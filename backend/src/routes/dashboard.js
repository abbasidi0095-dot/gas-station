import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard/summary?range=week|month|year
router.get('/summary', authenticate, isAdmin, async (req, res) => {
  const { range } = req.query; // 'week' | 'month' | 'year'

  // Set date boundaries
  const now = new Date();
  let startDate = new Date();

  if (range === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (range === 'year') {
    startDate.setDate(now.getDate() - 365);
  } else {
    // default to 'month' (last 30 days)
    startDate.setDate(now.getDate() - 30);
  }

  // Set time of startDate to 00:00:00
  startDate.setHours(0, 0, 0, 0);

  try {
    // 1. Fetch all Revenue in the range
    const revenues = await prisma.revenue.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });

    // 2. Fetch all Charges in the range
    const charges = await prisma.charge.findMany({
      where: { date: { gte: startDate } },
      include: { vendor: true },
      orderBy: { date: 'asc' },
    });

    // 3. Compute Totals
    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    const netProfit = totalRevenue - totalCharges;

    // 4. Expense Categories Breakdown
    const expenseCatMap = {};
    charges.forEach((c) => {
      const cat = c.category;
      expenseCatMap[cat] = (expenseCatMap[cat] || 0) + c.amount;
    });
    const expenseCategories = Object.keys(expenseCatMap).map((key) => ({
      name: key.replace('_', ' '),
      value: parseFloat(expenseCatMap[key].toFixed(2)),
    }));

    // 5. Revenue Categories Breakdown
    const revenueCatMap = {};
    revenues.forEach((r) => {
      const cat = r.category;
      revenueCatMap[cat] = (revenueCatMap[cat] || 0) + r.amount;
    });
    const revenueCategories = Object.keys(revenueCatMap).map((key) => ({
      name: key.replace('_', ' '),
      value: parseFloat(revenueCatMap[key].toFixed(2)),
    }));

    // 6. Vendor Spend Breakdown
    const vendorMap = {};
    charges.forEach((c) => {
      const vName = c.vendor ? c.vendor.name : 'Other / Non-Vendor';
      vendorMap[vName] = (vendorMap[vName] || 0) + c.amount;
    });
    const vendorBreakdown = Object.keys(vendorMap).map((key) => ({
      name: key,
      value: parseFloat(vendorMap[key].toFixed(2)),
    }));

    // 7. Group Chronological Data for Recharts side-by-side comparison
    const dailyData = {};

    // Helper to format date string as YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];

    revenues.forEach((r) => {
      const dStr = formatDate(r.date);
      if (!dailyData[dStr]) {
        dailyData[dStr] = { date: dStr, revenue: 0, expense: 0 };
      }
      dailyData[dStr].revenue += r.amount;
    });

    charges.forEach((c) => {
      const dStr = formatDate(c.date);
      if (!dailyData[dStr]) {
        dailyData[dStr] = { date: dStr, revenue: 0, expense: 0 };
      }
      dailyData[dStr].expense += c.amount;
    });

    // Convert dailyData map to sorted array
    let chartsData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // For better chart rendering, if range is 'year', we aggregate by month instead of day
    if (range === 'year') {
      const monthlyData = {};
      chartsData.forEach((item) => {
        const [year, month] = item.date.split('-');
        const monthKey = `${year}-${month}`; // e.g. "2026-07"
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { date: monthKey, revenue: 0, expense: 0 };
        }
        monthlyData[monthKey].revenue += item.revenue;
        monthlyData[monthKey].expense += item.expense;
      });
      chartsData = Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Round values to 2 decimal places
    chartsData = chartsData.map((item) => ({
      ...item,
      revenue: parseFloat(item.revenue.toFixed(2)),
      expense: parseFloat(item.expense.toFixed(2)),
    }));

    return res.json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCharges: parseFloat(totalCharges.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        range,
      },
      expenseCategories,
      revenueCategories,
      vendorBreakdown,
      chartsData,
    });
  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    return res.status(500).json({ error: 'Failed to aggregate dashboard metrics.' });
  }
});

export default router;
