import { Logger } from '@nestjs/common';
import { EtbKategorie, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logger = new Logger('Seed');

/**
 * Main function to perform the seeding operation. This includes cleaning up all existing data,
 * creating development seed data for ETB text templates, and ensuring the first registered user becomes SUPER_ADMIN.
 *
 * @return {Promise<void>} Resolves after all seeding operations are completed successfully.
 */
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

    // Erstelle Textbausteine für verschiedene Kategorien (DRK-spezifisch)
    const textbausteine = [
      // ALARMIERUNG
      { kategorie: EtbKategorie.ALARMIERUNG, kurztext: 'Alarmierung MEG', volltext: 'Alarmierung über Meldeempfänger', sortOrder: 1 },
      { kategorie: EtbKategorie.ALARMIERUNG, kurztext: 'Nachalarmierung', volltext: 'Nachalarmierung weiterer Kräfte', sortOrder: 2 },

      // ANKUNFT
      { kategorie: EtbKategorie.ANKUNFT, kurztext: 'Ankunft ES', volltext: 'Ankunft an der Einsatzstelle', sortOrder: 1 },
      { kategorie: EtbKategorie.ANKUNFT, kurztext: 'Bereitstellungsraum', volltext: 'Ankunft am Bereitstellungsraum', sortOrder: 2 },

      // LAGE
      { kategorie: EtbKategorie.LAGE, kurztext: 'Patienten gesichtet', volltext: 'Anzahl Patienten gesichtet und kategorisiert', sortOrder: 1 },
      { kategorie: EtbKategorie.LAGE, kurztext: 'Lage stabil', volltext: 'Lage vor Ort stabil, keine weiteren Verletzten', sortOrder: 2 },
      { kategorie: EtbKategorie.LAGE, kurztext: 'Betreuungsstelle', volltext: 'Betreuungsstelle eingerichtet', sortOrder: 3 },

      // MASSNAHME
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Erstversorgung', volltext: 'Erstversorgung von Verletzten', sortOrder: 1 },
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Transport', volltext: 'Patiententransport ins Krankenhaus', sortOrder: 2 },
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Betreuung', volltext: 'Betreuung von Betroffenen', sortOrder: 3 },
      { kategorie: EtbKategorie.MASSNAHME, kurztext: 'Verpflegung', volltext: 'Verpflegung ausgegeben', sortOrder: 4 },

      // PERSONAL
      { kategorie: EtbKategorie.PERSONAL, kurztext: 'EL übernommen', volltext: 'Einsatzleitung übernommen', sortOrder: 1 },
      { kategorie: EtbKategorie.PERSONAL, kurztext: 'EL übergeben', volltext: 'Einsatzleitung übergeben an', sortOrder: 2 },
      { kategorie: EtbKategorie.PERSONAL, kurztext: 'Helfer eingetroffen', volltext: 'Weitere Helfer eingetroffen', sortOrder: 3 },

      // FAHRZEUG
      { kategorie: EtbKategorie.FAHRZEUG, kurztext: 'KTW eingetroffen', volltext: 'Krankentransportwagen an Einsatzstelle', sortOrder: 1 },
      { kategorie: EtbKategorie.FAHRZEUG, kurztext: 'Fahrzeug abrücken', volltext: 'Fahrzeug rückt ab', sortOrder: 2 },

      // KOMMUNIKATION
      { kategorie: EtbKategorie.KOMMUNIKATION, kurztext: 'Kontakt Leitstelle', volltext: 'Rücksprache mit Leitstelle', sortOrder: 1 },
      { kategorie: EtbKategorie.KOMMUNIKATION, kurztext: 'Kontakt Krankenhaus', volltext: 'Voranmeldung im Krankenhaus', sortOrder: 2 },
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
