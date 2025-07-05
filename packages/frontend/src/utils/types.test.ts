import { describe, expect, it } from 'vitest';
import { BaseAtomProps, TestableComponent } from './types';

describe('TypeScript Type Definitions', () => {
  describe('TestableComponent', () => {
    it('should allow data-testid property', () => {
      // Type-Check
      const component: TestableComponent = {
        'data-testid': 'test-id',
      };

      expect(component['data-testid']).toBe('test-id');
    });

    it('should work with undefined data-testid property', () => {
      // Type-Check
      const component: TestableComponent = {};

      expect(component['data-testid']).toBeUndefined();
    });
  });

  describe('BaseAtomProps', () => {
    it('should extend TestableComponent', () => {
      // Type-Check
      const props: BaseAtomProps = {
        'data-testid': 'test-id',
        className: 'test-class',
      };

      expect(props['data-testid']).toBe('test-id');
      expect(props.className).toBe('test-class');
    });

    it('should work with just className', () => {
      // Type-Check
      const props: BaseAtomProps = {
        className: 'test-class',
      };

      expect(props.className).toBe('test-class');
      expect(props['data-testid']).toBeUndefined();
    });

    it('should work with no properties', () => {
      // Type-Check
      const props: BaseAtomProps = {};

      expect(props.className).toBeUndefined();
      expect(props['data-testid']).toBeUndefined();
    });
  });
});
