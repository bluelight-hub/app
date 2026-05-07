import { EigenschutzVorfallPdfRenderer } from '../eigenschutz-vorfall-pdf.renderer';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import { Beteiligter } from '@domain/eigenschutz/value-objects/beteiligter.vo';
import { Wo } from '@domain/eigenschutz/value-objects/wo.vo';
import * as redactModule from '@/shared/utils/pii-redact.util';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui05002';
const VORFALL_ID = 'clw3h8x9y0000qwertyui05010';
const ERFASSER_ID = 'clw3h8x9y0000qwertyui05003';
const CALLER_ID = 'clw3h8x9y0000qwertyui05004';
const NOW = new Date('2026-05-06T10:00:00.000Z');

interface SnapshotOverrides {
  empty?: boolean;
  driftAktivePsaProfile?: unknown;
  gefaehrdungItems?: number;
  psaProfile?: number;
  sicherheitsregeln?: number;
}

function buildSnapshot(overrides: SnapshotOverrides = {}): Record<string, unknown> {
  if (overrides.empty) return {};
  const items = Array.from({ length: overrides.gefaehrdungItems ?? 10 }, (_, i) => ({
    id: `clw3h8x9y0000qwertyui05${String(100 + i).padStart(3, '0')}`,
    title: `Gefährdung ${i + 1}`,
    description: `Beschreibung der Gefährdung ${i + 1}`,
    eintritt: 'HAEUFIG' as const,
    schaden: 'KATASTROPHAL' as const,
    risikoklasse: 'ROT' as const,
    schutzmassnahmen: 'PSA tragen, Bereich absperren',
  }));
  const psa = Array.from({ length: overrides.psaProfile ?? 3 }, (_, i) => ({
    id: `clw3h8x9y0000qwertyui05${String(200 + i).padStart(3, '0')}`,
    profil: ['BASIS', 'INFEKTION', 'VU'][i % 3] as 'BASIS' | 'INFEKTION' | 'VU',
    gueltigVon: '2026-05-06T08:00:00.000+00:00',
    gueltigBis: null,
    begruendung: 'Ärztliche Anordnung',
    propagationGroupId: `clw3h8x9y0000qwertyui05${String(300 + i).padStart(3, '0')}`,
  }));
  const regeln = Array.from({ length: overrides.sicherheitsregeln ?? 5 }, (_, i) => ({
    regelId: `clw3h8x9y0000qwertyui05${String(400 + i).padStart(3, '0')}`,
    versionId: `clw3h8x9y0000qwertyui05${String(500 + i).padStart(3, '0')}`,
    version: 1,
    titel: `Regel ${i + 1}`,
    inhalt: `Lange Erläuterung der Regel ${i + 1}. ` + 'Inhalt '.repeat(40),
    einsatzweit: i % 2 === 0,
    einheitIds: [EINHEIT_ID],
    gueltigVon: '2026-05-06T08:00:00.000+00:00',
  }));
  const snapshot: Record<string, unknown> = {
    schemaVersion: 1,
    snapshotAt: '2026-05-06T10:00:00.000+00:00',
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    gefaehrdungsbeurteilung: {
      versionId: 'clw3h8x9y0000qwertyui05088',
      version: 3,
      gueltigVon: '2026-05-06T08:00:00.000+00:00',
      items,
    },
    aktivePsaProfile: psa,
    sicherheitsregeln: regeln,
  };
  if (overrides.driftAktivePsaProfile !== undefined) {
    snapshot.aktivePsaProfile = overrides.driftAktivePsaProfile;
  }
  return snapshot;
}

function buildAggregate(snapshot: Record<string, unknown>): EigenschutzVorfall {
  const beteiligte = [
    Beteiligter.create({ kind: 'user', userId: ERFASSER_ID, rolle: 'San' }).value!,
    Beteiligter.create({ kind: 'freitext', name: 'Hans Müller', rolle: 'Patient' }).value!,
    Beteiligter.create({ kind: 'user', userId: CALLER_ID }).value!,
    Beteiligter.create({ kind: 'freitext', name: 'Anna Schmidt' }).value!,
    Beteiligter.create({ kind: 'user', userId: 'clw3h8x9y0000qwertyui05009' }).value!,
  ];
  const wo = Wo.create({ kind: 'coordinate', longitude: 8.6789, latitude: 50.12345, addressHint: 'Hauptstraße 12' }).value!;
  const result = EigenschutzVorfall.reconstitute({
    id: VORFALL_ID,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    vorfallZeit: NOW,
    wann: NOW,
    was: 'Sturz beim Aufstieg ins Fahrzeug',
    wo,
    beteiligte,
    massnahmen: 'Erste Hilfe geleistet, Rettungsdienst informiert',
    unfallkasseRelevant: true,
    erfasstVonUserId: ERFASSER_ID,
    erfasstAm: NOW,
    kontextSnapshot: snapshot,
    gefBeurteilungVersionId: snapshot.gefaehrdungsbeurteilung ? ((snapshot.gefaehrdungsbeurteilung as Record<string, unknown>).versionId as string) : null,
  });
  if (result.isFailure || !result.value) throw new Error(`Reconstitute failed: ${result.error}`);
  return result.value;
}

/**
 * pdfkit emittiert Text in `TJ`-Blöcken als hex-kodierte Strings (kerning-aware
 * Splits). `extractText(buffer)` enthält daher die *Hex-Repräsentation*
 * der Zeichen, nicht den Klartext. Dieser Helper sammelt alle Hex-Chunks aus
 * `TJ`-Blöcken (`[<HEX> ... <HEX> ...]`-Form) und konkateniert sie zu einem
 * suchbaren String — Substring-Asserts bleiben damit auch über kerning-bedingte
 * Chunk-Grenzen hinweg robust.
 */
function extractText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const tjBlocks = raw.match(/\[\s*<[^\]]+\]\s*TJ/g) ?? [];
  const out: string[] = [];
  for (const block of tjBlocks) {
    const hexChunks = block.match(/<([0-9a-fA-F]+)>/g) ?? [];
    let text = '';
    for (const chunk of hexChunks) {
      const hex = chunk.slice(1, -1);
      const bytes = Buffer.from(hex, 'hex');
      text += bytes.toString('latin1');
    }
    out.push(text);
  }
  return out.join('\n');
}

describe('EigenschutzVorfallPdfRenderer (Story 5.4)', () => {
  it('(1) erzeugt Buffer mit length > 1000 für Standard-Vorfall', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer();
    const buffer = await renderer.generate({
      vorfall: buildAggregate(buildSnapshot()),
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('(2) Buffer beginnt mit %PDF Magic-Bytes (compress-unabhängig)', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer();
    const buffer = await renderer.generate({
      vorfall: buildAggregate(buildSnapshot()),
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  // NFR-P5: lokal ≤ 5 s; CI-Hard-Limit ≤ 10 s
  it('(3) Performance-Smoke: Standard-Vorfall < 10 s (NFR-P5: lokal ≤ 5 s)', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer();
    const start = Date.now();
    await renderer.generate({
      vorfall: buildAggregate(buildSnapshot()),
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });

  it('(4) leerer Snapshot ({}) rendert Hinweis ohne Throw', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer({ compress: false });
    const buffer = await renderer.generate({
      vorfall: buildAggregate(buildSnapshot({ empty: true })),
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    expect(extractText(buffer)).toContain('Kontext-Snapshot nicht verfügbar');
  });

  it('(5) Schema-Drift: aktivePsaProfile als String → Hinweis statt Throw', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer({ compress: false });
    // Reconstitute prüft strikt gegen das V1-Schema (rejectet non-Array PSA).
    // Für den Drift-Test bauen wir mit gültigem Snapshot auf und mutieren das
    // private `_kontextSnapshot`-Feld nachträglich, um den Renderer-Defense-Pfad
    // zu prüfen (nicht ideal, aber der Renderer ist Append-only-konsumentenseitig
    // und muss korrupte DB-JSONB-Daten tolerieren).
    const aggregate = buildAggregate(buildSnapshot());
    const driftSnapshot = { ...buildSnapshot(), aktivePsaProfile: 'not-an-array' as unknown };
    const mutated = aggregate as unknown as { _kontextSnapshot: Record<string, unknown> };
    mutated._kontextSnapshot = driftSnapshot;
    const buffer = await renderer.generate({
      vorfall: aggregate,
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    expect(extractText(buffer)).toContain('Daten-Format nicht lesbar');
  });

  it('(6) PII-Hygiene: Klar-IDs werden via redactId(id, 8) maskiert', async () => {
    const klarId = 'cuid2klaridnotredactedplease24';
    const renderer = new EigenschutzVorfallPdfRenderer({ compress: false });
    const aggregate = buildAggregate(buildSnapshot());
    const buffer = await renderer.generate({
      vorfall: aggregate,
      erzeugtAm: NOW,
      erzeugtVonUserId: klarId,
    });
    const text = extractText(buffer);

    // Output-zentriert: der deterministische Redact-Hash für jede ID muss im
    // PDF-Text erscheinen; der Klar-CUID darf in keinem Text-Run auftauchen
    // (DSGVO-Minimierung im exportierten PDF).
    //
    // Code-Review-Patch (P4): die ältere Version verglich gegen den `latin1`-
    // Roh-Buffer — pdfkit kodiert Glyphen jedoch hex in `TJ`-Blöcken, der
    // Klar-CUID stand also nie als latin1-Bytes drin. Der Check war damit
    // tautologisch. Wir vergleichen jetzt gegen den decoded `extractText`-
    // Output, der den tatsächlich gerenderten Text repräsentiert — falls
    // der Renderer eine Klar-ID schreiben würde, wäre sie hier sichtbar.
    for (const id of [klarId, EINSATZ_ID, VORFALL_ID, ERFASSER_ID]) {
      const expectedHash = redactModule.redactId(id, 8)!;
      expect(text).toContain(expectedHash);
      expect(text).not.toContain(id);
    }
  });

  it('(7) Header enthält Titel "Vorfall-Meldung Eigenschutz"', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer({ compress: false });
    const buffer = await renderer.generate({
      vorfall: buildAggregate(buildSnapshot()),
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    expect(extractText(buffer)).toContain('Vorfall-Meldung Eigenschutz');
  });

  it('(8) Footer enthält Permission-String, Datum und Erzeugungs-Hinweis', async () => {
    const renderer = new EigenschutzVorfallPdfRenderer({ compress: false });
    const buffer = await renderer.generate({
      vorfall: buildAggregate(buildSnapshot()),
      erzeugtAm: NOW,
      erzeugtVonUserId: CALLER_ID,
    });
    const text = extractText(buffer);
    expect(text).toContain('Permission');
    expect(text).toContain('eigenschutz:vorfall:export');
    expect(text).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});
