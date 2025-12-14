import { Logger } from '@nestjs/common';
import { EtbKategorie, FahrzeugtypKategorie, PrismaClient, QualifikationKategorie } from '@prisma/client';

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

  // Kräfte-Management: Admin-Konfiguration (Story 1.0)
  await prisma.rolleQualifikation.deleteMany();
  await prisma.rollenDefinition.deleteMany();
  await prisma.qualifikation.deleteMany();
  await prisma.fahrzeugtyp.deleteMany();
  await prisma.funkStatusConfig.deleteMany();

  await prisma.user.deleteMany();
  logger.log('Cleared all data');

  // Keine Default-User – erster registrierter Nutzer erhält automatisch die Rolle SUPER_ADMIN
  logger.log('No default users created. First registered user will become SUPER_ADMIN.');

  // SYSTEM-User für Seed-Daten (wird für Audit-Trail benötigt)
  // Dieser User ist in allen Umgebungen notwendig für die Kräfte-Basiskonfiguration
  const systemUser = await prisma.user.upsert({
    where: { username: 'SYSTEM' },
    create: {
      username: 'SYSTEM',
      role: 'SUPER_ADMIN',
      isActive: false, // SYSTEM-User kann sich nicht einloggen
    },
    update: {},
  });

  // Kräfte-Management Basis-Konfiguration (Story 1.0)
  // MUSS in allen Umgebungen laufen - dies sind essentielle Stammdaten
  await seedKraefteConfig(systemUser.id);

  // Erstelle ETB Textbausteine NUR für Entwicklung
  if (process.env.NODE_ENV === 'development') {
    logger.log('Creating development seed data for ETB...');

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
          createdBy: systemUser.id,
        },
      });
    }

    logger.log(`Created ${textbausteine.length} ETB text templates`);
  }
}

/**
 * Erstellt Kräfte-Management Konfigurationsdaten.
 * Nutzt Upsert-Pattern für Idempotenz bei mehrfacher Ausführung.
 *
 * @param systemUserId - User ID für Audit-Trail (createdBy)
 */
async function seedKraefteConfig(systemUserId: string): Promise<void> {
  logger.log('Creating Kräfte configuration...');

  // Standard-Qualifikationen (DRK/Rettungsdienst)
  const qualifikationen = [
    { abkuerzung: 'RS', name: 'Rettungssanitäter', kategorie: QualifikationKategorie.SANITAET, sortOrder: 1 },
    { abkuerzung: 'NotSan', name: 'Notfallsanitäter', kategorie: QualifikationKategorie.SANITAET, sortOrder: 2 },
    { abkuerzung: 'NA', name: 'Notarzt', kategorie: QualifikationKategorie.SANITAET, sortOrder: 3 },
    { abkuerzung: 'RH', name: 'Rettungshelfer', kategorie: QualifikationKategorie.SANITAET, sortOrder: 4 },
    { abkuerzung: 'GF', name: 'Gruppenführer', kategorie: QualifikationKategorie.FUEHRUNG, sortOrder: 10 },
    { abkuerzung: 'ZF', name: 'Zugführer', kategorie: QualifikationKategorie.FUEHRUNG, sortOrder: 11 },
    { abkuerzung: 'VF', name: 'Verbandsführer', kategorie: QualifikationKategorie.FUEHRUNG, sortOrder: 12 },
  ];

  for (const q of qualifikationen) {
    await prisma.qualifikation.upsert({
      where: { abkuerzung: q.abkuerzung },
      create: { ...q, createdBy: systemUserId },
      update: {}, // Keine Updates bei existierenden Einträgen
    });
  }
  logger.log(`Created ${qualifikationen.length} Qualifikationen`);

  // Standard-Fahrzeugtypen (DIN EN 1789)
  const fahrzeugtypen = [
    { code: 'RTW', bezeichnung: 'Rettungswagen', kategorie: FahrzeugtypKategorie.RETTUNGSDIENST, sollbesatzung: { fahrer: 1, sanitaeter: 1 }, sortOrder: 1 },
    { code: 'KTW', bezeichnung: 'Krankentransportwagen', kategorie: FahrzeugtypKategorie.RETTUNGSDIENST, sollbesatzung: { fahrer: 1, sanitaeter: 1 }, sortOrder: 2 },
    { code: 'NEF', bezeichnung: 'Notarzteinsatzfahrzeug', kategorie: FahrzeugtypKategorie.RETTUNGSDIENST, sollbesatzung: { fahrer: 1, notarzt: 1 }, sortOrder: 3 },
    { code: 'NAW', bezeichnung: 'Notarztwagen', kategorie: FahrzeugtypKategorie.RETTUNGSDIENST, sollbesatzung: { fahrer: 1, sanitaeter: 1, notarzt: 1 }, sortOrder: 4 },
    { code: 'ELW', bezeichnung: 'Einsatzleitwagen', kategorie: FahrzeugtypKategorie.FUEHRUNG, sollbesatzung: { fahrer: 1, funktrupp: 2 }, sortOrder: 10 },
    { code: 'MTW', bezeichnung: 'Mannschaftstransportwagen', kategorie: FahrzeugtypKategorie.TRANSPORT, sollbesatzung: { fahrer: 1 }, sortOrder: 20 },
  ];

  for (const f of fahrzeugtypen) {
    await prisma.fahrzeugtyp.upsert({
      where: { code: f.code },
      create: { ...f, createdBy: systemUserId },
      update: {},
    });
  }
  logger.log(`Created ${fahrzeugtypen.length} Fahrzeugtypen`);

  // Standard-Rollen (DRK Führungsstruktur)
  const rollenDefinitionen = [
    { name: 'Leitender Notarzt', funkrufname: 'LNA', sortOrder: 1 },
    { name: 'Organisatorischer Leiter Rettungsdienst', funkrufname: 'OrgL', sortOrder: 2 },
    { name: 'Leiter Behandlungsplatz', funkrufname: 'Leiter BHP', sortOrder: 3 },
    { name: 'Einsatzleiter', funkrufname: 'EL', sortOrder: 4 },
    { name: 'Zugführer', funkrufname: 'ZF', sortOrder: 5 },
    { name: 'Gruppenführer', funkrufname: 'GF', sortOrder: 10 },
  ];

  for (const r of rollenDefinitionen) {
    await prisma.rollenDefinition.upsert({
      where: { name: r.name },
      create: { ...r, createdBy: systemUserId },
      update: {},
    });
  }
  logger.log(`Created ${rollenDefinitionen.length} Rollen-Definitionen`);

  // FunkStatus 0-9 nach DIN (7-9 regional anpassbar)
  const funkStatusConfig = [
    { code: 0, standardLabel: 'Betriebsbereit auf Funk', istAlarmierbar: true, farbe: '#22C55E' },
    { code: 1, standardLabel: 'Einsatzbereit über Funk', istAlarmierbar: true, farbe: '#22C55E' },
    { code: 2, standardLabel: 'Einsatzbereit auf Wache', istAlarmierbar: true, farbe: '#22C55E' },
    { code: 3, standardLabel: 'Einsatzübernahme', istAlarmierbar: false, farbe: '#3B82F6' },
    { code: 4, standardLabel: 'Ankunft Einsatzstelle', istAlarmierbar: false, farbe: '#3B82F6' },
    { code: 5, standardLabel: 'Sprechwunsch', istAlarmierbar: false, farbe: '#F59E0B' },
    { code: 6, standardLabel: 'Nicht einsatzbereit', istAlarmierbar: false, farbe: '#EF4444' },
    { code: 7, standardLabel: 'Patient aufgenommen', istAlarmierbar: false, farbe: '#8B5CF6' },
    { code: 8, standardLabel: 'Ankunft Krankenhaus', istAlarmierbar: false, farbe: '#8B5CF6' },
    { code: 9, standardLabel: 'Handquittung', istAlarmierbar: false, farbe: '#6B7280' },
  ];

  for (const s of funkStatusConfig) {
    await prisma.funkStatusConfig.upsert({
      where: { code: s.code },
      create: { ...s, createdBy: systemUserId },
      update: {},
    });
  }
  logger.log(`Created ${funkStatusConfig.length} FunkStatus-Konfigurationen`);

  logger.log('Kräfte-Config Seed completed');
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
