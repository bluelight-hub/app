/**
 * Unit-Tests für `useEinsatzActionsModule`.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEinsatzActionsModule } from '../useEinsatzActionsModule';

describe('useEinsatzActionsModule', () => {
  const baseParams = () => ({
    onOpenAudioDialog: vi.fn(),
    onOpenExterneEinladenDialog: vi.fn(),
    onOpenEndConfirmation: vi.fn(),
    isFuehrungskraft: false,
    canEndEinsatz: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enthält immer Audio-Einstellungen und Einsatz beenden', () => {
    const params = baseParams();
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const names = result.current.subPages.map((page) => page.name);
    expect(names).toContain('Audio-Einstellungen');
    expect(names).toContain('Einsatz beenden');
  });

  it('blendet „Externe einladen" für Nicht-Führungskräfte aus', () => {
    const params = { ...baseParams(), isFuehrungskraft: false };
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const names = result.current.subPages.map((page) => page.name);
    expect(names).not.toContain('Externe einladen');
  });

  it('zeigt „Externe einladen" für Führungskräfte', () => {
    const params = { ...baseParams(), isFuehrungskraft: true };
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const names = result.current.subPages.map((page) => page.name);
    expect(names).toContain('Externe einladen');
  });

  it('setzt „Einsatz beenden" auf disabled wenn canEndEinsatz=false', () => {
    const params = { ...baseParams(), canEndEinsatz: false };
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const endEntry = result.current.subPages.find((page) => page.id === 'einsatz-beenden');
    expect(endEntry?.disabled).toBe(true);
    expect(endEntry?.disabledReason).toBe('Einsatz bereits abgeschlossen oder archiviert');
  });

  it('„Einsatz beenden" ist aktiv (nicht disabled) wenn canEndEinsatz=true', () => {
    const params = { ...baseParams(), canEndEinsatz: true };
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const endEntry = result.current.subPages.find((page) => page.id === 'einsatz-beenden');
    expect(endEntry?.disabled).toBe(false);
    expect(endEntry?.disabledReason).toBeUndefined();
    expect(endEntry?.destructive).toBe(true);
  });

  it('ruft beim Ausführen von „Audio-Einstellungen" den entsprechenden Callback auf', () => {
    const params = baseParams();
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const audioEntry = result.current.subPages.find((page) => page.id === 'einsatz-audio-settings');
    audioEntry?.action?.();

    expect(params.onOpenAudioDialog).toHaveBeenCalledTimes(1);
    expect(params.onOpenEndConfirmation).not.toHaveBeenCalled();
    expect(params.onOpenExterneEinladenDialog).not.toHaveBeenCalled();
  });

  it('ruft beim Ausführen von „Externe einladen" den entsprechenden Callback auf', () => {
    const params = { ...baseParams(), isFuehrungskraft: true };
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const externeEntry = result.current.subPages.find((page) => page.id === 'einsatz-externe-einladen');
    externeEntry?.action?.();

    expect(params.onOpenExterneEinladenDialog).toHaveBeenCalledTimes(1);
  });

  it('ruft beim Ausführen von „Einsatz beenden" den entsprechenden Callback auf', () => {
    const params = baseParams();
    const { result } = renderHook(() => useEinsatzActionsModule(params));

    const endEntry = result.current.subPages.find((page) => page.id === 'einsatz-beenden');
    endEntry?.action?.();

    expect(params.onOpenEndConfirmation).toHaveBeenCalledTimes(1);
  });
});
