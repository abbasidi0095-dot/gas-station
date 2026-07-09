import express from 'express';
import cors from 'cors';
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

const app = express();

// Middleware
app.use(cors({
  origin: true, // Echoes request origin in development
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static receipt uploads
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routing
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

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
