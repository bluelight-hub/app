// @ts-nocheck
import { Reflector } from '@nestjs/core';
import { SKIP_SERVER_ACCESS_KEY, SkipServerAccess } from './skip-server-access.decorator';

describe('SkipServerAccess Decorator', () => {
  const reflector = new Reflector();

  describe('on method level', () => {
    it('should set metadata with SKIP_SERVER_ACCESS_KEY to true', () => {
      // Given: A controller method with @SkipServerAccess()
      class TestController {
        @SkipServerAccess()
        testMethod() {}
      }

      // When: Reflector reads metadata
      const metadata = reflector.get(SKIP_SERVER_ACCESS_KEY, TestController.prototype.testMethod);

      // Then: returns true
      expect(metadata).toBe(true);
    });

    it('should return undefined for methods without decorator', () => {
      // Given: A controller method without @SkipServerAccess()
      class TestController {
        testMethod() {}
      }

      // When: Reflector reads metadata
      const metadata = reflector.get(SKIP_SERVER_ACCESS_KEY, TestController.prototype.testMethod);

      // Then: returns undefined
      expect(metadata).toBeUndefined();
    });
  });

  describe('on class level', () => {
    it('should set metadata on class', () => {
      // Given: A controller class with @SkipServerAccess()
      @SkipServerAccess()
      class TestController {
        testMethod() {}
      }

      // When: Reflector reads metadata from class
      const metadata = reflector.get(SKIP_SERVER_ACCESS_KEY, TestController);

      // Then: returns true
      expect(metadata).toBe(true);
    });
  });

  describe('SKIP_SERVER_ACCESS_KEY constant', () => {
    it('should be exported and have correct value', () => {
      // Given-When-Then: Constant is exported with expected value
      expect(SKIP_SERVER_ACCESS_KEY).toBe('skipServerAccess');
    });
  });
});
