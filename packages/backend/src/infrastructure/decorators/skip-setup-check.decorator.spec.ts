// @ts-nocheck
import { Reflector } from '@nestjs/core';
import { SKIP_SETUP_CHECK_KEY, SkipSetupCheck } from './skip-setup-check.decorator';

describe('SkipSetupCheck Decorator', () => {
  const reflector = new Reflector();

  describe('SKIP_SETUP_CHECK_KEY', () => {
    it('should export the correct metadata key', () => {
      // Given - the exported constant
      const key = SKIP_SETUP_CHECK_KEY;

      // When & Then - verify value
      expect(key).toBe('skipSetupCheck');
    });
  });

  describe('SkipSetupCheck', () => {
    it('should set metadata correctly on method', () => {
      // Given
      class TestController {
        @SkipSetupCheck()
        testMethod() {
          return 'test';
        }
      }

      // When
      const metadata = reflector.get<boolean>(SKIP_SETUP_CHECK_KEY, TestController.prototype.testMethod);

      // Then
      expect(metadata).toBe(true);
    });

    it('should set metadata correctly on class', () => {
      // Given
      @SkipSetupCheck()
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      // When
      const metadata = reflector.get<boolean>(SKIP_SETUP_CHECK_KEY, TestController);

      // Then
      expect(metadata).toBe(true);
    });

    it('should not set metadata when decorator is not applied', () => {
      // Given
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      // When
      const metadata = reflector.get<boolean>(SKIP_SETUP_CHECK_KEY, TestController.prototype.testMethod);

      // Then
      expect(metadata).toBeUndefined();
    });

    it('should work with getAllAndOverride for both class and method level', () => {
      // Given
      @SkipSetupCheck()
      class ClassLevelController {
        testMethod() {
          return 'test';
        }
      }

      class MethodLevelController {
        @SkipSetupCheck()
        testMethod() {
          return 'test';
        }
      }

      // When - Class level
      const classMetadata = reflector.getAllAndOverride<boolean>(SKIP_SETUP_CHECK_KEY, [ClassLevelController.prototype.testMethod, ClassLevelController]);

      // When - Method level
      const methodMetadata = reflector.getAllAndOverride<boolean>(SKIP_SETUP_CHECK_KEY, [MethodLevelController.prototype.testMethod, MethodLevelController]);

      // Then
      expect(classMetadata).toBe(true);
      expect(methodMetadata).toBe(true);
    });

    it('should detect method-level decorator when class has no decorator', () => {
      // Given - Only method has decorator, class does not
      class PartialController {
        @SkipSetupCheck()
        decoratedMethod() {
          return 'skipped';
        }

        regularMethod() {
          return 'not skipped';
        }
      }

      // When - Check decorated method
      const decoratedMetadata = reflector.getAllAndOverride<boolean>(SKIP_SETUP_CHECK_KEY, [PartialController.prototype.decoratedMethod, PartialController]);

      // When - Check regular method
      const regularMetadata = reflector.getAllAndOverride<boolean>(SKIP_SETUP_CHECK_KEY, [PartialController.prototype.regularMethod, PartialController]);

      // Then
      expect(decoratedMetadata).toBe(true);
      expect(regularMetadata).toBeUndefined();
    });
  });
});
