import { validate } from 'class-validator';
import { CreateIpWhitelistDto } from './create-ip-whitelist.dto';

describe('CreateIpWhitelistDto', () => {
  let dto: CreateIpWhitelistDto;

  beforeEach(() => {
    dto = new CreateIpWhitelistDto();
  });

  describe('ipAddress validation', () => {
    it('should accept valid IPv4 addresses', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.description = 'Test IP';
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid IPv6 addresses', async () => {
      dto.ipAddress = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      dto.description = 'Test IPv6';
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept localhost IPv6', async () => {
      dto.ipAddress = '::1';
      dto.description = 'Localhost IPv6';
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid IP formats', async () => {
      dto.ipAddress = '192.168.300.1'; // Invalid octet
      dto.description = 'Invalid IP';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('should reject empty IP', async () => {
      dto.ipAddress = '';
      dto.description = 'Test';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject missing ipAddress', async () => {
      // ipAddress not set
      dto.description = 'Test';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
    });
  });

  describe('cidr validation', () => {
    it('should accept valid CIDR value', async () => {
      dto.ipAddress = '192.168.1.0';
      dto.cidr = 24;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept CIDR 0', async () => {
      dto.ipAddress = '0.0.0.0';
      dto.cidr = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept CIDR 128 for IPv6', async () => {
      dto.ipAddress = '::1';
      dto.cidr = 128;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject CIDR greater than 128', async () => {
      dto.ipAddress = '192.168.1.0';
      dto.cidr = 129;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cidr');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should reject negative CIDR', async () => {
      dto.ipAddress = '192.168.1.0';
      dto.cidr = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cidr');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should accept undefined CIDR (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // cidr not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('description validation', () => {
    it('should accept valid description', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.description = 'Büro Hauptstandort';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty description', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.description = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined description (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // description not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('isActive validation', () => {
    it('should accept true value', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept false value', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.isActive = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined isActive (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // isActive not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('isTemporary validation', () => {
    it('should accept true value', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.isTemporary = true;
      dto.expiresAt = '2024-12-31T23:59:59Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept false value', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.isTemporary = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined isTemporary (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // isTemporary not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('expiresAt validation', () => {
    it('should accept valid ISO date string', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.isTemporary = true;
      dto.expiresAt = '2024-12-31T23:59:59Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.expiresAt = 'not-a-date';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('expiresAt');
      expect(errors[0].constraints).toHaveProperty('isDateString');
    });

    it('should accept undefined expiresAt (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // expiresAt not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('tags validation', () => {
    it('should accept array of strings', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.tags = ['office', 'main-location'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty array', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.tags = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string array elements', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.tags = ['valid', 123 as any, 'another'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('tags');
    });

    it('should accept undefined tags (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // tags not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('allowedEndpoints validation', () => {
    it('should accept array of endpoint strings', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.allowedEndpoints = ['/api/einsatz', '/api/etb'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty array', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.allowedEndpoints = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string array elements', async () => {
      dto.ipAddress = '192.168.1.1';
      dto.allowedEndpoints = ['/api/valid', null as any];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('allowedEndpoints');
    });

    it('should accept undefined allowedEndpoints (optional)', async () => {
      dto.ipAddress = '192.168.1.1';
      // allowedEndpoints not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('complete DTO validation', () => {
    it('should accept minimal valid DTO', async () => {
      dto.ipAddress = '10.0.0.1';
      // All other fields are optional

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept complete valid DTO', async () => {
      dto.ipAddress = '172.16.0.0';
      dto.cidr = 16;
      dto.description = 'Private network range for internal services';
      dto.isActive = true;
      dto.isTemporary = true;
      dto.expiresAt = '2025-01-01T00:00:00Z';
      dto.tags = ['internal', 'temporary'];
      dto.allowedEndpoints = ['/api/health', '/api/status'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
