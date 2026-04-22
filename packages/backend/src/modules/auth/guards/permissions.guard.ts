import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { EigenschutzPermission } from '@domain/eigenschutz/enums/eigenschutz-permission.enum';
import { LOGGER } from '@/infrastructure/di-tokens';
import { EIGENSCHUTZ_PERMISSION_KEY } from '../decorators/requires-permission.decorator';
import type { ValidatedUser } from '../strategies/jwt.strategy';

/** Kontext-String für strukturierte Log-Einträge (NFR-S7, AC3). */
const LOG_CONTEXT = 'PermissionsGuard';

/**
 * Einheitlicher 403-Response-Body für Insufficient-Permission (AC3).
 * Ausgelagert als Konstante, damit alle Fehlerzweige denselben Body liefern.
 */
export const EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY = {
  statusCode: 403,
  error: 'InsufficientPermission',
  message: 'Fehlende Berechtigung für diese Eigenschutz-Aktion',
  suggestedAction: 'Zurück zum Überblick',
} as const;

/**
 * Emittiert einen strukturierten Security-Log (NFR-S7) als JSON-Payload.
 * Schema minimal: `{userId, einsatzId, reason}`. Niemals konkrete Permission-
 * Strings — die Log-Schema-Invariante bleibt plattformweit einheitlich
 * (Grep-Freundlichkeit für Security-Audits).
 *
 * **Bewusste Duplikation (Story 1.5 Dev Notes):** Identisch zum Helper in
 * `einsatz-scope.guard.ts` / `eigenschutz-rolle.guard.ts`. Extraktion auf
 * eine separate Plattform-Story verschoben (YAGNI).
 */
function buildSecurityLogPayload(userId: string, einsatzId: string, reason: string): string {
  return JSON.stringify({ userId, einsatzId, reason });
}

/**
 * **PermissionsGuard (Story 1.5)** — prüft, ob der authentifizierte Nutzer
 * eine der via `@RequiresPermission(...)` annotierten Permissions im aktuellen
 * Einsatz besitzt.
 *
 * ### Guard-Kette (verbindlich)
 * ```typescript
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
 * ```
 *
 * ### Match-Semantik (AC3)
 * - OR zwischen den aufgelisteten Permissions.
 * - **Exakter String-Match**; keine Wildcard-Expansion (`eigenschutz:*` matcht
 *   nichts). Wildcard-Logik ist explizit Out-of-Scope.
 * - Kein Decorator → Pass-through (`true`).
 *
 * ### ADMIN-Bypass (AC4)
 * `ValidatedUser.role ∈ {ADMIN, SUPER_ADMIN}` → short-circuit `true`, mit
 * `logger.debug`-Eintrag (kein Sicherheitsvorfall).
 *
 * ### Fehlerpfade
 * - Fehlender `request.user` → 403 (Defense-in-Depth).
 * - Fehlender `einsatzContext` → **500** (Programmierfehler, EinsatzScopeGuard
 *   fehlt in der Kette).
 * - Permission-Miss → 403 mit `reason: 'insufficient-permission'`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const validatedUser = request.user as ValidatedUser | undefined;

    if (!validatedUser) {
      this.logger.warn(buildSecurityLogPayload('unknown', 'unknown', 'missing-jwt-user'), LOG_CONTEXT);
      throw new ForbiddenException('Nicht authentifiziert');
    }

    const einsatzContext = request.einsatzContext;
    if (!einsatzContext) {
      throw new InternalServerErrorException('PermissionsGuard: request.einsatzContext fehlt. EinsatzScopeGuard muss VOR diesem Guard in der @UseGuards-Kette stehen.');
    }

    const rawRequired = this.reflector.getAllAndOverride<unknown>(EIGENSCHUTZ_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!Array.isArray(rawRequired) || rawRequired.length === 0) {
      return true;
    }
    const required = rawRequired as EigenschutzPermission[];

    if (validatedUser.role === 'ADMIN' || validatedUser.role === 'SUPER_ADMIN') {
      this.logger.debug(buildSecurityLogPayload(validatedUser.userId, einsatzContext.einsatzId, 'admin-bypass'), LOG_CONTEXT);
      return true;
    }

    const hasPermission = required.some((p) => einsatzContext.einsatzPermissions.includes(p));

    if (!hasPermission) {
      this.logger.warn(buildSecurityLogPayload(validatedUser.userId, einsatzContext.einsatzId, 'insufficient-permission'), LOG_CONTEXT);
      throw new ForbiddenException(EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY);
    }

    return true;
  }
}
