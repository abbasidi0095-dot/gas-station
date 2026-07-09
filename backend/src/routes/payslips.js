import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { generatePayslip } from '../services/payslip.js';
import { Resend } from 'resend';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function periodLabel(year, month) {
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[month]} ${year}`;
}

// POST /api/payslips/send-all
router.post('/send-all', authenticate, isAdmin, async (req, res) => {
  const { year, month } = req.body;
  const y = year || new Date().getFullYear();
  const m = month !== undefined ? month : new Date().getMonth();

  const startDate = new Date(y, m, 1);
  const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);

  try {
    const workers = await prisma.worker.findMany({
      where: { active: true },
      include: {
        payments: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'asc' },
        },
      },
    });

    const results = [];
    const period = periodLabel(y, m);

    for (const worker of workers) {
      if (worker.payments.length === 0) {
        results.push({ worker: worker.name, status: 'skipped', reason: 'Aucun paiement' });
        continue;
      }

      const { filePath, filename } = await generatePayslip({
        worker,
        payments: worker.payments,
        period,
      });

      results.push({ worker: worker.name, total: worker.payments.reduce((s, p) => s + p.amount, 0), filePath, filename });

      // Send email if worker has email
      if (worker.email) {
        const pdfBuffer = fs.readFileSync(filePath);
        const { error } = await resend.emails.send({
          from: 'Rapports Al Mohit <reports@almohit.site>',
          to: worker.email,
          subject: `Fiche de paie — ${period}`,
          html: `
            <p>Bonjour ${worker.name},</p>
            <p>Veuillez trouver ci-joint votre fiche de paie pour la période <strong>${period}</strong>.</p>
            <p>Cordialement,<br>N HOLDING DAKHLA (AL MOHIT)</p>
          `,
          attachments: [{
            filename: `fiche-paie-${worker.name.replace(/\s+/g, '-')}-${period}.pdf`,
            content: pdfBuffer.toString('base64'),
          }],
        });
        if (error) results[results.length - 1].emailError = error.message;
        else results[results.length - 1].emailSent = true;
      }
    }

    // Save last sent
    await prisma.setting.upsert({
      where: { key: 'payslip_last_sent' },
      update: { value: new Date().toISOString() },
      create: { key: 'payslip_last_sent', value: new Date().toISOString() },
    });

    return res.json({ message: 'Fiches de paie traitées.', results });
  } catch (error) {
    console.error('Send payslips error:', error);
    return res.status(500).json({ error: error.message || 'Échec de l\'envoi des fiches de paie.' });
  }
});

export default router;
