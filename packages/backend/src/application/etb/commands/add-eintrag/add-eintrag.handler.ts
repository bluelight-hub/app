import { CreateEtbCommand } from '@application/etb/commands';
import { Result } from '@domain/common/result';
import type { EtbEintrag } from '@domain/entities/etb-eintrag.entity';
import type { IEtbRepository } from '@domain/repositories';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { EintragKontextShape } from '@domain/value-objects/eintrag-kontext';
import { EintragKontext } from '@domain/value-objects/eintrag-kontext';
import { EtbId } from '@domain/value-objects/etb-id';
import { EtbKategorie } from '@domain/value-objects/etb-kategorie';
import { UserId } from '@domain/value-objects/user-id';
import { Inject, Injectable, Optional, forwardRef } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { AddEintragCommand } from './add-eintrag.command';
import { ETB_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { CreateEtbHandler } from '../create-etb/create-etb.handler';

/**
 * Handler für AddEintragCommand.
 *
 * Orchestriert das Hinzufügen eines neuen Eintrags zum Einsatztagebuch.
 * Lädt das ETB-Aggregate, delegiert Business-Logic an das Aggregate,
 * und publiziert Events nach erfolgreichem Save.
 *
 * **Versioning Pattern (DRK-Compliance):**
 * Das Aggregate erstellt automatisch einen Snapshot VOR der Mutation.
 * Dies ermöglicht vollständigen Audit-Trail und Rollback-Fähigkeit.
 *
 * **Sequence Number:**
 * Wird automatisch vom Aggregate vergeben (auto-increment).
 * Garantiert lückenlose chronologische Sortierung.
 *
 * Security: Sanitized error messages prevent ID disclosure to API consumers.
 */
@Injectable()
export class AddEintragHandler {
  constructor(
    @Inject(ETB_REPOSITORY)
    private readonly etbRepository: IEtbRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Optional()
    @Inject(forwardRef(() => CreateEtbHandler))
    private readonly createEtbHandler?: CreateEtbHandler,
  ) {}

  /**
   * Führt das Hinzufügen eines neuen Eintrags zum Einsatztagebuch aus.
   *
   * **Workflow:**
   * 1. Validiert EtbId und UserId Format (Value Objects)
   * 2. Lädt ETB-Aggregate (mit Auto-Creation falls nicht vorhanden)
   * 3. Konvertiert Prisma Enum zu Domain Value Object (Kategorie)
   * 4. Delegiert Business-Logic an Aggregate.addEintrag()
   * 5. Persisted Aggregate mit neuem Eintrag
   *
   * **Auto-Creation (wenn ETB nicht gefunden):**
   * - Prüft ob einsatzId im Command vorhanden
   * - Erstellt ETB automatisch via CreateEtbHandler
   * - Lädt neu erstelltes ETB und fährt mit Eintrag-Erstellung fort
   *
   * **DRK-Compliance:**
   * - Aggregate erstellt automatisch Snapshot VOR der Mutation
   * - Sequence Number wird automatisch vergeben (lückenlos)
   *
   * @param command - AddEintragCommand mit Eintragsdaten und ETB-ID
   * @returns Result<EtbEintrag> - Success mit erstelltem Eintrag oder Failure mit Fehlermeldung
   *
   * @example
   * ```typescript
   * const command = AddEintragCommand.create(
   *   'etb-id',
   *   'Fahrzeug ausgerückt',
   *   'user-id',
   *   'FAHRZEUG',
   *   'einsatz-id'
   * );
   * const result = await handler.execute(command.value);
   * if (result.isSuccess) {
   *   console.log('Eintrag erstellt:', result.value.text);
   * }
   * ```
   */
  async execute(command: AddEintragCommand): Promise<Result<EtbEintrag>> {
    // Step 1: Validate EtbId format
    const etbIdResult = EtbId.create(command.etbId);
    if (etbIdResult.isFailure) {
      return Result.fail<EtbEintrag>(etbIdResult.error ?? 'Invalid ETB ID');
    }
    const etbId = etbIdResult.value;
    if (!etbId) {
      this.logger.error('Unexpected null EtbId after successful validation', {
        command: command.constructor.name,
      });
      return Result.fail<EtbEintrag>('Invalid ETB ID result');
    }

    // Step 2: Validate UserId format
    const userIdResult = UserId.create(command.userId);
    if (userIdResult.isFailure) {
      return Result.fail<EtbEintrag>(userIdResult.error ?? 'Invalid User ID');
    }
    const userId = userIdResult.value;
    if (!userId) {
      this.logger.error('Unexpected null UserId after successful validation', {
        command: command.constructor.name,
      });
      return Result.fail<EtbEintrag>('Invalid User ID result');
    }

    // Step 3: Load ETB Aggregate
    // Strategie: Wenn einsatzId vorhanden, nutze findByEinsatzId (ETB hat eigene ID, nicht = einsatzId)
    // Fallback auf findById für direkte ETB-ID Lookups
    const einsatzIdStr = command.einsatzId?.trim();
    let aggregate = null;
    if (einsatzIdStr) {
      const einsatzIdResult = EinsatzId.create(einsatzIdStr);
      if (einsatzIdResult.isSuccess && einsatzIdResult.value) {
        aggregate = await this.etbRepository.findByEinsatzId(einsatzIdResult.value);
      }
    }
    if (!aggregate) {
      aggregate = await this.etbRepository.findById(etbId);
    }

    if (aggregate === null) {
      // Server-side logging with full diagnostic context
      this.logger.warn('ETB not found during AddEintrag', {
        etbId: etbId.value,
        einsatzId: einsatzIdStr,
        timestamp: new Date().toISOString(),
      });

      // Try to auto-create ETB if einsatzId is provided (active Einsatz context)
      const einsatzId = einsatzIdStr;

      if (!einsatzId) {
        this.logger.warn('Missing einsatzId for auto-creation after ETB miss', {
          etbId: etbId.value,
        });
        return Result.fail<EtbEintrag>('ETB nicht gefunden');
      }

      if (!this.createEtbHandler) {
        this.logger.error('CreateEtbHandler unavailable for ETB auto-creation', {
          etbId: etbId.value,
          einsatzId,
        });
        return Result.fail<EtbEintrag>('ETB konnte nicht automatisch erstellt werden');
      }

      // User-facing sanitized message (NO internal IDs)
      const newIdResult = CreateEtbCommand.create(einsatzId);
      if (newIdResult.isFailure || !newIdResult.value) {
        return Result.fail<EtbEintrag>(newIdResult.error ?? 'ETB konnte nicht erstellt werden');
      }

      const idResult = await this.createEtbHandler.execute(newIdResult.value);
      if (idResult.isFailure || !idResult.value) {
        this.logger.warn('ETB creation failed during addEintrag', {
          einsatzId,
          error: idResult.error,
        });
        return Result.fail<EtbEintrag>(idResult.error ?? 'ETB konnte nicht erstellt werden');
      }

      aggregate = await this.etbRepository.findById(idResult.value);
      if (!aggregate) {
        this.logger.error('ETB created but not found when reloading after addEintrag', {
          etbId: idResult.value.value,
          einsatzId,
        });
        return Result.fail<EtbEintrag>('ETB nicht gefunden');
      }
    }

    // Step 4: Convert Prisma enum to Domain Value Object
    // Application Layer verwendet Prisma Enum (fuer API-Validierung),
    // Domain Layer erwartet Value Object (Hexagonale Architektur)
    let kategorieVo: EtbKategorie | undefined;
    if (command.kategorie) {
      const kategorieResult = EtbKategorie.create(command.kategorie);
      if (kategorieResult.isFailure) {
        return Result.fail<EtbEintrag>(kategorieResult.error ?? 'Invalid Kategorie');
      }
      kategorieVo = kategorieResult.value as EtbKategorie;
    }

    // Step 5: Konvertiere Command-Kontext → Domain-VO (Issue #407)
    let kontext: EintragKontextShape | undefined;
    if (command.kontext?.type === 'funkspruch') {
      kontext = EintragKontext.funkspruch({
        kanalId: command.kontext.kanalId,
        funkPrioritaet: command.kontext.funkPrioritaet,
      });
    } else if (command.kontext?.type === 'standard') {
      kontext = EintragKontext.standard();
    }

    // Step 6: Delegate to domain method (validates business rules, creates snapshot)
    // Business rules checked by aggregate:
    // - ETB must not be locked (status !== LOCKED)
    // - Text must not be empty
    // - ereignisZeitpunkt max 60s in Zukunft
    // Aggregate also:
    // - Creates snapshot BEFORE mutation (DRK-Compliance)
    // - Auto-increments sequence number
    // - Creates EintragAddedEvent mit Kontext für Notfall-Detection
    const addResult = aggregate.addEintrag(command.text, userId, kategorieVo, command.absender, command.empfaenger, command.metadata, command.occurredAt, {
      kontext,
      ereignisZeitpunkt: command.ereignisZeitpunkt,
    });
    if (addResult.isFailure) {
      // Domain-level validation failure
      return Result.fail<EtbEintrag>(addResult.error ?? 'Eintrag konnte nicht hinzugefügt werden');
    }
    const eintrag = addResult.value;
    if (!eintrag) {
      this.logger.error('Unexpected null eintrag after successful addEintrag', {
        command: command.constructor.name,
      });
      return Result.fail<EtbEintrag>('Invalid Eintrag result');
    }

    // Step 6: Save aggregate (repository handles snapshot persistence)
    try {
      await this.etbRepository.save(aggregate);
    } catch (error) {
      this.logger.error('Failed to save ETB after adding entry', {
        error: error instanceof Error ? error.message : String(error),
        etbId: command.etbId,
        userId: command.userId,
      });
      return Result.fail<EtbEintrag>('Eintrag konnte nicht gespeichert werden');
    }

    // Domain Events werden automatisch in Outbox persistiert (Story 4-4: Transactional Outbox Pattern)
    // Repository.save() → Outbox → Polling Worker → Event Handler

    return Result.ok(eintrag);
  }
}
