import '@dotenvx/dotenvx/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Logger } from '@nestjs/common';
import { EtbKategorie, FahrzeugtypKategorie, PrismaClient, QualifikationKategorie } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

  // Kräfte-Management: Stammdaten (Story 2.0) - Junction Table zuerst!
  await prisma.stammPersonQualifikation.deleteMany();
  await prisma.stammPerson.deleteMany();
  await prisma.stammFahrzeug.deleteMany();

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

  // Stammdaten (Story 2.0) - MUSS nach seedKraefteConfig laufen (braucht Fahrzeugtypen + Qualifikationen)
  // MUSS in allen Umgebungen laufen - Stammdaten sind essentielle Entwicklungsdaten
  await seedStammdaten(systemUser.id);

  // Zeichen-Katalog (DV 102) - MUSS in allen Umgebungen laufen
  await seedZeichenKatalog();

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

  // FunkStatus 0-9 nach DIN 14610 (Status 0-6: fest definiert, 7-9: regional anpassbar)
  const funkStatusConfig = [
    // DIN 14610 Standard Status (0-6) - nicht editierbar
    { code: 0, standardLabel: 'Betriebsbereit auf Funk', istAlarmierbar: false, farbe: '#00AA00' },
    { code: 1, standardLabel: 'Einsatzbereit über Funk', istAlarmierbar: false, farbe: '#00AA00' },
    { code: 2, standardLabel: 'Einsatzbereit auf Wache', istAlarmierbar: false, farbe: '#00AA00' },
    { code: 3, standardLabel: 'Einsatzübernahme', istAlarmierbar: false, farbe: '#FFFF00' },
    { code: 4, standardLabel: 'Ankunft Einsatzstelle', istAlarmierbar: false, farbe: '#FF0000' },
    { code: 5, standardLabel: 'Sprechwunsch', istAlarmierbar: false, farbe: '#0000FF' },
    { code: 6, standardLabel: 'Nicht einsatzbereit', istAlarmierbar: false, farbe: '#808080' },
    // Regional anpassbare Status (7-9) - editierbar (customLabel, farbe)
    { code: 7, standardLabel: 'Patient aufgenommen', istAlarmierbar: true, farbe: '#FFFF00' },
    { code: 8, standardLabel: 'Ankunft Krankenhaus', istAlarmierbar: false, farbe: '#FF0000' },
    { code: 9, standardLabel: 'Handquittung', istAlarmierbar: false, farbe: '#FF0000' },
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

/**
 * Erstellt Stammdaten für Fahrzeuge und Personen.
 * Nutzt Upsert-Pattern für Idempotenz bei mehrfacher Ausführung.
 * MUSS in allen Umgebungen laufen - Stammdaten sind essentielle Entwicklungsdaten.
 *
 * @param systemUserId - User ID für Audit-Trail (createdBy)
 */
async function seedStammdaten(systemUserId: string): Promise<void> {
  logger.log('Creating Stammdaten (Fahrzeuge & Personen)...');

  // Erst Fahrzeugtypen laden (für FK)
  const rtw = await prisma.fahrzeugtyp.findUnique({ where: { code: 'RTW' } });
  const ktw = await prisma.fahrzeugtyp.findUnique({ where: { code: 'KTW' } });
  const nef = await prisma.fahrzeugtyp.findUnique({ where: { code: 'NEF' } });

  if (!rtw || !ktw || !nef) {
    logger.warn('Fahrzeugtypen nicht gefunden - überspringe Stammdaten-Seed');
    return;
  }

  // Standard-Fahrzeuge für Entwicklung
  const fahrzeuge = [
    { funkrufname: 'Rotkreuz 83/1', rufname: 'RTW 1', fahrzeugtypId: rtw.id, kennzeichen: 'DA-RK 101', baujahr: 2022 },
    { funkrufname: 'Rotkreuz 83/2', rufname: 'RTW 2', fahrzeugtypId: rtw.id, kennzeichen: 'DA-RK 102', baujahr: 2021 },
    { funkrufname: 'Rotkreuz 83/11', rufname: 'KTW 1', fahrzeugtypId: ktw.id, kennzeichen: 'DA-RK 111', baujahr: 2020 },
    { funkrufname: 'Rotkreuz 83/82', rufname: 'NEF 1', fahrzeugtypId: nef.id, kennzeichen: 'DA-RK 182', baujahr: 2023 },
  ];

  for (const f of fahrzeuge) {
    await prisma.stammFahrzeug.upsert({
      where: { funkrufname: f.funkrufname },
      create: { ...f, createdBy: systemUserId },
      update: {}, // Keine Updates bei existierenden Einträgen
    });
  }
  logger.log(`Created ${fahrzeuge.length} Stamm-Fahrzeuge`);

  // Qualifikationen laden für M:N
  const notsan = await prisma.qualifikation.findUnique({ where: { abkuerzung: 'NotSan' } });
  const rs = await prisma.qualifikation.findUnique({ where: { abkuerzung: 'RS' } });
  const gf = await prisma.qualifikation.findUnique({ where: { abkuerzung: 'GF' } });

  if (!notsan || !rs || !gf) {
    logger.warn('Qualifikationen nicht gefunden - überspringe Personen-Seed');
    return;
  }

  // Standard-Personen für Entwicklung
  const personen = [
    { personalnummer: 'P-001', vorname: 'Max', nachname: 'Mustermann', qualifikationIds: [notsan.id, gf.id] },
    { personalnummer: 'P-002', vorname: 'Erika', nachname: 'Musterfrau', qualifikationIds: [notsan.id] },
    { personalnummer: 'P-003', vorname: 'Hans', nachname: 'Sanitäter', qualifikationIds: [rs.id] },
  ];

  for (const p of personen) {
    const { qualifikationIds, ...personData } = p;

    // Person upsert
    const person = await prisma.stammPerson.upsert({
      where: { personalnummer: p.personalnummer },
      create: { ...personData, createdBy: systemUserId },
      update: {},
    });

    // Qualifikationen zuweisen (nur wenn Person neu erstellt)
    // Bei Upsert prüfen wir ob Qualifikationen bereits existieren
    for (const qualifikationId of qualifikationIds) {
      await prisma.stammPersonQualifikation.upsert({
        where: {
          personId_qualifikationId: {
            personId: person.id,
            qualifikationId,
          },
        },
        create: {
          personId: person.id,
          qualifikationId,
          createdBy: systemUserId,
        },
        update: {},
      });
    }
  }
  logger.log(`Created ${personen.length} Stamm-Personen mit Qualifikationen`);

  logger.log('Stammdaten Seed completed');
}

/**
 * Erstellt den Zeichen-Katalog nach DV 102.
 * Löscht alle Standard-Einträge und erstellt sie neu (Idempotenz).
 */
async function seedZeichenKatalog(): Promise<void> {
  logger.log('Erstelle Zeichen-Katalog (DV 102)...');

  // Bestehende Standard-Einträge löschen für Idempotenz
  await prisma.zeichenKatalogEintrag.deleteMany({ where: { istStandard: true } });

  const katalogEintraege = [
    // FUEHRUNG
    { name: 'Einsatzleitung', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', fachaufgabe: 'fuehrung' }, tags: ['el', 'einsatzleitung', 'führung'], sortOrder: 1 },
    {
      name: 'Einsatzleitung Feuerwehr',
      kategorie: 'FUEHRUNG',
      zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'feuerwehr', fachaufgabe: 'fuehrung' },
      tags: ['el', 'feuerwehr'],
      sortOrder: 2,
    },
    { name: 'Einsatzleitung THW', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'thw', fachaufgabe: 'fuehrung' }, tags: ['el', 'thw'], sortOrder: 3 },
    {
      name: 'Einsatzabschnittsleitung',
      kategorie: 'FUEHRUNG',
      zeichenDefinition: { grundzeichen: 'befehlsstelle', fachaufgabe: 'fuehrung', einheit: 'zug' },
      tags: ['eal', 'abschnitt'],
      sortOrder: 4,
    },

    // EINHEITEN
    {
      name: 'Löschzug Feuerwehr',
      kategorie: 'EINHEITEN',
      zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'zug' },
      tags: ['lz', 'löschzug', 'feuerwehr'],
      sortOrder: 10,
    },
    {
      name: 'Löschgruppe Feuerwehr',
      kategorie: 'EINHEITEN',
      zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'gruppe' },
      tags: ['lg', 'löschgruppe'],
      sortOrder: 11,
    },
    {
      name: 'Bergungsgruppe THW',
      kategorie: 'EINHEITEN',
      zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'bergung', einheit: 'gruppe' },
      tags: ['b', 'bergung', 'thw'],
      sortOrder: 12,
    },
    {
      name: 'SEG Rettung',
      kategorie: 'EINHEITEN',
      zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'gruppe' },
      tags: ['seg', 'rettung'],
      sortOrder: 13,
    },
    {
      name: 'SEG Betreuung',
      kategorie: 'EINHEITEN',
      zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'gruppe' },
      tags: ['seg', 'betreuung'],
      sortOrder: 14,
    },

    // FAHRZEUGE
    {
      name: 'ELW 1',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'fuehrung' },
      tags: ['elw', 'einsatzleitwagen'],
      sortOrder: 20,
    },
    {
      name: 'ELW 2',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'fuehrung', einheit: 'zug' },
      tags: ['elw2'],
      sortOrder: 21,
    },
    {
      name: 'RTW',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen' },
      tags: ['rtw', 'rettungswagen'],
      sortOrder: 22,
    },
    {
      name: 'KTW',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport' },
      tags: ['ktw', 'krankentransport'],
      sortOrder: 23,
    },
    {
      name: 'LF 20',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung' },
      tags: ['lf', 'löschfahrzeug'],
      sortOrder: 24,
    },
    {
      name: 'GKW THW',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'thw', fachaufgabe: 'bergung' },
      tags: ['gkw', 'gerätekraftwagen', 'thw'],
      sortOrder: 25,
    },

    // GEFAHREN
    { name: 'Brandstelle', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'brandbekaempfung' }, tags: ['brand', 'feuer', 'gefahr'], sortOrder: 30 },
    { name: 'Gefahrstoff', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abc' }, tags: ['gefahrstoff', 'abc', 'cbrn'], sortOrder: 31 },
    { name: 'Einsturzgefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'bergung' }, tags: ['einsturz', 'gebäude'], sortOrder: 32 },
    {
      name: 'Überflutung',
      kategorie: 'GEFAHREN',
      zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abwehr-wassergefahren' },
      tags: ['wasser', 'überflutung', 'hochwasser'],
      sortOrder: 33,
    },

    // VERSORGUNG
    {
      name: 'Behandlungsplatz',
      kategorie: 'VERSORGUNG',
      zeichenDefinition: { grundzeichen: 'stelle', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' },
      tags: ['bhp', 'behandlungsplatz', 'sanität'],
      sortOrder: 40,
    },
    { name: 'Bereitstellungsraum', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'logistik' }, tags: ['br', 'bereitstellungsraum'], sortOrder: 41 },
    { name: 'Sammelstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'betreuung' }, tags: ['sammelstelle', 'sammelpunkt'], sortOrder: 42 },
    { name: 'Verpflegungsstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'verpflegung' }, tags: ['verpflegung', 'essen'], sortOrder: 43 },
    { name: 'Hubschrauberlandeplatz', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'transport' }, tags: ['hubschrauber', 'landeplatz', 'rth'], sortOrder: 44 },

    // INFRASTRUKTUR
    {
      name: 'Wasserentnahmestelle',
      kategorie: 'INFRASTRUKTUR',
      zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'wasserversorgung' },
      tags: ['wasser', 'entnahme', 'hydrant'],
      sortOrder: 50,
    },
    {
      name: 'Stromversorgung',
      kategorie: 'INFRASTRUKTUR',
      zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'versorgung-elektrizitaet' },
      tags: ['strom', 'elektrizität', 'nea'],
      sortOrder: 51,
    },
    { name: 'Beleuchtung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'beleuchtung' }, tags: ['licht', 'beleuchtung'], sortOrder: 52 },
    { name: 'IuK-Stelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'iuk' }, tags: ['iuk', 'funk', 'kommunikation'], sortOrder: 53 },
  ];

  await prisma.zeichenKatalogEintrag.createMany({
    data: katalogEintraege.map((e) => ({
      name: e.name,
      kategorie: e.kategorie,
      zeichenDefinition: e.zeichenDefinition,
      tags: e.tags,
      sortOrder: e.sortOrder,
      istStandard: true,
    })),
  });

  logger.log(`${katalogEintraege.length} Zeichen-Katalog-Einträge erstellt`);
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
