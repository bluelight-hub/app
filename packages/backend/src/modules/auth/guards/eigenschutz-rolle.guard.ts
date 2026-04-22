import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EIGENSCHUTZ_ROLE_PREFIX, type EigenschutzRolle } from '@domain/eigenschutz/enums/eigenschutz-rolle.enum';
import { LOGGER } from '@/infrastructure/di-tokens';
import { EIGENSCHUTZ_ROLE_KEY } from '../decorators/requires-eigenschutz-rolle.decorator';
import type { ValidatedUser } from '../strategies/jwt.strategy';

/** Kontext-String für strukturierte Log-Einträge (NFR-S7, AC2). */
const LOG_CONTEXT = 'EigenschutzRolleGuard';

/**
 * Einheitlicher 403-Response-Body für Insufficient-Role (AC2). Frontend
 * erwartet `suggestedAction` für die „Zurück zum Überblick"-Fallback-UI.
 * Ausgelagert als Konstante, damit beide Fehlerzweige (no-eigenschutz-role,
 * insufficient-eigenschutz-role) den **identischen** Body liefern.
 */
export const EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY = {
  statusCode: 403,
  error: 'InsufficientRole',
  message: 'Diese Eigenschutz-Funktion erfordert eine andere Rolle',
  suggestedAction: 'Zurück zum Überblick',
} as const;

/**
 * Emittiert einen strukturierten Security-Log (NFR-S7) als JSON-Payload.
 * Schema ist minimal: `{userId, einsatzId, reason}` — niemals Rollen-Namen,
 * Permission-Inhalte oder PII-Felder (`personVorname`, `personNachname`).
 *
 * **Bewusste Duplikation (Story 1.5 Dev Notes):** Identisch zum Helper in
 * `einsatz-scope.guard.ts`, aber bewusst **nicht** extrahiert — eine spätere
 * Plattform-Refaktorierung kann `EinsatzScopeGuard` + die beiden neuen Guards
 * gemeinsam auf einen Helper konsolidieren (YAGNI jetzt).
 */
function buildSecurityLogPayload(userId: string, einsatzId: string, reason: string): string {
  return JSON.stringify({ userId, einsatzId, reason });
}

/**
 * **EigenschutzRolleGuard (Story 1.5)** — prüft, ob der authentifizierte Nutzer
 * eine der via `@RequiresEigenschutzRolle(...)` annotierten Short-Form-Rollen
 * im aktuellen Einsatz besitzt.
 *
 * ### Guard-Kette (verbindlich)
 * ```typescript
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)
 * ```
 * `EinsatzScopeGuard` (Story 1.3, ADR-012) **muss** davor laufen, weil dieser
 * Guard `request.einsatzContext.einsatzRollenNamen` konsumiert. Fehlt der
 * Kontext, wirft der Guard 500 mit DX-Message (Fail-Fast, AC5).
 *
 * ### Match-Semantik (AC1)
 * - OR zwischen den aufgelisteten Rollen (analog `@Roles(...)`).
 * - Decorator nutzt Short-Form; Guard prepended `EIGENSCHUTZ_ROLE_PREFIX`.
 * - Kein Decorator → Pass-through (`true`).
 *
 * ### ADMIN-Bypass (AC4)
 * `ValidatedUser.role ∈ {ADMIN, SUPER_ADMIN}` → short-circuit `true`, mit
 * `logger.debug`-Eintrag (kein Sicherheitsvorfall).
 *
 * ### Fehlerpfade
 * - Fehlender `request.user` → 403 (Defense-in-Depth, JwtAuthGuard fehlt).
 * - Fehlender `einsatzContext` → **500** (Programmierfehler, EinsatzScopeGuard
 *   fehlt in der Kette).
 * - Leere `einsatzRollenNamen` → 403 mit `reason: 'no-eigenschutz-role'`.
 * - Rolle-Mismatch → 403 mit `reason: 'insufficient-eigenschutz-role'`.
 */
@Injectable()
export class EigenschutzRolleGuard implements CanActivate {
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
      throw new InternalServerErrorException('EigenschutzRolleGuard: request.einsatzContext fehlt. EinsatzScopeGuard muss VOR diesem Guard in der @UseGuards-Kette stehen.');
    }

    const rawRequired = this.reflector.getAllAndOverride<unknown>(EIGENSCHUTZ_ROLE_KEY, [context.getHandler(), context.getClass()]);

    // Review-Lesson Story 1.3: Reflector-Garbage nicht blind casten. Nicht-Array
    // → "kein Decorator" (Pass-through), nicht 500 — ein falsch typisierter
    // Consumer-Decorator soll keinen Production-Traffic blockieren.
    if (!Array.isArray(rawRequired) || rawRequired.length === 0) {
      return true;
    }
    const required = rawRequired as EigenschutzRolle[];

    // ADMIN-Bypass (AC4): Plattform-Rolle aus JWT-Payload. Die Rolle wird
    // strikt aus `user.role` gelesen; eine davon unabhängige Einsatz-
    // Membership-Prüfung läuft bereits in `EinsatzScopeGuard`.
    if (validatedUser.role === 'ADMIN' || validatedUser.role === 'SUPER_ADMIN') {
      this.logger.debug(buildSecurityLogPayload(validatedUser.userId, einsatzContext.einsatzId, 'admin-bypass'), LOG_CONTEXT);
      return true;
    }

    const expectedFullNames = required.map((r) => EIGENSCHUTZ_ROLE_PREFIX + r);
    const hasRole = einsatzContext.einsatzRollenNamen.some((name) => expectedFullNames.includes(name));

    if (!hasRole) {
      const reason = einsatzContext.einsatzRollenNamen.length === 0 ? 'no-eigenschutz-role' : 'insufficient-eigenschutz-role';
      this.logger.warn(buildSecurityLogPayload(validatedUser.userId, einsatzContext.einsatzId, reason), LOG_CONTEXT);
      throw new ForbiddenException(EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY);
    }

    return true;
  }
}
