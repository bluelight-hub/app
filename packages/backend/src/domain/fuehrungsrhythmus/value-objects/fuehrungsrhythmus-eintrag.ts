import { createId } from '@paralleldrive/cuid2';
import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

interface FuehrungsrhythmusEintragProps extends Record<string, unknown> {
  id: string;
  titel: string;
  intervallMinuten: number;
  offsetMinuten: number;
  sortOrder: number;
}

/**
 * FuehrungsrhythmusEintrag Value Object.
 * Repraesentiert einen einzelnen Eintrag innerhalb eines Fuehrungsrhythmus-Templates.
 *
 * Validierung:
 * - titel: erforderlich, maximal 100 Zeichen
 * - intervallMinuten: 1-1440
 * - offsetMinuten: 0-1440
 * - sortOrder: >= 0
 * - id: optional bei Erstellung (wird via cuid2 generiert falls nicht angegeben)
 */
export class FuehrungsrhythmusEintrag extends ValueObject<FuehrungsrhythmusEintragProps> {
  public static readonly MAX_TITEL_LENGTH = 100;
  public static readonly MIN_INTERVALL_MINUTEN = 1;
  public static readonly MAX_INTERVALL_MINUTEN = 1440;
  public static readonly MIN_OFFSET_MINUTEN = 0;
  public static readonly MAX_OFFSET_MINUTEN = 1440;

  get id(): string {
    return this.props.id;
  }

  get titel(): string {
    return this.props.titel;
  }

  get intervallMinuten(): number {
    return this.props.intervallMinuten;
  }

  get offsetMinuten(): number {
    return this.props.offsetMinuten;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  private constructor(props: FuehrungsrhythmusEintragProps) {
    super(props);
  }

  static create(props: { id?: string; titel: string; intervallMinuten: number; offsetMinuten: number; sortOrder: number }): Result<FuehrungsrhythmusEintrag> {
    // Titel Validierung
    if (props.titel == null || props.titel.trim().length === 0) {
      return Result.fail<FuehrungsrhythmusEintrag>('FR_TEMPLATE_EINTRAG_INVALID: Titel ist erforderlich');
    }

    const trimmedTitel = props.titel.trim();
    if (trimmedTitel.length > FuehrungsrhythmusEintrag.MAX_TITEL_LENGTH) {
      return Result.fail<FuehrungsrhythmusEintrag>(`FR_TEMPLATE_EINTRAG_INVALID: Titel darf maximal ${FuehrungsrhythmusEintrag.MAX_TITEL_LENGTH} Zeichen haben, aber ${trimmedTitel.length} gefunden`);
    }

    // IntervallMinuten Validierung
    if (props.intervallMinuten == null || props.intervallMinuten < FuehrungsrhythmusEintrag.MIN_INTERVALL_MINUTEN || props.intervallMinuten > FuehrungsrhythmusEintrag.MAX_INTERVALL_MINUTEN) {
      return Result.fail<FuehrungsrhythmusEintrag>(
        `FR_TEMPLATE_EINTRAG_INVALID: intervallMinuten muss zwischen ${FuehrungsrhythmusEintrag.MIN_INTERVALL_MINUTEN} und ${FuehrungsrhythmusEintrag.MAX_INTERVALL_MINUTEN} liegen`,
      );
    }

    // OffsetMinuten Validierung
    if (props.offsetMinuten == null || props.offsetMinuten < FuehrungsrhythmusEintrag.MIN_OFFSET_MINUTEN || props.offsetMinuten > FuehrungsrhythmusEintrag.MAX_OFFSET_MINUTEN) {
      return Result.fail<FuehrungsrhythmusEintrag>(
        `FR_TEMPLATE_EINTRAG_INVALID: offsetMinuten muss zwischen ${FuehrungsrhythmusEintrag.MIN_OFFSET_MINUTEN} und ${FuehrungsrhythmusEintrag.MAX_OFFSET_MINUTEN} liegen`,
      );
    }

    // SortOrder Validierung
    if (props.sortOrder == null || props.sortOrder < 0) {
      return Result.fail<FuehrungsrhythmusEintrag>('FR_TEMPLATE_EINTRAG_INVALID: sortOrder muss >= 0 sein');
    }

    const id = props.id ?? createId();

    return Result.ok<FuehrungsrhythmusEintrag>(
      new FuehrungsrhythmusEintrag({
        id,
        titel: trimmedTitel,
        intervallMinuten: props.intervallMinuten,
        offsetMinuten: props.offsetMinuten,
        sortOrder: props.sortOrder,
      }),
    );
  }
}
