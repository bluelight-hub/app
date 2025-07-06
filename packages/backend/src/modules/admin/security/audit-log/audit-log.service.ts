import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogEntry {
    action: string;
    resource: string;
    resourceId?: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
}

/**
 * Service for creating and managing audit logs
 * Records all security-relevant events for compliance
 */
@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create an audit log entry
     */
    async log(entry: AuditLogEntry): Promise<AuditLog> {
        this.logger.debug(`Creating audit log: ${entry.action} on ${entry.resource} by ${entry.userId}`);

        try {
            const auditLog = await this.prisma.auditLog.create({
                data: {
                    action: entry.action,
                    resource: entry.resource,
                    resourceId: entry.resourceId,
                    userId: entry.userId,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                    details: entry.details,
                }
            });

            this.logger.debug(`Audit log created: ${auditLog.id}`);
            return auditLog;
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
            // Don't throw error to avoid breaking main functionality
            return null;
        }
    }

    /**
     * Log IP whitelist creation
     */
    async logIpWhitelistCreate(ipAddress: string, resourceId: string, userId: string, userIp?: string, userAgent?: string): Promise<void> {
        await this.log({
            action: 'CREATE',
            resource: 'IP_WHITELIST',
            resourceId,
            userId,
            ipAddress: userIp,
            userAgent,
            details: { whitelistedIp: ipAddress }
        });
    }

    /**
     * Log IP whitelist update
     */
    async logIpWhitelistUpdate(resourceId: string, userId: string, changes: any, userIp?: string, userAgent?: string): Promise<void> {
        await this.log({
            action: 'UPDATE',
            resource: 'IP_WHITELIST',
            resourceId,
            userId,
            ipAddress: userIp,
            userAgent,
            details: { changes }
        });
    }

    /**
     * Log IP whitelist deletion
     */
    async logIpWhitelistDelete(ipAddress: string, resourceId: string, userId: string, userIp?: string, userAgent?: string): Promise<void> {
        await this.log({
            action: 'DELETE',
            resource: 'IP_WHITELIST',
            resourceId,
            userId,
            ipAddress: userIp,
            userAgent,
            details: { deletedIp: ipAddress }
        });
    }

    /**
     * Log IP whitelist access attempts
     */
    async logIpWhitelistAccess(ipAddress: string, allowed: boolean, userId?: string, userAgent?: string): Promise<void> {
        await this.log({
            action: allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
            resource: 'IP_WHITELIST_CHECK',
            userId: userId || 'anonymous',
            ipAddress,
            userAgent,
            details: { allowed }
        });
    }

    /**
     * Get audit logs for a specific resource
     */
    async findByResource(resource: string, resourceId?: string): Promise<AuditLog[]> {
        this.logger.debug(`Retrieving audit logs for resource: ${resource}${resourceId ? ` ID: ${resourceId}` : ''}`);

        const where: any = { resource };
        if (resourceId) {
            where.resourceId = resourceId;
        }

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: 100 // Limit to recent 100 entries
        });
    }

    /**
     * Get audit logs for a specific user
     */
    async findByUser(userId: string): Promise<AuditLog[]> {
        this.logger.debug(`Retrieving audit logs for user: ${userId}`);

        return this.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 100 // Limit to recent 100 entries
        });
    }
}