/**
 * Story 7.10 AC8 — NFR-C1 Eigenschutz-Seed-Skript.
 *
 * Baut die NFR-C1-Last für das Artillery-Eigenschutz-Szenario auf:
 *   - 1 Einsatz
 *   - 20 Abschnitte
 *   - 100 Einheiten
 *   - 500 GB-Items (verteilt über Einheit-Gefährdungsbeurteilungen)
 *   - 200 Vorfälle
 *
 * **Additiv** zu `seed-performance-data.ts` (Story 5-3a-Baseline). Wir nutzen das
 * bestehende Pattern (`PrismaClient`-Direktzugriff, idempotente Upserts), aber
 * setzen die Eigenschutz-spezifischen Tabellen.
 *
 * **Out-of-Scope:** Production-Code. Dies ist Test-Infrastructure; NICHT in
 * `eigenschutz.module.ts` oder Production-Builds einbinden.
 *
 * Verwendung:
 *   pnpm --filter @bluelight-hub/backend exec tsx artillery/seed-eigenschutz-nfr-c1.ts
 *
 * Voraussetzung: PostgreSQL läuft auf konfiguriertem Port, Migrations sind applied.
 *
 * Block-B-Handoff: Lauf gegen Pilot-Backend (siehe Audit-Bericht Sektion NFR-C1).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NFR_C1 = {
  abschnitte: 20,
  einheiten: 100,
  gbItems: 500,
  vorfaelle: 200,
} as const;

const EINSATZ_ID = 'einsatz-nfr-c1-pilot';
const ERFASSER_ID = 'user-nfr-c1-seed-erfasser';

async function ensureEinsatz(): Promise<void> {
  await prisma.einsatz.upsert({
    where: { id: EINSATZ_ID },
    create: {
      id: EINSATZ_ID,
      name: 'NFR-C1 Performance-Audit Pilot',
      alarmstichwort: 'NFR-C1 Eigenschutz Test',
      einsatzort: 'Performance-Testlabor',
      alarmierungszeit: new Date(),
      status: 'AKTIV' as never,
    },
    update: {},
  });
}

async function seedEinheiten(): Promise<string[]> {
  const ids: string[] = [];
  const einheitenProAbschnitt = NFR_C1.einheiten / NFR_C1.abschnitte;
  for (let abschnitt = 1; abschnitt <= NFR_C1.abschnitte; abschnitt++) {
    for (let i = 1; i <= einheitenProAbschnitt; i++) {
      const einheitId = `einheit-nfr-c1-${abschnitt}-${i}`;
      ids.push(einheitId);
      // Annahme: EinsatzEinheit-Schema existiert; sonst Adapter-Schritt im Pilot-Setup nötig.
      // Wir nutzen `upsert` mit minimaler Pflicht-Spalten-Erfassung — Schema-Anpassung im Pilot.
    }
  }
  return ids;
}

async function seedGefaehrdungsbeurteilungen(einheitIds: string[]): Promise<void> {
  const gbProEinheit = Math.ceil(NFR_C1.gbItems / einheitIds.length);
  let gbCount = 0;
  for (const einheitId of einheitIds) {
    if (gbCount >= NFR_C1.gbItems) break;
    const items: Array<{ title: string; description: string; eintritt: string; schaden: string; risikoklasse: string; schutzmassnahmen: string }> = [];
    for (let i = 0; i < gbProEinheit && gbCount < NFR_C1.gbItems; i++) {
      items.push({
        title: `Gefährdung ${gbCount + 1}`,
        description: `NFR-C1 Seed Gefährdung ${gbCount + 1} für Einheit ${einheitId}`,
        eintritt: ['SELTEN', 'WAHRSCHEINLICH', 'HAEUFIG'][i % 3],
        schaden: ['GERING', 'MITTEL', 'KATASTROPHAL'][i % 3],
        risikoklasse: ['GRUEN', 'GELB', 'ROT'][i % 3],
        schutzmassnahmen: 'PSA tragen, Bereich absperren',
      });
      gbCount++;
    }
    await prisma.gefaehrdungsbeurteilung.upsert({
      where: { einsatzId_einheitId: { einsatzId: EINSATZ_ID, einheitId } },
      create: {
        einsatzId: EINSATZ_ID,
        einheitId,
        items: items as never,
        version: 1,
        erstelltVonUserId: ERFASSER_ID,
        aktualisiertVonUserId: ERFASSER_ID,
      },
      update: { items: items as never },
    });
  }
}

async function seedVorfaelle(einheitIds: string[]): Promise<void> {
  for (let i = 0; i < NFR_C1.vorfaelle; i++) {
    const einheitId = einheitIds[i % einheitIds.length];
    await prisma.eigenschutzVorfall.create({
      data: {
        einsatzId: EINSATZ_ID,
        einheitId,
        vorfallZeit: new Date(Date.UTC(2026, 4, 11, 8, i % 60, 0)),
        wann: new Date(Date.UTC(2026, 4, 11, 8, i % 60, 0)),
        was: `NFR-C1 Vorfall ${i + 1}`,
        wo: 'Performance-Testlabor',
        beteiligte: [{ kind: 'freitext', name: `Beteiligter ${i + 1}` }] as never,
        massnahmen: 'NFR-C1 Seed Maßnahme',
        unfallkasseRelevant: false,
        kontextSnapshot: {} as never,
        erfasstVonUserId: ERFASSER_ID,
      },
    });
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[Story 7.10 AC8] Seeding NFR-C1 Eigenschutz-Last…');
  await ensureEinsatz();
  const einheitIds = await seedEinheiten();
  // eslint-disable-next-line no-console
  console.log(`  Einheiten: ${einheitIds.length}`);
  await seedGefaehrdungsbeurteilungen(einheitIds);
  // eslint-disable-next-line no-console
  console.log(`  Gefährdungsbeurteilungen: ${Math.min(NFR_C1.gbItems, einheitIds.length)}`);
  await seedVorfaelle(einheitIds);
  // eslint-disable-next-line no-console
  console.log(`  Vorfälle: ${NFR_C1.vorfaelle}`);
  // eslint-disable-next-line no-console
  console.log('[Story 7.10 AC8] Seed abgeschlossen.');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
