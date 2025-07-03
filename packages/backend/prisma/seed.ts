import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { logger } from '../src/logger/consola.logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seed...');

  // Seed User (Admin)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@bluelight-hub.local',
      passwordHash: adminPassword,
      isActive: true,
      rolePermissions: {
        create: [{ permission: 'ALL' }],
      },
    },
  });
  logger.info(`✅ Created admin user: ${adminUser.username}`);

  // Seed example Einsatz (mission/operation)
  const exampleEinsatz = await prisma.einsatz.upsert({
    where: { einsatzNummer: 'E2025-001' },
    update: {},
    create: {
      einsatzNummer: 'E2025-001',
      stichwort: 'B3 - Brand Wohngebäude',
      einsatzort: 'Musterstraße 123, 12345 Musterstadt',
      beschreibung: 'Brand im Dachgeschoss eines Mehrfamilienhauses',
      alarmierungszeit: new Date('2025-01-15T14:30:00Z'),
      endzeit: new Date('2025-01-15T16:45:00Z'),
    },
  });
  logger.info(`✅ Created example Einsatz: ${exampleEinsatz.einsatzNummer}`);

  logger.info('🌱 Database seeding completed!');
}

main()
  .catch((e) => {
    logger.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
