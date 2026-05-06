import type { PersonalEntryProps, StandortProps } from '@domain/eigenschutz/value-objects/standort.vo';

/**
 * Command für `PATCH /api/einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten/:postenId`
 * (Story 4.1, AC6, AC8). Partial-Update — nur explizit gesetzte Felder werden überschrieben.
 *
 * `einheitId`/`zustaendigkeitsbereich`/`abloesezeiten` akzeptieren `null` als „leeren" -
 * Sentinel. `undefined` lässt das jeweilige Feld unverändert.
 */
export class UpdateSicherungspostenCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly postenId: string,
    public readonly userId: string,
    public readonly expectedVersion: number,
    public readonly changes: {
      bezeichnung?: string;
      standort?: StandortProps;
      personal?: PersonalEntryProps[];
      einheitId?: string | null;
      zustaendigkeitsbereich?: string | null;
      abloesezeiten?: string | null;
    },
  ) {}
}
