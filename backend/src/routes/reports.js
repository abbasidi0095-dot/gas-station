import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { sendDailyReport } from '../services/email.js';

const router = Router();
const prisma = new PrismaClient();

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// POST /api/reports/daily
router.post('/daily', authenticate, isAdmin, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis.' });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  try {
    const [revenueAgg, chargesAgg, charges, revenue] = await Promise.all([
      prisma.revenue.aggregate({
        where: { date: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      prisma.charge.aggregate({
        where: { date: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      prisma.charge.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        include: { vendor: true },
        orderBy: { date: 'desc' },
      }),
      prisma.revenue.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        orderBy: { date: 'desc' },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.amount || 0;
    const totalCharges = chargesAgg._sum.amount || 0;
    const net = totalRevenue - totalCharges;
    const date = formatDate(now);

    await sendDailyReport(email, {
      date,
      totalRevenue,
      totalCharges,
      net,
      charges,
      revenue,
    });

    return res.json({
      message: 'Rapport quotidien envoyé avec succès.',
      data: {
        totalRevenue,
        totalCharges,
        net,
        date,
        chargeCount: charges.length,
        revenueCount: revenue.length,
      },
    });
  } catch (error) {
    console.error('Daily report error:', error);
    return res.status(500).json({ error: error.message || 'Échec de l\'envoi du rapport.' });
  }
});

export default router;
