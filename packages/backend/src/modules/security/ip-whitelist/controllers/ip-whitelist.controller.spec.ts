import { Test, TestingModule } from '@nestjs/testing';
import { IpWhitelistController } from './ip-whitelist.controller';
import { IpWhitelistService } from '../services/ip-whitelist.service';
import { CreateIpWhitelistDto } from '../dto/create-ip-whitelist.dto';
import { UpdateIpWhitelistDto } from '../dto/update-ip-whitelist.dto';
import { QueryIpWhitelistDto, IpWhitelistSortBy } from '../dto/query-ip-whitelist.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IpWhitelist } from '../entities/ip-whitelist.entity';
import { PaginatedResponse } from '../../../../common/interfaces/paginated-response.interface';

describe('IpWhitelistController', () => {
  let controller: IpWhitelistController;
  let service: IpWhitelistService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    role: 'ADMIN',
  };

  const mockIpWhitelistEntry: IpWhitelist = {
    id: '1',
    ipAddress: '192.168.1.1',
    cidr: null,
    description: 'Test IP',
    isActive: true,
    isTemporary: false,
    expiresAt: null,
    tags: [],
    allowedEndpoints: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    createdByEmail: 'test@example.com',
    updatedBy: 'user-123',
    updatedByEmail: 'test@example.com',
    lastUsedAt: null,
    useCount: 0,
  };

  const mockPaginatedResponse: PaginatedResponse<IpWhitelist> = {
    items: [mockIpWhitelistEntry],
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpWhitelistController],
      providers: [
        {
          provide: IpWhitelistService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            isIpAllowed: jest.fn(),
            cleanupExpiredEntries: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IpWhitelistController>(IpWhitelistController);
    service = module.get<IpWhitelistService>(IpWhitelistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new IP whitelist entry', async () => {
      const createDto: CreateIpWhitelistDto = {
        ipAddress: '192.168.1.1',
        description: 'Test IP',
        isActive: true,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockIpWhitelistEntry);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockIpWhitelistEntry);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser.id, mockUser.email);
    });

    it('should pass all optional fields to service', async () => {
      const createDto: CreateIpWhitelistDto = {
        ipAddress: '10.0.0.0',
        cidr: 8,
        description: 'Company network',
        isActive: true,
        isTemporary: true,
        expiresAt: '2025-12-31T23:59:59Z',
        tags: ['office', 'vpn'],
        allowedEndpoints: ['/api/einsatz'],
      };

      jest.spyOn(service, 'create').mockResolvedValue({
        ...mockIpWhitelistEntry,
        ...createDto,
        expiresAt: new Date(createDto.expiresAt as string),
      } as IpWhitelist);

      await controller.create(createDto, mockUser);

      expect(service.create).toHaveBeenCalledWith(createDto, mockUser.id, mockUser.email);
    });

    it('should handle service errors', async () => {
      const createDto: CreateIpWhitelistDto = {
        ipAddress: 'invalid-ip',
        description: 'Test IP',
      };

      jest.spyOn(service, 'create').mockRejectedValue(new BadRequestException('Invalid IP format'));

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated IP whitelist entries', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        sortBy: IpWhitelistSortBy.CREATED_AT,
        sortOrder: 'desc',
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle query with filters', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        search: '192.168',
        isActive: true,
        isTemporary: false,
        tags: ['office'],
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle empty results', async () => {
      const query: QueryIpWhitelistDto = {};
      const emptyResponse: PaginatedResponse<IpWhitelist> = {
        items: [],
        pagination: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(emptyResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(emptyResponse);
    });
  });

  describe('findOne', () => {
    it('should return a single IP whitelist entry', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockIpWhitelistEntry);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockIpWhitelistEntry);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when entry not found', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('IP whitelist entry not found'));

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid ID format', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new BadRequestException('Invalid ID format'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an IP whitelist entry', async () => {
      const updateDto: UpdateIpWhitelistDto = {
        description: 'Updated description',
        isActive: false,
      };

      const updatedEntry: IpWhitelist = {
        ...mockIpWhitelistEntry,
        description: updateDto.description ?? mockIpWhitelistEntry.description,
        isActive: updateDto.isActive ?? mockIpWhitelistEntry.isActive,
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedEntry);

      const result = await controller.update('1', updateDto, mockUser);

      expect(result).toEqual(updatedEntry);
      expect(service.update).toHaveBeenCalledWith('1', updateDto, mockUser.id, mockUser.email);
    });

    it('should handle partial updates', async () => {
      const updateDto: UpdateIpWhitelistDto = {
        isActive: false,
      };

      const updatedEntry = {
        ...mockIpWhitelistEntry,
        isActive: false,
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedEntry);

      const result = await controller.update('1', updateDto, mockUser);

      expect(result).toEqual(updatedEntry);
      expect(service.update).toHaveBeenCalledWith('1', updateDto, mockUser.id, mockUser.email);
    });

    it('should handle updating with new tags', async () => {
      const updateDto: UpdateIpWhitelistDto = {
        tags: ['production', 'api'],
        allowedEndpoints: ['/api/v2'],
      };

      const updatedEntry = {
        ...mockIpWhitelistEntry,
        tags: ['production', 'api'],
        allowedEndpoints: ['/api/v2'],
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedEntry);

      const result = await controller.update('1', updateDto, mockUser);

      expect(result.tags).toEqual(['production', 'api']);
      expect(result.allowedEndpoints).toEqual(['/api/v2']);
    });

    it('should throw NotFoundException when entry not found', async () => {
      const updateDto: UpdateIpWhitelistDto = {
        description: 'Updated',
      };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new NotFoundException('IP whitelist entry not found'));

      await expect(controller.update('999', updateDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an IP whitelist entry', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove('1', mockUser);

      expect(service.remove).toHaveBeenCalledWith('1', mockUser.id, mockUser.email);
    });

    it('should throw NotFoundException when trying to remove non-existent entry', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new NotFoundException('IP whitelist entry not found'));

      await expect(controller.remove('999', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should handle removal of entry with dependencies', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new BadRequestException('Cannot remove entry with active dependencies'));

      await expect(controller.remove('1', mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkIp', () => {
    it('should check if IP is allowed', async () => {
      jest.spyOn(service, 'isIpAllowed').mockResolvedValue(true);

      const result = await controller.checkIp({ ipAddress: '192.168.1.1' });

      expect(result).toEqual({
        allowed: true,
        ipAddress: '192.168.1.1',
      });
      expect(service.isIpAllowed).toHaveBeenCalledWith('192.168.1.1', undefined);
    });

    it('should check if IP is allowed for specific endpoint', async () => {
      jest.spyOn(service, 'isIpAllowed').mockResolvedValue(false);

      const result = await controller.checkIp({
        ipAddress: '192.168.1.1',
        endpoint: '/api/admin',
      });

      expect(result).toEqual({
        allowed: false,
        ipAddress: '192.168.1.1',
        endpoint: '/api/admin',
      });
      expect(service.isIpAllowed).toHaveBeenCalledWith('192.168.1.1', '/api/admin');
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries', async () => {
      jest.spyOn(service, 'cleanupExpiredEntries').mockResolvedValue(5);

      const result = await controller.cleanup();

      expect(result).toEqual({ deletedCount: 5 });
      expect(service.cleanupExpiredEntries).toHaveBeenCalled();
    });

    it('should return 0 when no entries to cleanup', async () => {
      jest.spyOn(service, 'cleanupExpiredEntries').mockResolvedValue(0);

      const result = await controller.cleanup();

      expect(result).toEqual({ deletedCount: 0 });
      expect(service.cleanupExpiredEntries).toHaveBeenCalled();
    });
  });
});
