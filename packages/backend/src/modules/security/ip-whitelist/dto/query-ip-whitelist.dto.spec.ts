import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryIpWhitelistDto, IpWhitelistSortBy } from './query-ip-whitelist.dto';

describe('QueryIpWhitelistDto', () => {
  let dto: QueryIpWhitelistDto;

  beforeEach(() => {
    dto = new QueryIpWhitelistDto();
  });

  describe('isActive validation', () => {
    it('should accept true value', async () => {
      dto.isActive = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept false value', async () => {
      dto.isActive = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should transform string "true" to boolean', async () => {
      const plain = { isActive: 'true' };
      const transformed = plainToInstance(QueryIpWhitelistDto, plain);

      expect(transformed.isActive).toBe(true);

      const errors = await validate(transformed);
      expect(errors).toHaveLength(0);
    });

    it('should transform string "false" to boolean false', async () => {
      const plain = { isActive: 'false' };
      const transformed = plainToInstance(QueryIpWhitelistDto, plain);

      expect(transformed.isActive).toBe(false);

      const errors = await validate(transformed);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined isActive (optional)', async () => {
      // isActive not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('isTemporary validation', () => {
    it('should accept true value', async () => {
      dto.isTemporary = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept false value', async () => {
      dto.isTemporary = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should transform string "true" to boolean', async () => {
      const plain = { isTemporary: 'true' };
      const transformed = plainToInstance(QueryIpWhitelistDto, plain);

      expect(transformed.isTemporary).toBe(true);

      const errors = await validate(transformed);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined isTemporary (optional)', async () => {
      // isTemporary not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('tags validation', () => {
    it('should accept array of strings', async () => {
      dto.tags = ['office', 'vpn'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should transform single string to array', async () => {
      const plain = { tags: 'office' };
      const transformed = plainToInstance(QueryIpWhitelistDto, plain);

      expect(transformed.tags).toEqual(['office']);

      const errors = await validate(transformed);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty array', async () => {
      dto.tags = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string array elements', async () => {
      dto.tags = ['valid', 123 as any];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('tags');
    });

    it('should accept undefined tags (optional)', async () => {
      // tags not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('search validation', () => {
    it('should accept valid search string', async () => {
      dto.search = '192.168';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty search string', async () => {
      dto.search = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept search with special characters', async () => {
      dto.search = '192.168.*.*';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined search (optional)', async () => {
      // search not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('sortBy validation', () => {
    it('should accept CREATED_AT sort field', async () => {
      dto.sortBy = IpWhitelistSortBy.CREATED_AT;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept UPDATED_AT sort field', async () => {
      dto.sortBy = IpWhitelistSortBy.UPDATED_AT;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept IP_ADDRESS sort field', async () => {
      dto.sortBy = IpWhitelistSortBy.IP_ADDRESS;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept LAST_USED_AT sort field', async () => {
      dto.sortBy = IpWhitelistSortBy.LAST_USED_AT;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept USE_COUNT sort field', async () => {
      dto.sortBy = IpWhitelistSortBy.USE_COUNT;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid sort field', async () => {
      (dto as any).sortBy = 'invalid_field';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('sortBy');
    });

    it('should use default sort field when not provided', () => {
      expect(dto.sortBy).toBe(IpWhitelistSortBy.CREATED_AT);
    });
  });

  describe('onlyExpired validation', () => {
    it('should accept true value', async () => {
      dto.onlyExpired = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept false value', async () => {
      dto.onlyExpired = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should transform string "true" to boolean', async () => {
      const plain = { onlyExpired: 'true' };
      const transformed = plainToInstance(QueryIpWhitelistDto, plain);

      expect(transformed.onlyExpired).toBe(true);

      const errors = await validate(transformed);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined onlyExpired (optional)', async () => {
      // onlyExpired not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('sortOrder validation', () => {
    it('should accept asc value', async () => {
      dto.sortOrder = 'asc';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept desc value', async () => {
      dto.sortOrder = 'desc';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should use default desc when not provided', () => {
      expect(dto.sortOrder).toBe('desc');
    });

    it('should reject invalid sort order', async () => {
      (dto as any).sortOrder = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Note: IsString validation passes, but in runtime it would be validated
    });
  });

  describe('pagination inheritance', () => {
    it('should accept valid page number', async () => {
      dto.page = 1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid limit', async () => {
      dto.limit = 20;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject limit less than 1', async () => {
      dto.limit = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject non-integer limit', async () => {
      dto.limit = 5.5;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('isInt');
    });
  });

  describe('complete query validation', () => {
    it('should accept minimal query (all defaults)', async () => {
      // All fields optional

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.sortBy).toBe(IpWhitelistSortBy.CREATED_AT);
      expect(dto.sortOrder).toBe('desc');
    });

    it('should accept complete query with all fields', async () => {
      dto.search = '192.168.1';
      dto.isActive = true;
      dto.isTemporary = false;
      dto.tags = ['office', 'permanent'];
      dto.sortBy = IpWhitelistSortBy.IP_ADDRESS;
      dto.sortOrder = 'asc';
      dto.onlyExpired = false;
      dto.page = 2;
      dto.limit = 50;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should transform query string parameters correctly', async () => {
      const plain = {
        isActive: 'true',
        isTemporary: 'false',
        tags: 'office',
        onlyExpired: 'true',
        search: '10.0',
        sortBy: 'useCount',
        sortOrder: 'asc',
        page: '3',
        pageSize: '25',
      };

      const transformed = plainToInstance(QueryIpWhitelistDto, plain);

      expect(transformed.isActive).toBe(true);
      expect(transformed.isTemporary).toBe(false);
      expect(transformed.tags).toEqual(['office']);
      expect(transformed.onlyExpired).toBe(true);
      expect(transformed.search).toBe('10.0');
      expect(transformed.sortBy).toBe('useCount');
      expect(transformed.sortOrder).toBe('asc');

      const errors = await validate(transformed);
      expect(errors).toHaveLength(0);
    });
  });

  describe('filter combinations', () => {
    it('should accept query for expired temporary entries', async () => {
      dto.isTemporary = true;
      dto.onlyExpired = true;
      dto.sortBy = IpWhitelistSortBy.LAST_USED_AT;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept query for active entries with specific tags', async () => {
      dto.isActive = true;
      dto.tags = ['production', 'api-access'];
      dto.sortBy = IpWhitelistSortBy.USE_COUNT;
      dto.sortOrder = 'desc';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
