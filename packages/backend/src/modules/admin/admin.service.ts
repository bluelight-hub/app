import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/services/audit-log.service';

export interface Activity {
  id: string;
  action: string;
  entityType: 'user' | 'organization' | 'system' | 'security';
  entityId?: string;
  entityName?: string;
  userId: string;
  userName: string;
  metadata?: Record<string, any>;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Ruft die letzten Aktivitäten aus dem Audit-Log ab
   */
  async getRecentActivities(limit: number = 20): Promise<Activity[]> {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: this.mapEventToAction(log.event),
      entityType: this.getEntityType(log.resource),
      entityId: log.resourceId,
      entityName: this.getEntityName(log),
      userId: log.userId,
      userName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email
        : 'System',
      metadata: log.metadata as Record<string, any>,
      timestamp: log.createdAt.toISOString(),
      severity: this.getSeverity(log.event),
    }));
  }

  /**
   * Ruft Dashboard-Statistiken ab
   */
  async getDashboardStats() {
    const [users, organizations, activeEinsaetze] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.einsatz.count({
        where: {
          status: {
            in: ['ALARMIERT', 'AUSGERUECKT', 'ANKUNFT', 'BEGONNEN'],
          },
        },
      }),
    ]);

    return {
      users,
      organizations,
      activeEinsaetze,
      systemHealth: 'OK', // TODO: Implementiere echte System-Health-Prüfung
    };
  }

  private mapEventToAction(event: string): string {
    const eventMap: Record<string, string> = {
      'user.login': 'login',
      'user.logout': 'logout',
      'user.created': 'create',
      'user.updated': 'update',
      'user.deleted': 'delete',
      'organization.created': 'create',
      'organization.updated': 'update',
      'organization.deleted': 'delete',
      'security.alert': 'security_alert',
      'system.warning': 'warning',
    };

    return eventMap[event] || event;
  }

  private getEntityType(resource: string): Activity['entityType'] {
    if (resource.includes('user')) return 'user';
    if (resource.includes('organization')) return 'organization';
    if (resource.includes('security')) return 'security';
    return 'system';
  }

  private getEntityName(log: any): string | undefined {
    const metadata = log.metadata as any;

    if (metadata?.name) return metadata.name;
    if (metadata?.title) return metadata.title;
    if (metadata?.email) return metadata.email;

    if (log.resource === 'user' && metadata?.firstName && metadata?.lastName) {
      return `${metadata.firstName} ${metadata.lastName}`.trim();
    }

    return undefined;
  }

  private getSeverity(event: string): Activity['severity'] {
    if (event.includes('error') || event.includes('fail')) return 'error';
    if (event.includes('warning') || event.includes('alert')) return 'warning';
    if (event.includes('success') || event.includes('created')) return 'success';
    return 'info';
  }
}
