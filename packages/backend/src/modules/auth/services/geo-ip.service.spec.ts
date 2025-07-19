import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeoIpService } from './geo-ip.service';

describe('GeoIpService', () => {
  let service: GeoIpService;
  let _configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocationInfo', () => {
    it('should return null when GeoIP is disabled', async () => {
      mockConfigService.get.mockReturnValue('false');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoIpService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<GeoIpService>(GeoIpService);
      _configService = module.get(ConfigService);

      const result = await service.getLocationInfo('8.8.8.8');
      expect(result).toBeNull();
    });

    it('should return local info for private IP addresses', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'GEOIP_ENABLED') return 'true';
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoIpService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<GeoIpService>(GeoIpService);
      _configService = module.get(ConfigService);

      const privateIps = [
        '10.0.0.1',
        '172.16.0.1',
        '192.168.1.1',
        '127.0.0.1',
        '::1',
        'fe80::1',
        'fc00::1',
      ];

      for (const ip of privateIps) {
        const result = await service.getLocationInfo(ip);
        expect(result).toEqual({
          ip,
          country: 'Local',
          city: 'Local',
          region: 'Local',
          timezone: expect.any(String),
          isVpn: false,
          isProxy: false,
        });
      }
    });

    it('should return null for public IPs (not implemented)', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'GEOIP_ENABLED') return 'true';
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoIpService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<GeoIpService>(GeoIpService);
      _configService = module.get(ConfigService);

      const result = await service.getLocationInfo('8.8.8.8');
      expect(result).toBeNull();
    });

    it('should handle various edge cases for private IP detection', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'GEOIP_ENABLED') return 'true';
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoIpService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<GeoIpService>(GeoIpService);
      _configService = module.get(ConfigService);

      // Test edge cases of private ranges
      const edgeCases = [
        '10.255.255.255', // End of 10.x range
        '172.16.0.0', // Start of 172.16-31 range
        '172.31.255.255', // End of 172.16-31 range
        '192.168.0.0', // Start of 192.168 range
        '192.168.255.255', // End of 192.168 range
        '127.255.255.255', // End of loopback range
      ];

      for (const ip of edgeCases) {
        const result = await service.getLocationInfo(ip);
        expect(result).toEqual({
          ip,
          country: 'Local',
          city: 'Local',
          region: 'Local',
          timezone: expect.any(String),
          isVpn: false,
          isProxy: false,
        });
      }
    });

    it('should not detect public IPs as private', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'GEOIP_ENABLED') return 'true';
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoIpService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<GeoIpService>(GeoIpService);
      _configService = module.get(ConfigService);

      const publicIps = [
        '8.8.8.8', // Google DNS
        '1.1.1.1', // Cloudflare DNS
        '208.67.222.222', // OpenDNS
        '172.15.255.255', // Just outside 172.16-31 range
        '172.32.0.0', // Just outside 172.16-31 range
        '11.0.0.1', // Just outside 10.x range
        '191.168.1.1', // Just outside 192.168 range
      ];

      for (const ip of publicIps) {
        const result = await service.getLocationInfo(ip);
        expect(result).toBeNull(); // Should not be detected as private
      }
    });

    it('should handle different config values for GEOIP_ENABLED', async () => {
      const testCases = [
        { configValue: 'true', expected: true },
        { configValue: 'false', expected: false },
        { configValue: 'TRUE', expected: false }, // Case sensitive
        { configValue: '1', expected: false }, // Not 'true'
        { configValue: undefined, expected: false }, // Default to false
      ];

      for (const { configValue, expected } of testCases) {
        mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'GEOIP_ENABLED') return configValue || defaultValue;
          return defaultValue;
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            GeoIpService,
            {
              provide: ConfigService,
              useValue: mockConfigService,
            },
          ],
        }).compile();

        service = module.get<GeoIpService>(GeoIpService);

        const result = await service.getLocationInfo('192.168.1.1');

        if (expected) {
          expect(result).toEqual({
            ip: '192.168.1.1',
            country: 'Local',
            city: 'Local',
            region: 'Local',
            timezone: expect.any(String),
            isVpn: false,
            isProxy: false,
          });
        } else {
          expect(result).toBeNull();
        }
      }
    });
  });

  describe('calculateDistance', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('false');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoIpService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<GeoIpService>(GeoIpService);
      _configService = module.get(ConfigService);
    });

    it('should calculate distance between two coordinates', () => {
      // Test with known coordinates (New York to London)
      const nyLat = 40.7128;
      const nyLon = -74.006;
      const londonLat = 51.5074;
      const londonLon = -0.1278;

      const distance = service.calculateDistance(nyLat, nyLon, londonLat, londonLon);

      // Distance should be approximately 5585 km
      expect(distance).toBeGreaterThan(5500);
      expect(distance).toBeLessThan(5700);
    });

    it('should return 0 for same coordinates', () => {
      const lat = 40.7128;
      const lon = -74.006;

      const distance = service.calculateDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });
  });
});
