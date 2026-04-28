import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { createId } from '@paralleldrive/cuid2';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { PsaProfil } from '@/generated/prisma/enums';
import { PSA_PROFIL_CONFLICT_DETECTED, PsaProfilZuweisung } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPsaProfilZuweisungRepository } from '@domain/eigenschutz/repositories/i-psa-profil-zuweisung.repository';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_TEILNEHMER_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY, PSA_PROFIL_ZUWEISUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { ChangePsaProfilCommand, type ChangePsaProfilResult, type PsaProfilToggle } from './change-psa-profil.command';

/**
 * Sentinel-Codes des Handlers (Story 3.1). Der Controller mappt die
 * Präfixe deterministisch auf HTTP-Statuscodes (404/409/422/500).
 */
export const CHANGE_PSA_PROFIL_ERROR_CODES = {
  NOT_TEILNEHMER: 'BusinessRule:UnzulaessigeEinheitenZuordnung',
  EINSATZ_REQUIRED: 'BusinessRule:EinsatzIdErforderlich',
  CALLER_REQUIRED: 'BusinessRule:CallerUserIdErforderlich',
  EINHEIT_REQUIRED: 'BusinessRule:EinheitErforderlich',
  EINHEIT_NOT_IN_EINSATZ: 'BusinessRule:EinheitNichtImEinsatz',
  TOGGLES_REQUIRED: 'BusinessRule:ProfilTogglesErforderlich',
  TOO_MANY_TOGGLES: 'BusinessRule:ZuVieleProfilToggles',
  TOO_MANY_EINHEITEN: 'BusinessRule:ZuVieleEinheiten',
  DUPLICATE_EINHEIT: 'ValidationFailed:DuplicateEinheitId',
  EXPECTED_VERSION_REQUIRED: 'BusinessRule:ExpectedVersionRequired',
  ACTIVE_NOT_FOUND: 'NotFound:PsaProfilZuweisung',
  CONFLICT_DETECTED: PSA_PROFIL_CONFLICT_DETECTED,
  DUPLICATE_ACTIVE: 'ConflictDetected:DuplicateActivePsaProfilZuweisung',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

const RECOGNIZED_SENTINEL_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:', 'Invariant:'] as const;

function wrapInfrastructureError(error: string | undefined, fallback: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_SENTINEL_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }
  return `${CHANGE_PSA_PROFIL_ERROR_CODES.INFRASTRUCTURE_ERROR}:${message}`;
}

/**
 * Story 3.2 (AC5): bei Conflict-Sentinels die `einheitId` und das `profil` an
 * den Sentinel-String anhängen, damit der Controller-Mapper das im
 * 409-Body als `context.einheitId` / `context.profil` weiterreichen kann.
 *
 * Nur konflikt-typisierte Sentinels werden annotiert (`ConflictDetected:` —
 * sowohl OCC `ConflictDetected:PsaProfilZuweisung[:current=<n>]` als auch
 * `ConflictDetected:DuplicateActivePsaProfilZuweisung`). Andere Sentinels
 * (`NotFound:`, `BusinessRule:` etc.) sind nicht-einheit-spezifisch oder
 * werden separat behandelt und bleiben unverändert.
 *
 * Das Sentinel-Format bleibt key=value-basiert, sodass die Reihenfolge der
 * Suffixe in `mapMutationError` nicht relevant ist und neue Schlüssel
 * additiv ergänzt werden können.
 */
function annotateConflictWithEinheit(error: string, einheitId: string, profil: PsaProfil): string {
  if (error.startsWith(PSA_PROFIL_CONFLICT_DETECTED) || error.startsWith('ConflictDetected:DuplicateActivePsaProfilZuweisung')) {
    return `${error}:einheit=${einheitId}:profil=${profil}`;
  }
  return error;
}

const EINHEIT_IDS_MAX = 50;

/**
 * Maximalzahl der Profil-Toggles in einem Single- oder Bulk-Request.
 * Quelle der Wahrheit ist `PSA_PROFIL_TOGGLE_LIMIT` aus dem DTO; hier als
 * lokale Konstante referenziert, damit Domain-Validierung ohne Drift bleibt.
 */
const PROFIL_TOGGLES_MAX = 5;

/**
 * Handler für `ChangePsaProfilCommand` (Story 3.1 + Story 3.2 Bulk).
 *
 * **Transactional Flow** (atomar in einer Outbox-TX):
 * 1. Caller-Existenz im Einsatz prüfen (Defense-in-Depth zu Drei-Schicht-Guard).
 * 2. Command-Liste validieren (1–50 Einheiten, keine Duplikate; 1–5 Toggles,
 *    keine Duplikate pro Profil).
 * 3. Outer-Loop über Einheiten, Inner-Loop über Toggles: bestehende aktive Row
 *    laden, dann passenden Pfad fahren — `saveActivation` für Aktivierungen
 *    ohne Vor-Profil, `closeActiveZuweisung` für reine Deaktivierungen.
 * 4. Eine frisch erzeugte `propagationGroupId` (CUID2) wird an **alle** Events
 *    derselben Bulk-Operation gehängt, damit Story 3.3/3.7/3.11 sie als
 *    logische Gruppe wiedererkennen — unabhängig davon, wie viele Einheiten
 *    in der Operation drin waren.
 * 5. Bei beliebigem Teil-Conflict einer Einheit wird die gesamte Bulk-TX
 *    zurückgerollt (atomare Semantik AC5); der Sentinel wird mit
 *    `:einheit=<id>:profil=<p>` annotiert, damit das Frontend den Banner mit
 *    Einheit-Name + Profil rendern kann.
 *
 * **expectedVersion-Semantik:** Per-Toggle (`PsaProfilToggle.expectedVersion`).
 * Pflicht beim Deaktivieren; ignoriert beim reinen Aktivieren ohne
 * Vor-Profil.
 */
@Injectable()
@CommandHandler(ChangePsaProfilCommand)
export class ChangePsaProfilHandler extends TransactionalCommandHandler<ChangePsaProfilCommand, ChangePsaProfilResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(PSA_PROFIL_ZUWEISUNG_REPOSITORY)
    private readonly repo: IPsaProfilZuweisungRepository,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly teilnehmerRepo: IEinsatzTeilnehmerRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: ChangePsaProfilCommand, tx: TransactionContext): Promise<Result<ChangePsaProfilResult> | { result: ChangePsaProfilResult; events: DomainEvent[] }> {
    const validation = this.validateCommand(command);
    if (validation.isFailure) return Result.fail<ChangePsaProfilResult>(validation.error!);

    // Defense-in-Depth: Caller MUSS aktiver Teilnehmer im Einsatz sein.
    // Vier-Schicht-Guard-Kette deckt das ab; wir prüfen es hier ein zweites
    // Mal, falls jemand am Guard vorbei den Handler direkt aufruft (z. B.
    // Tests, interne Dispatch-Pfade).
    let teilnehmer: Awaited<ReturnType<IEinsatzTeilnehmerRepository['findByEinsatzAndUser']>>;
    try {
      teilnehmer = await this.teilnehmerRepo.findByEinsatzAndUser(command.einsatzId, command.callerUserId, tx);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return Result.fail<ChangePsaProfilResult>(wrapInfrastructureError(undefined, `Teilnehmer-Lookup fehlgeschlagen: ${message}`));
    }
    if (!teilnehmer) {
      return Result.fail<ChangePsaProfilResult>(CHANGE_PSA_PROFIL_ERROR_CODES.NOT_TEILNEHMER);
    }

    // Cross-Einsatz-Membership-Check: jede `einheitId` MUSS zum `einsatzId`
    // gehören. Defense-in-Depth, weil das Schema keinen FK auf
    // `EinsatzEinheit` hat und die Guards nur den Path-Param `:einsatzId`
    // gegen die Permission/Membership prüfen — eine fremde Einheit-ID im
    // Body würde sonst stillschweigend in den Einsatz-Scope geschrieben.
    // Pattern analog zu `create-sicherheitsregel.handler.ts`.
    for (const einheitId of command.einheitIds) {
      const einheitResult = await this.einheitRepo.findById(einheitId, tx);
      if (einheitResult.isFailure) {
        return Result.fail<ChangePsaProfilResult>(wrapInfrastructureError(einheitResult.error, 'Einheit konnte nicht geladen werden'));
      }
      const einheit = einheitResult.value;
      if (!einheit || einheit.einsatzId !== command.einsatzId) {
        return Result.fail<ChangePsaProfilResult>(CHANGE_PSA_PROFIL_ERROR_CODES.EINHEIT_NOT_IN_EINSATZ);
      }
    }

    // Story 3.2 AC4: **eine** propagationGroupId für **alle** N Einheiten ×
    // M Toggles. Outer-Loop iteriert die Einheiten, Inner-Loop die Toggles —
    // alle Mutationen passieren in der gleichen TX (umschließendes
    // `executeInTransaction`-Pattern aus `TransactionalCommandHandler`).
    const propagationGroupId = createId();
    const events: DomainEvent[] = [];
    const affectedZuweisungen: ChangePsaProfilResult['affectedZuweisungen'] = [];

    for (const einheitId of command.einheitIds) {
      for (const toggle of command.profilToggles) {
        const stepResult = await this.applyToggle(command, einheitId, toggle, propagationGroupId, tx);
        if (stepResult.isFailure) {
          // Annotation mit `einheitId` + `profil` für den Controller-Mapper
          // (Story 3.2 AC5/AC6) — gibt dem Frontend genug Kontext, den
          // Konflikt-Banner zu rendern und die richtige Einheit aus der
          // Selection zu entfernen.
          return Result.fail<ChangePsaProfilResult>(annotateConflictWithEinheit(stepResult.error!, einheitId, toggle.profil));
        }
        const step = stepResult.value!;
        events.push(...step.events);
        affectedZuweisungen.push(...step.affected);
      }
    }

    return { result: { propagationGroupId, affectedZuweisungen }, events };
  }

  private validateCommand(command: ChangePsaProfilCommand): Result<void> {
    if (!command.einsatzId || command.einsatzId.trim().length === 0) {
      return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.EINSATZ_REQUIRED);
    }
    if (!command.callerUserId || command.callerUserId.trim().length === 0) {
      return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.CALLER_REQUIRED);
    }
    if (!Array.isArray(command.einheitIds) || command.einheitIds.length === 0) {
      return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.EINHEIT_REQUIRED);
    }
    if (command.einheitIds.length > EINHEIT_IDS_MAX) {
      return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.TOO_MANY_EINHEITEN);
    }
    const seenEinheiten = new Set<string>();
    for (const id of command.einheitIds) {
      if (typeof id !== 'string' || id.trim().length === 0) {
        return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.EINHEIT_REQUIRED);
      }
      if (seenEinheiten.has(id)) {
        return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_EINHEIT);
      }
      seenEinheiten.add(id);
    }
    if (!Array.isArray(command.profilToggles) || command.profilToggles.length === 0) {
      return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.TOGGLES_REQUIRED);
    }
    if (command.profilToggles.length > PROFIL_TOGGLES_MAX) {
      return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.TOO_MANY_TOGGLES);
    }
    const seen = new Set<PsaProfil>();
    for (const toggle of command.profilToggles) {
      if (!toggle || typeof toggle.aktivieren !== 'boolean') {
        return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.TOGGLES_REQUIRED);
      }
      if (seen.has(toggle.profil)) {
        return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.TOGGLES_REQUIRED);
      }
      seen.add(toggle.profil);
    }
    return Result.ok();
  }

  private async applyToggle(
    command: ChangePsaProfilCommand,
    einheitId: string,
    toggle: PsaProfilToggle,
    propagationGroupId: string,
    tx: TransactionContext,
  ): Promise<Result<{ events: DomainEvent[]; affected: ChangePsaProfilResult['affectedZuweisungen'] }>> {
    const activeResult = await this.repo.findActiveByEinheit(command.einsatzId, einheitId, toggle.profil, tx);
    if (activeResult.isFailure) {
      return Result.fail(wrapInfrastructureError(activeResult.error, 'aktive Zuweisung konnte nicht geladen werden'));
    }
    const active = activeResult.value;

    if (toggle.aktivieren) {
      if (active) {
        // Profil ist für diese Einheit bereits aktiv → silenter No-Op.
        // `findActiveByEinheit` filtert bereits per `(einsatzId, einheitId, profil)`,
        // also matcht `active` immer das Toggle-Profil. Story 3.2 (Bulk) verlässt
        // sich darauf, dass redundante Aktivierungs-Toggles in gemischten Batches
        // nicht den ganzen Command failen — sondern still durchlaufen.
        this.logger.debug('PSA-Profil bereits aktiv — Toggle als No-Op behandelt', {
          einsatzId: command.einsatzId,
          einheitId,
          profil: toggle.profil,
          zuweisungId: active.id.value,
        });
        return Result.ok({ events: [], affected: [] });
      }

      // Pure-Aktivierung — keine Versions-Prüfung nötig.
      const aggregateResult = PsaProfilZuweisung.create({
        einsatzId: command.einsatzId,
        einheitId,
        profil: toggle.profil,
        begruendung: command.begruendung,
        aktiviertVonUserId: command.callerUserId,
        propagationGroupId,
      });
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return Result.fail(aggregateResult.error ?? 'Aggregate-Erzeugung fehlgeschlagen');
      }
      const aggregate = aggregateResult.value;
      const saveResult = await this.repo.saveActivation(aggregate, tx);
      if (saveResult.isFailure) {
        return Result.fail(wrapInfrastructureError(saveResult.error, 'saveActivation fehlgeschlagen'));
      }
      return Result.ok({
        events: aggregate.getDomainEvents(),
        affected: [{ einheitId, profil: toggle.profil, aktion: 'AKTIVIERT', zuweisungId: aggregate.id.value, version: aggregate.version }],
      });
    }

    // Deaktivierung — Set-Operation-Semantik (Story 3.2 D2):
    // Bei Bulk-Mixed-Toggle ("alle deaktivieren") rufen wir den Pfad auch
    // für Einheiten auf, die das Profil ohnehin nicht aktiv haben. Kein
    // Fehler — Zielzustand ist bereits erreicht. Symmetrisch zum
    // Aktivieren-No-Op (siehe oben).
    if (!active) {
      this.logger.debug('PSA-Profil bereits inaktiv — Deaktivierungs-Toggle als No-Op behandelt', {
        einsatzId: command.einsatzId,
        einheitId,
        profil: toggle.profil,
      });
      return Result.ok({ events: [], affected: [] });
    }
    if (toggle.expectedVersion === undefined) {
      return Result.fail(CHANGE_PSA_PROFIL_ERROR_CODES.EXPECTED_VERSION_REQUIRED);
    }
    const deactivateResult = active.deactivate({
      expectedVersion: toggle.expectedVersion,
      userId: command.callerUserId,
      begruendung: command.begruendung,
      propagationGroupId,
    });
    if (deactivateResult.isFailure) {
      return Result.fail(deactivateResult.error!);
    }
    const persistResult = await this.repo.closeActiveZuweisung(active, toggle.expectedVersion, tx);
    if (persistResult.isFailure) {
      return Result.fail(wrapInfrastructureError(persistResult.error, 'closeActiveZuweisung fehlgeschlagen'));
    }
    return Result.ok({
      events: active.getDomainEvents(),
      affected: [{ einheitId, profil: toggle.profil, aktion: 'DEAKTIVIERT', zuweisungId: active.id.value, version: active.version }],
    });
  }
}
