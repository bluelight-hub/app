/**
 * Unit Tests fuer useBefehleView Hook und befehleViewStore
 *
 * Verifiziert:
 * - Store-Initialisierung mit Default 'kanban'
 * - setBefehleView Action
 * - toggleBefehleView Action
 * - useBefehleView Hook gibt [view, toggle] zurueck
 * - useCurrentBefehleView Hook gibt nur den View-Wert zurueck
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { befehleViewStore, setBefehleView, toggleBefehleView, useBefehleView, useCurrentBefehleView } from '../use-befehle-view-store';

describe('befehleViewStore', () => {
  beforeEach(() => {
    befehleViewStore.setState(() => ({ view: 'kanban' }));
  });

  describe('Store Actions', () => {
    it('hat Default-View "kanban"', () => {
      expect(befehleViewStore.state.view).toBe('kanban');
    });

    it('setBefehleView setzt die Ansicht auf "tabelle"', () => {
      setBefehleView('tabelle');
      expect(befehleViewStore.state.view).toBe('tabelle');
    });

    it('setBefehleView setzt die Ansicht zurueck auf "kanban"', () => {
      setBefehleView('tabelle');
      setBefehleView('kanban');
      expect(befehleViewStore.state.view).toBe('kanban');
    });

    it('toggleBefehleView wechselt von "kanban" zu "tabelle"', () => {
      expect(befehleViewStore.state.view).toBe('kanban');

      toggleBefehleView();
      expect(befehleViewStore.state.view).toBe('tabelle');
    });

    it('toggleBefehleView wechselt von "tabelle" zurueck zu "kanban"', () => {
      setBefehleView('tabelle');

      toggleBefehleView();
      expect(befehleViewStore.state.view).toBe('kanban');
    });

    it('toggleBefehleView wechselt hin und her', () => {
      toggleBefehleView();
      expect(befehleViewStore.state.view).toBe('tabelle');

      toggleBefehleView();
      expect(befehleViewStore.state.view).toBe('kanban');

      toggleBefehleView();
      expect(befehleViewStore.state.view).toBe('tabelle');
    });
  });

  describe('useBefehleView Hook', () => {
    it('gibt [view, toggle] Tuple zurueck', () => {
      const { result } = renderHook(() => useBefehleView());

      expect(result.current[0]).toBe('kanban');
      expect(typeof result.current[1]).toBe('function');
    });

    it('reagiert auf Store-Aenderungen via toggle', () => {
      const { result } = renderHook(() => useBefehleView());

      expect(result.current[0]).toBe('kanban');

      act(() => {
        result.current[1](); // toggle
      });

      expect(result.current[0]).toBe('tabelle');
    });

    it('reagiert auf setBefehleView', () => {
      const { result } = renderHook(() => useBefehleView());

      act(() => {
        setBefehleView('tabelle');
      });

      expect(result.current[0]).toBe('tabelle');
    });
  });

  describe('useCurrentBefehleView Hook', () => {
    it('gibt nur den View-Wert zurueck', () => {
      const { result } = renderHook(() => useCurrentBefehleView());

      expect(result.current).toBe('kanban');

      act(() => {
        setBefehleView('tabelle');
      });

      expect(result.current).toBe('tabelle');
    });
  });
});
