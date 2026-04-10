import { Result } from '@domain/common/result';

/**
 * Props für FindeKatalogEintraegeQuery.
 */
export interface FindeKatalogEintraegeQueryProps {
  suche?: string;
  kategorie?: string;
}

/**
 * Query zum Abrufen von Katalogeinträgen mit optionaler Suche und Kategoriefilterung.
 */
export class FindeKatalogEintraegeQuery {
  private constructor(
    public readonly suche: string | undefined,
    public readonly kategorie: string | undefined,
  ) {}

  static create(props: FindeKatalogEintraegeQueryProps): Result<FindeKatalogEintraegeQuery> {
    return Result.ok<FindeKatalogEintraegeQuery>(new FindeKatalogEintraegeQuery(props.suche?.trim() || undefined, props.kategorie?.trim() || undefined));
  }
}
