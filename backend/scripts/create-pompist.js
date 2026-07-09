import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'pompist@almohit.com';
  const password = 'pompist2026';
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`Pompist user already exists with email: ${email}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  await prisma.user.create({
    data: {
      name: 'Ali (Pompist)',
      email,
      passwordHash,
      role: 'pompist',
    },
  });

  console.log('----------------------------------------------------');
  console.log('POMPIST USER CREATED SUCCESSFULY!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('Role: pompist');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error creating pompist user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
