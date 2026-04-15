// @ts-nocheck
import { Result } from '@domain/common/result';
import { KanalplanExportController } from '../kanalplan-export.controller';

function resStub() {
  const headers: Record<string, string> = {};
  const sent: { body?: any } = {};
  return {
    setHeader: jest.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    send: jest.fn((body: any) => {
      sent.body = body;
    }),
    headers,
    sent,
  };
}

describe('KanalplanExportController', () => {
  let controller: KanalplanExportController;
  let getKanalplanHandler: any;
  let pdfService: any;
  let einsatzRepository: any;

  beforeEach(() => {
    getKanalplanHandler = { execute: jest.fn() };
    pdfService = { generate: jest.fn() };
    einsatzRepository = { findById: jest.fn() };
    controller = new KanalplanExportController(getKanalplanHandler, pdfService, einsatzRepository);
  });

  it('liefert PDF-Buffer mit korrekten Headern', async () => {
    getKanalplanHandler.execute.mockResolvedValue(Result.ok([]));
    pdfService.generate.mockResolvedValue(Buffer.from('%PDF-1.4\ncontent'));
    einsatzRepository.findById.mockResolvedValue(Result.ok({ nummer: 'E2026-001', alarmstichwort: 'Wohnungsbrand' }));

    const res = resStub();
    await controller.exportPdf('clrealid000000000000000001', res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    const disposition = res.headers['Content-Disposition'];
    expect(disposition).toContain('attachment; filename="kanalplan-');
    expect(disposition).toContain('.pdf"');
    expect(res.sent.body).toBeInstanceOf(Buffer);
    expect(pdfService.generate).toHaveBeenCalledTimes(1);
    const pdfArg = pdfService.generate.mock.calls[0][0];
    expect(pdfArg.einsatzName).toBe('E2026-001 · Wohnungsbrand');
  });

  it('fällt bei unbekanntem Einsatz auf einsatzId zurück', async () => {
    getKanalplanHandler.execute.mockResolvedValue(Result.ok([]));
    pdfService.generate.mockResolvedValue(Buffer.from('%PDF'));
    einsatzRepository.findById.mockResolvedValue(Result.ok(null));

    const res = resStub();
    await controller.exportPdf('clrealid000000000000000001', res as any);

    const pdfArg = pdfService.generate.mock.calls[0][0];
    expect(pdfArg.einsatzName).toBe('clrealid000000000000000001');
  });
});
