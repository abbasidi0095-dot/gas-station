import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up 2026 data from the database...');

  // 1. Delete payments in 2026
  const deletedPayments = await prisma.payment.deleteMany({
    where: {
      date: {
        gte: new Date('2026-01-01T00:00:00Z'),
      },
    },
  });
  console.log(`Deleted ${deletedPayments.count} payment logs from 2026.`);

  // 2. Delete charges in 2026
  const deletedCharges = await prisma.charge.deleteMany({
    where: {
      date: {
        gte: new Date('2026-01-01T00:00:00Z'),
      },
    },
  });
  console.log(`Deleted ${deletedCharges.count} charge logs from 2026.`);

  // 3. Delete revenues in 2026
  const deletedRevenues = await prisma.revenue.deleteMany({
    where: {
      date: {
        gte: new Date('2026-01-01T00:00:00Z'),
      },
    },
  });
  console.log(`Deleted ${deletedRevenues.count} revenue logs from 2026.`);

  // 4. Delete receipts in 2026
  const deletedReceipts = await prisma.receipt.deleteMany({
    where: {
      OR: [
        {
          date: {
            startsWith: '2026',
          },
        },
        {
          scannedAt: {
            gte: new Date('2026-01-01T00:00:00Z'),
          },
        },
      ],
    },
  });
  console.log(`Deleted ${deletedReceipts.count} receipt records from 2026.`);

  // 5. Clean up invoices created in 2026
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: {
      createdAt: {
        gte: new Date('2026-01-01T00:00:00Z'),
      },
    },
  });
  console.log(`Deleted ${deletedInvoices.count} invoice records from 2026.`);

  console.log('Database cleanup completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
