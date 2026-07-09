import dotenv from 'dotenv';
import app from './app.js';
import { startScheduler } from './services/scheduler.js';
import { syncWorkerAccounts } from './services/syncWorkers.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`=============================================`);
  console.log(` Almohit Gas Operations API running on PORT: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=============================================`);
  await syncWorkerAccounts();
});

startScheduler();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
