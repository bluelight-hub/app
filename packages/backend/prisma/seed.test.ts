import { PrismaClient, UserRole } from '@prisma/client';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const logger = new Logger('TestSeed');

async function main() {
  logger.log('Starting test seed...');

  // Bereinige alle Benutzer
  await prisma.user.deleteMany();
  logger.log('Cleared all users');

  // Hash passwords
  const hashedPassword = await bcrypt.hash('Test123!', 10);

  // Erstelle Test-Benutzer
  const testUsers = [
    {
      username: 'testadmin',
      password: hashedPassword,
      email: 'admin@test.local',
      isFirstUser: true,
      role: UserRole.SUPER_ADMIN,
    },
    {
      username: 'testuser1',
      password: hashedPassword,
      email: 'user1@test.local',
      isFirstUser: false,
      role: UserRole.USER,
    },
    {
      username: 'testuser2',
      password: hashedPassword,
      email: 'user2@test.local',
      isFirstUser: false,
      role: UserRole.USER,
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.create({
      data: userData,
    });
    logger.log(`Created test user: ${user.username} with role: ${user.role}`);
  }

  logger.log('Test seed completed successfully');
}

main()
  .catch((e) => {
    logger.error('Test seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
