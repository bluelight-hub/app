import { Result } from '@domain/common/result';

/**
 * KanalDetails: Discriminated Union Value Object für Funkkanal-Typen.
 *
 * Ein Funkkanal hat genau einen Typ (TMO / DMO / Analog) mit jeweils unterschiedlichen
 * Pflicht- und optionalen Feldern:
 * - TMO (Trunked Mode Operation, Digitalfunk): Sprechgruppe (+ optional GSSI)
 * - DMO (Direct Mode Operation, Digitalfunk ohne Vermittlung): DMO-Kanalnummer (+ optional Repeater)
 * - Analog (4m / 2m-Band): Band + Frequenz (+ optional Kanalnummer)
 *
 * Persistierung erfolgt über detailsType (String) + detailsData (JSONB) am Funkkanal-Model.
 */
export type TmoDetails = {
  readonly type: 'tmo';
  readonly sprechgruppe: string;
  readonly gssi?: string;
};

export type DmoDetails = {
  readonly type: 'dmo';
  readonly dmoKanal: string;
  readonly repeater?: string;
};

export type AnalogDetails = {
  readonly type: 'analog';
  readonly band: '4m' | '2m';
  readonly frequenz: string;
  readonly kanalnummer?: string;
};

export type KanalDetailsShape = TmoDetails | DmoDetails | AnalogDetails;

/**
 * Persistierte Form — Discriminator wird separat gespeichert, daher type nicht enthalten.
 */
export type KanalDetailsData = Omit<TmoDetails, 'type'> | Omit<DmoDetails, 'type'> | Omit<AnalogDetails, 'type'>;

const ALLOWED_BANDS: readonly AnalogDetails['band'][] = ['4m', '2m'];

/**
 * Factory-Namespace für KanalDetails-Varianten.
 */
export const KanalDetails = {
  tmo(args: { sprechgruppe: string; gssi?: string }): Result<KanalDetailsShape> {
    const sprechgruppe = args.sprechgruppe?.trim();
    if (!sprechgruppe) {
      return Result.fail<KanalDetailsShape>('Sprechgruppe ist erforderlich');
    }
    return Result.ok<KanalDetailsShape>({
      type: 'tmo',
      sprechgruppe,
      gssi: args.gssi?.trim() || undefined,
    });
  },

  dmo(args: { dmoKanal: string; repeater?: string }): Result<KanalDetailsShape> {
    const dmoKanal = args.dmoKanal?.trim();
    if (!dmoKanal) {
      return Result.fail<KanalDetailsShape>('DMO-Kanal ist erforderlich');
    }
    return Result.ok<KanalDetailsShape>({
      type: 'dmo',
      dmoKanal,
      repeater: args.repeater?.trim() || undefined,
    });
  },

  analog(args: { band: '4m' | '2m'; frequenz: string; kanalnummer?: string }): Result<KanalDetailsShape> {
    if (!ALLOWED_BANDS.includes(args.band)) {
      return Result.fail<KanalDetailsShape>(`Band muss eines von ${ALLOWED_BANDS.join(', ')} sein`);
    }
    const frequenz = args.frequenz?.trim();
    if (!frequenz) {
      return Result.fail<KanalDetailsShape>('Frequenz ist erforderlich');
    }
    return Result.ok<KanalDetailsShape>({
      type: 'analog',
      band: args.band,
      frequenz,
      kanalnummer: args.kanalnummer?.trim() || undefined,
    });
  },

  /**
   * Rekonstruiert KanalDetails aus persistierter Form (detailsType + detailsData).
   */
  fromPersistence(type: string, data: unknown): KanalDetailsShape {
    const d = (data ?? {}) as Record<string, unknown>;
    if (type === 'tmo') {
      return {
        type: 'tmo',
        sprechgruppe: String(d.sprechgruppe ?? ''),
        gssi: typeof d.gssi === 'string' ? d.gssi : undefined,
      };
    }
    if (type === 'dmo') {
      return {
        type: 'dmo',
        dmoKanal: String(d.dmoKanal ?? ''),
        repeater: typeof d.repeater === 'string' ? d.repeater : undefined,
      };
    }
    if (type === 'analog') {
      return {
        type: 'analog',
        band: (d.band as AnalogDetails['band']) ?? '4m',
        frequenz: String(d.frequenz ?? ''),
        kanalnummer: typeof d.kanalnummer === 'string' ? d.kanalnummer : undefined,
      };
    }
    throw new Error(`Unbekannter KanalDetails-Type: ${type}`);
  },

  /**
   * Serialisiert KanalDetails ohne den Discriminator (der wird separat als detailsType
   * gespeichert). Gibt ein plain-object zurück, das direkt in JSONB geschrieben werden kann.
   */
  toPersistence(details: KanalDetailsShape): KanalDetailsData {
    const { type: _discard, ...rest } = details;
    return rest as KanalDetailsData;
  },
};
