import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function syncWorkerAccounts() {
  console.log('Synchronizing active worker logins...');
  try {
    const activeWorkers = await prisma.worker.findMany({
      where: { active: true },
    });

    const salt = await bcrypt.genSalt(10);
    const standardPassword = 'almohit2026';
    const passwordHash = await bcrypt.hash(standardPassword, salt);

    for (const worker of activeWorkers) {
      // Create email: clean spaces and special chars, convert to lowercase
      const cleanName = worker.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9]/g, '');     // keep only alphanumeric

      const email = worker.email || `${cleanName}@almohit.com`;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            name: worker.name,
            email: email.toLowerCase(),
            passwordHash,
            role: 'pompist',
          },
        });
        console.log(`Generated login access for active worker: ${worker.name} (Email: ${email.toLowerCase()} / Password: ${standardPassword})`);
      } else if (existingUser.role === 'pompist') {
        // Force reset password to 'almohit2026' for all pompists
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash },
        });
        console.log(`Updated password for existing pompist: ${worker.name} (Email: ${email.toLowerCase()} / Password: ${standardPassword})`);
      }
    }
  } catch (error) {
    console.error('Error synchronizing worker accounts:', error);
  }
}
