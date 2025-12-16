import { DomainEvent } from '@domain/common/domain-event';

/**
 * Event: RollenDefinition wurde erstellt.
 *
 * Dieses Event wird nach erfolgreicher Erstellung einer RollenDefinition
 * im Aggregate emittiert und via Outbox-Pattern persistiert.
 *
 * @remarks
 * Events nutzen primitive Typen (nicht Value Objects) für Serialisierbarkeit.
 * Das Event enthält alle relevanten Daten zum Zeitpunkt der Erstellung.
 */
export class RollenDefinitionCreatedEvent extends DomainEvent {
  constructor(
    public readonly rollenDefinitionId: string,
    public readonly name: string,
    public readonly funkrufname: string | undefined,
    public readonly erforderlicheQualifikationen: ReadonlyArray<{
      qualifikationId: string;
      istPflicht: boolean;
    }>,
    public readonly createdBy: string,
  ) {
    super(rollenDefinitionId);
  }

  static override eventName(): string {
    return 'RollenDefinitionCreated';
  }
}
