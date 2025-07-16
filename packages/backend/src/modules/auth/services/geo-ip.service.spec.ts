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
