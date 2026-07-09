import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

// Import route modules
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/workers.js';
import financialRoutes from './routes/financials.js';
import receiptRoutes from './routes/receipts.js';
import dashboardRoutes from './routes/dashboard.js';
import exportRoutes from './routes/export.js';
import reportRoutes from './routes/reports.js';
import invoiceRoutes from './routes/invoices.js';
import payslipRoutes from './routes/payslips.js';
import settingRoutes from './routes/settings.js';

const app = express();

// Security
app.disable('x-powered-by');
app.use(helmet());

// CORS
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5000'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets and receipt uploads
const assetsPath = path.join(process.cwd(), 'assets');
app.use('/assets', express.static(assetsPath));
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routing
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/settings', settingRoutes);

// Fallback Route
app.get('/api/health', (req, res) => {
  return res.json({ status: 'healthy', date: new Date() });
});

// ==========================================================
// Production: serve built frontend from frontend/dist
// ==========================================================
const frontendDist = path.resolve(process.cwd(), '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // SPA catch-all: return index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    return res.status(404).json({ error: 'Not found' });
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.',
  });
});

export default app;
