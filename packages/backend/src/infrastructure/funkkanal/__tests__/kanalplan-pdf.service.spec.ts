// @ts-nocheck
import { KanalplanPdfService } from '../kanalplan-pdf.service';

function aggregateStub(overrides: Partial<{ name: string; sortIndex: number; zweck: string; status: string; details: any; zuordnungen: any[] }> = {}) {
  return {
    kanal: {
      id: { value: 'kanal-1' },
      einsatzId: { value: 'einsatz-1' },
      name: overrides.name ?? 'Führung 1',
      details: overrides.details ?? { type: 'tmo', sprechgruppe: 'BOS-RLP-1', gssi: '2629031' },
      status: overrides.status ?? 'aktiv',
      zweck: overrides.zweck,
      sortIndex: overrides.sortIndex ?? 0,
      createdAt: new Date('2026-04-14T12:00:00.000Z'),
      updatedAt: new Date('2026-04-14T12:00:00.000Z'),
    },
    zuordnungen: overrides.zuordnungen ?? [{ rufnameSnapshot: 'Florian 12-1', rolle: 'primaer' }],
  };
}

describe('KanalplanPdfService', () => {
  const service = new KanalplanPdfService();

  it('erzeugt einen Buffer mit PDF-Signatur', async () => {
    const buffer = await service.generate({
      einsatzId: 'einsatz-1',
      einsatzName: 'E2026-001 · Wohnungsbrand',
      kanaele: [aggregateStub({ name: 'Führung' }), aggregateStub({ name: 'Einsatzabschnitt 1', sortIndex: 1, details: { type: 'dmo', dmoKanal: '310' } })],
      exportiertAm: new Date('2026-04-14T12:00:00.000Z'),
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rendert leere Kanalplan-Liste mit Hinweistext', async () => {
    const buffer = await service.generate({
      einsatzId: 'einsatz-1',
      einsatzName: 'Leer',
      kanaele: [],
      exportiertAm: new Date('2026-04-14T12:00:00.000Z'),
    });
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rendert Analog-Kanäle mit Band und Frequenz', async () => {
    const buffer = await service.generate({
      einsatzId: 'einsatz-1',
      einsatzName: 'Analog-Test',
      kanaele: [aggregateStub({ details: { type: 'analog', band: '4m', frequenz: '84,975 MHz', kanalnummer: '468 G/U' }, zuordnungen: [] })],
      exportiertAm: new Date('2026-04-14T12:00:00.000Z'),
    });
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
