// TODO(story-future): eager validation via OnApplicationBootstrap + DiscoveryService.
// Derzeit prüft der Guard erst beim ersten Request, ob der Pfad-Parameter vorhanden
// ist. Ein späterer Plattform-Lift kann via DiscoveryService alle Routen mit diesem
// Guard beim Bootstrap scannen und fehlende `:einsatzId`-Parameter sofort melden.

import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@/infrastructure/di-tokens';
import { AuthService } from '../auth.service';
import { EINSATZ_PARAM_KEY } from '../decorators/einsatz-param.decorator';
import type { ValidatedUser } from '../strategies/jwt.strategy';
import type { EinsatzRequestContext } from '../interfaces/einsatz-request-context';

/** Kontext-String für strukturierte Log-Einträge (NFR-S7, AC3). */
const LOG_CONTEXT = 'EinsatzScopeGuard';

/**
 * Default-Name des Pfad-Parameters, wenn kein `@EinsatzParam(...)` gesetzt ist.
 */
const DEFAULT_EINSATZ_PARAM_NAME = 'einsatzId';

/**
 * Einheitlicher 403-Response-Body (AC3-Kontrakt). Frontend erwartet `suggestedAction`
 * für die „Zurück zum Überblick"-Fallback-UI. Wird von allen 403-Pfaden geteilt,
 * damit Drift zwischen den Zweigen ausgeschlossen ist.
 */
const FORBIDDEN_RESPONSE_BODY = {
  statusCode: 403,
  error: 'Forbidden',
  message: 'Kein Zugriff auf diesen Einsatz',
  suggestedAction: 'Zurück zum Überblick',
} as const;

/**
 * Emittiert einen strukturierten Security-Log (NFR-S7, AC3) als JSON-Payload.
 * Schema ist bewusst minimal: `{userId, einsatzId, reason}` — keine PII, keine
 * Rollen-Namen, keine Permission-Inhalte.
 */
function buildSecurityLogPayload(userId: string, einsatzId: string, reason: string): string {
  return JSON.stringify({ userId, einsatzId, reason });
}

/**
 * Parst den persistierten User-Permissions-String robust zu einem String-Array.
 *
 * **Kontrakt (Story 1.3 AC2):**
 * - null / leerer String / ungültiger JSON → `[]` (kein Throw)
 * - Non-Array-JSON (z. B. `{"a":1}`) → `[]`
 * - Array mit Nicht-String-Elementen → gefiltert auf strings, Rest wird verworfen
 *
 * @param rawPermissions - Der persistierte JSON-String (`User.permissions`).
 * @param warn - Logger-Callback (nur mit Kontext, NIE mit dem Raw-Wert — PII-Schutz).
 */
function parsePermissions(rawPermissions: string | null | undefined, warn: (reason: string) => void): string[] {
  if (!rawPermissions) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawPermissions) as unknown;
    if (!Array.isArray(parsed)) {
      warn('permissions-not-array');
      return [];
    }
    return parsed.filter((p): p is string => typeof p === 'string');
  } catch {
    warn('permissions-parse-error');
    return [];
  }
}

/**
 * **EinsatzScopeGuard (ADR-012 / Story 1.3)** — Plattform-Pattern für Routen,
 * die an einen konkreten Einsatz gebunden sind.
 *
 * Der Guard prüft **ausschließlich Membership**: "Ist dieser authentifizierte
 * User aktuell in diesem Einsatz als Rollenbesetzung aktiv?". Die Prüfung
 * konkreter Rollen-Präfixe (z. B. `Eigenschutz: ...`) übernimmt ein
 * nachgelagerter Guard (`EigenschutzRolleGuard`, Story 1.5). Permissions-Flag-
 * Prüfung übernimmt `PermissionsGuard`. Drei orthogonale Schichten, gemeinsam
 * einsetzbar.
 *
 * ### Guard-Kette (empfohlen)
 * ```typescript
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard)
 * @Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: '1' })
 * export class EigenschutzController { ... }
 * ```
 *
 * ### Request-Kontext (nach erfolgreichem Guard-Pass)
 * `request.einsatzContext = { einsatzId, einsatzRollenNamen, einsatzPermissions }`
 *
 * ### Fehlerpfade
 * - Kein Pfad-Parameter (Dev-Fehler) → 500 mit DX-Message (AC5)
 * - Keine aktive Rollenbesetzung → 403 + Security-Log (AC3, AC6)
 * - User ohne Stammperson-Link → 403 mit `reason: 'user-without-stammperson'`
 * - User zwischen JWT-Ausstellung und Request gelöscht/gelockt → 403, kein 404-Leak
 *
 * ### Join-Pfad
 * `User.stammpersonId → StammPerson.id ← EinsatzPerson.stammId ← EinsatzRollenbesetzung.personId`
 */
@Injectable()
export class EinsatzScopeGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const validatedUser = request.user as ValidatedUser | undefined;

    // Defense-in-Depth: Guard nur nach JwtAuthGuard sinnvoll.
    if (!validatedUser) {
      this.logger.warn(buildSecurityLogPayload('unknown', 'unknown', 'missing-jwt-user'), LOG_CONTEXT);
      throw new ForbiddenException('Nicht authentifiziert');
    }

    const paramNameRaw = this.reflector.getAllAndOverride<unknown>(EINSATZ_PARAM_KEY, [context.getHandler(), context.getClass()]);
    const paramName = typeof paramNameRaw === 'string' && paramNameRaw.length > 0 ? paramNameRaw : DEFAULT_EINSATZ_PARAM_NAME;
    const einsatzIdRaw = request.params?.[paramName];

    if (einsatzIdRaw === undefined || einsatzIdRaw === null) {
      const method = request.method ?? 'UNKNOWN';
      const path = request.route?.path ?? request.path ?? 'unknown-path';
      throw new InternalServerErrorException(
        `EinsatzScopeGuard: Pfad-Parameter '${paramName}' fehlt auf Route '${method} ${path}'. ` + `Entweder Route um :${paramName} ergänzen oder passenden @EinsatzParam setzen.`,
      );
    }

    // Express-Typ erlaubt `string | string[]` (Array-Notation in Routes).
    // Ein Einsatz-Parameter darf semantisch NIE ein Array sein — das wäre ein
    // Routing-Konfigurationsfehler. Statt still auf das erste Element zu narrowen
    // explizit als DX-Fehler melden (analog fehlendem Param).
    if (Array.isArray(einsatzIdRaw)) {
      const method = request.method ?? 'UNKNOWN';
      const path = request.route?.path ?? request.path ?? 'unknown-path';
      throw new InternalServerErrorException(
        `EinsatzScopeGuard: Pfad-Parameter '${paramName}' auf Route '${method} ${path}' ist ein Array, erwartet wurde ein einzelner String. ` + `Route-Konfiguration prüfen.`,
      );
    }
    const einsatzId = einsatzIdRaw;

    // User laden (für stammpersonId + permissions). Bei Deleted/Locked wirft
    // findUserById NotFoundException → wir mappen auf 403, um 404-Leaks zu
    // vermeiden (AC3-Vertrag: Guard exit ist einheitlich 403).
    let userEntity: Awaited<ReturnType<AuthService['findUserById']>>;
    try {
      userEntity = await this.authService.findUserById(validatedUser.userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(buildSecurityLogPayload(validatedUser.userId, einsatzId, 'user-not-found'), LOG_CONTEXT);
        throw new ForbiddenException(FORBIDDEN_RESPONSE_BODY);
      }
      throw error;
    }

    // Falsy-Check deckt null, undefined und leeren String ab (defensiv gegen
    // versehentlich leer persistierte `stammpersonId`-Werte).
    if (!userEntity.stammpersonId) {
      this.logger.warn(buildSecurityLogPayload(validatedUser.userId, einsatzId, 'user-without-stammperson'), LOG_CONTEXT);
      throw new ForbiddenException(FORBIDDEN_RESPONSE_BODY);
    }

    const besetzungenResult = await this.rollenBesetzungRepository.findActiveByUserIdAndEinsatzId(validatedUser.userId, einsatzId);

    if (besetzungenResult.isFailure) {
      this.logger.error(`EinsatzScopeGuard: Laden der Rollenbesetzungen fehlgeschlagen (userId=${validatedUser.userId}, einsatzId=${einsatzId}): ${besetzungenResult.error}`);
      throw new InternalServerErrorException('Fehler beim Laden der Einsatz-Rollen');
    }

    const besetzungen = besetzungenResult.value ?? [];

    if (besetzungen.length === 0) {
      this.logger.warn(buildSecurityLogPayload(validatedUser.userId, einsatzId, 'no-active-rollenbesetzung'), LOG_CONTEXT);
      throw new ForbiddenException(FORBIDDEN_RESPONSE_BODY);
    }

    // Defensiver Non-String-Filter — Schema garantiert zwar `rollenName String @db.Text`
    // (non-null), aber fehlerhafte Mapper-Implementierungen oder zukünftige Schema-
    // Drifts würden sonst `undefined` in `einsatzRollenNamen` leaken und downstream
    // Präfix-Matcher brechen.
    const einsatzRollenNamen = Array.from(new Set(besetzungen.map((b) => b.rollenName).filter((n): n is string => typeof n === 'string' && n.length > 0)));
    const einsatzPermissions = parsePermissions(userEntity.permissions, (reason) => this.logger.warn(buildSecurityLogPayload(validatedUser.userId, einsatzId, reason), LOG_CONTEXT));

    const einsatzContext: EinsatzRequestContext = {
      einsatzId,
      einsatzRollenNamen,
      einsatzPermissions,
    };
    request.einsatzContext = einsatzContext;

    return true;
  }
}
