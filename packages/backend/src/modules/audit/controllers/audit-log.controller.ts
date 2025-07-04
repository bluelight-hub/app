import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogBatchService } from '../services/audit-log-batch.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RequirePermissions } from '@/modules/auth/decorators/permissions.decorator';
import { Permission, UserRole } from '@/modules/auth/types/jwt.types';
import {
  CreateAuditLogDto,
  QueryAuditLogDto,
  PaginatedAuditLogResponse,
  AuditLogStatisticsResponse,
} from '../dto';
import { AuditLogEntity } from '../entities';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit/logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogBatchService: AuditLogBatchService,
  ) {}

  /**
   * Create a single audit log entry
   * @description Creates a new audit log entry with manual logging capability
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create audit log entry' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Audit log entry created successfully',
    type: AuditLogEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid audit log data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(@Body() createAuditLogDto: CreateAuditLogDto): Promise<AuditLogEntity> {
    // Creating audit log entry
    return await this.auditLogService.create(createAuditLogDto);
  }

  /**
   * Create multiple audit log entries in batch
   * @description Batch endpoint for creating multiple audit log entries efficiently
   */
  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create audit logs in batch' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Batch processing completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid batch data',
  })
  async createBatch(@Body() createAuditLogDtos: CreateAuditLogDto[]) {
    if (!Array.isArray(createAuditLogDtos)) {
      throw new BadRequestException('Body must be an array of audit log entries');
    }

    if (createAuditLogDtos.length === 0) {
      throw new BadRequestException('Batch cannot be empty');
    }

    if (createAuditLogDtos.length > 1000) {
      throw new BadRequestException('Batch size cannot exceed 1000 entries');
    }

    // Processing batch
    return await this.auditLogBatchService.createBatch(createAuditLogDtos);
  }

  /**
   * Query audit logs with filtering and pagination
   * @description Advanced query endpoint with multiple filter options
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @RequirePermissions(Permission.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of audit logs',
    type: PaginatedAuditLogResponse,
  })
  async findAll(@Query() query: QueryAuditLogDto): Promise<PaginatedAuditLogResponse> {
    // Querying audit logs
    return await this.auditLogService.findAll(query);
  }

  /**
   * Get statistics for audit logs
   * @description Returns aggregated statistics for audit logs
   */
  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit log statistics',
    type: AuditLogStatisticsResponse,
  })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['action', 'resource', 'severity', 'user', 'day', 'hour'],
  })
  async getStatistics(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('groupBy') groupBy?: string,
  ): Promise<AuditLogStatisticsResponse> {
    // Getting audit log statistics
    return await this.auditLogService.getStatistics({ startDate, endDate, groupBy });
  }

  /**
   * Export audit logs in different formats
   * @description Export filtered audit logs as JSON, CSV, or NDJSON
   */
  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_EXPORT)
  @ApiOperation({ summary: 'Export audit logs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Exported audit logs',
  })
  @ApiQuery({ name: 'format', enum: ['json', 'csv', 'ndjson'], required: false })
  async export(
    @Query() query: QueryAuditLogDto,
    @Query('format') format: 'json' | 'csv' | 'ndjson' = 'json',
    @Res({ passthrough: true }) res: Response,
  ) {
    // Set appropriate headers based on format
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    // For large exports, use streaming
    const stream = await this.auditLogBatchService.exportLogsStream(query, format);
    return new StreamableFile(stream);
  }

  /**
   * Get a single audit log by ID
   * @description Retrieve detailed information about a specific audit log entry
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @RequirePermissions(Permission.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit log entry',
    type: AuditLogEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Audit log not found',
  })
  async findOne(@Param('id') id: string): Promise<AuditLogEntity> {
    // Getting audit log by ID
    return await this.auditLogService.findOne(id);
  }

  /**
   * Delete an audit log by ID
   * @description Soft delete an audit log entry (marks as deleted but retains for compliance)
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete audit log' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Audit log deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Audit log not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete compliance-tagged logs',
  })
  async remove(@Param('id') id: string): Promise<void> {
    // Deleting audit log
    await this.auditLogService.remove(id);
  }

  /**
   * Delete multiple audit logs based on criteria
   * @description Bulk delete audit logs that match specified criteria
   */
  @Delete()
  @Roles(UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete audit logs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Number of deleted entries',
  })
  @ApiQuery({ name: 'olderThan', required: true, type: Date })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'excludeCompliance', required: false, type: Boolean })
  async bulkDelete(
    @Query('olderThan') olderThan: Date,
    @Query('severity') severity?: string,
    @Query('excludeCompliance') excludeCompliance: boolean = true,
  ) {
    if (!olderThan) {
      throw new BadRequestException('olderThan parameter is required');
    }

    // Bulk deleting audit logs
    const deletedCount = await this.auditLogService.bulkDelete({
      olderThan: new Date(olderThan),
      severity: severity as any,
      excludeCompliance,
    });

    return { deletedCount, message: `Successfully deleted ${deletedCount} audit log entries` };
  }

  /**
   * Archive old audit logs
   * @description Archives audit logs older than specified days for compliance retention
   */
  @Post('archive')
  @Roles(UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive old audit logs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Number of archived entries',
  })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number })
  async archiveOldLogs(@Query('daysToKeep') daysToKeep: number = 365) {
    // Archiving old audit logs
    const archivedCount = await this.auditLogService.archiveOldLogs(daysToKeep);

    return {
      archivedCount,
      message: `Successfully archived ${archivedCount} audit log entries older than ${daysToKeep} days`,
    };
  }

  /**
   * Apply retention policy and cleanup expired logs
   * @description Applies configured retention policies and removes expired audit logs
   */
  @Post('cleanup')
  @Roles(UserRole.SUPER_ADMIN)
  @RequirePermissions(Permission.AUDIT_LOG_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply retention policy and cleanup logs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup results with deleted count',
  })
  async applyRetentionPolicy() {
    // Applying retention policy
    const deletedCount = await this.auditLogBatchService.applyRetentionPolicy();

    return {
      deletedCount,
      message: `Successfully cleaned up ${deletedCount} expired audit log entries based on retention policies`,
    };
  }
}
