import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { generateExcelExport, generatePDFExport } from '../services/export.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to calculate date boundaries
function getDateFilters(range, start, end) {
  let startDate = new Date();
  let endDate = new Date();

  if (range === 'week') {
    startDate.setDate(endDate.getDate() - 7);
  } else if (range === 'year') {
    startDate.setDate(endDate.getDate() - 365);
  } else if (range === 'custom' && start && end) {
    startDate = new Date(start);
    endDate = new Date(end);
  } else {
    // Default to 'month' (last 30 days)
    startDate.setDate(endDate.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

// Fetch all database lists for export
async function getExportData({ startDate, endDate, exportType, vendorId, category }) {
  const chargeWhere = { date: { gte: startDate, lte: endDate } };
  if (vendorId) chargeWhere.vendorId = vendorId;
  if (category) chargeWhere.category = category;

  const receiptWhere = { scannedAt: { gte: startDate, lte: endDate } };
  if (vendorId) receiptWhere.vendorId = vendorId;

  const revenueWhere = { date: { gte: startDate, lte: endDate } };
  if (vendorId) revenueWhere.vendorId = vendorId;
  if (category) revenueWhere.category = category;

  let revenues = [];
  let charges = [];
  let receipts = [];

  if (exportType === 'combined' || exportType === 'revenue') {
    revenues = await prisma.revenue.findMany({
      where: revenueWhere,
      include: { vendor: true },
      orderBy: { date: 'asc' },
    });
  }

  if (exportType === 'combined' || exportType === 'charges') {
    charges = await prisma.charge.findMany({
      where: chargeWhere,
      include: { vendor: true },
      orderBy: { date: 'asc' },
    });
  }

  if (exportType === 'combined' || exportType === 'receipts') {
    receipts = await prisma.receipt.findMany({
      where: receiptWhere,
      include: { vendor: true },
      orderBy: { scannedAt: 'asc' },
    });
  }

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
  const netProfit = totalRevenue - totalCharges;

  return {
    revenues,
    charges,
    receipts,
    totals: { totalRevenue, totalCharges, netProfit }
  };
}

// GET /api/export/excel
router.get('/excel', authenticate, isAdmin, async (req, res) => {
  const { range, startDate: queryStart, endDate: queryEnd, exportType = 'combined', vendorId, category } = req.query;

  try {
    const { startDate, endDate } = getDateFilters(range, queryStart, queryEnd);
    const data = await getExportData({ startDate, endDate, exportType, vendorId: vendorId || null, category: category || null });

    const buffer = await generateExcelExport({
      range,
      startDate,
      endDate,
      exportType,
      vendorId: vendorId || null,
      category: category || null,
      ...data,
    });

    const filename = `al-mohit-export-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Excel Export Route Error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel sheet.' });
  }
});

// GET /api/export/pdf
router.get('/pdf', authenticate, isAdmin, async (req, res) => {
  const { range, startDate: queryStart, endDate: queryEnd, exportType = 'combined', vendorId, category } = req.query;

  try {
    const { startDate, endDate } = getDateFilters(range, queryStart, queryEnd);
    const data = await getExportData({ startDate, endDate, exportType, vendorId: vendorId || null, category: category || null });

    const buffer = await generatePDFExport({
      range,
      startDate,
      endDate,
      exportType,
      vendorId: vendorId || null,
      category: category || null,
      ...data,
    });

    const filename = `al-mohit-statement-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('PDF Export Route Error:', error);
    return res.status(500).json({ error: 'Failed to generate PDF document.' });
  }
});

export default router;
