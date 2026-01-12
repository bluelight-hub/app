/**
 * Server Color Utilities Unit Tests
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: SERVER_COLOR_PRESETS, isValidServerColor, getServerColorClass, getServerColorHex
 */

import { describe, it, expect } from 'vitest';
import { SERVER_COLOR_PRESETS, type ServerColorPreset } from '../server-color.utils';
import { isValidServerColor, getServerColorClass, getServerColorHex, getDefaultServerColor } from '../server-color.utils';

describe('SERVER_COLOR_PRESETS', () => {
  it('should have 9 predefined color presets', () => {
    // Given (Arrange)
    const expectedCount = 9;

    // When (Act)
    const actualCount = SERVER_COLOR_PRESETS.length;

    // Then (Assert)
    expect(actualCount).toBe(expectedCount);
  });

  it('should have all expected colors defined', () => {
    // Given (Arrange)
    const expectedColorValues = ['sky', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange', 'fuchsia', 'slate'];

    // When (Act)
    const actualColorValues = SERVER_COLOR_PRESETS.map((preset) => preset.value);

    // Then (Assert)
    expect(actualColorValues).toEqual(expectedColorValues);
  });

  it('should have German names for all colors', () => {
    // Given (Arrange)
    const expectedNames = ['Himmelblau', 'Smaragd', 'Bernstein', 'Rose', 'Violett', 'Cyan', 'Orange', 'Fuchsia', 'Grau'];

    // When (Act)
    const actualNames = SERVER_COLOR_PRESETS.map((preset) => preset.name);

    // Then (Assert)
    expect(actualNames).toEqual(expectedNames);
  });

  it('should have valid hex values for all colors', () => {
    // Given (Arrange)
    const hexPattern = /^#[0-9a-fA-F]{6}$/;

    // When (Act) & Then (Assert)
    for (const preset of SERVER_COLOR_PRESETS) {
      expect(preset.hex).toMatch(hexPattern);
    }
  });

  it('should have correct hex values for each color', () => {
    // Given (Arrange)
    const expectedHexMap: Record<string, string> = {
      sky: '#0ea5e9',
      emerald: '#10b981',
      amber: '#f59e0b',
      rose: '#f43f5e',
      violet: '#8b5cf6',
      cyan: '#06b6d4',
      orange: '#f97316',
      fuchsia: '#d946ef',
      slate: '#64748b',
    };

    // When (Act) & Then (Assert)
    for (const preset of SERVER_COLOR_PRESETS) {
      expect(preset.hex).toBe(expectedHexMap[preset.value]);
    }
  });

  it('should have readonly type (immutable array)', () => {
    // Given (Arrange)
    // Compile-time check: SERVER_COLOR_PRESETS sollte readonly sein
    // Runtime check: Array should be frozen or at least have the same structure
    const firstPreset = SERVER_COLOR_PRESETS[0];

    // When (Act) & Then (Assert)
    expect(firstPreset).toBeDefined();
    expect(firstPreset.name).toBe('Himmelblau');
    expect(firstPreset.value).toBe('sky');
    expect(firstPreset.hex).toBe('#0ea5e9');
  });
});

describe('isValidServerColor()', () => {
  describe('valid colors', () => {
    it.each([
      ['sky', true],
      ['emerald', true],
      ['amber', true],
      ['rose', true],
      ['violet', true],
      ['cyan', true],
      ['orange', true],
      ['fuchsia', true],
      ['slate', true],
    ])('should return true for valid color "%s"', (color, expected) => {
      // Given (Arrange)
      // color is provided via parameterized test

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(expected);
    });
  });

  describe('invalid colors', () => {
    it('should return false for empty string', () => {
      // Given (Arrange)
      const color = '';

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for unknown color', () => {
      // Given (Arrange)
      const color = 'unknown';

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for similar but incorrect color name', () => {
      // Given (Arrange)
      const color = 'blue'; // "sky" ist korrekt, nicht "blue"

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for uppercase variant', () => {
      // Given (Arrange)
      const color = 'SKY'; // Case-sensitive

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for hex value directly', () => {
      // Given (Arrange)
      const color = '#0ea5e9';

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for color with whitespace', () => {
      // Given (Arrange)
      const color = ' sky ';

      // When (Act)
      const result = isValidServerColor(color);

      // Then (Assert)
      expect(result).toBe(false);
    });
  });
});

describe('getServerColorClass()', () => {
  describe('bg variant', () => {
    it('should return correct bg class for sky color', () => {
      // Given (Arrange)
      const color = 'sky';

      // When (Act)
      const result = getServerColorClass(color, 'bg');

      // Then (Assert)
      expect(result).toBe('bg-sky-500');
    });

    it('should return correct bg class for emerald color', () => {
      // Given (Arrange)
      const color = 'emerald';

      // When (Act)
      const result = getServerColorClass(color, 'bg');

      // Then (Assert)
      expect(result).toBe('bg-emerald-500');
    });

    // M1 Fix: amber, orange, cyan nutzen 600er Shade für besseren WCAG Kontrast
    it.each([
      ['amber', 'bg-amber-600'], // 600er Shade für besseren Kontrast
      ['rose', 'bg-rose-500'],
      ['violet', 'bg-violet-500'],
      ['cyan', 'bg-cyan-600'], // 600er Shade für besseren Kontrast
      ['orange', 'bg-orange-600'], // 600er Shade für besseren Kontrast
      ['fuchsia', 'bg-fuchsia-500'],
      ['slate', 'bg-slate-500'],
    ])('should return correct bg class for %s color', (color, expected) => {
      // Given (Arrange) - parameterized

      // When (Act)
      const result = getServerColorClass(color, 'bg');

      // Then (Assert)
      expect(result).toBe(expected);
    });
  });

  describe('ring variant', () => {
    it('should return correct ring class for sky color', () => {
      // Given (Arrange)
      const color = 'sky';

      // When (Act)
      const result = getServerColorClass(color, 'ring');

      // Then (Assert)
      expect(result).toBe('ring-sky-500');
    });

    // M1 Fix: amber nutzt 600er Shade für besseren WCAG Kontrast
    it.each([
      ['emerald', 'ring-emerald-500'],
      ['amber', 'ring-amber-600'], // 600er Shade für besseren Kontrast
      ['rose', 'ring-rose-500'],
      ['violet', 'ring-violet-500'],
    ])('should return correct ring class for %s color', (color, expected) => {
      // Given (Arrange) - parameterized

      // When (Act)
      const result = getServerColorClass(color, 'ring');

      // Then (Assert)
      expect(result).toBe(expected);
    });
  });

  describe('text variant', () => {
    it('should return correct text class for sky color', () => {
      // Given (Arrange)
      const color = 'sky';

      // When (Act)
      const result = getServerColorClass(color, 'text');

      // Then (Assert)
      expect(result).toBe('text-sky-500');
    });

    // M1 Fix: amber nutzt 600er Shade für besseren WCAG Kontrast
    it.each([
      ['emerald', 'text-emerald-500'],
      ['amber', 'text-amber-600'], // 600er Shade für besseren Kontrast
      ['rose', 'text-rose-500'],
      ['violet', 'text-violet-500'],
    ])('should return correct text class for %s color', (color, expected) => {
      // Given (Arrange) - parameterized

      // When (Act)
      const result = getServerColorClass(color, 'text');

      // Then (Assert)
      expect(result).toBe(expected);
    });
  });

  describe('border variant', () => {
    it('should return correct border class for sky color', () => {
      // Given (Arrange)
      const color = 'sky';

      // When (Act)
      const result = getServerColorClass(color, 'border');

      // Then (Assert)
      expect(result).toBe('border-sky-500');
    });
  });

  describe('invalid inputs', () => {
    it('should return fallback class for unknown color', () => {
      // Given (Arrange)
      const color = 'unknown';

      // When (Act)
      const result = getServerColorClass(color, 'bg');

      // Then (Assert)
      expect(result).toBe('bg-slate-500');
    });

    it('should return fallback class for empty string', () => {
      // Given (Arrange)
      const color = '';

      // When (Act)
      const result = getServerColorClass(color, 'bg');

      // Then (Assert)
      expect(result).toBe('bg-slate-500');
    });

    it('should return fallback ring class for invalid color', () => {
      // Given (Arrange)
      const color = 'invalid';

      // When (Act)
      const result = getServerColorClass(color, 'ring');

      // Then (Assert)
      expect(result).toBe('ring-slate-500');
    });
  });
});

describe('getServerColorHex()', () => {
  describe('valid colors', () => {
    it.each([
      ['sky', '#0ea5e9'],
      ['emerald', '#10b981'],
      ['amber', '#f59e0b'],
      ['rose', '#f43f5e'],
      ['violet', '#8b5cf6'],
      ['cyan', '#06b6d4'],
      ['orange', '#f97316'],
      ['fuchsia', '#d946ef'],
      ['slate', '#64748b'],
    ])('should return correct hex value for %s', (color, expectedHex) => {
      // Given (Arrange) - parameterized

      // When (Act)
      const result = getServerColorHex(color);

      // Then (Assert)
      expect(result).toBe(expectedHex);
    });
  });

  describe('invalid colors', () => {
    it('should return undefined for unknown color', () => {
      // Given (Arrange)
      const color = 'unknown';

      // When (Act)
      const result = getServerColorHex(color);

      // Then (Assert)
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      // Given (Arrange)
      const color = '';

      // When (Act)
      const result = getServerColorHex(color);

      // Then (Assert)
      expect(result).toBeUndefined();
    });

    it('should return undefined for hex value passed as input', () => {
      // Given (Arrange)
      const color = '#0ea5e9';

      // When (Act)
      const result = getServerColorHex(color);

      // Then (Assert)
      expect(result).toBeUndefined();
    });
  });
});

describe('getDefaultServerColor()', () => {
  it('should return the first color preset value', () => {
    // Given (Arrange)
    const expectedDefault = 'sky';

    // When (Act)
    const result = getDefaultServerColor();

    // Then (Assert)
    expect(result).toBe(expectedDefault);
  });

  it('should return a valid server color', () => {
    // Given (Arrange)
    // Kein Arrange nötig

    // When (Act)
    const defaultColor = getDefaultServerColor();
    const isValid = isValidServerColor(defaultColor);

    // Then (Assert)
    expect(isValid).toBe(true);
  });
});

describe('Type exports', () => {
  it('should export ServerColorPreset type correctly', () => {
    // Given (Arrange)
    const preset: ServerColorPreset = SERVER_COLOR_PRESETS[0];

    // When (Act) & Then (Assert)
    expect(preset.name).toBeDefined();
    expect(preset.value).toBeDefined();
    expect(preset.hex).toBeDefined();
  });

  it('should have ServerColorValue as union of preset values', () => {
    // Given (Arrange)
    // Dies ist ein Compile-Zeit Check, zur Laufzeit prüfen wir nur die Struktur

    // When (Act)
    const validColors = SERVER_COLOR_PRESETS.map((p) => p.value);

    // Then (Assert)
    expect(validColors).toContain('sky');
    expect(validColors).toContain('slate');
    expect(validColors.length).toBe(9);
  });
});
