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
  const { name, cin, position, phone, hireDate } = req.body;

  if (!name || !cin || !position || !phone || !hireDate) {
    return res.status(400).json({ error: 'Name, CIN, position, phone, and hire date are required.' });
  }

  try {
    const worker = await prisma.worker.create({
      data: { name, cin, position, phone, hireDate: new Date(hireDate), active: true },
    });
    return res.status(201).json({ message: 'Worker created successfully.', worker });
  } catch (error) {
    console.error('Create worker error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create worker.' });
  }
});

router.put('/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, cin, position, phone, hireDate, active } = req.body;

  try {
    const updatedWorker = await prisma.worker.update({
      where: { id },
      data: {
        name,
        cin,
        position,
        phone,
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
  const { workerId, amount, date, description } = req.body;

  if (!workerId || !amount || !date) {
    return res.status(400).json({ error: 'Worker, amount, and date are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const charge = await tx.charge.create({
        data: {
          amount: parseFloat(amount),
          category: 'salary',
          date: new Date(date),
          description: description || 'Worker salary payment',
          createdBy: req.user.id,
        },
      });

      const payment = await tx.payment.create({
        data: {
          workerId,
          amount: parseFloat(amount),
          date: new Date(date),
          description,
          createdBy: req.user.id,
          chargeId: charge.id,
        },
        include: { worker: true },
      });

      return payment;
    });

    return res.status(201).json({ message: 'Payment logged successfully.', payment: result });
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({ error: 'Failed to record worker payment.' });
  }
});

router.delete('/payments/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    await prisma.$transaction(async (tx) => {
      if (payment.chargeId) {
        await tx.charge.delete({ where: { id: payment.chargeId } }).catch(() => {});
      }
      await tx.payment.delete({ where: { id } });
    });

    return res.json({ message: 'Payment deleted successfully.' });
  } catch (error) {
    console.error('Delete payment error:', error);
    return res.status(404).json({ error: 'Payment not found or delete failed.' });
  }
});

export default router;
