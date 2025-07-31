import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '../../modules/auth/guards';
import { Roles } from '../../modules/auth/decorators';
import { UserRole } from '../../modules/auth/types/jwt.types';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryLogsDto } from '../dto/query-logs.dto';

/**
 * Controller für Admin-Zugriff auf Security Logs.
 * Bietet Read-Only Zugriff mit umfangreichen Filter- und Paginierungsoptionen.
 *
 * Sicherheitsfeatures:
 * - Nur für Admins zugänglich
 * - Rate Limiting (100 Requests/Minute)
 * - Sensitive Felder werden gefiltert
 * - Keine Schreiboperationen möglich
 */
@ApiTags('Security Logs')
@Controller('api/admin/security-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class SecurityLogController {
  private readonly logger = new Logger(SecurityLogController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ruft Security Logs mit Filteroptionen und Pagination ab.
   *
   * @param {QueryLogsDto} query - Abfrageparameter für Filter und Pagination
   * @returns {Promise<{data: SecurityLog[], pagination: PaginationInfo}>}
   *          Gefilterte Logs mit Pagination-Metadaten
   * @throws {InternalServerErrorException} Bei Datenbankfehlern
   */
  @Get()
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 Requests pro Minute
  @ApiOperation({
    summary: 'Get security logs',
    description: 'Retrieve security logs with optional filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Security logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              eventType: { type: 'string' },
              severity: { type: 'string' },
              userId: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              sessionId: { type: 'string', nullable: true },
              metadata: { type: 'object', nullable: true },
              message: { type: 'string', nullable: true },
              sequenceNumber: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSecurityLogs(@Query() query: QueryLogsDto) {
    try {
      // Build where clause
      const where: any = {};

      if (query.eventType) {
        where.eventType = query.eventType;
      }

      if (query.userId) {
        where.userId = query.userId;
      }

      // Date range filter
      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) {
          where.createdAt.gte = new Date(query.from);
        }
        if (query.to) {
          where.createdAt.lte = new Date(query.to);
        }
      }

      // Calculate pagination
      const skip = (query.page - 1) * query.pageSize;
      const take = query.pageSize;

      // Execute queries in parallel for better performance
      const [logs, total] = await Promise.all([
        // Get logs with selected fields (excluding sensitive hash fields)
        this.prisma.securityLog.findMany({
          where,
          select: {
            id: true,
            eventType: true,
            severity: true,
            userId: true,
            ipAddress: true,
            userAgent: true,
            sessionId: true,
            metadata: true,
            message: true,
            sequenceNumber: true,
            createdAt: true,
            // Include user details if available
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take,
        }),
        // Get total count for pagination
        this.prisma.securityLog.count({ where }),
      ]);

      // Calculate total pages
      const totalPages = Math.ceil(total / query.pageSize);

      this.logger.debug(
        `Retrieved ${logs.length} security logs (page ${query.page}/${totalPages})`,
      );

      // Convert BigInt to string for JSON serialization
      const serializedLogs = logs.map((log) => ({
        ...log,
        sequenceNumber: log.sequenceNumber.toString(),
      }));

      return {
        data: serializedLogs,
        pagination: {
          total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve security logs', error);
      throw new InternalServerErrorException('Failed to retrieve security logs');
    }
  }
}
