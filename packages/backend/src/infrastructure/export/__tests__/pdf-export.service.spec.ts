import { PdfExportService } from '../pdf-export.service';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { ErinnerungStatistikDto } from '@/application/erinnerung/dto/erinnerung-statistik.dto';
import type { PersonStatistikDto } from '@/application/erinnerung/dto/person-statistik.dto';
import type { EskalationsAnalyseDto } from '@/application/erinnerung/dto/eskalations-analyse.dto';
import type { ReaktionszeitStatistikDto } from '@/application/erinnerung/dto/reaktionszeit-statistik.dto';

describe('PdfExportService', () => {
  let service: PdfExportService;

  /** Helper: Erstellt ein valides ErinnerungExportItem */
  function createMockItem(overrides: Partial<ErinnerungExportItem> = {}): ErinnerungExportItem {
    return {
      id: 'clw3h8x9y000108l6daaaaaaa',
      titel: 'Lagebesprechung',
      beschreibung: 'Taktische Lagebesprechung durchfuehren',
      status: 'AUSGELOEST',
      erstelltVonName: 'Max Mueller',
      assignedToName: 'Anna Schmidt',
      kategorieName: 'Fuehrung',
      faelligAm: new Date('2026-02-08T14:00:00Z'),
      ausgeloestAm: new Date('2026-02-08T14:00:00Z'),
      acknowledgedAm: new Date('2026-02-08T14:02:00Z'),
      erledigtAm: null,
      eskaliertAm: null,
      wurdeEskaliert: false,
      snoozeCount: 0,
      createdAt: new Date('2026-02-08T13:30:00Z'),
      ...overrides,
    };
  }

  function createMockStatistik(overrides: Partial<ErinnerungStatistikDto> = {}): ErinnerungStatistikDto {
    return {
      totalEscalated: 2,
      avgEscalationTimeSeconds: 300,
      topReceivers: [],
      statusCounts: {
        total: 10,
        geplant: 1,
        ausgeloest: 2,
        acknowledged: 3,
        snoozed: 0,
        eskaliert: 2,
        erledigt: 5,
      },
      activeCount: 5,
      ...overrides,
    };
  }

  function createMockPersonStatistik(): PersonStatistikDto {
    return {
      items: [
        {
          userId: 'user-1',
          userName: 'Max Mueller',
          zugewiesen: 5,
          acknowledged: 4,
          eskalationen: 1,
          avgReaktionszeitSeconds: 45,
        },
      ],
    };
  }

  function createMockEskalationsAnalyse(): EskalationsAnalyseDto {
    return {
      totalEscalated: 2,
      totalErinnerungen: 10,
      eskalationsRate: 0.2,
      avgZeitBisEskalationSeconds: 300,
      topReceivers: [{ userId: 'user-1', userName: 'Max Mueller', count: 2 }],
      topSources: [{ userId: 'user-2', userName: 'Anna Schmidt', count: 1 }],
      items: [],
    };
  }

  function createMockReaktionszeiten(): ReaktionszeitStatistikDto {
    return {
      totalAcknowledged: 8,
      avgReaktionszeitSeconds: 45,
      medianReaktionszeitSeconds: 30,
      minReaktionszeitSeconds: 10,
      maxReaktionszeitSeconds: 120,
      buckets: [{ label: '0-30s', minSeconds: 0, maxSeconds: 30, count: 4 }],
    };
  }

  beforeEach(() => {
    service = new PdfExportService();
  });

  it('should return a Buffer', async () => {
    // Given
    const erinnerungen: ErinnerungExportItem[] = [];

    // When
    const buffer = await service.generateExport(createMockStatistik(), createMockPersonStatistik(), createMockEskalationsAnalyse(), createMockReaktionszeiten(), erinnerungen, 'E-2026-001');

    // Then
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should return a Buffer with PDF header', async () => {
    // Given
    const erinnerungen = [createMockItem()];

    // When
    const buffer = await service.generateExport(createMockStatistik(), createMockPersonStatistik(), createMockEskalationsAnalyse(), createMockReaktionszeiten(), erinnerungen, 'E-2026-001');

    // Then — PDF beginnt mit %PDF
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('should handle single erinnerung', async () => {
    // Given
    const erinnerungen = [createMockItem()];

    // When
    const buffer = await service.generateExport(createMockStatistik(), createMockPersonStatistik(), createMockEskalationsAnalyse(), createMockReaktionszeiten(), erinnerungen, 'E-2026-001');

    // Then
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('should include all statistics data', async () => {
    // Given — voller Datensatz mit mehreren Erinnerungen
    const erinnerungen = [
      createMockItem(),
      createMockItem({
        id: 'clw3h8x9y000108l6dbbbbbbbb',
        titel: 'Wasserversorgung pruefen',
        status: 'ERLEDIGT',
        wurdeEskaliert: true,
        eskaliertAm: new Date('2026-02-08T14:10:00Z'),
        erledigtAm: new Date('2026-02-08T15:00:00Z'),
      }),
      createMockItem({
        id: 'clw3h8x9y000108l6dcccccccc',
        titel: 'Funkverbindung testen',
        status: 'ACKNOWLEDGED',
        assignedToName: null,
        kategorieName: null,
      }),
    ];

    const statistik = createMockStatistik({
      statusCounts: {
        total: 3,
        geplant: 0,
        ausgeloest: 1,
        acknowledged: 1,
        snoozed: 0,
        eskaliert: 1,
        erledigt: 1,
      },
    });

    // When
    const buffer = await service.generateExport(statistik, createMockPersonStatistik(), createMockEskalationsAnalyse(), createMockReaktionszeiten(), erinnerungen, 'E-2026-001');

    // Then — kein Fehler, valides PDF
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});
