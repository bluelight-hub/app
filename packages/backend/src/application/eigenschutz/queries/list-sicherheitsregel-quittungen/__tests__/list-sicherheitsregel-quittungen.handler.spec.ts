// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { SICHERHEITSREGEL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ListSicherheitsregelQuittungenHandler } from '../list-sicherheitsregel-quittungen.handler';
import { ListSicherheitsregelQuittungenQuery } from '../list-sicherheitsregel-quittungen.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const REGEL_ID = 'clw3h8x9y0000qwertyui000re';

describe('ListSicherheitsregelQuittungenHandler (Story 2.7)', () => {
  let handler: ListSicherheitsregelQuittungenHandler;
  let quittungRepo: { upsert: jest.Mock; findByRegel: jest.Mock; findByRegelAndEinheit: jest.Mock };

  beforeEach(async () => {
    quittungRepo = { upsert: jest.fn(), findByRegel: jest.fn(), findByRegelAndEinheit: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListSicherheitsregelQuittungenHandler, { provide: SICHERHEITSREGEL_QUITTUNG_REPOSITORY, useValue: quittungRepo }],
    }).compile();
    handler = module.get(ListSicherheitsregelQuittungenHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('liefert leere Liste, wenn das Repo leer antwortet', async () => {
    quittungRepo.findByRegel.mockResolvedValue(Result.ok([]));

    const result = await handler.execute(new ListSicherheitsregelQuittungenQuery(EINSATZ_ID, REGEL_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(quittungRepo.findByRegel).toHaveBeenCalledWith(EINSATZ_ID, REGEL_ID);
  });

  it('mapped Read-Models zu DTOs (mit isoformatiertem quittiertAm)', async () => {
    const quittiertAm = new Date('2026-04-27T08:42:13.000Z');
    quittungRepo.findByRegel.mockResolvedValue(Result.ok([{ id: 'q-1', regelId: REGEL_ID, einheitId: 'einheit-1', einheitName: '1. Sangruppe', quittiertAm, quittiertVonUserId: 'u-1' }]));

    const result = await handler.execute(new ListSicherheitsregelQuittungenQuery(EINSATZ_ID, REGEL_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([
      expect.objectContaining({
        einheitId: 'einheit-1',
        einheitName: '1. Sangruppe',
        quittiertAm: '2026-04-27T08:42:13.000Z',
        quittiertVonUserId: 'u-1',
      }),
    ]);
  });

  it('reicht Repo-Failures durch', async () => {
    quittungRepo.findByRegel.mockResolvedValue(Result.fail<unknown>('InfrastructureError:SicherheitsregelQuittung:db-down'));

    const result = await handler.execute(new ListSicherheitsregelQuittungenQuery(EINSATZ_ID, REGEL_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/InfrastructureError/);
  });

  it('respektiert die Repo-Sortierung (DESC) — Handler ändert Reihenfolge nicht', async () => {
    const newer = new Date('2026-04-27T09:00:00.000Z');
    const older = new Date('2026-04-27T08:00:00.000Z');
    quittungRepo.findByRegel.mockResolvedValue(
      Result.ok([
        { id: 'q-newer', regelId: REGEL_ID, einheitId: 'e-2', einheitName: '2. Gruppe', quittiertAm: newer, quittiertVonUserId: 'u-2' },
        { id: 'q-older', regelId: REGEL_ID, einheitId: 'e-1', einheitName: '1. Gruppe', quittiertAm: older, quittiertVonUserId: 'u-1' },
      ]),
    );

    const result = await handler.execute(new ListSicherheitsregelQuittungenQuery(EINSATZ_ID, REGEL_ID));

    expect(result.value!.map((q) => q.einheitId)).toEqual(['e-2', 'e-1']);
  });
});
