import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Bereinige alle Benutzer
  await prisma.user.deleteMany();
  console.log('Cleared all users');

  // Keine Default-User – erster registrierter Nutzer erhält automatisch die Rolle SUPER_ADMIN
  console.log('No default users created. First registered user will become SUPER_ADMIN.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
