import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MgrsConverterService } from './mgrs-converter.service';

describe('MgrsConverterService', () => {
  let service: MgrsConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MgrsConverterService],
    }).compile();

    service = module.get<MgrsConverterService>(MgrsConverterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('latLngToMgrs', () => {
    it('should convert valid coordinates to MGRS with default precision (5)', () => {
      // Berlin Brandenburger Tor
      const mgrsString = service.latLngToMgrs(52.516275, 13.377704);

      expect(mgrsString).toBeDefined();
      expect(typeof mgrsString).toBe('string');
      expect(mgrsString).toMatch(/^33UUU\d{10}$/); // 33UUU + 10 digits for precision 5
    });

    it('should convert valid coordinates to MGRS with precision 3', () => {
      const mgrsString = service.latLngToMgrs(52.516275, 13.377704, 3);

      expect(mgrsString).toBeDefined();
      expect(mgrsString).toMatch(/^33UUU\d{6}$/); // 33UUU + 6 digits for precision 3
    });

    it('should convert valid coordinates to MGRS with precision 0', () => {
      const mgrsString = service.latLngToMgrs(52.516275, 13.377704, 0);

      expect(mgrsString).toBeDefined();
      expect(mgrsString).toBe('33UUU'); // No digits for precision 0
    });

    it('should convert coordinates at equator', () => {
      const mgrsString = service.latLngToMgrs(0, 0);

      expect(mgrsString).toBeDefined();
      expect(typeof mgrsString).toBe('string');
    });

    it('should convert coordinates at north pole boundary', () => {
      const mgrsString = service.latLngToMgrs(84, 0); // MGRS only goes to 84°N

      expect(mgrsString).toBeDefined();
      expect(typeof mgrsString).toBe('string');
    });

    it('should convert coordinates at south pole boundary', () => {
      const mgrsString = service.latLngToMgrs(-80, 0); // MGRS only goes to 80°S

      expect(mgrsString).toBeDefined();
      expect(typeof mgrsString).toBe('string');
    });

    it('should convert negative coordinates (Western/Southern hemisphere)', () => {
      // Rio de Janeiro
      const mgrsString = service.latLngToMgrs(-22.9068, -43.1729);

      expect(mgrsString).toBeDefined();
      expect(typeof mgrsString).toBe('string');
    });

    it('should throw BadRequestException for latitude > 90', () => {
      expect(() => service.latLngToMgrs(91, 0)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(91, 0)).toThrow('Ungültiger Breitengrad: 91');
    });

    it('should throw BadRequestException for latitude < -90', () => {
      expect(() => service.latLngToMgrs(-91, 0)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(-91, 0)).toThrow('Ungültiger Breitengrad: -91');
    });

    it('should throw BadRequestException for longitude > 180', () => {
      expect(() => service.latLngToMgrs(0, 181)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(0, 181)).toThrow('Ungültiger Längengrad: 181');
    });

    it('should throw BadRequestException for longitude < -180', () => {
      expect(() => service.latLngToMgrs(0, -181)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(0, -181)).toThrow('Ungültiger Längengrad: -181');
    });

    it('should throw BadRequestException for invalid precision > 5', () => {
      expect(() => service.latLngToMgrs(52.516275, 13.377704, 6)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(52.516275, 13.377704, 6)).toThrow('Ungültige Precision: 6');
    });

    it('should throw BadRequestException for invalid precision < 0', () => {
      expect(() => service.latLngToMgrs(52.516275, 13.377704, -1)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(52.516275, 13.377704, -1)).toThrow('Ungültige Precision: -1');
    });

    it('should throw BadRequestException for non-integer precision', () => {
      expect(() => service.latLngToMgrs(52.516275, 13.377704, 2.5)).toThrow(BadRequestException);
      expect(() => service.latLngToMgrs(52.516275, 13.377704, 2.5)).toThrow('Ungültige Precision: 2.5');
    });

    it('should throw BadRequestException for non-numeric latitude', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input types
      expect(() => service.latLngToMgrs('invalid' as any, 13.377704)).toThrow(BadRequestException);
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input types
      expect(() => service.latLngToMgrs('invalid' as any, 13.377704)).toThrow('Latitude und Longitude müssen Zahlen sein');
    });

    it('should throw BadRequestException for non-numeric longitude', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input types
      expect(() => service.latLngToMgrs(52.516275, 'invalid' as any)).toThrow(BadRequestException);
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input types
      expect(() => service.latLngToMgrs(52.516275, 'invalid' as any)).toThrow('Latitude und Longitude müssen Zahlen sein');
    });
  });

  describe('mgrsToLatLng', () => {
    it('should convert valid MGRS string to coordinates', () => {
      const mgrsString = '33UUU9185320652';
      const coords = service.mgrsToLatLng(mgrsString);

      expect(coords).toBeDefined();
      expect(coords.latitude).toBeCloseTo(52.516275, 4); // 4 decimal places ~11m precision
      expect(coords.longitude).toBeCloseTo(13.377704, 4);
    });

    it('should convert MGRS with precision 3 to coordinates', () => {
      const mgrsString = '33UUU918206';
      const coords = service.mgrsToLatLng(mgrsString);

      expect(coords).toBeDefined();
      expect(coords.latitude).toBeCloseTo(52.516, 1); // Lower precision
      expect(coords.longitude).toBeCloseTo(13.377, 1);
    });

    it('should convert MGRS with precision 0 to coordinates', () => {
      const mgrsString = '33UUU';
      const coords = service.mgrsToLatLng(mgrsString);

      expect(coords).toBeDefined();
      expect(typeof coords.latitude).toBe('number');
      expect(typeof coords.longitude).toBe('number');
      expect(coords.latitude).toBeGreaterThan(0);
      expect(coords.longitude).toBeGreaterThan(0);
    });

    it('should handle MGRS strings with whitespace', () => {
      const mgrsString = '  33UUU9185320652  ';
      const coords = service.mgrsToLatLng(mgrsString);

      expect(coords).toBeDefined();
      expect(coords.latitude).toBeCloseTo(52.516275, 4);
      expect(coords.longitude).toBeCloseTo(13.377704, 4);
    });

    it('should convert MGRS from southern hemisphere', () => {
      // Rio de Janeiro area
      const mgrsString = '23KPQ6832858923';
      const coords = service.mgrsToLatLng(mgrsString);

      expect(coords).toBeDefined();
      expect(coords.latitude).toBeLessThan(0); // Southern hemisphere
      expect(coords.longitude).toBeLessThan(0); // Western hemisphere
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => service.mgrsToLatLng('')).toThrow(BadRequestException);
      expect(() => service.mgrsToLatLng('')).toThrow('MGRS String darf nicht leer sein');
    });

    it('should throw BadRequestException for whitespace-only string', () => {
      expect(() => service.mgrsToLatLng('   ')).toThrow(BadRequestException);
      expect(() => service.mgrsToLatLng('   ')).toThrow('MGRS String darf nicht leer sein');
    });

    it('should throw BadRequestException for invalid MGRS format', () => {
      expect(() => service.mgrsToLatLng('INVALID')).toThrow(BadRequestException);
      expect(() => service.mgrsToLatLng('INVALID')).toThrow('Ungültiges MGRS Format');
    });

    it('should throw BadRequestException for MGRS with odd number of digits', () => {
      expect(() => service.mgrsToLatLng('33UUU123')).toThrow(BadRequestException);
      expect(() => service.mgrsToLatLng('33UUU123')).toThrow('Ungültiges MGRS Format');
    });

    it('should throw BadRequestException for non-string input', () => {
      expect(() => service.mgrsToLatLng(123 as any)).toThrow(BadRequestException);
      expect(() => service.mgrsToLatLng(null as any)).toThrow(BadRequestException);
      expect(() => service.mgrsToLatLng(undefined as any)).toThrow(BadRequestException);
    });
  });

  describe('isValidMgrs', () => {
    it('should validate correct MGRS string with precision 5', () => {
      expect(service.isValidMgrs('33UUU9185320652')).toBe(true);
    });

    it('should validate correct MGRS string with precision 3', () => {
      expect(service.isValidMgrs('33UUU918206')).toBe(true);
    });

    it('should validate correct MGRS string with precision 0', () => {
      expect(service.isValidMgrs('33UUU')).toBe(true);
    });

    it('should validate MGRS with single-digit zone', () => {
      expect(service.isValidMgrs('5QKB1234567890')).toBe(true);
    });

    it('should validate MGRS with whitespace (after trimming)', () => {
      expect(service.isValidMgrs('  33UUU9185320652  ')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(service.isValidMgrs('')).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      expect(service.isValidMgrs('   ')).toBe(false);
    });

    it('should reject string with odd number of digits', () => {
      expect(service.isValidMgrs('33UUU123')).toBe(false);
    });

    it('should reject string without grid zone', () => {
      expect(service.isValidMgrs('UUU1234567890')).toBe(false);
    });

    it('should reject string without 100km square', () => {
      expect(service.isValidMgrs('33U1234567890')).toBe(false);
    });

    it('should reject string with too many digits', () => {
      expect(service.isValidMgrs('33UUU12345678901')).toBe(false); // 11 digits (max is 10)
    });

    it('should reject completely invalid format', () => {
      expect(service.isValidMgrs('INVALID')).toBe(false);
      expect(service.isValidMgrs('123456')).toBe(false);
      expect(service.isValidMgrs('ABC')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(service.isValidMgrs(123 as any)).toBe(false);
      expect(service.isValidMgrs(null as any)).toBe(false);
      expect(service.isValidMgrs(undefined as any)).toBe(false);
      expect(service.isValidMgrs({} as any)).toBe(false);
    });
  });

  describe('round-trip conversion', () => {
    it('should convert LatLng → MGRS → LatLng with minimal precision loss', () => {
      const originalLat = 52.516275;
      const originalLng = 13.377704;

      // Convert to MGRS with high precision
      const mgrsString = service.latLngToMgrs(originalLat, originalLng, 5);

      // Convert back
      const coords = service.mgrsToLatLng(mgrsString);

      // Should be very close (within ~1 meter)
      expect(coords.latitude).toBeCloseTo(originalLat, 5);
      expect(coords.longitude).toBeCloseTo(originalLng, 5);
    });

    it('should handle round-trip conversion for multiple test locations', () => {
      const testLocations = [
        { lat: 52.516275, lng: 13.377704, name: 'Berlin' },
        { lat: 48.8566, lng: 2.3522, name: 'Paris' },
        { lat: 51.5074, lng: -0.1278, name: 'London' },
        { lat: 40.7128, lng: -74.006, name: 'New York' },
        { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
        { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
      ];

      for (const location of testLocations) {
        const mgrsString = service.latLngToMgrs(location.lat, location.lng, 5);
        const coords = service.mgrsToLatLng(mgrsString);

        expect(coords.latitude).toBeCloseTo(location.lat, 4);
        expect(coords.longitude).toBeCloseTo(location.lng, 4);
      }
    });
  });
});
