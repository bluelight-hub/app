import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator';

describe('Public Decorator', () => {
  let reflector: Reflector;
  let app: TestingModule;

  @Controller('test')
  class TestController {
    @Public()
    @Get('public')
    publicRoute() {
      return { message: 'This is public' };
    }

    @Get('protected')
    protectedRoute() {
      return { message: 'This is protected' };
    }

    @Public()
    @Get('another-public')
    anotherPublicRoute() {
      return { message: 'Another public route' };
    }
  }

  beforeEach(async () => {
    app = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    reflector = app.get(Reflector);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(Public).toBeDefined();
  });

  it('should set isPublic metadata to true on decorated methods', () => {
    const controller = app.get(TestController);

    const publicMetadata = reflector.get<boolean>('isPublic', controller.publicRoute);
    const anotherPublicMetadata = reflector.get<boolean>('isPublic', controller.anotherPublicRoute);

    expect(publicMetadata).toBe(true);
    expect(anotherPublicMetadata).toBe(true);
  });

  it('should not set isPublic metadata on non-decorated methods', () => {
    const controller = app.get(TestController);

    const protectedMetadata = reflector.get<boolean>('isPublic', controller.protectedRoute);

    expect(protectedMetadata).toBeUndefined();
  });

  describe('Class-level decoration', () => {
    @Public()
    @Controller('public-controller')
    class PublicController {
      @Get('route1')
      route1() {
        return { message: 'route1' };
      }

      @Get('route2')
      route2() {
        return { message: 'route2' };
      }
    }

    it('should set isPublic metadata on class', async () => {
      const module = await Test.createTestingModule({
        controllers: [PublicController],
      }).compile();

      const reflector = module.get(Reflector);
      const classMetadata = reflector.get<boolean>('isPublic', PublicController);

      expect(classMetadata).toBe(true);

      await module.close();
    });
  });

  describe('Combined with other decorators', () => {
    @Controller('combined')
    class CombinedController {
      @Get('public-get')
      @Public()
      publicGetRoute() {
        return { message: 'public get' };
      }

      @Public()
      @Get('get-public')
      getPublicRoute() {
        return { message: 'get public' };
      }
    }

    it('should work regardless of decorator order', async () => {
      const module = await Test.createTestingModule({
        controllers: [CombinedController],
      }).compile();

      const reflector = module.get(Reflector);
      const controller = module.get(CombinedController);

      const publicGetMetadata = reflector.get<boolean>('isPublic', controller.publicGetRoute);
      const getPublicMetadata = reflector.get<boolean>('isPublic', controller.getPublicRoute);

      expect(publicGetMetadata).toBe(true);
      expect(getPublicMetadata).toBe(true);

      await module.close();
    });
  });

  describe('Reflector getAllAndOverride behavior', () => {
    it('should work with getAllAndOverride for method and class metadata', () => {
      @Public()
      @Controller('override-test')
      class OverrideController {
        @Get('method1')
        method1() {
          return { message: 'method1' };
        }

        @Public()
        @Get('method2')
        method2() {
          return { message: 'method2' };
        }
      }

      const testModule = Test.createTestingModule({
        controllers: [OverrideController],
      }).compile();

      testModule.then(async (module) => {
        const reflector = module.get(Reflector);
        const controller = module.get(OverrideController);

        // Test getAllAndOverride behavior
        const method1Public = reflector.getAllAndOverride<boolean>('isPublic', [
          controller.method1,
          OverrideController,
        ]);
        const method2Public = reflector.getAllAndOverride<boolean>('isPublic', [
          controller.method2,
          OverrideController,
        ]);

        expect(method1Public).toBe(true); // Gets from class
        expect(method2Public).toBe(true); // Gets from method

        await module.close();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple applications of the decorator', () => {
      @Controller('multiple')
      class MultipleController {
        @Public()
        @Public() // Applied twice
        @Get('double')
        doublePublic() {
          return { message: 'double' };
        }
      }

      const testModule = Test.createTestingModule({
        controllers: [MultipleController],
      }).compile();

      testModule.then(async (module) => {
        const reflector = module.get(Reflector);
        const controller = module.get(MultipleController);

        const metadata = reflector.get<boolean>('isPublic', controller.doublePublic);
        expect(metadata).toBe(true);

        await module.close();
      });
    });

    it('should work on different types of routes', () => {
      @Controller('routes')
      class RouteController {
        @Public()
        @Get()
        getAll() {
          return { message: 'get all' };
        }

        @Public()
        @Get(':id')
        getOne() {
          return { message: 'get one' };
        }
      }

      const testModule = Test.createTestingModule({
        controllers: [RouteController],
      }).compile();

      expect(testModule).toBeDefined();
    });
  });

  describe('Integration with guards', () => {
    it('should provide metadata accessible to guards', () => {
      const mockExecutionContext = {
        getHandler: () => TestController.prototype.publicRoute,
        getClass: () => TestController,
      };

      const isPublic = reflector.getAllAndOverride<boolean>('isPublic', [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);

      expect(isPublic).toBe(true);
    });

    it('should return undefined for non-public routes in guards', () => {
      const mockExecutionContext = {
        getHandler: () => TestController.prototype.protectedRoute,
        getClass: () => TestController,
      };

      const isPublic = reflector.getAllAndOverride<boolean>('isPublic', [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);

      expect(isPublic).toBeFalsy();
    });
  });

  describe('Metadata key', () => {
    it('should use "isPublic" as the metadata key', () => {
      const controller = app.get(TestController);
      const metadataKeys = Reflect.getMetadataKeys(controller.publicRoute);

      expect(metadataKeys).toContain('isPublic');
    });

    it('should not interfere with other metadata', () => {
      @Controller('metadata')
      class MetadataController {
        @Public()
        @Get('route')
        route() {
          return { message: 'route' };
        }
      }

      // Add custom metadata
      Reflect.defineMetadata('custom', 'value', MetadataController.prototype.route);

      const testModule = Test.createTestingModule({
        controllers: [MetadataController],
      }).compile();

      testModule.then(async (module) => {
        const controller = module.get(MetadataController);

        const publicMetadata = Reflect.getMetadata('isPublic', controller.route);
        const customMetadata = Reflect.getMetadata('custom', controller.route);

        expect(publicMetadata).toBe(true);
        expect(customMetadata).toBe('value');

        await module.close();
      });
    });
  });
});
