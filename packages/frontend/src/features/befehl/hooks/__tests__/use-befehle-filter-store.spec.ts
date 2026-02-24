/**
 * Unit Tests fuer useBefehleFilterStore
 *
 * Verifiziert:
 * - Store-Initialisierung mit leerem State
 * - Alle Actions (setStatusFilter, setEmpfaengerName, etc.)
 * - resetBefehleFilter setzt auf Initial zurueck
 * - useActiveFilterCount zaehlt aktive Filter korrekt
 * - useHasActiveFilters erkennt aktive Filter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  befehleFilterStore,
  setStatusFilter,
  setEmpfaengerName,
  setBefehlsgeberName,
  setSearchText,
  setVon,
  setBis,
  resetBefehleFilter,
  useBefehleFilter,
  useActiveFilterCount,
  useHasActiveFilters,
} from '../use-befehle-filter-store';

describe('befehleFilterStore', () => {
  beforeEach(() => {
    resetBefehleFilter();
  });

  describe('Initial State', () => {
    it('hat leeren Initialzustand', () => {
      const state = befehleFilterStore.state;
      expect(state.statusFilter).toEqual([]);
      expect(state.empfaengerName).toBe('');
      expect(state.befehlsgeberName).toBe('');
      expect(state.searchText).toBe('');
      expect(state.von).toBe('');
      expect(state.bis).toBe('');
    });
  });

  describe('Store Actions', () => {
    it('setStatusFilter setzt Status-Array', () => {
      setStatusFilter(['ERTEILT', 'ZUGESTELLT']);
      expect(befehleFilterStore.state.statusFilter).toEqual(['ERTEILT', 'ZUGESTELLT']);
    });

    it('setStatusFilter kann auf leer zurueckgesetzt werden', () => {
      setStatusFilter(['ERTEILT']);
      setStatusFilter([]);
      expect(befehleFilterStore.state.statusFilter).toEqual([]);
    });

    it('setEmpfaengerName setzt Empfaenger-Name', () => {
      setEmpfaengerName('THW Ortsverband');
      expect(befehleFilterStore.state.empfaengerName).toBe('THW Ortsverband');
    });

    it('setBefehlsgeberName setzt Befehlsgeber-Name', () => {
      setBefehlsgeberName('Einsatzleiter Müller');
      expect(befehleFilterStore.state.befehlsgeberName).toBe('Einsatzleiter Müller');
    });

    it('setSearchText setzt Suchtext', () => {
      setSearchText('Wasserversorgung');
      expect(befehleFilterStore.state.searchText).toBe('Wasserversorgung');
    });

    it('setVon setzt Von-Datum', () => {
      setVon('2026-01-01');
      expect(befehleFilterStore.state.von).toBe('2026-01-01');
    });

    it('setBis setzt Bis-Datum', () => {
      setBis('2026-12-31');
      expect(befehleFilterStore.state.bis).toBe('2026-12-31');
    });

    it('Actions sind unabhaengig voneinander', () => {
      setStatusFilter(['QUITTIERT']);
      setEmpfaengerName('Feuerwehr');
      setVon('2026-01-01');

      expect(befehleFilterStore.state.statusFilter).toEqual(['QUITTIERT']);
      expect(befehleFilterStore.state.empfaengerName).toBe('Feuerwehr');
      expect(befehleFilterStore.state.von).toBe('2026-01-01');
      expect(befehleFilterStore.state.befehlsgeberName).toBe('');
      expect(befehleFilterStore.state.searchText).toBe('');
      expect(befehleFilterStore.state.bis).toBe('');
    });
  });

  describe('resetBefehleFilter', () => {
    it('setzt alle Filter auf den Initialzustand zurueck', () => {
      setStatusFilter(['ERTEILT', 'ZUGESTELLT']);
      setEmpfaengerName('THW');
      setBefehlsgeberName('Einsatzleiter');
      setSearchText('Suche');
      setVon('2026-01-01');
      setBis('2026-12-31');

      resetBefehleFilter();

      const state = befehleFilterStore.state;
      expect(state.statusFilter).toEqual([]);
      expect(state.empfaengerName).toBe('');
      expect(state.befehlsgeberName).toBe('');
      expect(state.searchText).toBe('');
      expect(state.von).toBe('');
      expect(state.bis).toBe('');
    });
  });

  describe('useBefehleFilter Hook', () => {
    it('gibt den gesamten Filter-State zurueck', () => {
      const { result } = renderHook(() => useBefehleFilter());

      expect(result.current.statusFilter).toEqual([]);
      expect(result.current.empfaengerName).toBe('');
    });

    it('reagiert auf Store-Aenderungen', () => {
      const { result } = renderHook(() => useBefehleFilter());

      act(() => {
        setStatusFilter(['ERTEILT']);
        setSearchText('Test');
      });

      expect(result.current.statusFilter).toEqual(['ERTEILT']);
      expect(result.current.searchText).toBe('Test');
    });
  });

  describe('useActiveFilterCount Hook', () => {
    it('gibt 0 bei leerem State', () => {
      const { result } = renderHook(() => useActiveFilterCount());
      expect(result.current).toBe(0);
    });

    it('zaehlt jeden Filter-Typ als 1', () => {
      const { result } = renderHook(() => useActiveFilterCount());

      act(() => {
        setStatusFilter(['ERTEILT', 'ZUGESTELLT']); // 1
        setEmpfaengerName('THW'); // 1
        setSearchText('Test'); // 1
      });

      expect(result.current).toBe(3);
    });

    it('zaehlt alle 6 Filter-Typen', () => {
      const { result } = renderHook(() => useActiveFilterCount());

      act(() => {
        setStatusFilter(['ERTEILT']);
        setEmpfaengerName('THW');
        setBefehlsgeberName('EL');
        setSearchText('Test');
        setVon('2026-01-01');
        setBis('2026-12-31');
      });

      expect(result.current).toBe(6);
    });

    it('reagiert auf Reset', () => {
      const { result } = renderHook(() => useActiveFilterCount());

      act(() => {
        setStatusFilter(['ERTEILT']);
        setSearchText('Test');
      });
      expect(result.current).toBe(2);

      act(() => {
        resetBefehleFilter();
      });
      expect(result.current).toBe(0);
    });
  });

  describe('useHasActiveFilters Hook', () => {
    it('gibt false bei leerem State', () => {
      const { result } = renderHook(() => useHasActiveFilters());
      expect(result.current).toBe(false);
    });

    it('gibt true wenn ein Filter aktiv', () => {
      const { result } = renderHook(() => useHasActiveFilters());

      act(() => {
        setSearchText('x');
      });

      expect(result.current).toBe(true);
    });

    it('gibt false nach Reset', () => {
      const { result } = renderHook(() => useHasActiveFilters());

      act(() => {
        setVon('2026-01-01');
      });
      expect(result.current).toBe(true);

      act(() => {
        resetBefehleFilter();
      });
      expect(result.current).toBe(false);
    });
  });
});
