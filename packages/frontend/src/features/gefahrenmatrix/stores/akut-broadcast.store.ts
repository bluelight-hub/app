/**
 * akutBroadcastStore (Issue #627, G4)
 *
 * Client-State für den AKUT-Broadcast-Toast:
 * - `soundEnabled`: abschaltbarer System-Beep (default: an); via
 *   `localStorage` persistiert, damit die Einstellung pro Gerät Bestand hat.
 * - `activeAlerts`: dreistufige Eskalation pro AKUT-Meldung. Die Toast-Komponente
 *   rendert daraus den passenden UI-Zustand (Toast / persistenter Toast /
 *   Header-Banner).
 */

import { createStore } from '@tanstack/react-store';
import type { GefahrentypValue, SchutzobjektValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

export type AkutAlertStage = 'toast' | 'persistent' | 'banner';

export interface AkutAlert {
  id: string;
  einsatzId: string;
  gefahrentyp: GefahrentypValue;
  schutzobjekt: SchutzobjektValue;
  aktualisiertVon: string;
  receivedAt: number;
  stage: AkutAlertStage;
}

export interface AkutBroadcastState {
  soundEnabled: boolean;
  activeAlerts: AkutAlert[];
}

const SOUND_STORAGE_KEY = 'bluelight:akut-sound-enabled';

function loadSoundEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

function persistSoundEnabled(value: boolean): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Storage-Quota / Private-Mode — kein harter Fehler.
  }
}

export const akutBroadcastStore = createStore<AkutBroadcastState>({
  soundEnabled: loadSoundEnabled(),
  activeAlerts: [],
});

export const akutBroadcastActions = {
  toggleSound(): void {
    akutBroadcastStore.setState((s) => {
      const next = !s.soundEnabled;
      persistSoundEnabled(next);
      return { ...s, soundEnabled: next };
    });
  },
  setSoundEnabled(value: boolean): void {
    akutBroadcastStore.setState((s) => {
      if (s.soundEnabled === value) return s;
      persistSoundEnabled(value);
      return { ...s, soundEnabled: value };
    });
  },
  /**
   * Fügt einen neuen AKUT-Alert hinzu (Stage 1). De-Dupe via `id`.
   */
  pushAlert(alert: Omit<AkutAlert, 'stage' | 'receivedAt'> & Partial<Pick<AkutAlert, 'receivedAt'>>): void {
    akutBroadcastStore.setState((s) => {
      if (s.activeAlerts.some((a) => a.id === alert.id)) return s;
      const full: AkutAlert = {
        id: alert.id,
        einsatzId: alert.einsatzId,
        gefahrentyp: alert.gefahrentyp,
        schutzobjekt: alert.schutzobjekt,
        aktualisiertVon: alert.aktualisiertVon,
        receivedAt: alert.receivedAt ?? Date.now(),
        stage: 'toast',
      };
      return { ...s, activeAlerts: [...s.activeAlerts, full] };
    });
  },
  /**
   * Stuft einen Alert hoch (toast → persistent → banner). Terminal bei `banner`.
   */
  escalateAlert(id: string): void {
    akutBroadcastStore.setState((s) => {
      const idx = s.activeAlerts.findIndex((a) => a.id === id);
      if (idx < 0) return s;
      const current = s.activeAlerts[idx];
      const nextStage: AkutAlertStage = current.stage === 'toast' ? 'persistent' : current.stage === 'persistent' ? 'banner' : 'banner';
      if (nextStage === current.stage) return s;
      const next = [...s.activeAlerts];
      next[idx] = { ...current, stage: nextStage };
      return { ...s, activeAlerts: next };
    });
  },
  /** Entfernt einen Alert (Klick, Dismiss, Navigation). */
  dismissAlert(id: string): void {
    akutBroadcastStore.setState((s) => {
      const next = s.activeAlerts.filter((a) => a.id !== id);
      if (next.length === s.activeAlerts.length) return s;
      return { ...s, activeAlerts: next };
    });
  },
  clearAll(): void {
    akutBroadcastStore.setState((s) => (s.activeAlerts.length === 0 ? s : { ...s, activeAlerts: [] }));
  },
};

/**
 * Spielt einen kurzen System-Beep via Web-Audio-API (500 ms, 800 Hz, fade-out).
 * No-Op, wenn `AudioContext` nicht verfügbar ist oder Sound deaktiviert ist.
 */
export function playAkutBeep(): void {
  if (!akutBroadcastStore.state.soundEnabled) return;
  if (typeof window === 'undefined') return;
  const AudioCtor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
  if (!AudioCtor) return;
  try {
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch {
    // jsdom / Feature-Detect-Fail — Sound ist optional.
  }
}
