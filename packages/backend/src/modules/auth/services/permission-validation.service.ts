import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Permission, UserRole } from '../types/jwt.types';
import { DefaultRolePermissions, PermissionDescriptions } from '../constants';

/**
 * Service zur Validierung und Synchronisierung von Berechtigungen zwischen Code und Datenbank.
 * Stellt sicher, dass die Berechtigungsmatrix konsistent ist.
 */
@Injectable()
export class PermissionValidationService implements OnModuleInit {
  private readonly logger = new Logger(PermissionValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Wird beim Start des Moduls ausgeführt, um die Berechtigungen zu validieren.
   */
  async onModuleInit() {
    // Skip validation in test environment to avoid database access during module initialization
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('Überspringe Berechtigungsvalidierung im Test-Modus');
      return;
    }
    await this.validatePermissions();
  }

  /**
   * Validiert die Konsistenz zwischen Code-definierten und Datenbank-Berechtigungen.
   *
   * @returns Validierungsbericht mit Details über gefundene Inkonsistenzen
   */
  async validatePermissions(): Promise<ValidationReport> {
    this.logger.log('Starte Validierung der Berechtigungsmatrix...');

    const report: ValidationReport = {
      isValid: true,
      missingInDatabase: [],
      extraInDatabase: [],
      roleMismatches: [],
      timestamp: new Date(),
    };

    try {
      // Hole alle Berechtigungen aus der Datenbank
      const dbPermissions = await this.prisma.rolePermission.findMany({
        select: {
          role: true,
          permission: true,
        },
      });

      // Gruppiere Datenbank-Berechtigungen nach Rolle
      const dbPermissionsByRole = new Map<UserRole, Set<Permission>>();
      for (const dbPerm of dbPermissions) {
        const role = dbPerm.role as unknown as UserRole;
        const permission = dbPerm.permission as unknown as Permission;

        if (!dbPermissionsByRole.has(role)) {
          dbPermissionsByRole.set(role, new Set());
        }
        dbPermissionsByRole.get(role)!.add(permission);
      }

      // Validiere jede Rolle
      for (const [role, expectedPermissions] of Object.entries(DefaultRolePermissions)) {
        const dbPerms = dbPermissionsByRole.get(role as UserRole) || new Set();
        const expectedPermsSet = new Set(expectedPermissions);

        // Finde fehlende Berechtigungen in der Datenbank
        for (const expectedPerm of expectedPermissions) {
          if (!dbPerms.has(expectedPerm)) {
            report.missingInDatabase.push({
              role: role as UserRole,
              permission: expectedPerm,
            });
            report.isValid = false;
          }
        }

        // Finde zusätzliche Berechtigungen in der Datenbank
        for (const dbPerm of dbPerms) {
          if (!expectedPermsSet.has(dbPerm)) {
            report.extraInDatabase.push({
              role: role as UserRole,
              permission: dbPerm,
            });
            report.isValid = false;
          }
        }
      }

      // Prüfe, ob alle definierten Berechtigungen eine Beschreibung haben
      const allPermissions = Object.values(Permission);
      for (const permission of allPermissions) {
        if (!PermissionDescriptions[permission]) {
          this.logger.warn(`Berechtigung ${permission} hat keine Beschreibung`);
        }
      }

      // Log Zusammenfassung
      if (report.isValid) {
        this.logger.log('✓ Berechtigungsmatrix ist konsistent');
      } else {
        this.logger.warn('⚠ Inkonsistenzen in der Berechtigungsmatrix gefunden:');
        if (report.missingInDatabase.length > 0) {
          this.logger.warn(
            `  - ${report.missingInDatabase.length} Berechtigungen fehlen in der Datenbank`,
          );
        }
        if (report.extraInDatabase.length > 0) {
          this.logger.warn(
            `  - ${report.extraInDatabase.length} zusätzliche Berechtigungen in der Datenbank`,
          );
        }
      }

      return report;
    } catch (error) {
      this.logger.error('Fehler bei der Validierung der Berechtigungen:', error);
      report.isValid = false;
      report.error = error.message;
      return report;
    }
  }

  /**
   * Synchronisiert die Berechtigungen aus dem Code in die Datenbank.
   * Entfernt keine Berechtigungen, fügt nur fehlende hinzu.
   *
   * @returns Anzahl der hinzugefügten Berechtigungen
   */
  async syncPermissionsToDatabase(): Promise<number> {
    this.logger.log('Synchronisiere Berechtigungen zur Datenbank...');

    let addedCount = 0;

    try {
      for (const [role, permissions] of Object.entries(DefaultRolePermissions)) {
        for (const permission of permissions) {
          const exists = await this.prisma.rolePermission.findUnique({
            where: {
              role_permission: {
                role: role as any,
                permission: permission as any,
              },
            },
          });

          if (!exists) {
            await this.prisma.rolePermission.create({
              data: {
                role: role as any,
                permission: permission as any,
                grantedBy: 'system-sync',
              },
            });
            addedCount++;
            this.logger.log(`Berechtigung hinzugefügt: ${role} -> ${permission}`);
          }
        }
      }

      this.logger.log(`Synchronisierung abgeschlossen. ${addedCount} Berechtigungen hinzugefügt.`);
      return addedCount;
    } catch (error) {
      this.logger.error('Fehler bei der Synchronisierung:', error);
      throw error;
    }
  }

  /**
   * Gibt einen detaillierten Bericht über die aktuelle Berechtigungsmatrix zurück.
   */
  async getPermissionReport(): Promise<PermissionReport> {
    const dbPermissions = await this.prisma.rolePermission.findMany({
      include: {
        grantedByUser: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { permission: 'asc' }],
    });

    const report: PermissionReport = {
      roles: {},
      totalPermissions: dbPermissions.length,
      lastSync: new Date(),
    };

    // Gruppiere nach Rolle
    for (const perm of dbPermissions) {
      if (!report.roles[perm.role]) {
        report.roles[perm.role] = {
          permissions: [],
          count: 0,
        };
      }

      report.roles[perm.role].permissions.push({
        permission: perm.permission as unknown as Permission,
        grantedBy: perm.grantedByUser?.email || perm.grantedBy || 'system',
        grantedAt: perm.grantedAt,
      });
      report.roles[perm.role].count++;
    }

    return report;
  }
}

/**
 * Validierungsbericht für die Berechtigungsmatrix
 *
 * Dokumentiert Inkonsistenzen zwischen Code-definierten und Datenbank-Berechtigungen
 * zur Sicherstellung einer konsistenten Berechtigungsstruktur.
 *
 * @interface ValidationReport
 * @example
 * ```typescript
 * const report: ValidationReport = {
 *   isValid: false,
 *   missingInDatabase: [
 *     { role: UserRole.ADMIN, permission: Permission.MANAGE_USERS }
 *   ],
 *   extraInDatabase: [],
 *   roleMismatches: [
 *     { role: UserRole.USER, message: 'Hat unerwartete Admin-Berechtigung' }
 *   ],
 *   timestamp: new Date()
 * };
 * ```
 */
interface ValidationReport {
  /** Gesamtstatus der Validierung */
  isValid: boolean;
  /** Berechtigungen, die im Code definiert aber nicht in der DB sind */
  missingInDatabase: Array<{ role: UserRole; permission: Permission }>;
  /** Berechtigungen, die in der DB aber nicht im Code definiert sind */
  extraInDatabase: Array<{ role: UserRole; permission: Permission }>;
  /** Rollen mit inkonsistenten Berechtigungen */
  roleMismatches: Array<{ role: UserRole; message: string }>;
  /** Zeitstempel der Validierung */
  timestamp: Date;
  /** Fehlermeldung bei Validierungsfehler */
  error?: string;
}

/**
 * Detaillierter Bericht über die Berechtigungsmatrix
 *
 * Bietet eine umfassende Übersicht über alle Rollen und deren Berechtigungen
 * mit Metadaten zur Verwaltung und Auditierung.
 *
 * @interface PermissionReport
 * @example
 * ```typescript
 * const report: PermissionReport = {
 *   roles: {
 *     ADMIN: {
 *       permissions: [
 *         {
 *           permission: Permission.MANAGE_USERS,
 *           grantedBy: 'system',
 *           grantedAt: new Date('2024-01-01')
 *         }
 *       ],
 *       count: 15
 *     }
 *   },
 *   totalPermissions: 45,
 *   lastSync: new Date()
 * };
 * ```
 */
interface PermissionReport {
  /** Übersicht aller Rollen mit ihren Berechtigungen */
  roles: Record<
    string,
    {
      /** Detaillierte Liste der Berechtigungen */
      permissions: Array<{
        /** Die Berechtigung */
        permission: Permission;
        /** Wer hat die Berechtigung erteilt */
        grantedBy: string;
        /** Wann wurde die Berechtigung erteilt */
        grantedAt: Date;
      }>;
      /** Anzahl der Berechtigungen für diese Rolle */
      count: number;
    }
  >;
  /** Gesamtanzahl aller Berechtigungen im System */
  totalPermissions: number;
  /** Zeitstempel der letzten Synchronisation */
  lastSync: Date;
}
