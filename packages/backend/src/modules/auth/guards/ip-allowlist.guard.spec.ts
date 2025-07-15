import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { IpAllowlistGuard } from './ip-allowlist.guard';
import { Request } from 'express';

describe('IpAllowlistGuard', () => {
  let _guard: IpAllowlistGuard;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'false';
      if (key === 'SECURITY_ALLOWED_IPS') return '';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpAllowlistGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    _guard = module.get<IpAllowlistGuard>(IpAllowlistGuard);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with IP allowlist disabled', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'false';
        if (key === 'SECURITY_ALLOWED_IPS') return '';
        return defaultValue;
      });

      const testGuard = new IpAllowlistGuard(configService);
      expect(testGuard).toBeDefined();
    });

    it('should initialize with IP allowlist enabled and parse IPs', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'true';
        if (key === 'SECURITY_ALLOWED_IPS') return '192.168.1.1,10.0.0.1, 172.16.0.1 ';
        return defaultValue;
      });

      const testGuard = new IpAllowlistGuard(configService);
      expect(testGuard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    let mockExecutionContext: ExecutionContext;
    let mockRequest: Partial<Request>;

    beforeEach(() => {
      mockRequest = {
        ip: '192.168.1.100',
        headers: {},
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;
    });

    it('should allow access when IP allowlist is disabled', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'false';
        return defaultValue;
      });

      const testGuard = new IpAllowlistGuard(configService);
      expect(testGuard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should allow access when IP is in the allowed list', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'true';
        if (key === 'SECURITY_ALLOWED_IPS') return '192.168.1.100,10.0.0.1';
        return defaultValue;
      });

      const testGuard = new IpAllowlistGuard(configService);
      expect(testGuard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should deny access when IP is not in the allowed list', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'true';
        if (key === 'SECURITY_ALLOWED_IPS') return '10.0.0.1,172.16.0.1';
        return defaultValue;
      });

      const testGuard = new IpAllowlistGuard(configService);
      expect(() => testGuard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('should extract IP from x-forwarded-for header', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'true';
        if (key === 'SECURITY_ALLOWED_IPS') return '203.0.113.1';
        return defaultValue;
      });

      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 10.0.0.1, 172.16.0.1',
      };

      const testGuard = new IpAllowlistGuard(configService);
      expect(testGuard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should extract IP from x-real-ip header', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'true';
        if (key === 'SECURITY_ALLOWED_IPS') return '203.0.113.2';
        return defaultValue;
      });

      mockRequest.headers = {
        'x-real-ip': '203.0.113.2',
      };
      delete (mockRequest as any).ip;

      const testGuard = new IpAllowlistGuard(configService);
      expect(testGuard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should throw ForbiddenException when IP cannot be determined', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'SECURITY_IP_ALLOWLIST_ENABLED') return 'true';
        if (key === 'SECURITY_ALLOWED_IPS') return '10.0.0.1';
        return defaultValue;
      });

      delete (mockRequest as any).ip;
      mockRequest.headers = {};

      const testGuard = new IpAllowlistGuard(configService);
      expect(() => testGuard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied: Unable to verify IP address'),
      );
    });
  });
});
