import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/settings
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    return res.json(map);
  } catch (error) {
    console.error('Fetch settings error:', error);
    return res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// POST /api/settings
router.post('/', authenticate, isAdmin, async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required.' });

  try {
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return res.json(setting);
  } catch (error) {
    console.error('Save setting error:', error);
    return res.status(500).json({ error: 'Failed to save setting.' });
  }
});

export default router;
