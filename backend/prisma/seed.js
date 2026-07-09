import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding clean database (no mock data)...');

  // Wipe everything for a pristine start
  await prisma.revenue.deleteMany({});
  await prisma.charge.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.vendor.deleteMany({});

  // Vendors
  await prisma.vendor.create({ data: { name: 'Al Mohit' } });
  await prisma.vendor.create({ data: { name: 'Afriquia' } });
  console.log('Vendors seeded: Al Mohit, Afriquia');

  // Admin user (password: salami2026)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('salami2026', salt);

  await prisma.user.create({
    data: { name: 'Salami Hassan', email: 'admin@gas.com', passwordHash, role: 'admin' },
  });
  console.log('Admin seeded: admin@gas.com / salami2026');

  console.log('Clean database seeding complete! No mock transactions.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
