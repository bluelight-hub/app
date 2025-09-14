import { Logger } from '@nestjs/common';
import { PrismaClient, EtbKategorie } from '@prisma/client';

const prisma = new PrismaClient();

const logger = new Logger('Seed');

async function main() {
  logger.log('Starting seed...');

  // Bereinige alle Daten in umgekehrter Reihenfolge der Abhängigkeiten
  await prisma.etbArchiv.deleteMany();
  await prisma.etbTextbaustein.deleteMany();
  await prisma.etbEintragHistorie.deleteMany();
  await prisma.etbEintrag.deleteMany();
  await prisma.einsatztagebuch.deleteMany();
  await prisma.einsatz.deleteMany();
  await prisma.user.deleteMany();
  logger.log('Cleared all data');

  // Keine Default-User – erster registrierter Nutzer erhält automatisch die Rolle SUPER_ADMIN
  logger.log('No default users created. First registered user will become SUPER_ADMIN.');

  // Erstelle ETB Textbausteine für Entwicklung
  if (process.env.NODE_ENV === 'development') {
    logger.log('Creating development seed data for ETB...');

    // Erstelle einen Test-User für Seed-Daten
    const testUser = await prisma.user.create({
      data: {
        username: 'seed-user',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    // Erstelle Textbausteine für verschiedene Kategorien
    const textbausteine = [
      // ALARMIERUNG
      { kategorie: EtbKategorie.ALARMIERUNG, kurztext: 'Sirenenalarm', volltext: 'Alarmierung durch Sirene und Meldeempfänger', sortOrder: 1 },
      { kategorie: EtbKategorie.ALARMIERUNG, kurztext: 'Stille Alarmierung', volltext: 'Stille Alarmierung über Meldeempfänger', sortOrder: 2 },

      // ANKUNFT
      { kategorie: EtbKategorie.ANKUNFT, kurztext: 'Ankunft ES', volltext: 'Ankunft an der Einsatzstelle', sortOrder: 1 },
      { kategorie: EtbKategorie.ANKUNFT, kurztext: 'Sammelplatz', volltext: 'Ankunft am Sammelplatz', sortOrder: 2 },

      // LAGE
      { kategorie: EtbKategorie.LAGE, kurztext: 'Feuer unter Kontrolle', volltext: 'Brand unter Kontrolle, Nachlöscharbeiten laufen', sortOrder: 1 },
      { kategorie: EtbKategorie.LAGE, kurztext: 'Gefahr beseitigt', volltext: 'Gefahr beseitigt, keine weiteren Maßnahmen erforderlich', sortOrder: 2 },

      // MASSNAHME
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Brandbekämpfung', volltext: 'Brandbekämpfung mit C-Rohr im Innenangriff', sortOrder: 1 },
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Wasserversorgung', volltext: 'Wasserversorgung über Hydrant aufgebaut', sortOrder: 2 },
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Atemschutz', volltext: 'Atemschutztrupp eingesetzt', sortOrder: 3 },

      // PERSONAL
      { kategorie: EtbKategorie.PERSONAL, kurztext: 'EL übernommen', volltext: 'Einsatzleitung übernommen', sortOrder: 1 },
      { kategorie: EtbKategorie.PERSONAL, kurztext: 'EL übergeben', volltext: 'Einsatzleitung übergeben an', sortOrder: 2 },

      // FAHRZEUG
      { kategorie: EtbKategorie.FAHRZEUG, kurztext: 'Fzg eingetroffen', volltext: 'Fahrzeug an Einsatzstelle eingetroffen', sortOrder: 1 },
      { kategorie: EtbKategorie.FAHRZEUG, kurztext: 'Fzg abrücken', volltext: 'Fahrzeug rückt ab', sortOrder: 2 },
    ];

    for (const tb of textbausteine) {
      await prisma.etbTextbaustein.create({
        data: {
          ...tb,
          createdBy: testUser.id,
        },
      });
    }

    logger.log(`Created ${textbausteine.length} ETB text templates`);
  }
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
