import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// Worker CRUD Endpoints (Admin Only)
// ==========================================

router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const workers = await prisma.worker.findMany({
      include: { payments: { orderBy: { date: 'desc' }, take: 10 } },
      orderBy: { name: 'asc' },
    });
    return res.json(workers);
  } catch (error) {
    console.error('Fetch workers error:', error);
    return res.status(500).json({ error: 'Failed to retrieve workers list.' });
  }
});

router.post('/', authenticate, isAdmin, async (req, res) => {
  const { name, cin, position, phone, email, hireDate } = req.body;

  if (!name || !cin || !position || !phone || !hireDate) {
    return res.status(400).json({ error: 'Name, CIN, position, phone, and hire date are required.' });
  }

  try {
    const worker = await prisma.worker.create({
      data: { name, cin, position, phone, email: email || null, hireDate: new Date(hireDate), active: true },
    });
    return res.status(201).json({ message: 'Worker created successfully.', worker });
  } catch (error) {
    console.error('Create worker error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create worker.' });
  }
});

router.put('/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, cin, position, phone, email, hireDate, active } = req.body;

  try {
    const updatedWorker = await prisma.worker.update({
      where: { id },
      data: {
        name,
        cin,
        position,
        phone,
        email: email !== undefined ? email : undefined,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        active: active !== undefined ? active : undefined,
      },
    });
    return res.json({ message: 'Worker updated successfully.', worker: updatedWorker });
  } catch (error) {
    console.error('Update worker error:', error);
    return res.status(404).json({ error: 'Worker not found or update failed.' });
  }
});

// ==========================================
// Payment Endpoints (Admin Only)
// ==========================================

router.get('/payments', authenticate, isAdmin, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { worker: true, user: { select: { name: true, role: true } } },
      orderBy: { date: 'desc' },
    });
    return res.json(payments);
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment logs.' });
  }
});

router.post('/payments', authenticate, isAdmin, async (req, res) => {
  const { workerId, amount, date, periodStart, periodEnd, description } = req.body;

  if (!workerId || !amount || !date) {
    return res.status(400).json({ error: 'Worker, amount, and date are required.' });
  }

  const periodDesc = periodStart && periodEnd
    ? `Paiement du ${new Date(periodStart).toLocaleDateString('fr-FR')} au ${new Date(periodEnd).toLocaleDateString('fr-FR')}`
    : null;
  const finalDesc = description || periodDesc || 'Worker salary payment';

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch next sequential invoice number
      const seq = await tx.sequence.upsert({
        where: { id: 'invoice_number' },
        update: { value: { increment: 1 } },
        create: { id: 'invoice_number', value: 1 },
      });

      // 2. Create the Invoice record
      const invoice = await tx.invoice.create({
        data: { invoiceNumber: seq.value, type: 'single' },
      });

      // 3. Create the salary charge linked to the invoice
      const charge = await tx.charge.create({
        data: {
          amount: parseFloat(amount),
          category: 'salary',
          date: new Date(date),
          description: finalDesc,
          createdBy: req.user.id,
          invoiceId: invoice.id,
        },
      });

      // 4. Create the Payment record
      const payment = await tx.payment.create({
        data: {
          workerId,
          amount: parseFloat(amount),
          date: new Date(date),
          description: finalDesc,
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
      // Pass a populated charge object with invoice and worker name as vendor
      const populatedCharge = {
        ...result.charge,
        invoice: result.invoice,
        vendor: { name: result.payment.worker.name } // Set worker's name as the 'vendor' for the charge invoice
      };
      await generateInvoice(populatedCharge, result.seqValue);
    } catch (invErr) {
      console.error('Invoice PDF generation failed for salary payment:', invErr);
    }

    // Generate payslip PDF and send email
    try {
      const { generatePayslip } = await import('../services/payslip.js');
      const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const pDate = periodEnd ? new Date(periodEnd) : new Date(date);
      const period = `${monthNames[pDate.getMonth()]} ${pDate.getFullYear()}`;

      const { filePath, filename } = await generatePayslip({
        worker: result.payment.worker,
        payments: [result.payment],
        period,
      });

      // Determine email recipients
      const adminEmailSetting = await prisma.setting.findUnique({ where: { key: 'report_email' } });
      const adminEmail = adminEmailSetting?.value;

      const recipients = [];
      if (result.payment.worker.email) {
        recipients.push(result.payment.worker.email);
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
              subject: `Fiche de paie — ${result.payment.worker.name} — ${period}`,
              html: `
                <p>Bonjour,</p>
                <p>Veuillez trouver ci-joint la fiche de paie de <strong>${result.payment.worker.name}</strong> pour la période <strong>${period}</strong>.</p>
                <p>Cordialement,<br>N HOLDING DAKHLA (AL MOHIT)</p>
              `,
              attachments: [{
                filename: `fiche-paie-${result.payment.worker.name.replace(/\s+/g, '-')}-${period}.pdf`,
                content: pdfBuffer.toString('base64'),
              }],
            });
          } catch (mailErr) {
            console.error(`Failed to send payslip email to ${toEmail}:`, mailErr);
          }
        }
      }
    } catch (payslipErr) {
      console.error('Payslip generation or mailing failed:', payslipErr);
    }

    return res.status(201).json({ message: 'Payment logged, invoice generated, and payslip sent successfully.', payment: result.payment });
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({ error: 'Failed to record worker payment.' });
  }
});

router.delete('/payments/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { charge: true }
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete payment
      await tx.payment.delete({ where: { id } });

      // 2. If payment has linked charge, delete charge and linked invoice
      if (payment.chargeId) {
        if (payment.charge && payment.charge.invoiceId) {
          // Delete linked invoice
          await tx.invoice.delete({ where: { id: payment.charge.invoiceId } }).catch(() => {});
        }
        // Delete the charge
        await tx.charge.delete({ where: { id: payment.chargeId } }).catch(() => {});
      }
    });

    return res.json({ message: 'Payment, linked charge, and invoice deleted successfully.' });
  } catch (error) {
    console.error('Delete payment error:', error);
    return res.status(500).json({ error: 'Failed to delete payment.' });
  }
});

router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        payments: {
          include: {
            charge: true
          }
        }
      }
    });

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Gather all charge IDs and invoice IDs linked to worker payments
      const chargeIds = [];
      const invoiceIds = [];

      for (const payment of worker.payments) {
        if (payment.chargeId) {
          chargeIds.push(payment.chargeId);
          if (payment.charge && payment.charge.invoiceId) {
            invoiceIds.push(payment.charge.invoiceId);
          }
        }
      }

      // 2. Delete payments
      await tx.payment.deleteMany({ where: { workerId: id } });

      // 3. Delete charges
      if (chargeIds.length > 0) {
        await tx.charge.deleteMany({ where: { id: { in: chargeIds } } });
      }

      // 4. Delete invoices
      if (invoiceIds.length > 0) {
        await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }

      // 5. Finally delete the worker
      await tx.worker.delete({ where: { id } });
    });

    return res.json({ message: 'Worker and all associated logs deleted successfully.' });
  } catch (error) {
    console.error('Delete worker error:', error);
    return res.status(500).json({ error: 'Failed to delete worker.' });
  }
});

export default router;
