import '@dotenvx/dotenvx/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Logger } from '@nestjs/common';
import { EinsatzEinheitTyp, Eintrittswahrscheinlichkeit, EtbKategorie, FahrzeugtypKategorie, PrismaClient, QualifikationKategorie, Schadensausmass } from '../src/generated/prisma/client';

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

  // Eigenschutz-Modul Stammdaten (Issue #415, Story 1.4)
  // Eigenschutz: Seeds sind Stammdaten (Vorlagen + Rollen), keine Dev-Daten.
  // Kein deleteMany nötig, solange keine Dev-Daten auf Eigenschutz-FKs referenzieren.
  await seedEigenschutzConfig(systemUser.id);

  // Stammdaten (Story 2.0) - MUSS nach seedKraefteConfig laufen (braucht Fahrzeugtypen + Qualifikationen)
  // MUSS in allen Umgebungen laufen - Stammdaten sind essentielle Entwicklungsdaten
  await seedStammdaten(systemUser.id);

  // Zeichen-Katalog (DV 102) - MUSS in allen Umgebungen laufen
  await seedZeichenKatalog();

  // Default-Zeichen für Fahrzeugtypen und Einheitentypen - MUSS nach seedKraefteConfig laufen
  await seedZeichenDefaults();

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
 * Erstellt Eigenschutz-Stammdaten (Issue #415, Story 1.4).
 *
 * Seed-Inhalt:
 * 1. 4 RollenDefinitionen mit Präfix `Eigenschutz: ` für EinsatzScopeGuard + EigenschutzRolleGuard
 * 2. 5 GefaehrdungsbeurteilungVorlagen für die MVP-Szenarien (MANV, VU, Großveranstaltung, Betreuung, CBRN)
 *
 * Beide nutzen das Upsert-Pattern für Idempotenz bei mehrfacher Ausführung.
 *
 * ⚠️ WICHTIG — Beispielcharakter der Vorlagen:
 * Die 5 Gefährdungsbeurteilungs-Vorlagen enthalten fachlich formulierte Handlungsanweisungen
 * (PSNV-Einsatznachsorge, Dekon-Schnittstellen, HV-Batterie-Warnungen, Bindemittel bei Säure-Austritt).
 * Diese Inhalte sind an DIN/DGUV/TRBS-Vokabular angelehnt, aber NICHT durch einen
 * Sicherheitsbeauftragten (SiBe) einer konkreten Organisation fachlich freigegeben.
 * Vor produktivem Einsatz MÜSSEN die Vorlagen durch den SiBe der einsetzenden
 * Hilfsorganisation (DRK/JUH/MHD/ASB/DLRG) geprüft und ggf. angepasst werden.
 *
 * @param systemUserId - User ID für Audit-Trail (createdBy / erstelltVonUserId)
 */
async function seedEigenschutzConfig(systemUserId: string): Promise<void> {
  logger.log('Creating Eigenschutz-Stammdaten (Issue #415)...');
  logger.warn('Eigenschutz-Vorlagen: Beispielinhalte — vor produktivem Einsatz durch SiBe fachlich freigeben.');

  // --- 4 Eigenschutz-RollenDefinitionen (AC5) ---
  // Präfix `Eigenschutz: ` ist Pflicht für das Regex-Matching im EigenschutzRolleGuard (Story 1.5).
  // sortOrder ≥ 100 trennt Eigenschutz-Rollen visuell von den Kräfte-Führungsrollen (1–10).
  const eigenschutzRollen = [
    {
      name: 'Eigenschutz: Sicherheitsbeauftragter',
      funkrufname: 'SiBe',
      beschreibung: 'Verantwortlich für Gefährdungsbeurteilung, PSA-Profile, Sicherheitsregeln und Sicherungsposten im Einsatz (FR44–FR46, Eigenschutz-Pilot)',
      sortOrder: 100,
    },
    {
      name: 'Eigenschutz: Abschnittsleiter',
      funkrufname: 'EALtr',
      beschreibung: 'Empfängt kritische Bekanntgaben (PSA, Sicherheitsregeln) und quittiert für seinen Abschnitt (FR18, FR25)',
      sortOrder: 101,
    },
    {
      name: 'Eigenschutz: Einheitsführer',
      funkrufname: 'EF',
      beschreibung: 'Empfängt Bekanntgaben auf Einheits-Ebene und meldet Ausrüstungslücken zurück (FR20, Phase 2: FR21)',
      sortOrder: 102,
    },
    {
      name: 'Eigenschutz: Nachbereitung',
      funkrufname: 'Nachber.',
      beschreibung: 'Filtert Vorfälle und exportiert Unfallkassen-Meldungen (FR31–FR36, FR47)',
      sortOrder: 103,
    },
  ];

  for (const r of eigenschutzRollen) {
    await prisma.rollenDefinition.upsert({
      where: { name: r.name },
      create: { ...r, createdBy: systemUserId },
      update: {},
    });
  }
  logger.log(`Created ${eigenschutzRollen.length} Eigenschutz-RollenDefinitionen`);

  // --- 5 GefaehrdungsbeurteilungVorlagen (AC6) ---
  // Items werden in Story 2.1 deep-kopiert (Item-Kopie, kein Live-Link → PRD-Mitigation „Vorlagen-Drift").
  // Inhaltlich realistische Gefährdungen für weiße Hilfsorganisationen (DRK/JUH/MHD/ASB/DLRG).
  const vorlagen = [
    {
      slug: 'manv',
      name: 'MANV — Massenanfall von Verletzten',
      szenario: 'MANV',
      items: [
        {
          title: 'Eigenverletzung durch spitze/scharfe Gegenstände',
          description: 'An Schadensstellen (Glas, Metallsplitter, medizinische Kanülen) besteht erhöhtes Risiko für Schnitt- und Stichverletzungen während Triage und Erstversorgung.',
          eintritt: Eintrittswahrscheinlichkeit.HAEUFIG,
          schaden: Schadensausmass.GERING,
          schutzmassnahmen: 'Schnittschutz-Handschuhe tragen, Kanülen sofort sicher entsorgen, unübersichtliches Gelände mit Flutlicht ausleuchten.',
        },
        {
          title: 'Infektionsrisiko durch Blut und Körperflüssigkeiten',
          description: 'Bei Sichtung und Behandlung zahlreicher Patienten kommen Einsatzkräfte mit Blut, Speichel, Erbrochenem und Wundsekreten in Kontakt (Hepatitis-, HIV-Risiko).',
          eintritt: Eintrittswahrscheinlichkeit.HAEUFIG,
          schaden: Schadensausmass.MITTEL,
          schutzmassnahmen: 'Einmalhandschuhe bei jedem Patienten wechseln, Schutzbrille bei Spritzrisiko, Impfstatus Hepatitis-B prüfen, Meldekette für Nadelstich-Verletzungen klären.',
        },
        {
          title: 'Psychische Belastung durch Triage-Entscheidungen',
          description: 'Sichtungskategorie IV (abwartende Behandlung) bei überlebensfähigen Patienten belastet Einsatzkräfte langfristig; Risiko für akute Belastungsreaktionen und PTBS.',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.HOCH,
          schutzmassnahmen: 'PSNV-Einsatznachsorge verpflichtend anbieten, Partnerarbeit statt Alleinentscheidung, regelmäßige Ablösung nach 30–45 min an der Sichtungsstelle.',
        },
      ],
    },
    {
      slug: 'vu-patientenversorgung',
      name: 'VU — Verkehrsunfall-Patientenversorgung',
      szenario: 'Verkehrsunfall',
      items: [
        {
          title: 'Fließender Verkehr an der Unfallstelle',
          description: 'Unfallstelle ist nicht vollständig gesperrt; anrauschende Fahrzeuge gefährden Einsatzkräfte auf der Fahrbahn, insbesondere bei schlechter Sicht, Nässe oder Nacht.',
          eintritt: Eintrittswahrscheinlichkeit.HAEUFIG,
          schaden: Schadensausmass.KATASTROPHAL,
          schutzmassnahmen:
            'Warnweste der Klasse 3 pflicht, Absperrung mit Warndreieck/Verkehrsleitkegel stromaufwärts, Polizei zur Fahrbahnsperrung anfordern, niemals mit dem Rücken zum fließenden Verkehr arbeiten.',
        },
        {
          title: 'Treibstoff- und Betriebsmittel-Austritt',
          description: 'Aus beschädigten Tanks, Leitungen oder Batterien treten Kraftstoffe, Öle oder Säure aus. Rutsch-, Brand- und Inhalationsgefahr.',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.HOCH,
          schutzmassnahmen:
            'Gefahrenbereich absichern lassen, Zündquellen fernhalten (kein offenes Licht direkt am Fahrzeug), Bindemittel bereithalten, bei Säure-Kontakt sofort spülen und Betroffene aus dem unmittelbaren Gefahrenbereich führen.',
        },
        {
          title: 'Hochvolt-Risiko bei Elektro- und Hybrid-Fahrzeugen',
          description:
            'Beschädigte HV-Batterien (400–800 V DC) können Einsatzkräfte durch Berührungsspannung tödlich verletzen; thermisches Durchgehen (Thermal Runaway) mit toxischen Rauchgasen möglich.',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.KATASTROPHAL,
          schutzmassnahmen:
            'Fahrzeug-Typ erkennen (Rettungsdatenblatt), technische Freigabe des Fahrzeugs abwarten, Mindestabstand zu beschädigten Batterien halten, bei Rauchentwicklung Bereich sofort räumen und Spezialkräfte anfordern.',
        },
      ],
    },
    {
      slug: 'sanitaetsdienst-grossveranstaltung',
      name: 'Sanitätsdienst-Großveranstaltung',
      szenario: 'Großveranstaltung',
      items: [
        {
          title: 'Menschenmengen-Dynamik (Gedränge, Panik)',
          description:
            'Bei Massen-Events können Dichtephänomene, Paniksituationen oder Fluchtbewegungen entstehen; Einsatzkräfte können im Gedränge erdrückt, getrampelt oder von der Einsatzstelle abgeschnitten werden.',
          eintritt: Eintrittswahrscheinlichkeit.SELTEN,
          schaden: Schadensausmass.KATASTROPHAL,
          schutzmassnahmen:
            'Feste Sanitäts-Standorte mit Fluchtweg planen, permanenter Funkkontakt zur Einsatzleitung, bei kritischer Dichte sofort Rückzug; keine Hilfeleistung im laufenden Gedränge.',
        },
        {
          title: 'Temperatur- und Wetterexposition über Schichtdauer',
          description: 'Lange Standzeiten (8–12 h) bei Hitze, Kälte oder Dauerregen führen zu Hitzschlag, Erschöpfung, Unterkühlung oder Erfrierungen; besonders kritisch bei PSA-Tragezwang.',
          eintritt: Eintrittswahrscheinlichkeit.HAEUFIG,
          schaden: Schadensausmass.MITTEL,
          schutzmassnahmen:
            'Witterungs-angepasste Kleidung, Trink-/Ruhe-Rhythmus 45/15 min, Beschattete/beheizte Ruhepausen, Hitzeschutz-Regel ab 28 °C, Ablösung bei Frühsymptomen Hitzschlag/Hypothermie.',
        },
        {
          title: 'Aggressives oder alkoholisiertes Publikum',
          description: 'Verbale Übergriffe, Bedrohungen und tätliche Angriffe gegen Sanitätspersonal durch enthemmte oder intoxikierte Besucher sind auf Festen regelmäßig zu erwarten.',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.MITTEL,
          schutzmassnahmen:
            'Immer im Team arbeiten (4-Augen-Prinzip), Security/Polizei-Verbindung vor Ort, deeskalierende Gesprächsführung im Einsatzbriefing schulen, Rückzugsraum definiert und gesichert halten.',
        },
      ],
    },
    {
      slug: 'betreuungseinsatz',
      name: 'Betreuungseinsatz',
      szenario: 'Betreuung',
      items: [
        {
          title: 'Psychosoziale Belastung durch Betroffenen-Kontakt',
          description: 'Lange Gespräche mit Angehörigen, Evakuierten und traumatisierten Personen übertragen emotionale Belastung auf Einsatzkräfte; Risiko sekundärer Traumatisierung.',
          eintritt: Eintrittswahrscheinlichkeit.HAEUFIG,
          schaden: Schadensausmass.MITTEL,
          schutzmassnahmen: 'Rotation zwischen Betreuungs- und Back-Office-Aufgaben, PSNV-Einsatznachsorge nach Schicht, klare Pausenregelung, Supervision durch Einsatzleitung.',
        },
        {
          title: 'Hygienerisiken in temporären Unterkünften',
          description:
            'Notunterkünfte (Sporthallen, Zelte) haben eingeschränkte Hygiene-Infrastruktur; Infektionsgefahr durch Tröpfcheninfektion, Kontakt- und Schmierinfektion (Norovirus, Influenza, Läuse).',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.MITTEL,
          schutzmassnahmen:
            'Händedesinfektion vor und nach Betroffenen-Kontakt, FFP2-Maske bei respiratorischen Symptomen, Betroffene mit Infekt-Verdacht isolieren, Schutzkleidung bei Reinigungsarbeiten.',
        },
        {
          title: 'Langdauernde Schichten ohne Ablösung',
          description: 'Betreuungslagen laufen oft über 24–72 h; Übermüdung führt zu reduzierter Urteilsfähigkeit, Fehlentscheidungen und Unfallrisiko bei Fahrten.',
          eintritt: Eintrittswahrscheinlichkeit.HAEUFIG,
          schaden: Schadensausmass.MITTEL,
          schutzmassnahmen: 'Max. 12 h Schichtdauer (Ausnahme dokumentieren), Schlafmöglichkeit sicherstellen, nach >10 h keine Fahrten mehr, Ablöse-Planung vom Schichtbeginn an vorhalten.',
        },
      ],
    },
    {
      slug: 'cbrn-patientenversorgung',
      name: 'CBRN — Patientenversorgung bei Kontamination',
      szenario: 'CBRN',
      items: [
        {
          title: 'Kontamination durch chemische, biologische oder radiologische Stoffe',
          description: 'Kontaminierte Patienten, Flächen und Geräte übertragen Schadstoffe auf Einsatzkräfte; akute Vergiftung, verzögerte Symptome (Strahlung) oder Infektion möglich.',
          eintritt: Eintrittswahrscheinlichkeit.SELTEN,
          schaden: Schadensausmass.KATASTROPHAL,
          schutzmassnahmen:
            'Arbeit ausschließlich in der Weißen Zone nach Dekontamination, kontaminierte Patienten nur über definierte Übergabepunkte übernehmen, Einweg-Schutzkleidung und Chemikalienschutzhandschuhe nutzen, striktes One-Way-Prinzip Schmutz/Sauber einhalten.',
        },
        {
          title: 'Unzureichende Eigen-PSA bei Kontaminationsverdacht',
          description:
            'Schon in der Patientenübernahme nach unklarer oder unvollständiger Dekontamination kann unzureichende Eigen-PSA zu Kontaminationsverschleppung oder Eigenschädigung führen; kritisch sind insbesondere Hautkontakt, Schleimhaut-Exposition und unsaubere Übergänge.',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.KATASTROPHAL,
          schutzmassnahmen:
            'Buddy-Check der Eigenschutz-PSA vor Patientenkontakt, Versorgung nur in freigegebenen Bereichen, Dekon-Status sichtbar dokumentieren, bei unklarer Lage keine Patientenübernahme ohne Rücksprache mit Spezialkräften.',
        },
        {
          title: 'Kreuz-Kontamination zwischen Patienten und Helfern',
          description: 'Unsachgemäßer Patientenkontakt oder Geräte-Wiederverwendung zwischen Zonen schleppt Schadstoffe in saubere Bereiche und kontaminiert Behandlungsplätze und Fahrzeuge.',
          eintritt: Eintrittswahrscheinlichkeit.GELEGENTLICH,
          schaden: Schadensausmass.HOCH,
          schutzmassnahmen:
            'Einweg-Material bevorzugen, kontaminierte Ausrüstung farblich markieren (rot = Schmutz), Dekon-Stufe zwischen Zonen pflichtig, Transport erst nach vollständiger Dekontamination des Patienten und der Trage.',
        },
      ],
    },
  ];

  for (const v of vorlagen) {
    await prisma.gefaehrdungsbeurteilungVorlage.upsert({
      where: { slug: v.slug },
      create: { ...v, erstelltVonUserId: systemUserId },
      update: {},
    });
  }
  logger.log(`Created ${vorlagen.length} Eigenschutz-Vorlagen`);

  logger.log('Eigenschutz-Config Seed completed');
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
 * Nutzt die gleiche Datenquelle wie der Startup-Seeder.
 */
async function seedZeichenKatalog(): Promise<void> {
  logger.log('Erstelle Zeichen-Katalog (DV 102)...');

  // Bestehende Standard-Einträge löschen für Idempotenz
  await prisma.zeichenKatalogEintrag.deleteMany({ where: { istStandard: true } });

  // Importiere Katalog-Daten aus der zentralen Datei
  const { ZEICHEN_KATALOG_STANDARD_EINTRAEGE } = await import('../src/infrastructure/taktische-zeichen/zeichen-katalog-daten');

  await prisma.zeichenKatalogEintrag.createMany({
    data: ZEICHEN_KATALOG_STANDARD_EINTRAEGE.map((e) => ({
      name: e.name,
      kategorie: e.kategorie,
      zeichenDefinition: e.zeichenDefinition as object,
      tags: [...e.tags],
      sortOrder: 0,
      istStandard: true,
    })),
  });

  logger.log(`${ZEICHEN_KATALOG_STANDARD_EINTRAEGE.length} Zeichen-Katalog-Einträge erstellt`);
}

/**
 * Erstellt Default-Zeichen-Definitionen für Fahrzeugtypen und Einheitentypen.
 * Nutzt Upsert-Pattern für Idempotenz bei mehrfacher Ausführung.
 * Läuft nach seedKraefteConfig(), da Fahrzeugtyp-IDs benötigt werden.
 */
async function seedZeichenDefaults(): Promise<void> {
  logger.log('Erstelle Default-Zeichen für Fahrzeugtypen und Einheitentypen...');

  // Default-Zeichen für Fahrzeugtypen (verknüpft mit bestehenden Fahrzeugtypen aus seedKraefteConfig)
  const fahrzeugtypDefaults = [
    {
      code: 'RTW',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen' },
    },
    {
      code: 'KTW',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport' },
    },
    {
      code: 'NEF',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' },
    },
    {
      code: 'NAW',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung', einheit: 'trupp' },
    },
    {
      code: 'ELW',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', fachaufgabe: 'fuehrung' },
    },
    {
      code: 'MTW',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport', einheit: 'trupp' },
    },
  ];

  let fahrzeugtypCount = 0;
  for (const entry of fahrzeugtypDefaults) {
    const fahrzeugtyp = await prisma.fahrzeugtyp.findUnique({ where: { code: entry.code } });
    if (!fahrzeugtyp) {
      logger.warn(`Fahrzeugtyp '${entry.code}' nicht gefunden — Default-Zeichen übersprungen`);
      continue;
    }

    await prisma.fahrzeugtypZeichenDefault.upsert({
      where: { fahrzeugtypId: fahrzeugtyp.id },
      create: {
        fahrzeugtypId: fahrzeugtyp.id,
        zeichenDefinition: entry.zeichenDefinition,
      },
      update: {
        zeichenDefinition: entry.zeichenDefinition,
      },
    });
    fahrzeugtypCount++;
  }
  logger.log(`${fahrzeugtypCount} FahrzeugtypZeichenDefaults erstellt/aktualisiert`);

  // Default-Zeichen für Einheitentypen (feste Enum-Werte, kein FK)
  const einheitentypDefaults: Array<{ einheitentyp: EinsatzEinheitTyp; zeichenDefinition: Record<string, string> }> = [
    { einheitentyp: EinsatzEinheitTyp.TRUPP, zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'trupp' } },
    { einheitentyp: EinsatzEinheitTyp.STAFFEL, zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'staffel' } },
    { einheitentyp: EinsatzEinheitTyp.GRUPPE, zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'gruppe' } },
    { einheitentyp: EinsatzEinheitTyp.ZUG, zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'zug' } },
    { einheitentyp: EinsatzEinheitTyp.ABSCHNITT, zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'bereitschaft' } },
  ];

  for (const entry of einheitentypDefaults) {
    await prisma.einheitentypZeichenDefault.upsert({
      where: { einheitentyp: entry.einheitentyp },
      create: {
        einheitentyp: entry.einheitentyp,
        zeichenDefinition: entry.zeichenDefinition,
      },
      update: {
        zeichenDefinition: entry.zeichenDefinition,
      },
    });
  }
  logger.log(`${einheitentypDefaults.length} EinheitentypZeichenDefaults erstellt/aktualisiert`);

  logger.log('Default-Zeichen Seed completed');
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
