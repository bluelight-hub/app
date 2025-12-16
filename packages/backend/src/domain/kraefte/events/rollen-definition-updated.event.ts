import { DomainEvent } from '@domain/common/domain-event';

/**
 * Event: RollenDefinition wurde aktualisiert.
 *
 * Dieses Event wird nach erfolgreicher Aktualisierung einer RollenDefinition
 * im Aggregate emittiert. Es enthält nur die geänderten Felder.
 *
 * @remarks
 * Das `changes` Objekt ist ein Partial-Objekt und enthält nur die tatsächlich
 * geänderten Felder. Unveränderliche Felder fehlen im Objekt.
 */
export class RollenDefinitionUpdatedEvent extends DomainEvent {
  constructor(
    public readonly rollenDefinitionId: string,
    public readonly changes: {
      name?: string;
      funkrufname?: string;
      beschreibung?: string;
      istAktiv?: boolean;
      sortOrder?: number;
      erforderlicheQualifikationen?: ReadonlyArray<{
        qualifikationId: string;
        istPflicht: boolean;
      }>;
    },
    public readonly updatedBy: string,
  ) {
    super(rollenDefinitionId);
  }

  static override eventName(): string {
    return 'RollenDefinitionUpdated';
  }
}
