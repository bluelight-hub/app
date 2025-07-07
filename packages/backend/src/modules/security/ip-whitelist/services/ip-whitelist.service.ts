import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateIpWhitelistDto, UpdateIpWhitelistDto, QueryIpWhitelistDto } from '../dto';
import { IpWhitelist, Prisma } from '@prisma/generated/prisma/client';
import { PaginationService } from '../../../../common/services/pagination.service';
import { AuditLogService } from '../../../audit';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { PaginatedResponse } from '../../../../common/interfaces/paginated-response.interface';

/**
 * Service zur Verwaltung der IP-Whitelist
 */
@Injectable()
export class IpWhitelistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Erstellt einen neuen IP-Whitelist-Eintrag
   */
  async create(
    createDto: CreateIpWhitelistDto,
    userId: string,
    userEmail: string,
  ): Promise<IpWhitelist> {
    // Prüfen ob IP bereits existiert
    const existing = await this.prisma.ipWhitelist.findFirst({
      where: {
        ipAddress: createDto.ipAddress,
        cidr: createDto.cidr ?? null,
      },
    });

    if (existing) {
      throw new ConflictException('IP-Adresse mit dieser CIDR-Notation existiert bereits');
    }

    // Validierung für temporäre Einträge
    if (createDto.isTemporary && !createDto.expiresAt) {
      throw new BadRequestException('Temporäre Einträge benötigen ein Ablaufdatum');
    }

    const ipWhitelist = await this.prisma.ipWhitelist.create({
      data: {
        ...createDto,
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
        createdBy: userId,
        createdByEmail: userEmail,
        tags: createDto.tags ?? [],
        allowedEndpoints: createDto.allowedEndpoints ?? [],
      },
    });

    // Audit-Log erstellen
    await this.auditLogService.create({
      actionType: AuditActionType.CREATE,
      severity: AuditSeverity.HIGH,
      action: 'ip_whitelist.create',
      resource: 'ip_whitelist',
      resourceId: ipWhitelist.id,
      userId,
      userEmail,
      newValues: ipWhitelist,
      success: true,
    });

    return ipWhitelist;
  }

  /**
   * Findet alle IP-Whitelist-Einträge mit Filterung und Paginierung
   */
  async findAll(query: QueryIpWhitelistDto): Promise<PaginatedResponse<IpWhitelist>> {
    const where: Prisma.IpWhitelistWhereInput = {};

    // Filter anwenden
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isTemporary !== undefined) {
      where.isTemporary = query.isTemporary;
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = {
        hasSome: query.tags,
      };
    }

    if (query.search) {
      where.OR = [
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.onlyExpired) {
      where.AND = [{ isTemporary: true }, { expiresAt: { lt: new Date() } }];
    }

    // Sortierung
    const orderBy: Prisma.IpWhitelistOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return await this.paginationService.paginate<IpWhitelist>(
      'ipWhitelist',
      {
        where,
        orderBy,
      },
      query.page,
      query.limit,
    );
  }

  /**
   * Findet einen IP-Whitelist-Eintrag anhand der ID
   */
  async findOne(id: string): Promise<IpWhitelist> {
    const ipWhitelist = await this.prisma.ipWhitelist.findUnique({
      where: { id },
    });

    if (!ipWhitelist) {
      throw new NotFoundException(`IP-Whitelist-Eintrag mit ID ${id} nicht gefunden`);
    }

    return ipWhitelist;
  }

  /**
   * Aktualisiert einen IP-Whitelist-Eintrag
   */
  async update(
    id: string,
    updateDto: UpdateIpWhitelistDto,
    userId: string,
    userEmail: string,
  ): Promise<IpWhitelist> {
    const existing = await this.findOne(id);

    // Prüfen ob neue IP bereits existiert (falls IP geändert wird)
    if (updateDto.ipAddress || updateDto.cidr !== undefined) {
      const duplicate = await this.prisma.ipWhitelist.findFirst({
        where: {
          ipAddress: updateDto.ipAddress ?? existing.ipAddress,
          cidr: updateDto.cidr !== undefined ? updateDto.cidr : existing.cidr,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException('IP-Adresse mit dieser CIDR-Notation existiert bereits');
      }
    }

    // Validierung für temporäre Einträge
    if (updateDto.isTemporary && !updateDto.expiresAt && !existing.expiresAt) {
      throw new BadRequestException('Temporäre Einträge benötigen ein Ablaufdatum');
    }

    const ipWhitelist = await this.prisma.ipWhitelist.update({
      where: { id },
      data: {
        ...updateDto,
        expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined,
        updatedBy: userId,
        updatedByEmail: userEmail,
      },
    });

    // Audit-Log erstellen
    await this.auditLogService.create({
      actionType: AuditActionType.UPDATE,
      severity: AuditSeverity.HIGH,
      action: 'ip_whitelist.update',
      resource: 'ip_whitelist',
      resourceId: id,
      userId,
      userEmail,
      oldValues: existing,
      newValues: ipWhitelist,
      affectedFields: Object.keys(updateDto),
      success: true,
    });

    return ipWhitelist;
  }

  /**
   * Löscht einen IP-Whitelist-Eintrag
   */
  async remove(id: string, userId: string, userEmail: string): Promise<void> {
    const existing = await this.findOne(id);

    await this.prisma.ipWhitelist.delete({
      where: { id },
    });

    // Audit-Log erstellen
    await this.auditLogService.create({
      actionType: AuditActionType.DELETE,
      severity: AuditSeverity.CRITICAL,
      action: 'ip_whitelist.delete',
      resource: 'ip_whitelist',
      resourceId: id,
      userId,
      userEmail,
      oldValues: existing,
      success: true,
    });
  }

  /**
   * Prüft ob eine IP-Adresse in der Whitelist ist
   */
  async isIpAllowed(ipAddress: string, endpoint?: string): Promise<boolean> {
    // Aktive, nicht abgelaufene Einträge suchen
    const entries = await this.prisma.ipWhitelist.findMany({
      where: {
        isActive: true,
        OR: [
          { isTemporary: false },
          {
            AND: [{ isTemporary: true }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
    });

    for (const entry of entries) {
      // Endpoint-Prüfung
      if (endpoint && entry.allowedEndpoints.length > 0) {
        if (!entry.allowedEndpoints.some((allowed) => endpoint.startsWith(allowed))) {
          continue;
        }
      }

      // IP-Prüfung
      if (this.checkIpMatch(ipAddress, entry.ipAddress, entry.cidr)) {
        // Nutzungsstatistik aktualisieren
        await this.prisma.ipWhitelist.update({
          where: { id: entry.id },
          data: {
            lastUsedAt: new Date(),
            useCount: { increment: 1 },
          },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Prüft ob eine IP zu einem IP-Bereich gehört
   */
  private checkIpMatch(ip: string, whitelistIp: string, cidr: number | null): boolean {
    // Exakte Übereinstimmung
    if (!cidr) {
      return ip === whitelistIp;
    }

    // CIDR-Bereich prüfen (vereinfachte Implementierung für IPv4)
    // Für Production sollte eine robustere Lösung wie ip-cidr oder netmask verwendet werden
    if (this.isIPv4(ip) && this.isIPv4(whitelistIp)) {
      const ipNum = this.ipToNumber(ip);
      const whitelistNum = this.ipToNumber(whitelistIp);
      const mask = (0xffffffff << (32 - cidr)) >>> 0;

      return (ipNum & mask) === (whitelistNum & mask);
    }

    // IPv6 oder andere Fälle - nur exakte Übereinstimmung
    return ip === whitelistIp;
  }

  private isIPv4(ip: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    return (
      parts.reduce((acc, part, index) => {
        return acc + (parseInt(part) << (8 * (3 - index)));
      }, 0) >>> 0
    );
  }

  /**
   * Bereinigt abgelaufene temporäre Einträge
   */
  async cleanupExpiredEntries(): Promise<number> {
    const result = await this.prisma.ipWhitelist.deleteMany({
      where: {
        isTemporary: true,
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      await this.auditLogService.create({
        actionType: AuditActionType.DELETE,
        severity: AuditSeverity.LOW,
        action: 'ip_whitelist.cleanup_expired',
        resource: 'ip_whitelist',
        userId: 'system',
        userEmail: 'system@bluelight-hub.com',
        metadata: { deletedCount: result.count },
        success: true,
      });
    }

    return result.count;
  }
}
