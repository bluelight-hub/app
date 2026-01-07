import { type CanActivate, type ExecutionContext, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Reflector ist Injectable Class - wird zur Laufzeit fuer NestJS DI benoetigt
import { Reflector } from '@nestjs/core';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
// biome-ignore lint/style/useImportType: PrismaService ist Injectable Class - wird zur Laufzeit fuer NestJS DI benoetigt
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SERVER_ACCESS_TOKEN_REPOSITORY } from '@/infrastructure/di-tokens';
import { SKIP_SETUP_CHECK_KEY } from '../decorators/skip-setup-check.decorator';

/**
 * Guard zur Pruefung ob Server-Setup abgeschlossen ist.
 *
 * Blockiert ALLE Requests mit 503 wenn Setup nicht komplett.
 * Whitelist-Endpoints nutzen @SkipSetupCheck() Decorator.
 *
 * **Guard-Reihenfolge:**
 * ThrottlerGuard → SetupPendingGuard → ServerAccessGuard → JwtAuthGuard
 *
 * **Warum SetupPendingGuard vor ServerAccessGuard?**
 * Im Setup-Mode existieren noch keine Access-Tokens. ServerAccessGuard wuerde
 * 401 Unauthorized werfen. SetupPendingGuard gibt stattdessen 503 mit klarem
 * Error-Code zurueck, der dem Client signalisiert dass Setup erforderlich ist.
 *
 * **Setup ist komplett wenn:**
 * - Mindestens ein User mit role=ADMIN oder SUPER_ADMIN existiert
 * - User muss aktiv sein (isActive=true) und nicht geloescht (isDeleted=false)
 * - Mindestens ein aktiver (nicht revoked, nicht expired) Access-Token existiert
 *
 * **Warum isActive und isDeleted Filter?**
 * Sicherheitsrelevant: Deaktivierte oder geloeschte Admins sollen nicht
 * als "existierende Admins" zaehlen. Ein Server ohne aktive Admins ist
 * nicht betriebsbereit.
 *
 * **Performance:**
 * Setup-Status wird fuer 10 Sekunden gecacht (In-Memory).
 * Dadurch wird DB-Flooding bei vielen Requests verhindert.
 */
@Injectable()
export class SetupPendingGuard implements CanActivate {
  private cachedSetupComplete: boolean | null = null;
  private cacheTimestamp = 0;

  /** Cache TTL in Millisekunden (10 Sekunden) */
  private readonly CACHE_TTL_MS = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IServerAccessTokenRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check @SkipSetupCheck decorator (Klasse oder Methode)
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SETUP_CHECK_KEY, [context.getHandler(), context.getClass()]);
    if (skipCheck) {
      return true;
    }

    // 2. Check cached setup status
    const isComplete = await this.isSetupComplete();
    if (isComplete) {
      return true;
    }

    // 3. Setup not complete - block with 503
    throw new ServiceUnavailableException({
      error: 'SERVER_NOT_SETUP',
      message: 'Server setup required',
    });
  }

  /**
   * Ermittelt ob das Server-Setup abgeschlossen ist.
   *
   * **Warum zwei Bedingungen?**
   * 1. Admin-User: Jemand muss Administration durchfuehren koennen
   * 2. Access-Token: Clients muessen sich authentifizieren koennen
   *
   * Beide sind NOTWENDIG fuer einen betriebsbereiten Server.
   *
   * **Warum ADMIN und SUPER_ADMIN?**
   * Beide Rollen haben administrative Rechte. Ein Server mit nur SUPER_ADMIN
   * ist genauso betriebsbereit wie einer mit ADMIN.
   *
   * **Performance:**
   * Nutzt In-Memory Cache mit 10s TTL um DB-Abfragen zu minimieren.
   * Bei hoher Request-Last wird die DB nicht geflutet.
   *
   * **Error Handling:**
   * Bei Repository-Fehlern wird Setup als "nicht komplett" betrachtet.
   * Dies ist eine sichere Default-Annahme (fail-closed).
   *
   * @returns true wenn Setup abgeschlossen, false sonst
   */
  private async isSetupComplete(): Promise<boolean> {
    // Check cache validity
    const now = Date.now();
    if (this.cachedSetupComplete !== null && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedSetupComplete;
    }

    // Query database for both conditions in parallel
    const [adminCount, activeTokenResult] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
          isDeleted: false,
        },
      }),
      this.tokenRepo.countActive(),
    ]);

    // Both conditions must be true
    const hasAdmin = adminCount > 0;
    const hasActiveToken = activeTokenResult.isSuccess && (activeTokenResult.value ?? 0) > 0;
    const isComplete = hasAdmin && hasActiveToken;

    // Update cache
    this.cachedSetupComplete = isComplete;
    this.cacheTimestamp = now;

    return isComplete;
  }
}
