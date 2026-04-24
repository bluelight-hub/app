import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY,
  loadPendingCommands,
  markPendingCommandConflict,
  removePendingCommand,
  replayPendingCommands,
  upsertPendingCommand,
  type EigenschutzPendingCommandV1,
} from '../pending-command-queue';

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => ({
    getItem: mocks.getItem,
    setItem: mocks.setItem,
  }),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}));

function command(overrides: Partial<EigenschutzPendingCommandV1> = {}): EigenschutzPendingCommandV1 {
  return {
    schemaVersion: 1,
    id: 'cmd-1',
    entityType: 'gefaehrdungsbeurteilung',
    einsatzId: 'einsatz-1',
    entityId: 'gb-1',
    expectedVersion: 3,
    payload: { items: [{ title: 'Strom' }] },
    queuedAt: '2026-04-24T10:00:00.000Z',
    updatedAt: '2026-04-24T10:00:00.000Z',
    source: 'auto-save',
    status: 'pending',
    ...overrides,
  };
}

describe('pending-command-queue (Story 2.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItem.mockResolvedValue(null);
    mocks.setItem.mockResolvedValue(undefined);
  });

  it('nutzt den festgelegten Storage-Key und lädt valide Commands', async () => {
    const existing = command();
    mocks.getItem.mockResolvedValue(JSON.stringify([existing]));

    await expect(loadPendingCommands()).resolves.toEqual([existing]);
    expect(mocks.getItem).toHaveBeenCalledWith(EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY);
  });

  it('ignoriert beschädigte Storage-Payloads defensiv und loggt', async () => {
    mocks.getItem.mockResolvedValue('{kaputt');

    await expect(loadPendingCommands()).resolves.toEqual([]);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(expect.stringContaining('Pending Commands verworfen'), expect.objectContaining({ error: expect.anything() }));
  });

  it('coalesced Auto-Save-Commands derselben Entität und expectedVersion auf den neuesten Payload', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'cmd-alt', payload: { items: [{ title: 'Alt' }] } })]));

    await upsertPendingCommand(command({ id: 'cmd-neu', payload: { items: [{ title: 'Neu' }] }, updatedAt: '2026-04-24T10:00:02.000Z' }));

    const persisted = JSON.parse(mocks.setItem.mock.calls[0][1]) as EigenschutzPendingCommandV1[];
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      id: 'cmd-alt',
      payload: { items: [{ title: 'Neu' }] },
      updatedAt: '2026-04-24T10:00:02.000Z',
    });
  });

  it('entfernt Commands per removePendingCommand', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'a' }), command({ id: 'b' })]));

    await removePendingCommand('a');

    const persisted = JSON.parse(mocks.setItem.mock.calls[0][1]) as EigenschutzPendingCommandV1[];
    expect(persisted.map((entry) => entry.id)).toEqual(['b']);
  });

  it('markiert echte Replay-409 als sichtbaren Konflikt', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'a' })]));
    const error409 = { response: { status: 409 } };

    await replayPendingCommands({
      saveCommand: vi.fn().mockRejectedValue(error409),
      isAlreadyApplied: vi.fn().mockResolvedValue(false),
    });

    const persisted = JSON.parse(mocks.setItem.mock.calls[0][1]) as EigenschutzPendingCommandV1[];
    expect(persisted[0]).toMatchObject({ id: 'a', status: 'conflict' });
  });

  it('entfernt Replay-409, wenn Serverstand den Payload bereits enthält', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'a' })]));
    const error409 = { response: { status: 409 } };

    await replayPendingCommands({
      saveCommand: vi.fn().mockRejectedValue(error409),
      isAlreadyApplied: vi.fn().mockResolvedValue(true),
    });

    const persisted = JSON.parse(mocks.setItem.mock.calls[0][1]) as EigenschutzPendingCommandV1[];
    expect(persisted).toEqual([]);
  });

  it('markPendingCommandConflict hält den Command sichtbar', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'a' })]));

    await markPendingCommandConflict('a', 'Server-Version abweichend');

    const persisted = JSON.parse(mocks.setItem.mock.calls[0][1]) as EigenschutzPendingCommandV1[];
    expect(persisted[0]).toMatchObject({
      id: 'a',
      status: 'conflict',
      conflictReason: 'Server-Version abweichend',
    });
  });
});
