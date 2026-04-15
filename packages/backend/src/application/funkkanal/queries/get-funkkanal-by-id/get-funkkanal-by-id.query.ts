import { Result } from '@domain/common/result';

export interface GetFunkkanalByIdQueryProps {
  readonly kanalId: string;
}

/**
 * Query: Liefert einen einzelnen Funkkanal inkl. Zuordnungen.
 */
export class GetFunkkanalByIdQuery {
  private constructor(public readonly kanalId: string) {}

  static create(props: GetFunkkanalByIdQueryProps): Result<GetFunkkanalByIdQuery> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<GetFunkkanalByIdQuery>('kanalId ist erforderlich');
    }
    return Result.ok(new GetFunkkanalByIdQuery(kanalId));
  }
}
