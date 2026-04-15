import { Result } from '@domain/common/result';

export interface GetRufnamenVorschlaegeQueryProps {
  readonly einsatzId: string;
}

/**
 * Query: Liefert alle zuordnungsfähigen Kräfte eines Einsatzes
 * (Fahrzeuge, Personen, Einheiten) für die Rufnamen-Auswahl.
 */
export class GetRufnamenVorschlaegeQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: GetRufnamenVorschlaegeQueryProps): Result<GetRufnamenVorschlaegeQuery> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<GetRufnamenVorschlaegeQuery>('einsatzId ist erforderlich');
    }
    return Result.ok(new GetRufnamenVorschlaegeQuery(einsatzId));
  }
}

export interface RufnamenVorschlaegeResult {
  readonly fahrzeuge: ReadonlyArray<{ id: string; funkrufname: string }>;
  readonly personen: ReadonlyArray<{ id: string; funkrufname: string }>;
  readonly einheiten: ReadonlyArray<{ id: string; name: string }>;
}
