import type { PersonalEntryProps, StandortProps } from '@domain/eigenschutz/value-objects/standort.vo';

/**
 * Command für `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten`
 * (Story 4.1, AC6).
 */
export class CreateSicherungspostenCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly createdBy: string,
    public readonly bezeichnung: string,
    public readonly standort: StandortProps,
    public readonly personal: PersonalEntryProps[],
    public readonly einheitId?: string,
    public readonly zustaendigkeitsbereich?: string,
    public readonly abloesezeiten?: string,
  ) {}
}
