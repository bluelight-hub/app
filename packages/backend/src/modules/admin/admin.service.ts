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
    try {
      const logs = await this.prisma.auditLog.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });

      // Falls keine Logs vorhanden sind, geben wir Beispiel-Aktivitäten zurück
      if (logs.length === 0) {
        return this.getMockActivities();
      }

      return logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: this.getEntityType(log.resource),
        entityId: log.resourceId,
        entityName: this.getEntityName(log),
        userId: log.userId || 'system',
        userName: log.userEmail || 'System',
        metadata: log.metadata as Record<string, unknown>,
        timestamp: log.timestamp.toISOString(),
        severity: this.getSeverityFromAuditSeverity(log.severity),
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      return this.getMockActivities();
    }
  }

  /**
   * Ruft Dashboard-Statistiken ab
   */
  async getDashboardStats() {
    const [users, activeEinsaetze] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.einsatz.count({
        where: {
          endeDatum: null,
        },
      }),
    ]);

    return {
      users,
      organizations: 0, // TODO: Organizations werden später implementiert
      activeEinsaetze,
      systemHealth: 'OK', // TODO: Implementiere echte System-Health-Prüfung
    };
  }

  private getSeverityFromAuditSeverity(severity: any): Activity['severity'] {
    switch (severity) {
      case 'LOW':
        return 'info';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'error';
      case 'CRITICAL':
        return 'error';
      default:
        return 'info';
    }
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

  private getMockActivities(): Activity[] {
    const now = new Date();
    return [
      {
        id: '1',
        action: 'login',
        entityType: 'user',
        userId: 'mock-user-1',
        userName: 'Max Mustermann',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // vor 5 Minuten
        severity: 'info',
      },
      {
        id: '2',
        action: 'create',
        entityType: 'organization',
        entityId: 'org-123',
        entityName: 'Feuerwehr Musterstadt',
        userId: 'mock-user-2',
        userName: 'Anna Admin',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // vor 30 Minuten
        severity: 'success',
      },
      {
        id: '3',
        action: 'update',
        entityType: 'user',
        entityId: 'user-456',
        entityName: 'Peter Test',
        userId: 'mock-user-2',
        userName: 'Anna Admin',
        metadata: { role: 'ADMIN' },
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // vor 2 Stunden
        severity: 'info',
      },
      {
        id: '4',
        action: 'security_alert',
        entityType: 'security',
        userId: 'system',
        userName: 'System',
        metadata: { reason: 'Mehrfache fehlgeschlagene Anmeldeversuche' },
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // vor 4 Stunden
        severity: 'warning',
      },
      {
        id: '5',
        action: 'logout',
        entityType: 'user',
        userId: 'mock-user-3',
        userName: 'Thomas Tester',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // vor 1 Tag
        severity: 'info',
      },
    ];
  }
}
