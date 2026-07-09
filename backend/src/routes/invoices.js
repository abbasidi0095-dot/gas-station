import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { generateInvoice, generateConsolidatedInvoice } from '../services/invoice.js';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function pad(n, w) {
  return String(n).padStart(w, '0');
}

async function nextInvoiceNumber(tx) {
  const seq = await tx.sequence.upsert({
    where: { id: 'invoice_number' },
    update: { value: { increment: 1 } },
    create: { id: 'invoice_number', value: 1 },
  });
  return seq.value;
}

// GET /api/invoices
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        _count: { select: { charges: true } },
        charges: { select: { id: true, amount: true, category: true, vendor: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(invoices);
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return res.status(500).json({ error: 'Failed to retrieve invoices.' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        charges: { include: { vendor: true } },
      },
    });
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
    return res.json(invoice);
  } catch (error) {
    console.error('Fetch invoice error:', error);
    return res.status(500).json({ error: 'Failed to retrieve invoice.' });
  }
});

// POST /api/invoices/generate/:chargeId
router.post('/generate/:chargeId', authenticate, isAdmin, async (req, res) => {
  try {
    const charge = await prisma.charge.findUnique({
      where: { id: req.params.chargeId },
      include: { vendor: true },
    });
    if (!charge) return res.status(404).json({ error: 'Charge introuvable.' });

    const result = await prisma.$transaction(async (tx) => {
      const num = await nextInvoiceNumber(tx);
      const invoice = await tx.invoice.create({
        data: { invoiceNumber: num, type: 'single' },
      });
      await tx.charge.update({
        where: { id: charge.id },
        data: { invoiceId: invoice.id },
      });
      return { invoice, num };
    });

    const { filePath, filename } = await generateInvoice(charge, result.num);

    return res.status(201).json({
      message: 'Facture générée avec succès.',
      invoice: { ...result.invoice, filename },
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    return res.status(500).json({ error: error.message || 'Échec de la génération de la facture.' });
  }
});

// POST /api/invoices/merge
router.post('/merge', authenticate, isAdmin, async (req, res) => {
  const { invoiceIds } = req.body;
  if (!invoiceIds || invoiceIds.length < 2) {
    return res.status(400).json({ error: 'Sélectionnez au moins 2 factures à fusionner.' });
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      include: { charges: { include: { vendor: true } } },
    });

    if (invoices.length !== invoiceIds.length) {
      return res.status(400).json({ error: 'Certaines factures sont introuvables.' });
    }

    const allCharges = invoices.flatMap((inv) => inv.charges);

    const result = await prisma.$transaction(async (tx) => {
      const num = await nextInvoiceNumber(tx);
      const consolidated = await tx.invoice.create({
        data: { invoiceNumber: num, type: 'consolidated' },
      });

      for (const inv of invoices) {
        await tx.invoice.update({
          where: { id: inv.id },
          data: { status: 'merged_into', mergedIntoId: consolidated.id },
        });
      }

      const chargeIds = allCharges.map((c) => c.id);
      await tx.charge.updateMany({
        where: { id: { in: chargeIds } },
        data: { invoiceId: consolidated.id },
      });

      return { consolidated, num };
    });

    const { filePath, filename } = await generateConsolidatedInvoice(allCharges, result.num);

    return res.status(201).json({
      message: 'Facture consolidée générée.',
      invoice: { ...result.consolidated, filename },
    });
  } catch (error) {
    console.error('Merge invoices error:', error);
    return res.status(500).json({ error: error.message || 'Échec de la fusion des factures.' });
  }
});

// GET /api/invoices/:id/download
router.get('/:id/download', authenticate, isAdmin, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { charges: { include: { vendor: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });

    const num = `INV-${pad(invoice.invoiceNumber, 4)}`;
    const filePath = path.join(__dirname, '..', '..', 'invoices', `facture-${num}.pdf`);

    if (!fs.existsSync(filePath)) {
      if (invoice.type === 'consolidated') {
        await generateConsolidatedInvoice(invoice.charges, invoice.invoiceNumber);
      } else if (invoice.charges.length === 1) {
        await generateInvoice(invoice.charges[0], invoice.invoiceNumber);
      } else {
        return res.status(404).json({ error: 'Fichier PDF introuvable.' });
      }
    }

    return res.download(filePath, `facture-${num}.pdf`);
  } catch (error) {
    console.error('Download invoice error:', error);
    return res.status(500).json({ error: 'Échec du téléchargement.' });
  }
});

// POST /api/invoices/:id/send
router.post('/:id/send', authenticate, isAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { charges: { include: { vendor: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });

    const num = `INV-${pad(invoice.invoiceNumber, 4)}`;
    const filePath = path.join(__dirname, '..', '..', 'invoices', `facture-${num}.pdf`);

    if (!fs.existsSync(filePath)) {
      if (invoice.type === 'consolidated') {
        await generateConsolidatedInvoice(invoice.charges, invoice.invoiceNumber);
      } else {
        await generateInvoice(invoice.charges[0], invoice.invoiceNumber);
      }
    }

    const pdfBuffer = fs.readFileSync(filePath);
    const typeLabel = invoice.type === 'consolidated' ? 'Facture Consolidée' : 'Facture';

    const { error } = await resend.emails.send({
      from: 'Rapports Al Mohit <reports@almohit.site>',
      to: email,
      subject: `${typeLabel} N° ${num}`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint la facture <strong>${num}</strong>.</p>
        <p>Al Mohit Station</p>
      `,
      attachments: [{
        filename: `facture-${num}.pdf`,
        content: pdfBuffer.toString('base64'),
      }],
    });

    if (error) throw new Error(error.message);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'sent', sentTo: email, sentAt: new Date() },
    });

    return res.json({ message: 'Facture envoyée avec succès.' });
  } catch (error) {
    console.error('Send invoice error:', error);
    return res.status(500).json({ error: error.message || 'Échec de l\'envoi de la facture.' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: req.params.id } });
      if (!invoice) throw new Error('Not found');

      await tx.charge.updateMany({
        where: { invoiceId: invoice.id },
        data: { invoiceId: null },
      });

      if (invoice.status === 'merged_into' && invoice.mergedIntoId) {
        await tx.invoice.update({
          where: { id: invoice.mergedIntoId },
          data: { status: 'generated', mergedIntoId: null },
        });
      }

      await tx.invoice.delete({ where: { id: invoice.id } });
    });

    return res.json({ message: 'Facture supprimée.' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return res.status(500).json({ error: 'Échec de la suppression.' });
  }
});

export default router;
