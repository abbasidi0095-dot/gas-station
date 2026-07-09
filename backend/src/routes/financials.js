import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { generateInvoice } from '../services/invoice.js';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// Vendor Endpoints (All Authenticated Users)
// ==========================================
router.get('/vendors', authenticate, async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(vendors);
  } catch (error) {
    console.error('Fetch vendors error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vendors.' });
  }
});

// ==========================================
// Charges/Expenses Endpoints (Admin Only)
// ==========================================

// GET /api/financials/charges
router.get('/charges', authenticate, isAdmin, async (req, res) => {
  const { vendorId, category, startDate, endDate } = req.query;

  const where = {};
  if (vendorId) where.vendorId = vendorId;
  if (category) where.category = category;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  try {
    const charges = await prisma.charge.findMany({
      where,
      include: {
        vendor: true,
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        receipt: {
          select: { id: true, imageUrl: true, status: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    return res.json(charges);
  } catch (error) {
    console.error('Fetch charges error:', error);
    return res.status(500).json({ error: 'Failed to retrieve charges ledger.' });
  }
});

// POST /api/financials/charges
router.post('/charges', authenticate, isAdmin, async (req, res) => {
  const { vendorId, amount, category, date, description } = req.body;

  if (amount === undefined || !category || !date) {
    return res.status(400).json({ error: 'Amount, category, and date are required.' });
  }

  try {
    const charge = await prisma.$transaction(async (tx) => {
      const seq = await tx.sequence.upsert({
        where: { id: 'invoice_number' },
        update: { value: { increment: 1 } },
        create: { id: 'invoice_number', value: 1 },
      });

      const c = await tx.charge.create({
        data: {
          vendorId: vendorId || null,
          amount: parseFloat(amount),
          category,
          date: new Date(date),
          description,
          createdBy: req.user.id,
        },
        include: { vendor: true },
      });

      const invoice = await tx.invoice.create({
        data: { invoiceNumber: seq.value, type: 'single' },
      });

      await tx.charge.update({
        where: { id: c.id },
        data: { invoiceId: invoice.id },
      });

      await generateInvoice(c, seq.value);

      return { ...c, invoice };
    });

    return res.status(201).json({ message: 'Expense charge logged successfully.', charge });
  } catch (error) {
    console.error('Create charge error:', error);
    return res.status(500).json({ error: 'Failed to record manual expense.' });
  }
});

// PUT /api/financials/charges/:id
router.put('/charges/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { vendorId, amount, category, date, description } = req.body;

  try {
    const updatedCharge = await prisma.charge.update({
      where: { id },
      data: {
        vendorId: vendorId === '' ? null : vendorId,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        category,
        date: date ? new Date(date) : undefined,
        description,
      },
      include: {
        vendor: true,
      },
    });
    return res.json({ message: 'Charge updated successfully.', charge: updatedCharge });
  } catch (error) {
    console.error('Update charge error:', error);
    return res.status(404).json({ error: 'Charge entry not found or update failed.' });
  }
});

// DELETE /api/financials/charges/:id
router.delete('/charges/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.charge.delete({ where: { id } });
    return res.json({ message: 'Charge entry deleted successfully.' });
  } catch (error) {
    console.error('Delete charge error:', error);
    return res.status(404).json({ error: 'Charge entry not found or delete failed.' });
  }
});

// ==========================================
// Revenue Endpoints (Admin Only)
// ==========================================

// GET /api/financials/revenue
router.get('/revenue', authenticate, isAdmin, async (req, res) => {
  const { category, startDate, endDate } = req.query;

  const where = {};
  if (category) where.category = category;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  try {
    const revenue = await prisma.revenue.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return res.json(revenue);
  } catch (error) {
    console.error('Fetch revenue error:', error);
    return res.status(500).json({ error: 'Failed to retrieve revenue ledger.' });
  }
});

// POST /api/financials/revenue
router.post('/revenue', authenticate, isAdmin, async (req, res) => {
  const { amount, category, date, description } = req.body;

  if (amount === undefined || !category || !date) {
    return res.status(400).json({ error: 'Amount, category, and date are required.' });
  }

  try {
    const rev = await prisma.revenue.create({
      data: {
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        description,
        createdBy: req.user.id,
      },
    });
    return res.status(201).json({ message: 'Revenue entry logged successfully.', revenue: rev });
  } catch (error) {
    console.error('Create revenue error:', error);
    return res.status(500).json({ error: 'Failed to record manual revenue.' });
  }
});

// PUT /api/financials/revenue/:id
router.put('/revenue/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { amount, category, date, description } = req.body;

  try {
    const updatedRev = await prisma.revenue.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        category,
        date: date ? new Date(date) : undefined,
        description,
      },
    });
    return res.json({ message: 'Revenue entry updated successfully.', revenue: updatedRev });
  } catch (error) {
    console.error('Update revenue error:', error);
    return res.status(404).json({ error: 'Revenue entry not found or update failed.' });
  }
});

// DELETE /api/financials/revenue/:id
router.delete('/revenue/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.revenue.delete({ where: { id } });
    return res.json({ message: 'Revenue entry deleted successfully.' });
  } catch (error) {
    console.error('Delete revenue error:', error);
    return res.status(404).json({ error: 'Revenue entry not found or delete failed.' });
  }
});

// POST /api/financials/quick-add
router.post('/quick-add', authenticate, isAdmin, async (req, res) => {
  const { text, context } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text input is required.' });
  }

  try {
    const { classifyTextWithGemini } = await import('../services/gemini.js');
    const result = await classifyTextWithGemini(text, context);

    // If more information is needed, return the context back to the frontend with the prompt question!
    if (result.status === 'incomplete') {
      return res.json({
        success: true,
        status: 'incomplete',
        prompt: result.prompt,
        context: {
          originalInput: context ? context.originalInput : text,
          partialTransaction: result.transaction,
          previousPrompt: result.prompt
        }
      });
    }

    const { type, category, amount, vendor, workerName, date, description } = result.transaction;

    if (!amount || isNaN(amount)) {
      return res.status(422).json({ error: 'Failed to extract a valid amount from input.', classification: result });
    }

    // 1. REVENUE
    if (type === 'revenue') {
      let linkedVendorId = null;
      if (vendor && vendor.toLowerCase() !== 'unknown') {
        let vRecord = await prisma.vendor.findFirst({
          where: { name: { contains: vendor } }
        });
        if (!vRecord) {
          vRecord = await prisma.vendor.create({ data: { name: vendor } });
        }
        linkedVendorId = vRecord.id;
      }

      const rev = await prisma.revenue.create({
        data: {
          vendorId: linkedVendorId,
          amount: parseFloat(amount),
          category: category || 'other',
          date: new Date(date),
          description: description || text,
          createdBy: req.user.id,
        },
        include: { vendor: true }
      });

      return res.status(201).json({
        success: true,
        status: 'complete',
        message: `Revenu enregistré avec succès : Ventes de ${amount.toFixed(2)} DH (Catégorie: ${category || 'autre'}).`,
        type: 'revenue',
        classification: result,
        data: rev
      });
    }

    // 2. SALARY (Worker Payment)
    if (type === 'salary' || category === 'salary') {
      let matchedWorker = null;
      if (workerName) {
        matchedWorker = await prisma.worker.findFirst({
          where: {
            active: true,
            name: { contains: workerName }
          }
        });
      }

      // If a worker matches, log a real salary payment!
      if (matchedWorker) {
        const salaryResult = await prisma.$transaction(async (tx) => {
          const seq = await tx.sequence.upsert({
            where: { id: 'invoice_number' },
            update: { value: { increment: 1 } },
            create: { id: 'invoice_number', value: 1 },
          });

          const invoice = await tx.invoice.create({
            data: { invoiceNumber: seq.value, type: 'single' },
          });

          const charge = await tx.charge.create({
            data: {
              amount: parseFloat(amount),
              category: 'salary',
              date: new Date(date),
              description: description || `Salaire de ${matchedWorker.name}`,
              createdBy: req.user.id,
              invoiceId: invoice.id,
            },
          });

          const payment = await tx.payment.create({
            data: {
              workerId: matchedWorker.id,
              amount: parseFloat(amount),
              date: new Date(date),
              description: description || `Salaire de ${matchedWorker.name}`,
              createdBy: req.user.id,
              chargeId: charge.id,
            },
            include: { worker: true },
          });

          return { payment, seqValue: seq.value, invoice, charge };
        });

        // Generate Invoice PDF
        try {
          const { generateInvoice } = await import('../services/invoice.js');
          const populatedCharge = {
            ...salaryResult.charge,
            invoice: salaryResult.invoice,
            vendor: { name: salaryResult.payment.worker.name }
          };
          await generateInvoice(populatedCharge, salaryResult.seqValue);
        } catch (invErr) {
          console.error('Quick-add invoice PDF generation failed:', invErr);
        }

        // Generate Payslip & Email
        try {
          const { generatePayslip } = await import('../services/payslip.js');
          const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
          const pDate = new Date(date);
          const period = `${monthNames[pDate.getMonth()]} ${pDate.getFullYear()}`;

          const { filePath } = await generatePayslip({
            worker: salaryResult.payment.worker,
            payments: [salaryResult.payment],
            period,
          });

          // Determine recipients
          const adminEmailSetting = await prisma.setting.findUnique({ where: { key: 'report_email' } });
          const adminEmail = adminEmailSetting?.value;

          const recipients = [];
          if (salaryResult.payment.worker.email) {
            recipients.push(salaryResult.payment.worker.email);
          }
          if (adminEmail && !recipients.includes(adminEmail)) {
            recipients.push(adminEmail);
          }

          if (recipients.length > 0) {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const fs = await import('fs');
            const pdfBuffer = fs.readFileSync(filePath);

            for (const toEmail of recipients) {
              try {
                await resend.emails.send({
                  from: 'Rapports Al Mohit <reports@almohit.site>',
                  to: toEmail,
                  subject: `Fiche de paie — ${salaryResult.payment.worker.name} — ${period}`,
                  html: `
                    <p>Bonjour,</p>
                    <p>Veuillez trouver ci-joint la fiche de paie de <strong>${salaryResult.payment.worker.name}</strong> pour la période <strong>${period}</strong>.</p>
                    <p>Cordialement,<br>N HOLDING DAKHLA (AL MOHIT)</p>
                  `,
                  attachments: [{
                    filename: `fiche-paie-${salaryResult.payment.worker.name.replace(/\s+/g, '-')}-${period}.pdf`,
                    content: pdfBuffer.toString('base64'),
                  }],
                });
              } catch (mailErr) {
                console.error(`Failed to send payslip email to ${toEmail}:`, mailErr);
              }
            }
          }
        } catch (payslipErr) {
          console.error('Quick-add payslip generation failed:', payslipErr);
        }

        return res.status(201).json({
          success: true,
          status: 'complete',
          message: `Salaire enregistré avec succès pour ${matchedWorker.name} (${amount.toFixed(2)} DH). Fiche de paie générée et envoyée par email.`,
          type: 'salary',
          classification: result,
          data: salaryResult.payment
        });
      }
    }

    // 3. REGULAR CHARGE (OR SALARY CHARGE WITH NO MATCHED WORKER)
    let linkedVendorId = null;
    if (vendor && vendor.toLowerCase() !== 'unknown' && vendor.toLowerCase() !== 'autre') {
      let vRecord = await prisma.vendor.findFirst({
        where: { name: { contains: vendor } }
      });
      if (!vRecord) {
        vRecord = await prisma.vendor.create({ data: { name: vendor } });
      }
      linkedVendorId = vRecord.id;
    }

    const chargeResult = await prisma.$transaction(async (tx) => {
      const seq = await tx.sequence.upsert({
        where: { id: 'invoice_number' },
        update: { value: { increment: 1 } },
        create: { id: 'invoice_number', value: 1 },
      });

      const invoice = await tx.invoice.create({
        data: { invoiceNumber: seq.value, type: 'single' },
      });

      const charge = await tx.charge.create({
        data: {
          vendorId: linkedVendorId,
          amount: parseFloat(amount),
          category: category || 'other',
          date: new Date(date),
          description: description || text,
          createdBy: req.user.id,
          invoiceId: invoice.id,
        },
        include: { vendor: true },
      });

      return { charge, seqValue: seq.value, invoice };
    });

    // Generate Invoice PDF
    try {
      const { generateInvoice } = await import('../services/invoice.js');
      const populatedCharge = {
        ...chargeResult.charge,
        invoice: chargeResult.invoice
      };
      await generateInvoice(populatedCharge, chargeResult.seqValue);
    } catch (invErr) {
      console.error('Quick-add charge invoice PDF generation failed:', invErr);
    }

    return res.status(201).json({
      success: true,
      status: 'complete',
      message: `Dépense enregistrée avec succès : Charge de ${amount.toFixed(2)} DH (Catégorie: ${category || 'autre'}, Fournisseur: ${vendor || 'sans'}). Facture générée.`,
      type: 'charge',
      classification: result,
      data: chargeResult.charge
    });

  } catch (error) {
    console.error('Quick-add service error:', error);
    return res.status(500).json({ error: error.message || 'An error occurred during Quick Add processing.' });
  }
});

export default router;
