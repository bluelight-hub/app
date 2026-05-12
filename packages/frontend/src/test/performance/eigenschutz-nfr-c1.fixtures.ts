/**
 * Story 7.10 — NFR-C1-Last-Fixtures für Eigenschutz-Performance-Specs.
 *
 * NFR-C1-Wortlaut (PRD): 20 Abschnitte, 100 Einheiten, 50 aktive Clients,
 * 500 GB-Items, 200 Vorfälle.
 *
 * Diese Datei liefert die Frontend-seitigen Test-Builder für die TTI-Render-
 * Smoke (AC2) und die Pending-Command-Queue-NFR-P6-Spec (AC7). Sie ist
 * **nicht** für Production-Code bestimmt — ausschließlich Test-Fixtures.
 */

export const NFR_C1_DIMENSIONS = {
  abschnitte: 20,
  einheiten: 100,
  aktiveClients: 50,
  gefaehrdungsItems: 500,
  vorfaelle: 200,
} as const;

export interface NfrC1Abschnitt {
  id: string;
  bezeichnung: string;
  einheiten: NfrC1Einheit[];
}

export interface NfrC1Einheit {
  id: string;
  bezeichnung: string;
  abschnittId: string;
  funktionsbezeichnung: string;
}

export interface NfrC1GefaehrdungsItem {
  id: string;
  titel: string;
  risikoStufe: 'NIEDRIG' | 'MITTEL' | 'HOCH';
}

export interface NfrC1Vorfall {
  id: string;
  einheitId: string;
  meldungZeitpunkt: string;
  beschreibung: string;
}

export interface NfrC1Fixture {
  einsatzId: string;
  abschnitte: NfrC1Abschnitt[];
  einheiten: NfrC1Einheit[];
  gefaehrdungsItems: NfrC1GefaehrdungsItem[];
  vorfaelle: NfrC1Vorfall[];
}

export function buildNfrC1Fixture(einsatzId = 'einsatz-nfr-c1'): NfrC1Fixture {
  const einheiten: NfrC1Einheit[] = [];
  const abschnitte: NfrC1Abschnitt[] = [];

  // Integer-Divisibility-Invariante: bei nicht-divisibler NFR_C1_DIMENSIONS-Konfiguration
  // würde ein Float-`einheitenProAbschnitt` die innere Loop entweder cut-offen oder
  // einen Off-by-one-Vorfall erzeugen. Math.floor + Assertion macht den Vertrag explizit.
  const einheitenProAbschnitt = Math.floor(NFR_C1_DIMENSIONS.einheiten / NFR_C1_DIMENSIONS.abschnitte);
  if (NFR_C1_DIMENSIONS.einheiten % NFR_C1_DIMENSIONS.abschnitte !== 0) {
    throw new Error(`NFR_C1_DIMENSIONS.einheiten (${NFR_C1_DIMENSIONS.einheiten}) muss durch abschnitte (${NFR_C1_DIMENSIONS.abschnitte}) teilbar sein`);
  }
  for (let i = 0; i < NFR_C1_DIMENSIONS.abschnitte; i++) {
    const abschnittId = `abschnitt-${i + 1}`;
    const abschnittEinheiten: NfrC1Einheit[] = [];
    for (let j = 0; j < einheitenProAbschnitt; j++) {
      const einheit: NfrC1Einheit = {
        id: `einheit-${i + 1}-${j + 1}`,
        bezeichnung: `Einheit ${i + 1}-${j + 1}`,
        abschnittId,
        funktionsbezeichnung: ['Sanitäter', 'Trupp', 'Führung', 'Logistik', 'Funk'][j % 5],
      };
      einheiten.push(einheit);
      abschnittEinheiten.push(einheit);
    }
    abschnitte.push({
      id: abschnittId,
      bezeichnung: `Abschnitt ${i + 1}`,
      einheiten: abschnittEinheiten,
    });
  }

  const gefaehrdungsItems: NfrC1GefaehrdungsItem[] = Array.from({ length: NFR_C1_DIMENSIONS.gefaehrdungsItems }, (_, idx) => ({
    id: `gb-item-${idx + 1}`,
    titel: `Gefährdung ${idx + 1}: ${['Stolpergefahr', 'Hitze', 'Lärm', 'CBRN', 'Absturz'][idx % 5]}`,
    risikoStufe: idx % 7 === 0 ? 'HOCH' : idx % 3 === 0 ? 'MITTEL' : 'NIEDRIG',
  }));

  const vorfaelle: NfrC1Vorfall[] = Array.from({ length: NFR_C1_DIMENSIONS.vorfaelle }, (_, idx) => {
    const einheit = einheiten[idx % einheiten.length];
    return {
      id: `vorfall-${idx + 1}`,
      einheitId: einheit.id,
      meldungZeitpunkt: new Date(2026, 4, 11, 8, idx % 60, 0).toISOString(),
      beschreibung: `Vorfall ${idx + 1}`,
    };
  });

  return {
    einsatzId,
    abschnitte,
    einheiten,
    gefaehrdungsItems,
    vorfaelle,
  };
}

/**
 * Mix von 50 typischen Eigenschutz-Pending-Commands für AC7-NFR-P6.
 *
 * Verteilung (analog AC7-Story-Wortlaut):
 * - 20× PSA-Toggle
 * - 15× Gefährdungs-Edit
 * - 10× Sicherheitsregel-Bestätigung
 * - 5× Vorfall-Erfassung
 */
export interface NfrP6CommandStub {
  id: string;
  kind: 'psa-toggle' | 'gefaehrdungs-edit' | 'regel-bestaetigung' | 'vorfall-erfassung';
  einsatzId: string;
  entityId: string;
  queuedAtMs: number;
}

export function buildNfrP6PendingCommandMix(einsatzId = 'einsatz-nfr-c1', baseTime = Date.UTC(2026, 4, 11, 9, 0, 0)): NfrP6CommandStub[] {
  const list: NfrP6CommandStub[] = [];
  let cursor = baseTime;
  const push = (count: number, kind: NfrP6CommandStub['kind'], prefix: string) => {
    for (let i = 0; i < count; i++) {
      list.push({
        id: `${prefix}-${i + 1}`,
        kind,
        einsatzId,
        entityId: `${prefix}-entity-${i + 1}`,
        queuedAtMs: cursor,
      });
      cursor += 10;
    }
  };
  push(20, 'psa-toggle', 'psa');
  push(15, 'gefaehrdungs-edit', 'gb');
  push(10, 'regel-bestaetigung', 'regel');
  push(5, 'vorfall-erfassung', 'vorfall');
  return list;
}
