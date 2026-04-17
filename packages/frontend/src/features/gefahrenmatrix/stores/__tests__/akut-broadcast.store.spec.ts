import { beforeEach, describe, expect, it, vi } from 'vitest';
import { akutBroadcastActions, akutBroadcastStore, playAkutBeep } from '../akut-broadcast.store';

describe('akutBroadcastStore', () => {
  beforeEach(() => {
    akutBroadcastActions.clearAll();
    akutBroadcastActions.setSoundEnabled(true);
  });

  it('pushAlert fügt neuen Alert mit stage=toast hinzu', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u1' });
    expect(akutBroadcastStore.state.activeAlerts).toHaveLength(1);
    expect(akutBroadcastStore.state.activeAlerts[0].stage).toBe('toast');
  });

  it('pushAlert dedupliziert nach id', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u1' });
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u1' });
    expect(akutBroadcastStore.state.activeAlerts).toHaveLength(1);
  });

  it('escalateAlert: toast → persistent → banner, dann terminal', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u1' });
    akutBroadcastActions.escalateAlert('a1');
    expect(akutBroadcastStore.state.activeAlerts[0].stage).toBe('persistent');
    akutBroadcastActions.escalateAlert('a1');
    expect(akutBroadcastStore.state.activeAlerts[0].stage).toBe('banner');
    akutBroadcastActions.escalateAlert('a1');
    expect(akutBroadcastStore.state.activeAlerts[0].stage).toBe('banner');
  });

  it('dismissAlert entfernt den Alert', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u1' });
    akutBroadcastActions.dismissAlert('a1');
    expect(akutBroadcastStore.state.activeAlerts).toHaveLength(0);
  });

  it('toggleSound schaltet zwischen true/false um', () => {
    akutBroadcastActions.setSoundEnabled(true);
    akutBroadcastActions.toggleSound();
    expect(akutBroadcastStore.state.soundEnabled).toBe(false);
    akutBroadcastActions.toggleSound();
    expect(akutBroadcastStore.state.soundEnabled).toBe(true);
  });
});

describe('playAkutBeep', () => {
  it('respektiert soundEnabled=false (kein AudioContext-Call)', () => {
    const audioSpy = vi.fn();
    vi.stubGlobal('AudioContext', audioSpy);
    akutBroadcastActions.setSoundEnabled(false);
    playAkutBeep();
    expect(audioSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('nutzt AudioContext wenn soundEnabled=true', () => {
    const start = vi.fn();
    const stop = vi.fn();
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return { start, stop, connect: vi.fn(), frequency: { setValueAtTime: vi.fn() }, type: '', onended: null as null | (() => void) };
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
      close() {
        /* no-op */
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    akutBroadcastActions.setSoundEnabled(true);
    playAkutBeep();
    expect(start).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
