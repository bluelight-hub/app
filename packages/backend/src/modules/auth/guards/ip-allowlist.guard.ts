import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Guard zur Überprüfung ob die IP-Adresse des Anfragenden auf der Allowlist steht.
 * Wird für besonders sensitive Operationen verwendet.
 *
 * Dieser Guard bietet eine zusätzliche Sicherheitsebene durch IP-basierte
 * Zugriffskontrolle. Besonders nützlich für:
 * - Admin-Endpunkte
 * - Kritische Systemoperationen
 * - API-Endpunkte mit erhöhtem Sicherheitsbedarf
 *
 * Features:
 * - Flexibel aktivierbar über Umgebungsvariable
 * - Unterstützt mehrere IPs (kommasepariert)
 * - Proxy/Load-Balancer-kompatibel (X-Forwarded-For, X-Real-IP)
 * - Detailliertes Logging für Sicherheits-Audits
 *
 * @class IpAllowlistGuard
 * @implements {CanActivate}
 * @injectable
 *
 * @example
 * ```typescript
 * // Konfiguration über Umgebungsvariablen:
 * // SECURITY_IP_ALLOWLIST_ENABLED=true
 * // SECURITY_ALLOWED_IPS=192.168.1.100,10.0.0.5,203.0.113.45
 *
 * // Verwendung auf Controller-Ebene
 * @UseGuards(IpAllowlistGuard)
 * @Controller('admin')
 * export class AdminController {
 *   // Alle Routen in diesem Controller sind IP-geschützt
 * }
 *
 * // Verwendung auf Route-Ebene
 * @Controller('api')
 * export class ApiController {
 *   @UseGuards(IpAllowlistGuard)
 *   @Post('critical-operation')
 *   async performCriticalOperation() {
 *     // Nur von erlaubten IPs aufrufbar
 *   }
 * }
 *
 * // Kombination mit anderen Guards
 * @UseGuards(JwtAuthGuard, IpAllowlistGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @Delete('system/reset')
 * async resetSystem() {}
 * ```
 */
@Injectable()
export class IpAllowlistGuard implements CanActivate {
  /**
   * Logger-Instanz für Security-Audit-Logging
   * @private
   * @readonly
   * @property {Logger} logger
   */
  private readonly logger = new Logger(IpAllowlistGuard.name);

  /**
   * Set der erlaubten IP-Adressen
   * @private
   * @readonly
   * @property {Set<string>} allowedIps
   */
  private readonly allowedIps: Set<string>;

  /**
   * Flag ob IP-Allowlist-Prüfung aktiviert ist
   * @private
   * @readonly
   * @property {boolean} ipAllowlistEnabled
   */
  private readonly ipAllowlistEnabled: boolean;

  /**
   * Erstellt eine neue IpAllowlistGuard-Instanz
   *
   * Lädt die IP-Allowlist-Konfiguration aus den Umgebungsvariablen
   * und initialisiert das Set der erlaubten IP-Adressen.
   *
   * @param {ConfigService} configService - Service für Konfigurationszugriff
   *
   * @example
   * ```typescript
   * // Automatisch injiziert durch NestJS DI
   * // Konfiguration:
   * // SECURITY_IP_ALLOWLIST_ENABLED=true
   * // SECURITY_ALLOWED_IPS=192.168.1.1,192.168.1.2,10.0.0.1
   * ```
   */
  constructor(private configService: ConfigService) {
    this.ipAllowlistEnabled =
      this.configService.get<string>('SECURITY_IP_ALLOWLIST_ENABLED', 'false') === 'true';
    const ipList = this.configService.get<string>('SECURITY_ALLOWED_IPS', '');
    this.allowedIps = new Set(
      ipList
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip),
    );
  }

  /**
   * Prüft, ob die anfragende IP-Adresse autorisiert ist
   *
   * Führt eine IP-basierte Zugriffskontrolle durch. Wenn die
   * IP-Allowlist aktiviert ist, wird geprüft ob die Client-IP
   * in der Liste erlaubter IPs enthalten ist.
   *
   * @param {ExecutionContext} context - Der Ausführungskontext der Anfrage
   * @returns {boolean} true wenn die IP erlaubt ist oder Prüfung deaktiviert
   * @throws {ForbiddenException} Wenn die IP nicht auf der Allowlist steht
   *
   * @example
   * ```typescript
   * // Wird automatisch von NestJS aufgerufen
   * // Bei erlaubter IP: Request wird durchgelassen
   * // Bei verbotener IP: 403 Forbidden mit Fehlermeldung
   *
   * // Logging-Beispiele:
   * // [WARN] Access denied for IP: 192.168.1.99
   * // [DEBUG] Access granted for IP: 192.168.1.100
   * // [ERROR] Could not determine client IP address
   * ```
   */
  canActivate(context: ExecutionContext): boolean {
    // Skip check if IP allowlist is not enabled
    if (!this.ipAllowlistEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    if (!clientIp) {
      this.logger.error('Could not determine client IP address');
      throw new ForbiddenException('Access denied: Unable to verify IP address');
    }

    if (!this.allowedIps.has(clientIp)) {
      this.logger.warn(`Access denied for IP: ${clientIp}`);
      throw new ForbiddenException('Access denied: IP address not allowed');
    }

    this.logger.debug(`Access granted for IP: ${clientIp}`);
    return true;
  }

  /**
   * Ermittelt die Client-IP-Adresse aus der Request
   *
   * Prüft verschiedene Header für die Client-IP, um auch
   * hinter Proxies/Load Balancern die korrekte IP zu ermitteln.
   * Die Prüfreihenfolge ist:
   * 1. X-Forwarded-For Header (erste IP in der Liste)
   * 2. X-Real-IP Header
   * 3. request.ip (Express-Standard)
   *
   * @private
   * @param {Request} request - Express Request-Objekt
   * @returns {string | null} Die ermittelte IP-Adresse oder null
   *
   * @example
   * ```typescript
   * // X-Forwarded-For: "203.0.113.195, 70.41.3.18, 150.172.238.178"
   * const ip = this.getClientIp(request); // "203.0.113.195"
   *
   * // X-Real-IP: "203.0.113.195"
   * const ip = this.getClientIp(request); // "203.0.113.195"
   *
   * // Direkte Verbindung
   * const ip = this.getClientIp(request); // request.ip
   * ```
   */
  private getClientIp(request: Request): string | null {
    // Check for forwarded IP addresses (when behind proxy/load balancer)
    const forwardedIps = request.headers['x-forwarded-for'];
    if (forwardedIps) {
      const ips = (forwardedIps as string).split(',').map((ip) => ip.trim());
      return ips[0]; // Use the first IP (original client)
    }

    // Check for real IP header (some proxies use this)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fall back to request IP
    return request.ip || null;
  }
}
