import { validate } from 'class-validator';
import { UpdateIpWhitelistDto } from './update-ip-whitelist.dto';

describe('UpdateIpWhitelistDto', () => {
  let dto: UpdateIpWhitelistDto;

  beforeEach(() => {
    dto = new UpdateIpWhitelistDto();
  });

  describe('ipAddress validation', () => {
    it('should accept valid IPv4 address update', async () => {
      dto.ipAddress = '10.0.0.1';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid IPv6 address update', async () => {
      dto.ipAddress = '::1';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid IP format', async () => {
      dto.ipAddress = '999.999.999.999';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
    });

    it('should reject empty IP string', async () => {
      dto.ipAddress = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
    });

    it('should accept undefined IP (optional field)', async () => {
      // IP not set
      dto.description = 'Updated description';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('cidr validation', () => {
    it('should accept valid CIDR update', async () => {
      dto.cidr = 32;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject CIDR over 128', async () => {
      dto.cidr = 200;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cidr');
    });

    it('should reject negative CIDR', async () => {
      dto.cidr = -10;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cidr');
    });

    it('should accept undefined CIDR (optional)', async () => {
      // cidr not set
      dto.description = 'Test';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('description validation', () => {
    it('should accept valid description update', async () => {
      dto.description = 'Updated office network';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty description', async () => {
      dto.description = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined description (optional field)', async () => {
      // description not set
      dto.isActive = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('boolean fields validation', () => {
    it('should accept isActive update', async () => {
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept isActive false', async () => {
      dto.isActive = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept isTemporary update', async () => {
      dto.isTemporary = true;
      dto.expiresAt = '2025-12-31T23:59:59Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-boolean values', async () => {
      (dto as any).isActive = 'yes'; // string instead of boolean

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('isActive');
    });
  });

  describe('expiresAt validation', () => {
    it('should accept valid date update', async () => {
      dto.expiresAt = '2025-06-30T12:00:00Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      dto.expiresAt = 'invalid-date';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('expiresAt');
    });

    it('should accept undefined expiresAt', async () => {
      // expiresAt not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('tags validation', () => {
    it('should accept tags array update', async () => {
      dto.tags = ['vpn', 'temporary'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty tags array', async () => {
      dto.tags = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string elements', async () => {
      dto.tags = ['valid', 42 as any];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('tags');
    });
  });

  describe('allowedEndpoints validation', () => {
    it('should accept endpoints array update', async () => {
      dto.allowedEndpoints = ['/api/v2/einsatz'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty endpoints array', async () => {
      dto.allowedEndpoints = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string endpoint elements', async () => {
      dto.allowedEndpoints = ['/api/valid', true as any];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('allowedEndpoints');
    });
  });

  describe('partial update validation', () => {
    it('should accept empty DTO (all fields optional)', async () => {
      // No fields set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept single field update - ipAddress only', async () => {
      dto.ipAddress = '192.168.100.1';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept single field update - description only', async () => {
      dto.description = 'VPN server range';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept single field update - isActive only', async () => {
      dto.isActive = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept multiple field updates', async () => {
      dto.ipAddress = '172.31.0.1';
      dto.cidr = 16;
      dto.description = 'AWS VPC range';
      dto.isActive = true;
      dto.tags = ['aws', 'production'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('inheritance from PartialType', () => {
    it('should have all properties optional', () => {
      const dto = new UpdateIpWhitelistDto();

      expect(dto.ipAddress).toBeUndefined();
      expect(dto.cidr).toBeUndefined();
      expect(dto.description).toBeUndefined();
      expect(dto.isActive).toBeUndefined();
      expect(dto.isTemporary).toBeUndefined();
      expect(dto.expiresAt).toBeUndefined();
      expect(dto.tags).toBeUndefined();
      expect(dto.allowedEndpoints).toBeUndefined();
    });

    it('should maintain validation rules from parent', async () => {
      dto.ipAddress = '10.0.0.1';
      dto.cidr = 24;
      dto.description = 'Valid update';
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate all fields when provided', async () => {
      dto.ipAddress = 'invalid';
      dto.cidr = -1;
      dto.isActive = 'not-boolean' as any;
      dto.expiresAt = 'not-a-date';
      dto.tags = [123 as any];
      dto.allowedEndpoints = [null as any];

      const errors = await validate(dto);
      expect(errors).toHaveLength(6); // All invalid fields should have errors
    });
  });
});
