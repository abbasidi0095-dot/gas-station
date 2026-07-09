import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { scanReceiptWithGemini, manualReceiptEntry } from '../services/gemini.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only receipt images (JPEG, PNG, WEBP) or PDFs are allowed!'));
  },
});

// POST /api/receipts/scan - Upload and analyze receipt with Vertex AI
router.post('/scan', authenticate, isAdmin, upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a receipt image.' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  const filePath = req.file.path;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ocrResults = await scanReceiptWithGemini(fileBuffer, req.file.mimetype);

    const allVendors = await prisma.vendor.findMany();
    const normalize = (s) => String(s).toLowerCase().replace(/[\s\-_]+/g, '');
    const results = [];

    for (const ocrResult of ocrResults) {
      let vendor = null;
      if (ocrResult.vendor && ocrResult.vendor !== 'unknown') {
        const target = normalize(ocrResult.vendor);
        vendor = allVendors.find((v) => {
          const n = normalize(v.name);
          return n === target || n.includes(target) || target.includes(n);
        }) || null;
      }

      const confidence = ocrResult.confidence || 0.0;
      const isHighConfidence = confidence >= 0.8 && vendor !== null && ocrResult.amount !== null;
      const initialStatus = isHighConfidence ? 'confirmed' : 'pending_review';

      const receipt = await prisma.receipt.create({
        data: {
          imageUrl,
          vendorId: vendor ? vendor.id : null,
          amount: ocrResult.amount,
          currency: ocrResult.currency || 'MAD',
          date: ocrResult.date || null,
          fuelType: ocrResult.fuelType || null,
          extractedRawText: ocrResult.extractedRawText,
          confidenceScore: confidence,
          status: initialStatus,
          purpose: 'expense',
          scannedBy: req.user.id,
        },
        include: {
          vendor: true,
          user: { select: { name: true } },
        },
      });

      if (initialStatus === 'confirmed') {
        await prisma.charge.create({
          data: {
            vendorId: vendor.id,
            receiptId: receipt.id,
            amount: ocrResult.amount,
            category: 'fuel_purchase',
            date: ocrResult.date ? new Date(ocrResult.date) : new Date(),
            description: `Auto-scanned fuel purchase via Vertex AI (confidence: ${(confidence * 100).toFixed(0)}%)`,
            createdBy: req.user.id,
          },
        });
      }

      results.push({ receipt, autoFiled: isHighConfidence });
    }

    return res.status(201).json({
      message: `Processed ${results.length} receipt(s).`,
      results,
    });
  } catch (error) {
    console.error('Scan receipts route error:', error);
    return res.status(500).json({ error: error.message || 'An error occurred during receipt processing.' });
  }
});

// POST /api/receipts/manual - Manual receipt entry (no AI scan)
router.post('/manual', authenticate, isAdmin, upload.single('receipt'), async (req, res) => {
  const { vendorId, amount, date, category, description } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!amount || !date) {
    return res.status(400).json({ error: 'Amount and date are required.' });
  }

  try {
    const receipt = await manualReceiptEntry({
      vendorId,
      amount,
      date,
      category: category || 'fuel_purchase',
      description,
      imageUrl,
      scannedBy: req.user.id,
      prisma,
    });

    return res.status(201).json({
      message: 'Receipt manually filed in charges ledger.',
      receipt,
      autoFiled: true,
    });
  } catch (error) {
    console.error('Manual receipt error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record manual receipt.' });
  }
});

// GET /api/receipts/queue
router.get('/queue', authenticate, isAdmin, async (req, res) => {
  try {
    const queue = await prisma.receipt.findMany({
      where: { status: 'pending_review', purpose: 'expense' },
      include: { vendor: true, user: { select: { name: true } } },
      orderBy: { scannedAt: 'desc' },
    });
    return res.json(queue);
  } catch (error) {
    console.error('Fetch review queue error:', error);
    return res.status(500).json({ error: 'Failed to retrieve review queue.' });
  }
});

// ==========================================================
// Sold Gas (Revenue) Receipts — Bulk upload + approval flow
// ==========================================================

// POST /api/receipts/scan-bulk — upload multiple sold-gas receipts, OCR each
router.post('/scan-bulk', authenticate, isAdmin, upload.array('receipts', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one receipt image.' });
  }

  const results = [];

  for (const file of req.files) {
    const imageUrl = `/uploads/${file.filename}`;
    const filePath = file.path;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ocrResults = await scanReceiptWithGemini(fileBuffer, file.mimetype);

      const allVendors = await prisma.vendor.findMany();
      const normalize = (s) => String(s).toLowerCase().replace(/[\s\-_]+/g, '');

      for (const ocrResult of ocrResults) {
        let vendor = null;
        if (ocrResult.vendor && ocrResult.vendor !== 'unknown') {
          const target = normalize(ocrResult.vendor);
          vendor = allVendors.find((v) => {
            const n = normalize(v.name);
            return n === target || n.includes(target) || target.includes(n);
          }) || null;
        }

        const receipt = await prisma.receipt.create({
          data: {
            imageUrl,
            vendorId: vendor ? vendor.id : null,
            amount: ocrResult.amount,
            currency: ocrResult.currency || 'MAD',
            date: ocrResult.date || null,
            fuelType: ocrResult.fuelType || null,
            extractedRawText: ocrResult.extractedRawText,
            confidenceScore: ocrResult.confidence || 0,
            status: 'pending_review',
            purpose: 'revenue',
            scannedBy: req.user.id,
          },
          include: { vendor: true },
        });

        results.push({ success: true, receipt });
      }
    } catch (error) {
      console.error('Bulk scan file error:', error);
      results.push({ success: false, filename: file.originalname, error: error.message || 'OCR failed for this file.' });
    }
  }

  return res.status(201).json({ message: `Processed ${results.length} receipt(s).`, results });
});

// GET /api/receipts/sold-gas/queue
router.get('/sold-gas/queue', authenticate, isAdmin, async (req, res) => {
  try {
    const queue = await prisma.receipt.findMany({
      where: { status: 'pending_review', purpose: 'revenue' },
      include: { vendor: true, user: { select: { name: true } } },
      orderBy: { scannedAt: 'desc' },
    });
    return res.json(queue);
  } catch (error) {
    console.error('Fetch sold-gas queue error:', error);
    return res.status(500).json({ error: 'Failed to retrieve sold-gas review queue.' });
  }
});

// PUT /api/receipts/sold-gas/review/:id
router.put('/sold-gas/review/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { vendorId, amount, date, status, description, fuelType } = req.body;

  if (!status || (status !== 'confirmed' && status !== 'rejected')) {
    return res.status(400).json({ error: 'Valid review status ("confirmed" or "rejected") is required.' });
  }

  try {
    const originalReceipt = await prisma.receipt.findUnique({
      where: { id },
      include: { revenue: true },
    });

    if (!originalReceipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    if (originalReceipt.status !== 'pending_review') {
      return res.status(400).json({ error: 'This receipt has already been reviewed.' });
    }
    if (originalReceipt.purpose !== 'revenue') {
      return res.status(400).json({ error: 'This receipt is not a sold-gas receipt.' });
    }

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      const updated = await tx.receipt.update({
        where: { id },
        data: {
          vendorId: status === 'confirmed' ? vendorId : null,
          amount: status === 'confirmed' ? parseFloat(amount) : null,
          status,
        },
      });

      if (status === 'confirmed') {
        if (amount === undefined || !date) {
          throw new Error('Amount and Date are required to confirm the sold-gas receipt.');
        }

        await tx.revenue.create({
          data: {
            amount: parseFloat(amount),
            category: 'fuel_sales',
            fuelType: fuelType || null,
            date: new Date(date),
            description: description || 'Sold gas from scanned receipt',
            createdBy: req.user.id,
            vendorId: vendorId || null,
            receiptId: id,
          },
        });
      }

      return updated;
    });

    return res.json({
      message: status === 'confirmed'
        ? 'Sold-gas receipt approved and recorded as fuel sales revenue.'
        : 'Sold-gas receipt rejected successfully.',
      receipt: updatedReceipt,
    });
  } catch (error) {
    console.error('Sold-gas review error:', error);
    return res.status(400).json({ error: error.message || 'Failed to submit sold-gas review.' });
  }
});

// PUT /api/receipts/review/:id
router.put('/review/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { vendorId, amount, date, status, category, description } = req.body;

  if (!status || (status !== 'confirmed' && status !== 'rejected')) {
    return res.status(400).json({ error: 'Valid review status ("confirmed" or "rejected") is required.' });
  }

  try {
    const originalReceipt = await prisma.receipt.findUnique({
      where: { id },
      include: { charge: true },
    });

    if (!originalReceipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    if (originalReceipt.status !== 'pending_review') {
      return res.status(400).json({ error: 'This receipt has already been reviewed.' });
    }

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      const updated = await tx.receipt.update({
        where: { id },
        data: {
          vendorId: status === 'confirmed' ? vendorId : null,
          amount: status === 'confirmed' ? parseFloat(amount) : null,
          status,
        },
      });

      if (status === 'confirmed') {
        if (!vendorId || amount === undefined || !date) {
          throw new Error('Vendor, Amount, and Date are required to confirm the receipt.');
        }

        await tx.charge.create({
          data: {
            vendorId,
            receiptId: id,
            amount: parseFloat(amount),
            category: category || 'fuel_purchase',
            date: new Date(date),
            description: description || 'Manually confirmed from scanned receipt queue.',
            createdBy: req.user.id,
          },
        });
      }

      return updated;
    });

    return res.json({
      message: status === 'confirmed'
        ? 'Receipt confirmed and filed in charges ledger successfully.'
        : 'Receipt rejected successfully.',
      receipt: updatedReceipt,
    });
  } catch (error) {
    console.error('Review receipt error:', error);
    return res.status(400).json({ error: error.message || 'Failed to submit receipt review.' });
  }
});

// GET /api/receipts
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const receipts = await prisma.receipt.findMany({
      include: { vendor: true, user: { select: { name: true } } },
      orderBy: { scannedAt: 'desc' },
    });
    return res.json(receipts);
  } catch (error) {
    console.error('Fetch receipts history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve receipt history.' });
  }
});

export default router;
