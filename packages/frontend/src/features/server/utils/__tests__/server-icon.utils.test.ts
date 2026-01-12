/**
 * Server Icon Utilities Unit Tests
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: Icon-Presets, Icon-Komponenten, Fallback-Verhalten
 */

import { describe, it, expect } from 'vitest';
import { SERVER_ICON_PRESETS, type ServerIconPreset, type ServerIconValue } from '../../constants/server-icons';
import { isValidServerIcon, getServerIconComponent, getDefaultServerIcon, getServerIconName, getServerIconPreset } from '../server-icon.utils';

describe('SERVER_ICON_PRESETS Konstante', () => {
  it('should have exactly 8 icon presets defined', () => {
    // Given (Arrange)
    const expectedCount = 8;

    // When (Act)
    const actualCount = SERVER_ICON_PRESETS.length;

    // Then (Assert)
    expect(actualCount).toBe(expectedCount);
  });

  it('should have all expected icon values', () => {
    // Given (Arrange)
    const expectedValues = ['building', 'shield', 'star', 'pin', 'server', 'home', 'academic', 'heart'];

    // When (Act)
    const actualValues = SERVER_ICON_PRESETS.map((preset) => preset.value);

    // Then (Assert)
    expect(actualValues).toEqual(expectedValues);
  });

  it('should have German names for all icons', () => {
    // Given (Arrange)
    const expectedNames = ['Gebäude', 'Schild', 'Stern', 'Pin', 'Server', 'Haus', 'Akademie', 'Herz'];

    // When (Act)
    const actualNames = SERVER_ICON_PRESETS.map((preset) => preset.name);

    // Then (Assert)
    expect(actualNames).toEqual(expectedNames);
  });

  it('should have an icon component for each preset', () => {
    // Given (Arrange)
    // When (Act)
    for (const preset of SERVER_ICON_PRESETS) {
      // Then (Assert)
      expect(preset.icon).toBeDefined();
      expect(typeof preset.icon).toBe('function');
    }
  });

  it('should have type-safe ServerIconPreset interface', () => {
    // Given (Arrange)
    const preset: ServerIconPreset = SERVER_ICON_PRESETS[0];

    // When (Act)
    // Then (Assert) - Type checks at compile time
    expect(preset).toHaveProperty('name');
    expect(preset).toHaveProperty('value');
    expect(preset).toHaveProperty('icon');
    expect(typeof preset.name).toBe('string');
    expect(typeof preset.value).toBe('string');
  });
});

describe('isValidServerIcon()', () => {
  describe('Valid icons', () => {
    it.each([
      ['building', true],
      ['shield', true],
      ['star', true],
      ['pin', true],
      ['server', true],
      ['home', true],
      ['academic', true],
      ['heart', true],
    ])('should return true for valid icon "%s"', (icon, expected) => {
      // Given (Arrange)
      // When (Act)
      const result = isValidServerIcon(icon);

      // Then (Assert)
      expect(result).toBe(expected);
    });
  });

  describe('Invalid icons', () => {
    it('should return false for unknown icon string', () => {
      // Given (Arrange)
      const invalidIcon = 'unknown-icon';

      // When (Act)
      const result = isValidServerIcon(invalidIcon);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      // Given (Arrange)
      const emptyIcon = '';

      // When (Act)
      const result = isValidServerIcon(emptyIcon);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for numeric string', () => {
      // Given (Arrange)
      const numericIcon = '123';

      // When (Act)
      const result = isValidServerIcon(numericIcon);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for icon with wrong case', () => {
      // Given (Arrange)
      const wrongCaseIcon = 'Building';

      // When (Act)
      const result = isValidServerIcon(wrongCaseIcon);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false for icon with whitespace', () => {
      // Given (Arrange)
      const whitespaceIcon = ' building ';

      // When (Act)
      const result = isValidServerIcon(whitespaceIcon);

      // Then (Assert)
      expect(result).toBe(false);
    });
  });
});

describe('getServerIconComponent()', () => {
  describe('Valid icons', () => {
    it.each(['building', 'shield', 'star', 'pin', 'server', 'home', 'academic', 'heart'])('should return a component for valid icon "%s"', (icon) => {
      // Given (Arrange)
      // When (Act)
      const component = getServerIconComponent(icon);

      // Then (Assert)
      expect(component).toBeDefined();
      expect(typeof component).toBe('function');
    });
  });

  describe('Invalid icons', () => {
    it('should return undefined for unknown icon', () => {
      // Given (Arrange)
      const unknownIcon = 'unknown-icon';

      // When (Act)
      const component = getServerIconComponent(unknownIcon);

      // Then (Assert)
      expect(component).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      // Given (Arrange)
      const emptyIcon = '';

      // When (Act)
      const component = getServerIconComponent(emptyIcon);

      // Then (Assert)
      expect(component).toBeUndefined();
    });
  });
});

describe('getDefaultServerIcon()', () => {
  it('should return the server icon component as default', () => {
    // Given (Arrange)
    const expectedComponent = getServerIconComponent('server');

    // When (Act)
    const defaultIcon = getDefaultServerIcon();

    // Then (Assert)
    expect(defaultIcon).toBeDefined();
    expect(typeof defaultIcon).toBe('function');
    expect(defaultIcon).toBe(expectedComponent);
  });

  it('should return a valid React component', () => {
    // Given (Arrange)
    // When (Act)
    const defaultIcon = getDefaultServerIcon();

    // Then (Assert)
    expect(defaultIcon).toBeDefined();
    // Check it's a function (React component)
    expect(typeof defaultIcon).toBe('function');
  });
});

describe('getServerIconName()', () => {
  describe('Valid icons', () => {
    it.each([
      ['building', 'Gebäude'],
      ['shield', 'Schild'],
      ['star', 'Stern'],
      ['pin', 'Pin'],
      ['server', 'Server'],
      ['home', 'Haus'],
      ['academic', 'Akademie'],
      ['heart', 'Herz'],
    ])('should return German name "%s" for icon "%s"', (icon, expectedName) => {
      // Given (Arrange)
      // When (Act)
      const name = getServerIconName(icon);

      // Then (Assert)
      expect(name).toBe(expectedName);
    });
  });

  describe('Invalid icons', () => {
    it('should return undefined for unknown icon', () => {
      // Given (Arrange)
      const unknownIcon = 'unknown-icon';

      // When (Act)
      const name = getServerIconName(unknownIcon);

      // Then (Assert)
      expect(name).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      // Given (Arrange)
      const emptyIcon = '';

      // When (Act)
      const name = getServerIconName(emptyIcon);

      // Then (Assert)
      expect(name).toBeUndefined();
    });
  });
});

describe('getServerIconPreset()', () => {
  describe('Valid icons', () => {
    it('should return the full preset for a valid icon', () => {
      // Given (Arrange)
      const iconValue = 'building';

      // When (Act)
      const preset = getServerIconPreset(iconValue);

      // Then (Assert)
      expect(preset).toBeDefined();
      expect(preset?.value).toBe('building');
      expect(preset?.name).toBe('Gebäude');
      expect(preset?.icon).toBeDefined();
    });

    it('should return preset with all properties for server icon', () => {
      // Given (Arrange)
      const iconValue = 'server';

      // When (Act)
      const preset = getServerIconPreset(iconValue);

      // Then (Assert)
      expect(preset).toEqual(
        expect.objectContaining({
          name: 'Server',
          value: 'server',
        }),
      );
    });
  });

  describe('Invalid icons', () => {
    it('should return undefined for unknown icon', () => {
      // Given (Arrange)
      const unknownIcon = 'unknown-icon';

      // When (Act)
      const preset = getServerIconPreset(unknownIcon);

      // Then (Assert)
      expect(preset).toBeUndefined();
    });
  });
});

describe('Type safety', () => {
  it('should correctly type ServerIconValue', () => {
    // Given (Arrange)
    const validValue: ServerIconValue = 'building';

    // When (Act)
    const isValid = isValidServerIcon(validValue);

    // Then (Assert)
    expect(isValid).toBe(true);
  });
});
