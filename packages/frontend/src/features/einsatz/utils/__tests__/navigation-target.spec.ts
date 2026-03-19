/**
 * Unit-Tests für resolveNavigationTarget()
 *
 * Story 2.4, Task 1 + Task 6.1:
 * - Route-Mapping für alle Quelltypen
 * - Verfügbarkeits-Check via checkAccessibility
 * - Fallback-Werte bei 'unknown' und nicht-erreichbaren Zielen
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeKeyboardNavigationFlag, resolveNavigationTarget, type NavigationSourceType } from '../navigation-target';

const EINSATZ_ID = 'einsatz-abc';
const alwaysAccessible = vi.fn(() => true);
const neverAccessible = vi.fn(() => false);

beforeEach(() => {
  alwaysAccessible.mockClear();
  neverAccessible.mockClear();
  consumeKeyboardNavigationFlag();
});

describe('resolveNavigationTarget', () => {
  it('mappt etb-entry auf die ETB-Route im Führungs-Modul', () => {
    const target = resolveNavigationTarget('etb-entry', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/führung/etb');
    expect(target.module).toBe('Führung');
    expect(target.available).toBe(true);
    expect(target.label).toBe('Zum ETB wechseln');
  });

  it('mappt lagekarte-update auf die Karten-Route im Übersicht-Modul', () => {
    const target = resolveNavigationTarget('lagekarte-update', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/übersicht/karte');
    expect(target.module).toBe('Übersicht');
    expect(target.available).toBe(true);
  });

  it('mappt kraefte-status auf die Kräfte-Dashboard-Route', () => {
    const target = resolveNavigationTarget('kraefte-status', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/kräfte/dashboard');
    expect(target.module).toBe('Kräfte');
    expect(target.available).toBe(true);
  });

  it('mappt befehl auf die Befehle-Route im Führungs-Modul', () => {
    const target = resolveNavigationTarget('befehl', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/führung/befehle');
    expect(target.module).toBe('Führung');
    expect(target.available).toBe(true);
  });

  it('mappt sicherheit auf die Eigenschutz-Route', () => {
    const target = resolveNavigationTarget('sicherheit', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/sicherheit/eigenschutz');
    expect(target.module).toBe('Sicherheit');
    expect(target.available).toBe(true);
  });

  it('mappt patienten auf die Patienten-Route', () => {
    const target = resolveNavigationTarget('patienten', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/patienten');
    expect(target.module).toBe('Patienten');
    expect(target.available).toBe(true);
  });

  it('mappt logistik auf die Material-Route', () => {
    const target = resolveNavigationTarget('logistik', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/logistik/material');
    expect(target.module).toBe('Logistik');
    expect(target.available).toBe(true);
  });

  it('gibt Fallback ohne Route zurück für Typ "unknown"', () => {
    const target = resolveNavigationTarget('unknown', EINSATZ_ID, alwaysAccessible);

    expect(target.route).toBeNull();
    expect(target.available).toBe(false);
    expect(target.fallbackAction).toBe('Weiter beobachten');
    expect(target.label).toBe('Bereich in Vorbereitung');
    expect(alwaysAccessible).not.toHaveBeenCalled();
  });

  it('setzt available=false und route=null wenn Ziel nicht erreichbar', () => {
    const target = resolveNavigationTarget('etb-entry', EINSATZ_ID, neverAccessible);

    expect(target.route).toBeNull();
    expect(target.available).toBe(false);
    expect(target.fallbackAction).toContain('nicht zugänglich');
    expect(neverAccessible).toHaveBeenCalledWith(`/app/einsatz/${EINSATZ_ID}/führung/etb`, EINSATZ_ID);
  });

  it('ersetzt $einsatzId in der Route beim Accessibility-Check', () => {
    const checkFn = vi.fn(() => true);
    resolveNavigationTarget('kraefte-status', 'test-123', checkFn);

    expect(checkFn).toHaveBeenCalledWith('/app/einsatz/test-123/kräfte/dashboard', 'test-123');
  });

  it('gibt die Template-Route (mit $einsatzId) zurück wenn verfügbar', () => {
    const target = resolveNavigationTarget('etb-entry', 'xyz', alwaysAccessible);

    expect(target.route).toBe('/app/einsatz/$einsatzId/führung/etb');
  });

  it('benennt Fallback-Aktion "In Übersicht bleiben" bei verfügbarem Ziel', () => {
    const target = resolveNavigationTarget('etb-entry', EINSATZ_ID, alwaysAccessible);

    expect(target.fallbackAction).toBe('In Übersicht bleiben');
  });

  it('prüft Verfügbarkeit für alle nicht-unknown Quelltypen', () => {
    const sourceTypes: NavigationSourceType[] = ['etb-entry', 'lagekarte-update', 'kraefte-status', 'befehl', 'sicherheit', 'patienten', 'logistik'];

    for (const sourceType of sourceTypes) {
      const checkFn = vi.fn(() => false);
      const target = resolveNavigationTarget(sourceType, EINSATZ_ID, checkFn);

      expect(checkFn).toHaveBeenCalledOnce();
      expect(target.available).toBe(false);
      expect(target.route).toBeNull();
    }
  });
});

describe('consumeKeyboardNavigationFlag', () => {
  it('gibt false zurück ohne vorherige Keyboard-Interaktion', () => {
    expect(consumeKeyboardNavigationFlag()).toBe(false);
  });

  it('gibt true zurück nach Enter-Tastendruck und setzt Flag zurück', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(consumeKeyboardNavigationFlag()).toBe(true);
    expect(consumeKeyboardNavigationFlag()).toBe(false);
  });

  it('gibt true zurück nach Space-Tastendruck', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(consumeKeyboardNavigationFlag()).toBe(true);
  });

  it('wird durch Maus-Interaktion zurückgesetzt', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(consumeKeyboardNavigationFlag()).toBe(false);
  });
});
