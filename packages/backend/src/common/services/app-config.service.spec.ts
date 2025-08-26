import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', () => {
      jest.spyOn(configService, 'get').mockReturnValue('production');
      expect(service.isProduction()).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should return false when NODE_ENV is not production', () => {
      jest.spyOn(configService, 'get').mockReturnValue('development');
      expect(service.isProduction()).toBe(false);
    });
  });

  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', () => {
      jest.spyOn(configService, 'get').mockReturnValue('development');
      expect(service.isDevelopment()).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should return false when NODE_ENV is not development', () => {
      jest.spyOn(configService, 'get').mockReturnValue('production');
      expect(service.isDevelopment()).toBe(false);
    });
  });

  describe('isTest', () => {
    it('should return true when NODE_ENV is test', () => {
      jest.spyOn(configService, 'get').mockReturnValue('test');
      expect(service.isTest()).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should return false when NODE_ENV is not test', () => {
      jest.spyOn(configService, 'get').mockReturnValue('development');
      expect(service.isTest()).toBe(false);
    });
  });

  describe('getNodeEnv', () => {
    it('should return the current NODE_ENV value', () => {
      jest.spyOn(configService, 'get').mockReturnValue('staging');
      expect(service.getNodeEnv()).toBe('staging');
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
    });

    it('should return development as default when NODE_ENV is not set', () => {
      jest.spyOn(configService, 'get').mockReturnValue('development');
      expect(service.getNodeEnv()).toBe('development');
    });
  });

  describe('get', () => {
    it('should proxy the call to configService.get', () => {
      const mockValue = 'test-value';
      jest.spyOn(configService, 'get').mockReturnValue(mockValue);

      const result = service.get('TEST_KEY');

      expect(result).toBe(mockValue);
      expect(configService.get).toHaveBeenCalledWith('TEST_KEY', undefined);
    });

    it('should proxy the call with default value', () => {
      const defaultValue = 'default';
      jest.spyOn(configService, 'get').mockReturnValue(defaultValue);

      const result = service.get('TEST_KEY', defaultValue);

      expect(result).toBe(defaultValue);
      expect(configService.get).toHaveBeenCalledWith('TEST_KEY', defaultValue);
    });
  });

  describe('getOrThrow', () => {
    it('should proxy the call to configService.getOrThrow', () => {
      const mockValue = 'test-value';
      jest.spyOn(configService, 'getOrThrow').mockReturnValue(mockValue);

      const result = service.getOrThrow('TEST_KEY');

      expect(result).toBe(mockValue);
      expect(configService.getOrThrow).toHaveBeenCalledWith('TEST_KEY');
    });
  });
});
