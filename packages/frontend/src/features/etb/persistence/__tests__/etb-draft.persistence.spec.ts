import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearEtbDraft, getEtbDraftStorageKey, loadEtbDraft, saveEtbDraft } from '../etb-draft.persistence';
import type { EtbDraftScope } from '../../types/draft-state.types';

// In-Memory Storage Mock
const storageData = new Map<string, string>();

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => ({
    getItem: vi.fn(async (key: string) => storageData.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storageData.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storageData.delete(key);
    }),
    clear: vi.fn(async () => {
      storageData.clear();
    }),
  }),
}));

const testScope: EtbDraftScope = {
  serverId: 'server-1',
  userId: 'user-1',
  role: 'EINSATZLEITUNG',
  einsatzId: 'einsatz-1',
};

describe('etb-draft.persistence', () => {
  beforeEach(() => {
    storageData.clear();
    vi.restoreAllMocks();
  });

  describe('getEtbDraftStorageKey', () => {
    it('erzeugt den korrekten scoped Storage-Key', () => {
      const key = getEtbDraftStorageKey(testScope);
      expect(key).toBe('bluelight:server:server-1:user:user-1:role:EINSATZLEITUNG:einsatz:einsatz-1:feature:etb-draft');
    });
  });

  describe('saveEtbDraft + loadEtbDraft Round-Trip', () => {
    it('speichert und lädt einen Draft korrekt', async () => {
      await saveEtbDraft(testScope, {
        kategorie: 'LAGE' as never,
        text: 'Hochwasser steigt',
        absender: 'EL',
        empfaenger: 'Leitstelle',
        etbId: 'etb-1',
      });

      const loaded = await loadEtbDraft(testScope);
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(1);
      expect(loaded!.kategorie).toBe('LAGE');
      expect(loaded!.text).toBe('Hochwasser steigt');
      expect(loaded!.absender).toBe('EL');
      expect(loaded!.empfaenger).toBe('Leitstelle');
      expect(loaded!.etbId).toBe('etb-1');
      expect(loaded!.updatedAt).toBeDefined();
    });

    it('setzt version und updatedAt automatisch', async () => {
      const beforeSave = new Date().toISOString();

      await saveEtbDraft(testScope, {
        kategorie: 'LAGE' as never,
        text: 'Test',
        etbId: 'etb-1',
      });

      const loaded = await loadEtbDraft(testScope);
      expect(loaded!.version).toBe(1);
      expect(loaded!.updatedAt >= beforeSave).toBe(true);
    });
  });

  describe('loadEtbDraft', () => {
    it('gibt null zurück wenn kein Draft vorhanden', async () => {
      const loaded = await loadEtbDraft(testScope);
      expect(loaded).toBeNull();
    });

    it('gibt null zurück bei korrupten JSON-Daten', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const key = getEtbDraftStorageKey(testScope);
      storageData.set(key, '{invalid json');

      const loaded = await loadEtbDraft(testScope);
      expect(loaded).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('Ungültigen ETB-Draft verworfen:', expect.anything());
      warnSpy.mockRestore();
    });

    it('gibt null zurück bei Daten die Zod-Validierung nicht bestehen', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const key = getEtbDraftStorageKey(testScope);
      // Fehlende Pflichtfelder
      storageData.set(key, JSON.stringify({ version: 999, text: 'test' }));

      const loaded = await loadEtbDraft(testScope);
      expect(loaded).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('gibt null zurück bei falscher Version', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const key = getEtbDraftStorageKey(testScope);
      storageData.set(
        key,
        JSON.stringify({
          version: 2,
          kategorie: 'LAGE',
          text: 'test',
          etbId: 'etb-1',
          updatedAt: new Date().toISOString(),
        }),
      );

      const loaded = await loadEtbDraft(testScope);
      expect(loaded).toBeNull();
      warnSpy.mockRestore();
    });
  });

  describe('clearEtbDraft', () => {
    it('löscht den Draft aus dem Storage', async () => {
      await saveEtbDraft(testScope, {
        kategorie: 'LAGE' as never,
        text: 'Draft zum Löschen',
        etbId: 'etb-1',
      });

      expect(await loadEtbDraft(testScope)).not.toBeNull();

      await clearEtbDraft(testScope);

      expect(await loadEtbDraft(testScope)).toBeNull();
    });

    it('wirft keinen Fehler wenn kein Draft vorhanden', async () => {
      await expect(clearEtbDraft(testScope)).resolves.toBeUndefined();
    });
  });

  describe('Scope-Isolation', () => {
    it('unterschiedliche Scopes greifen auf unterschiedliche Drafts zu', async () => {
      const scope2: EtbDraftScope = { ...testScope, einsatzId: 'einsatz-2' };

      await saveEtbDraft(testScope, {
        kategorie: 'LAGE' as never,
        text: 'Draft Einsatz 1',
        etbId: 'etb-1',
      });

      await saveEtbDraft(scope2, {
        kategorie: 'BEFEHL' as never,
        text: 'Draft Einsatz 2',
        etbId: 'etb-2',
      });

      const draft1 = await loadEtbDraft(testScope);
      const draft2 = await loadEtbDraft(scope2);

      expect(draft1!.text).toBe('Draft Einsatz 1');
      expect(draft2!.text).toBe('Draft Einsatz 2');
    });
  });
});
