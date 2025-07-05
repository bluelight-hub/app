import { PaginatedAuditLogResponse } from '../paginated-audit-log.dto';
import { AuditLogEntity } from '../../entities';
import { plainToInstance } from 'class-transformer';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { PaginationMeta } from '@/common/interfaces/paginated-response.interface';

describe('PaginatedAuditLogResponse', () => {
  const mockAuditLog: AuditLogEntity = {
    id: 'audit-123',
    actionType: AuditActionType.CREATE,
    severity: AuditSeverity.MEDIUM,
    action: 'create-user',
    resource: 'user',
    resourceId: 'user-456',
    userId: 'admin-789',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN' as any,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/users',
    httpMethod: 'POST',
    timestamp: new Date('2024-01-01T12:00:00.000Z'),
    success: true,
    statusCode: 201,
    duration: 150,
    sensitiveData: false,
    requiresReview: false,
  } as AuditLogEntity;

  const mockPaginationMeta: PaginationMeta = {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 100,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: false,
  };

  describe('Constructor and properties', () => {
    it('should create instance with all properties', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = [mockAuditLog];
      dto.pagination = mockPaginationMeta;

      expect(dto.items).toHaveLength(1);
      expect(dto.items[0]).toBe(mockAuditLog);
      expect(dto.pagination).toBe(mockPaginationMeta);
      expect(dto.pagination.currentPage).toBe(1);
      expect(dto.pagination.totalPages).toBe(5);
    });

    it('should handle empty items array', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = [];
      dto.pagination = {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      expect(dto.items).toHaveLength(0);
      expect(dto.pagination.totalItems).toBe(0);
      expect(dto.pagination.hasNextPage).toBe(false);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to class instance', () => {
      const plainObject = {
        items: [
          {
            id: 'audit-123',
            actionType: 'CREATE',
            severity: 'MEDIUM',
            action: 'create-user',
            resource: 'user',
            resourceId: 'user-456',
            userId: 'admin-789',
            userEmail: 'admin@example.com',
            userRole: 'ADMIN',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            endpoint: '/api/users',
            httpMethod: 'POST',
            timestamp: '2024-01-01T12:00:00.000Z',
            success: true,
            statusCode: 201,
            duration: 150,
            sensitiveData: false,
            requiresReview: false,
          },
        ],
        pagination: {
          currentPage: 2,
          itemsPerPage: 10,
          totalItems: 50,
          totalPages: 5,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      };

      const dto = plainToInstance(PaginatedAuditLogResponse, plainObject);

      expect(dto).toBeInstanceOf(PaginatedAuditLogResponse);
      expect(dto.items).toHaveLength(1);
      expect(dto.pagination.currentPage).toBe(2);
      expect(dto.pagination.totalItems).toBe(50);
      expect(dto.pagination.hasNextPage).toBe(true);
    });
  });

  describe('Pagination logic', () => {
    it('should correctly handle first page', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = Array(20).fill(mockAuditLog);
      dto.pagination = {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      };

      expect(dto.pagination.hasNextPage).toBe(true);
      expect(dto.pagination.hasPreviousPage).toBe(false);
      expect(dto.pagination.currentPage).toBe(1);
    });

    it('should correctly handle last page', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = Array(20).fill(mockAuditLog);
      dto.pagination = {
        currentPage: 5,
        itemsPerPage: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: false,
        hasPreviousPage: true,
      };

      expect(dto.pagination.hasNextPage).toBe(false);
      expect(dto.pagination.hasPreviousPage).toBe(true);
      expect(dto.pagination.currentPage).toBe(5);
    });

    it('should handle partial last page', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = Array(5).fill(mockAuditLog);
      dto.pagination = {
        currentPage: 5,
        itemsPerPage: 20,
        totalItems: 85,
        totalPages: 5,
        hasNextPage: false,
        hasPreviousPage: true,
      };

      expect(dto.items).toHaveLength(5);
      expect(dto.pagination.hasNextPage).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle single item', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = [mockAuditLog];
      dto.pagination = {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      expect(dto.items).toHaveLength(1);
      expect(dto.pagination.hasNextPage).toBe(false);
      expect(dto.pagination.totalPages).toBe(1);
    });

    it('should handle large datasets', () => {
      const dto = new PaginatedAuditLogResponse();
      dto.items = Array(100).fill(mockAuditLog);
      dto.pagination = {
        currentPage: 50,
        itemsPerPage: 100,
        totalItems: 10000,
        totalPages: 100,
        hasNextPage: true,
        hasPreviousPage: true,
      };

      expect(dto.items).toHaveLength(100);
      expect(dto.pagination.hasNextPage).toBe(true);
      expect(dto.pagination.totalPages).toBe(100);
    });
  });
});
