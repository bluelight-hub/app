/**
 * Tests für FMS-Status Konstanten und Helper-Funktionen.
 */

import { describe, it, expect } from 'vitest';
import {
  FMS_STATUS_LABELS,
  FMS_STATUS_COLORS,
  FMS_STATUS_OPTIONS,
  FMS_BORDER_LEFT_COLORS,
  getStatusClasses,
  getStatusBgClasses,
  getStatusBorderLeftClass,
  isFmsStatus,
  isImEinsatzStatus,
  isEinsatzbereitStatus,
} from '../fms-status.constants';

describe('FMS-Status Konstanten', () => {
  it('enthält Labels für alle Status 0-9', () => {
    for (let i = 0; i <= 9; i++) {
      expect(FMS_STATUS_LABELS[i]).toBeDefined();
      expect(FMS_STATUS_LABELS[i].length).toBeGreaterThan(0);
    }
  });

  it('nutzt BOS-Standard-Labels', () => {
    expect(FMS_STATUS_LABELS[0]).toBe('Notruf');
    expect(FMS_STATUS_LABELS[1]).toBe('Einsatzbereit über Funk');
    expect(FMS_STATUS_LABELS[6]).toBe('Außer Dienst');
    expect(FMS_STATUS_LABELS[9]).toBe('Außerhalb Funkbereich');
  });

  it('FMS_STATUS_OPTIONS enthält alle Status 0-9', () => {
    expect(FMS_STATUS_OPTIONS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('getStatusClasses', () => {
  it('gibt die korrekte Farb-Klasse für bekannten Status zurück', () => {
    expect(getStatusClasses(1)).toBe(FMS_STATUS_COLORS[1]);
    expect(getStatusClasses(6)).toBe(FMS_STATUS_COLORS[6]);
  });

  it('gibt Fallback-Klasse für unbekannten Status zurück', () => {
    expect(getStatusClasses(99)).toBe('bg-gray-500/15 text-gray-600 dark:bg-gray-500/25 dark:text-gray-400');
  });
});

describe('getStatusBgClasses', () => {
  it('extrahiert nur bg- und dark:bg- Klassen', () => {
    const result = getStatusBgClasses(1);
    expect(result).toContain('bg-green-500/15');
    expect(result).toContain('dark:bg-green-500/25');
    expect(result).not.toContain('text-');
  });

  it('gibt Fallback für unbekannten Status zurück', () => {
    const result = getStatusBgClasses(99);
    expect(result).toContain('bg-gray-500/15');
  });
});

describe('getStatusBorderLeftClass', () => {
  it('gibt Border-Farbe für bekannten Status zurück', () => {
    expect(getStatusBorderLeftClass(0)).toBe('border-l-red-600');
    expect(getStatusBorderLeftClass(1)).toBe('border-l-green-500');
    expect(getStatusBorderLeftClass(5)).toBe('border-l-blue-500');
    expect(getStatusBorderLeftClass(8)).toBe('border-l-violet-500');
  });

  it('gibt Fallback-Border für unbekannten Status zurück', () => {
    expect(getStatusBorderLeftClass(42)).toBe('border-l-text-primary');
  });

  it('FMS_BORDER_LEFT_COLORS deckt alle Status 0-9 ab', () => {
    for (let i = 0; i <= 9; i++) {
      expect(FMS_BORDER_LEFT_COLORS[i]).toBeDefined();
    }
  });
});

describe('isFmsStatus', () => {
  it('akzeptiert gültige Status 0-9', () => {
    for (let i = 0; i <= 9; i++) {
      expect(isFmsStatus(i)).toBe(true);
    }
  });

  it('lehnt Werte außerhalb 0-9 ab', () => {
    expect(isFmsStatus(-1)).toBe(false);
    expect(isFmsStatus(10)).toBe(false);
    expect(isFmsStatus(3.5)).toBe(false);
  });

  it('lehnt Nicht-Zahlen ab', () => {
    expect(isFmsStatus('3')).toBe(false);
    expect(isFmsStatus(null)).toBe(false);
    expect(isFmsStatus(undefined)).toBe(false);
    expect(isFmsStatus({})).toBe(false);
  });
});

describe('isImEinsatzStatus', () => {
  it('erkennt Im-Einsatz-Status (3-4)', () => {
    expect(isImEinsatzStatus(3)).toBe(true);
    expect(isImEinsatzStatus(4)).toBe(true);
  });

  it('lehnt andere Status ab', () => {
    expect(isImEinsatzStatus(0)).toBe(false);
    expect(isImEinsatzStatus(2)).toBe(false);
    expect(isImEinsatzStatus(5)).toBe(false);
    expect(isImEinsatzStatus(9)).toBe(false);
  });
});

describe('isEinsatzbereitStatus', () => {
  it('erkennt Einsatzbereit-Status (1-2)', () => {
    expect(isEinsatzbereitStatus(1)).toBe(true);
    expect(isEinsatzbereitStatus(2)).toBe(true);
  });

  it('lehnt andere Status ab', () => {
    expect(isEinsatzbereitStatus(0)).toBe(false);
    expect(isEinsatzbereitStatus(3)).toBe(false);
    expect(isEinsatzbereitStatus(6)).toBe(false);
  });
});
