import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IpWhitelistService } from './ip-whitelist.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaginationService } from '../../../../common/services/pagination.service';
import { AuditLogService } from '../../../audit';
import {
  CreateIpWhitelistDto,
  UpdateIpWhitelistDto,
  QueryIpWhitelistDto,
  IpWhitelistSortBy,
} from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

describe('IpWhitelistService', () => {
  let service: IpWhitelistService;

  const mockPrismaService = {
    ipWhitelist: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockPaginationService = {
    paginate: jest.fn(),
  };

  const mockAuditLogService = {
    create: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
  };

  const mockIpWhitelist = {
    id: 'ip-123',
    ipAddress: '192.168.1.1',
    cidr: null,
    description: 'Test IP',
    isActive: true,
    isTemporary: false,
    expiresAt: null,
    tags: ['office'],
    allowedEndpoints: [],
    createdBy: mockUser.id,
    createdByEmail: mockUser.email,
    updatedBy: null,
    updatedByEmail: null,
    lastUsedAt: null,
    useCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpWhitelistService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<IpWhitelistService>(IpWhitelistService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateIpWhitelistDto = {
      ipAddress: '192.168.1.1',
      description: 'Test IP',
      isActive: true,
      tags: ['office'],
    };

    it('sollte einen neuen IP-Whitelist-Eintrag erstellen', async () => {
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);
      mockPrismaService.ipWhitelist.create.mockResolvedValue(mockIpWhitelist);

      const result = await service.create(createDto, mockUser.id, mockUser.email);

      expect(result).toEqual(mockIpWhitelist);
      expect(mockPrismaService.ipWhitelist.findFirst).toHaveBeenCalledWith({
        where: {
          ipAddress: createDto.ipAddress,
          cidr: null,
        },
      });
      expect(mockPrismaService.ipWhitelist.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          expiresAt: null,
          createdBy: mockUser.id,
          createdByEmail: mockUser.email,
          tags: createDto.tags,
          allowedEndpoints: [],
        },
      });
      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        actionType: AuditActionType.CREATE,
        severity: AuditSeverity.HIGH,
        action: 'ip_whitelist.create',
        resource: 'ip_whitelist',
        resourceId: mockIpWhitelist.id,
        userId: mockUser.id,
        userEmail: mockUser.email,
        newValues: mockIpWhitelist,
        success: true,
      });
    });

    it('sollte einen Fehler werfen, wenn IP bereits existiert', async () => {
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(mockIpWhitelist);

      await expect(service.create(createDto, mockUser.id, mockUser.email)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.ipWhitelist.create).not.toHaveBeenCalled();
    });

    it('sollte einen Fehler werfen für temporäre Einträge ohne Ablaufdatum', async () => {
      const temporaryDto: CreateIpWhitelistDto = {
        ...createDto,
        isTemporary: true,
      };
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);

      await expect(service.create(temporaryDto, mockUser.id, mockUser.email)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sollte temporäre Einträge mit Ablaufdatum akzeptieren', async () => {
      const temporaryDto: CreateIpWhitelistDto = {
        ...createDto,
        isTemporary: true,
        expiresAt: '2024-12-31T23:59:59Z',
      };
      const expectedResult = {
        ...mockIpWhitelist,
        isTemporary: true,
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);
      mockPrismaService.ipWhitelist.create.mockResolvedValue(expectedResult);

      const result = await service.create(temporaryDto, mockUser.id, mockUser.email);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.ipWhitelist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isTemporary: true,
          expiresAt: new Date('2024-12-31T23:59:59Z'),
        }),
      });
    });

    it('sollte CIDR-Notation korrekt verarbeiten', async () => {
      const cidrDto: CreateIpWhitelistDto = {
        ...createDto,
        cidr: 24,
      };
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);
      mockPrismaService.ipWhitelist.create.mockResolvedValue({
        ...mockIpWhitelist,
        cidr: 24,
      });

      await service.create(cidrDto, mockUser.id, mockUser.email);

      expect(mockPrismaService.ipWhitelist.findFirst).toHaveBeenCalledWith({
        where: {
          ipAddress: createDto.ipAddress,
          cidr: 24,
        },
      });
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = {
      data: [mockIpWhitelist],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('sollte alle IP-Whitelist-Einträge ohne Filter zurückgeben', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        sortBy: IpWhitelistSortBy.CREATED_AT,
        sortOrder: 'desc',
      };
      mockPaginationService.paginate.mockResolvedValue(mockPaginatedResponse);

      const result = await service.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'ipWhitelist',
        {
          where: {},
          orderBy: { createdAt: 'desc' },
        },
        1,
        10,
      );
    });

    it('sollte nach aktiven Einträgen filtern', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        sortBy: IpWhitelistSortBy.CREATED_AT,
        sortOrder: 'desc',
        isActive: true,
      };
      mockPaginationService.paginate.mockResolvedValue(mockPaginatedResponse);

      await service.findAll(query);

      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'ipWhitelist',
        {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        1,
        10,
      );
    });

    it('sollte nach Tags filtern', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        sortBy: IpWhitelistSortBy.CREATED_AT,
        sortOrder: 'desc',
        tags: ['office', 'vpn'],
      };
      mockPaginationService.paginate.mockResolvedValue(mockPaginatedResponse);

      await service.findAll(query);

      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'ipWhitelist',
        {
          where: {
            tags: {
              hasSome: ['office', 'vpn'],
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        1,
        10,
      );
    });

    it('sollte Volltextsuche unterstützen', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        sortBy: IpWhitelistSortBy.CREATED_AT,
        sortOrder: 'desc',
        search: '192.168',
      };
      mockPaginationService.paginate.mockResolvedValue(mockPaginatedResponse);

      await service.findAll(query);

      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'ipWhitelist',
        {
          where: {
            OR: [
              { ipAddress: { contains: '192.168', mode: 'insensitive' } },
              { description: { contains: '192.168', mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        },
        1,
        10,
      );
    });

    it('sollte nur abgelaufene Einträge anzeigen', async () => {
      const query: QueryIpWhitelistDto = {
        page: 1,
        limit: 10,
        sortBy: IpWhitelistSortBy.CREATED_AT,
        sortOrder: 'desc',
        onlyExpired: true,
      };
      mockPaginationService.paginate.mockResolvedValue(mockPaginatedResponse);

      await service.findAll(query);

      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'ipWhitelist',
        {
          where: {
            AND: [{ isTemporary: true }, { expiresAt: { lt: expect.any(Date) } }],
          },
          orderBy: { createdAt: 'desc' },
        },
        1,
        10,
      );
    });
  });

  describe('findOne', () => {
    it('sollte einen IP-Whitelist-Eintrag anhand der ID finden', async () => {
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(mockIpWhitelist);

      const result = await service.findOne('ip-123');

      expect(result).toEqual(mockIpWhitelist);
      expect(mockPrismaService.ipWhitelist.findUnique).toHaveBeenCalledWith({
        where: { id: 'ip-123' },
      });
    });

    it('sollte NotFoundException werfen, wenn Eintrag nicht gefunden', async () => {
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateIpWhitelistDto = {
      description: 'Updated description',
      isActive: false,
    };

    it('sollte einen IP-Whitelist-Eintrag aktualisieren', async () => {
      const updatedEntry = {
        ...mockIpWhitelist,
        ...updateDto,
        updatedBy: mockUser.id,
        updatedByEmail: mockUser.email,
      };
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(mockIpWhitelist);
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);
      mockPrismaService.ipWhitelist.update.mockResolvedValue(updatedEntry);

      const result = await service.update('ip-123', updateDto, mockUser.id, mockUser.email);

      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.ipWhitelist.update).toHaveBeenCalledWith({
        where: { id: 'ip-123' },
        data: {
          ...updateDto,
          updatedBy: mockUser.id,
          updatedByEmail: mockUser.email,
        },
      });
      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        actionType: AuditActionType.UPDATE,
        severity: AuditSeverity.HIGH,
        action: 'ip_whitelist.update',
        resource: 'ip_whitelist',
        resourceId: 'ip-123',
        userId: mockUser.id,
        userEmail: mockUser.email,
        oldValues: mockIpWhitelist,
        newValues: updatedEntry,
        affectedFields: Object.keys(updateDto),
        success: true,
      });
    });

    it('sollte NotFoundException werfen, wenn Eintrag nicht existiert', async () => {
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockUser.id, mockUser.email),
      ).rejects.toThrow(NotFoundException);
    });

    it('sollte ConflictException werfen, wenn neue IP bereits existiert', async () => {
      const updateWithNewIp: UpdateIpWhitelistDto = {
        ipAddress: '192.168.1.2',
      };
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(mockIpWhitelist);
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue({
        ...mockIpWhitelist,
        id: 'other-ip',
        ipAddress: '192.168.1.2',
      });

      await expect(
        service.update('ip-123', updateWithNewIp, mockUser.id, mockUser.email),
      ).rejects.toThrow(ConflictException);
    });

    it('sollte BadRequestException werfen für temporäre Einträge ohne Ablaufdatum', async () => {
      const temporaryUpdate: UpdateIpWhitelistDto = {
        isTemporary: true,
      };
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(mockIpWhitelist);

      await expect(
        service.update('ip-123', temporaryUpdate, mockUser.id, mockUser.email),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('sollte einen IP-Whitelist-Eintrag löschen', async () => {
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(mockIpWhitelist);
      mockPrismaService.ipWhitelist.delete.mockResolvedValue(mockIpWhitelist);

      await service.remove('ip-123', mockUser.id, mockUser.email);

      expect(mockPrismaService.ipWhitelist.delete).toHaveBeenCalledWith({
        where: { id: 'ip-123' },
      });
      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        actionType: AuditActionType.DELETE,
        severity: AuditSeverity.CRITICAL,
        action: 'ip_whitelist.delete',
        resource: 'ip_whitelist',
        resourceId: 'ip-123',
        userId: mockUser.id,
        userEmail: mockUser.email,
        oldValues: mockIpWhitelist,
        success: true,
      });
    });

    it('sollte NotFoundException werfen, wenn Eintrag nicht existiert', async () => {
      mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUser.id, mockUser.email)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isIpAllowed', () => {
    it('sollte true zurückgeben für exakte IP-Übereinstimmung', async () => {
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([mockIpWhitelist]);
      mockPrismaService.ipWhitelist.update.mockResolvedValue(mockIpWhitelist);

      const result = await service.isIpAllowed('192.168.1.1');

      expect(result).toBe(true);
      expect(mockPrismaService.ipWhitelist.update).toHaveBeenCalledWith({
        where: { id: mockIpWhitelist.id },
        data: {
          lastUsedAt: expect.any(Date),
          useCount: { increment: 1 },
        },
      });
    });

    it('sollte false zurückgeben für nicht gelistete IP', async () => {
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([mockIpWhitelist]);

      const result = await service.isIpAllowed('10.0.0.1');

      expect(result).toBe(false);
      expect(mockPrismaService.ipWhitelist.update).not.toHaveBeenCalled();
    });

    it('sollte inaktive Einträge ignorieren', async () => {
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([]);

      const result = await service.isIpAllowed('192.168.1.1');

      expect(result).toBe(false);
    });

    it('sollte abgelaufene temporäre Einträge ignorieren', async () => {
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([]);

      const result = await service.isIpAllowed('192.168.1.1');

      expect(result).toBe(false);
    });

    it('sollte Endpoint-Beschränkungen respektieren', async () => {
      const restrictedEntry = {
        ...mockIpWhitelist,
        allowedEndpoints: ['/api/einsatz'],
      };
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([restrictedEntry]);

      const resultAllowed = await service.isIpAllowed('192.168.1.1', '/api/einsatz/123');
      const resultDenied = await service.isIpAllowed('192.168.1.1', '/api/etb');

      expect(resultAllowed).toBe(true);
      expect(resultDenied).toBe(false);
    });

    it('sollte CIDR-Bereiche korrekt prüfen', async () => {
      const cidrEntry = {
        ...mockIpWhitelist,
        cidr: 24,
      };
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([cidrEntry]);
      mockPrismaService.ipWhitelist.update.mockResolvedValue(cidrEntry);

      const result1 = await service.isIpAllowed('192.168.1.100');
      const result2 = await service.isIpAllowed('192.168.2.1');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('sollte abgelaufene temporäre Einträge löschen', async () => {
      mockPrismaService.ipWhitelist.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.cleanupExpiredEntries();

      expect(result).toBe(3);
      expect(mockPrismaService.ipWhitelist.deleteMany).toHaveBeenCalledWith({
        where: {
          isTemporary: true,
          expiresAt: { lt: expect.any(Date) },
        },
      });
      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        actionType: AuditActionType.DELETE,
        severity: AuditSeverity.LOW,
        action: 'ip_whitelist.cleanup_expired',
        resource: 'ip_whitelist',
        userId: 'system',
        userEmail: 'system@bluelight-hub.com',
        metadata: { deletedCount: 3 },
        success: true,
      });
    });

    it('sollte kein Audit-Log erstellen, wenn keine Einträge gelöscht wurden', async () => {
      mockPrismaService.ipWhitelist.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpiredEntries();

      expect(result).toBe(0);
      expect(mockAuditLogService.create).not.toHaveBeenCalled();
    });
  });

  describe('IP-Validierung (private Methoden)', () => {
    it('sollte IPv4-Adressen korrekt validieren', async () => {
      // Test durch isIpAllowed mit verschiedenen IP-Formaten
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([
        { ...mockIpWhitelist, ipAddress: '10.0.0.1', cidr: null },
      ]);

      const result = await service.isIpAllowed('10.0.0.1');
      expect(result).toBe(true);

      const resultInvalid = await service.isIpAllowed('999.999.999.999');
      expect(resultInvalid).toBe(false);
    });

    it('sollte IPv6-Adressen unterstützen', async () => {
      const ipv6Entry = {
        ...mockIpWhitelist,
        ipAddress: '2001:db8::1',
      };
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([ipv6Entry]);
      mockPrismaService.ipWhitelist.update.mockResolvedValue(ipv6Entry);

      const result = await service.isIpAllowed('2001:db8::1');
      expect(result).toBe(true);
    });

    it('sollte localhost (::1) unterstützen', async () => {
      const localhostEntry = {
        ...mockIpWhitelist,
        ipAddress: '::1',
      };
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([localhostEntry]);
      mockPrismaService.ipWhitelist.update.mockResolvedValue(localhostEntry);

      const result = await service.isIpAllowed('::1');
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit leeren Arrays umgehen können', async () => {
      const dto: CreateIpWhitelistDto = {
        ipAddress: '192.168.1.1',
        tags: [],
        allowedEndpoints: [],
      };
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);
      mockPrismaService.ipWhitelist.create.mockResolvedValue(mockIpWhitelist);

      const result = await service.create(dto, mockUser.id, mockUser.email);

      expect(result).toEqual(mockIpWhitelist);
    });

    it('sollte null-Werte in optionalen Feldern verarbeiten', async () => {
      const dto: CreateIpWhitelistDto = {
        ipAddress: '192.168.1.1',
        cidr: undefined,
        description: undefined,
      };
      mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);
      mockPrismaService.ipWhitelist.create.mockResolvedValue(mockIpWhitelist);

      const result = await service.create(dto, mockUser.id, mockUser.email);

      expect(result).toEqual(mockIpWhitelist);
    });

    it('sollte große CIDR-Bereiche verarbeiten können', async () => {
      const cidrEntry = {
        ...mockIpWhitelist,
        ipAddress: '10.0.0.0',
        cidr: 8,
      };
      mockPrismaService.ipWhitelist.findMany.mockResolvedValue([cidrEntry]);
      mockPrismaService.ipWhitelist.update.mockResolvedValue(cidrEntry);

      const result = await service.isIpAllowed('10.255.255.255');
      expect(result).toBe(true);
    });
  });
});
