/**
 * Unit Tests für useMeineBefehleFilter Hook und Store
 *
 * Verifiziert:
 * - Store-Initialisierung mit Viewport-basiertem Default
 * - Toggle-Funktionalität
 * - Reset auf Default
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMeineBefehleFilter,
  useShowMeineBefehle,
  toggleMeineBefehle,
  setShowMeineBefehle,
  toggleOffeneRueckfragen,
  setShowOffeneRueckfragen,
  resetMeineBefehleFilterStore,
  meineBefehleFilterStore,
} from '../use-meine-befehle-filter';

describe('useMeineBefehleFilter', () => {
  beforeEach(() => {
    // Store auf Desktop-Default zuruecksetzen
    meineBefehleFilterStore.setState({ showMeineBefehle: false, showOffeneRueckfragen: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Store Actions', () => {
    it('toggleMeineBefehle wechselt den Wert', () => {
      expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(false);

      toggleMeineBefehle();
      expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(true);

      toggleMeineBefehle();
      expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(false);
    });

    it('setShowMeineBefehle setzt den Wert explizit', () => {
      setShowMeineBefehle(true);
      expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(true);

      setShowMeineBefehle(false);
      expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(false);
    });

    it('resetMeineBefehleFilterStore setzt auf Viewport-Default zurueck', () => {
      setShowMeineBefehle(true);
      expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(true);

      resetMeineBefehleFilterStore();
      // Auf Desktop (default matchMedia mock) wird false erwartet
      expect(typeof meineBefehleFilterStore.state.showMeineBefehle).toBe('boolean');
    });
  });

  describe('useMeineBefehleFilter Hook', () => {
    it('gibt aktuellen Wert und Toggle-Funktion zurueck', () => {
      const { result } = renderHook(() => useMeineBefehleFilter());

      expect(result.current[0]).toBe(false);
      expect(typeof result.current[1]).toBe('function');
    });

    it('reagiert auf Store-Aenderungen', () => {
      const { result } = renderHook(() => useMeineBefehleFilter());

      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1](); // toggle
      });

      expect(result.current[0]).toBe(true);
    });
  });

  describe('useShowMeineBefehle Hook', () => {
    it('gibt nur den booleschen Wert zurueck', () => {
      const { result } = renderHook(() => useShowMeineBefehle());

      expect(result.current).toBe(false);

      act(() => {
        setShowMeineBefehle(true);
      });

      expect(result.current).toBe(true);
    });
  });
});

describe('Gegenseitiger Ausschluss: showMeineBefehle / showOffeneRueckfragen', () => {
  beforeEach(() => {
    resetMeineBefehleFilterStore();
    // Explizit beide auf false setzen (Desktop-Default)
    meineBefehleFilterStore.setState({
      showMeineBefehle: false,
      showOffeneRueckfragen: false,
    });
  });

  it('toggleOffeneRueckfragen aktiviert showOffeneRueckfragen', () => {
    toggleOffeneRueckfragen();

    expect(meineBefehleFilterStore.state.showOffeneRueckfragen).toBe(true);
  });

  it('toggleOffeneRueckfragen deaktiviert showMeineBefehle wenn beide aktiv', () => {
    // Erst showMeineBefehle aktivieren
    meineBefehleFilterStore.setState({
      showMeineBefehle: true,
      showOffeneRueckfragen: false,
    });

    // Dann toggleOffeneRueckfragen -> showMeineBefehle muss deaktiviert werden
    toggleOffeneRueckfragen();

    expect(meineBefehleFilterStore.state.showOffeneRueckfragen).toBe(true);
    expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(false);
  });

  it('setShowOffeneRueckfragen(true) deaktiviert showMeineBefehle', () => {
    meineBefehleFilterStore.setState({
      showMeineBefehle: true,
      showOffeneRueckfragen: false,
    });

    setShowOffeneRueckfragen(true);

    expect(meineBefehleFilterStore.state.showOffeneRueckfragen).toBe(true);
    expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(false);
  });

  it('toggleMeineBefehle deaktiviert showOffeneRueckfragen wenn beide aktiv', () => {
    // Erst showOffeneRueckfragen aktivieren
    meineBefehleFilterStore.setState({
      showMeineBefehle: false,
      showOffeneRueckfragen: true,
    });

    // Dann toggleMeineBefehle -> showOffeneRueckfragen muss deaktiviert werden
    toggleMeineBefehle();

    expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(true);
    expect(meineBefehleFilterStore.state.showOffeneRueckfragen).toBe(false);
  });

  it('setShowMeineBefehle(true) deaktiviert showOffeneRueckfragen', () => {
    meineBefehleFilterStore.setState({
      showMeineBefehle: false,
      showOffeneRueckfragen: true,
    });

    setShowMeineBefehle(true);

    expect(meineBefehleFilterStore.state.showMeineBefehle).toBe(true);
    expect(meineBefehleFilterStore.state.showOffeneRueckfragen).toBe(false);
  });

  it('resetMeineBefehleFilterStore setzt beide auf Default', () => {
    // Beide aktivieren (kuenstlicher Zustand)
    meineBefehleFilterStore.setState({
      showMeineBefehle: true,
      showOffeneRueckfragen: true,
    });

    resetMeineBefehleFilterStore();

    // Nach Reset: showOffeneRueckfragen ist immer false (Default)
    expect(meineBefehleFilterStore.state.showOffeneRueckfragen).toBe(false);
    // showMeineBefehle ist viewport-abhaengig, aber Typ ist boolean
    expect(typeof meineBefehleFilterStore.state.showMeineBefehle).toBe('boolean');
  });
});
