import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

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
    const charge = await prisma.charge.create({
      data: {
        vendorId: vendorId || null,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        description,
        createdBy: req.user.id,
      },
      include: {
        vendor: true,
      },
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

export default router;
