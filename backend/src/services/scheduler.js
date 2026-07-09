import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendDailyReport } from './email.js';

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

async function checkAndSendReport() {
  try {
    const freqSetting = await prisma.setting.findUnique({ where: { key: 'report_frequency' } });
    const emailSetting = await prisma.setting.findUnique({ where: { key: 'report_email' } });
    const lastSentSetting = await prisma.setting.findUnique({ where: { key: 'report_last_sent' } });

    const frequency = freqSetting?.value || 'disabled';
    const reportEmail = emailSetting?.value;
    const lastSent = lastSentSetting?.value ? new Date(lastSentSetting.value) : null;

    if (frequency === 'disabled' || !reportEmail) return;

    const now = new Date();
    let shouldSend = false;

    switch (frequency) {
      case 'daily':
        if (!lastSent || startOfDay(lastSent) < startOfDay(now)) shouldSend = true;
        break;
      case 'weekly':
        if (now.getDay() === 1) {
          if (!lastSent || startOfDay(lastSent) < startOfDay(new Date(now.getTime() - 7 * 86400000))) shouldSend = true;
        }
        break;
      case 'monthly':
        if (now.getDate() === 1) {
          if (!lastSent || startOfDay(lastSent) < startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))) shouldSend = true;
        }
        break;
      case 'annual':
        if (now.getDate() === 1 && now.getMonth() === 0) {
          if (!lastSent || startOfDay(lastSent) < startOfDay(new Date(now.getFullYear() - 1, 0, 1))) shouldSend = true;
        }
        break;
    }

    if (!shouldSend) return;

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

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

    await sendDailyReport(reportEmail, {
      date: formatDate(now),
      totalRevenue: revenueAgg._sum.amount || 0,
      totalCharges: chargesAgg._sum.amount || 0,
      net: (revenueAgg._sum.amount || 0) - (chargesAgg._sum.amount || 0),
      charges,
      revenue,
    });

    await prisma.setting.upsert({
      where: { key: 'report_last_sent' },
      update: { value: now.toISOString() },
      create: { key: 'report_last_sent', value: now.toISOString() },
    });

    console.log(`[Scheduler] Report sent at ${now.toISOString()}`);
  } catch (error) {
    console.error('[Scheduler] Error:', error.message);
  }
}

export function startScheduler() {
  cron.schedule('0 * * * *', checkAndSendReport);
  console.log('[Scheduler] Started (every hour)');
}
