import type { BefehlDto } from '@bluelight-hub/shared/client';
import type { EintragDto } from '@/shared';

export const RING_2_PERFORMANCE_THRESHOLDS = {
  usableStateP95Ms: 2000,
  interactionFeedbackMs: 200,
  statusFeedbackMs: 300,
  requiredPassRate: 0.95,
  iterations: 30,
} as const;

export const RING_2_BROWSER_MATRIX = ['Chrome 146', 'Edge 146', 'Safari 26.2', 'Firefox 140.7 ESR'] as const;

export const RING_2_BREAKPOINT_MATRIX = ['Mobile < 640px', 'Tablet 640-1023px', 'Desktop >= 1024px', 'Wide Desktop >= 1536px'] as const;

type Ring2ScenarioId = 'overview' | 'etb' | 'befehle';

interface Ring2PerformanceScenario {
  id: Ring2ScenarioId;
  label: string;
  anchor: string;
  route: string;
  usableState: string;
  representativeLoad: Record<string, number>;
  metrics: Array<'usable-state' | 'interaction-feedback' | 'status-feedback'>;
}

export const RING_2_PERFORMANCE_SCENARIOS: Record<Ring2ScenarioId, Ring2PerformanceScenario> = {
  overview: {
    id: 'overview',
    label: 'Überblick',
    anchor: 'SingleEinsatzDashboard',
    route: '/app/einsatz/$einsatzId/übersicht',
    usableState: 'Workspace-Kontext, Statistik-Karten und Schnellzugriffe sind sichtbar; priorisierte Überblicksinformationen sind lesbar.',
    representativeLoad: {
      statusObjects: 100,
      etbEntries: 200,
    },
    metrics: ['usable-state', 'status-feedback'],
  },
  etb: {
    id: 'etb',
    label: 'ETB',
    anchor: 'EtbPage / EtbEntryList',
    route: '/app/einsatz/$einsatzId/führung/etb',
    usableState: 'Header, Eingabeformular und erste virtuelle ETB-Zeilen oder ein textlich eindeutiger Ladezustand sind sichtbar.',
    representativeLoad: {
      etbEntries: 200,
    },
    metrics: ['usable-state', 'interaction-feedback', 'status-feedback'],
  },
  befehle: {
    id: 'befehle',
    label: 'Befehle',
    anchor: 'BefehlsListeMitEingabe',
    route: '/app/einsatz/$einsatzId/führung/befehle',
    usableState: 'Filter-/Headerbereich und erste Befehlskarten oder ein textlich eindeutiger Ladezustand sind sichtbar.',
    representativeLoad: {
      openCommands: 20,
    },
    metrics: ['usable-state', 'interaction-feedback', 'status-feedback'],
  },
};

export interface OverviewStatusObject {
  id: string;
  kind: 'resource' | 'status';
  label: string;
  state: 'available' | 'pending' | 'warning';
}

export function buildOverviewStatusObjects(count = RING_2_PERFORMANCE_SCENARIOS.overview.representativeLoad.statusObjects): OverviewStatusObject[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `overview-object-${index + 1}`,
    kind: index % 4 === 0 ? 'status' : 'resource',
    label: `Überblicksobjekt ${index + 1}`,
    state: index % 9 === 0 ? 'warning' : index % 3 === 0 ? 'pending' : 'available',
  }));
}

export function buildOverviewDashboardFixture(count = RING_2_PERFORMANCE_SCENARIOS.overview.representativeLoad.statusObjects) {
  const statusObjects = buildOverviewStatusObjects(count);
  const resourceCount = Math.max(1, Math.round(count * 0.6));
  const poiCount = Math.max(1, count - resourceCount);

  return {
    einsatz: {
      id: 'einsatz-1',
      name: 'Wohnungsbrand Musterstraße',
      alarmstichwort: 'B3Y',
      einsatzort: 'Musterstraße 7, 12345 Teststadt',
      alarmierungszeit: new Date('2026-03-16T11:45:00.000Z').toISOString(),
      createdAt: new Date('2026-03-16T11:40:00.000Z').toISOString(),
      beschreibung: 'Starke Rauchentwicklung im zweiten Obergeschoss.',
    },
    statusObjects,
    fahrzeuge: Array.from({ length: resourceCount }, (_, index) => ({
      id: `fahrzeug-${index + 1}`,
      name: `LF ${index + 1}`,
      fmsStatus: index % 4 === 0 ? 4 : 3,
    })),
    pois: Array.from({ length: poiCount }, (_, index) => ({
      id: `poi-${index + 1}`,
      title: `POI ${index + 1}`,
      type: index % 2 === 0 ? 'hydrant' : 'sammelpunkt',
    })),
    etbEntries: buildEtbEntries(RING_2_PERFORMANCE_SCENARIOS.overview.representativeLoad.etbEntries),
  };
}

export function buildEtbEntries(count = RING_2_PERFORMANCE_SCENARIOS.etb.representativeLoad.etbEntries): EintragDto[] {
  return Array.from({ length: count }, (_, index) => {
    const createdAt = new Date(Date.UTC(2026, 2, 16, 11, Math.floor(index / 4), index % 60));
    const updatedAt = new Date(createdAt.getTime() + 45_000);

    return {
      id: `etb-entry-${index + 1}`,
      sequenceNumber: index + 1,
      version: index % 7 === 0 ? 2 : 1,
      timestamp: createdAt.toISOString(),
      createdAt,
      updatedAt,
      absender: `Führung ${index % 6}`,
      empfaenger: `Abschnitt ${index % 4}`,
      kategorie: index % 5 === 0 ? 'BEFEHL' : index % 3 === 0 ? 'LAGE' : 'MASSNAHME',
      text: `ETB-Eintrag ${index + 1}: Lagebild und Maßnahmenstand für Ring-2-Performance.`,
      deletedAt: null,
      deleterUsername: null,
      metadata: {
        source: 'ring-2-performance',
      },
      linkedErinnerung: null,
    } as unknown as EintragDto;
  });
}

export function buildOpenBefehle(count = RING_2_PERFORMANCE_SCENARIOS.befehle.representativeLoad.openCommands): BefehlDto[] {
  return Array.from({ length: count }, (_, index) => {
    const issuedAt = new Date(Date.UTC(2026, 2, 16, 12, index, 0));

    return {
      id: `befehl-${index + 1}`,
      nummer: `B2026-${String(index + 1).padStart(3, '0')}`,
      einsatzId: 'einsatz-1',
      auftrag: `Abschnitt ${index % 4}: Aufgabe ${index + 1} priorisiert abarbeiten.`,
      befehlsgeberName: `Leitung ${index % 3}`,
      erstellerId: `ersteller-${index % 2}`,
      status: 'ERTEILT',
      befehlstyp: 'KURZBEFEHL',
      erteiltAm: issuedAt,
      empfaenger: [
        {
          id: `empfaenger-${index + 1}`,
          empfaengerId: `user-${(index % 5) + 1}`,
          empfaengerName: `Empfänger ${(index % 5) + 1}`,
          quittiertAm: index % 4 === 0 ? issuedAt : undefined,
        },
      ],
      kommentare: [],
      createdAt: issuedAt,
      updatedAt: issuedAt,
    } as unknown as BefehlDto;
  });
}
