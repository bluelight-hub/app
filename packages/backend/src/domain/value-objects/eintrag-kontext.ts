import type { FunkPrioritaetValue } from './funk-prioritaet';

/**
 * Discriminated Union für ETB-Eintrag-Kontextvarianten.
 *
 * Der EintragKontext modelliert typisierte Zusatz-Informationen eines
 * ETB-Eintrags jenseits des reinen Texts. Aktuell zwei Varianten:
 * - `standard`: Gewöhnlicher ETB-Eintrag ohne spezifischen Kontext
 * - `funkspruch`: Eintrag, der aus einem Funkspruch entstanden ist (mit
 *   referenziertem Funkkanal und Priorität)
 *
 * Serialisiert in DB als `kontextType` (Discriminator) + `kontextData` (JSONB Payload).
 */
export type EintragKontextType = 'standard' | 'funkspruch';

/** Persistierte Form eines StandardKontext (nur type). */
export interface StandardKontextPersisted {
  type: 'standard';
}

/** Persistierte Form eines FunkKontext (alle Felder). */
export interface FunkKontextPersisted {
  type: 'funkspruch';
  kanalId: string;
  funkPrioritaet: FunkPrioritaetValue;
}

export type EintragKontextPersisted = StandardKontextPersisted | FunkKontextPersisted;

export interface StandardKontext {
  readonly type: 'standard';
  toPersistence(): StandardKontextPersisted;
}

export interface FunkKontext {
  readonly type: 'funkspruch';
  readonly kanalId: string;
  readonly funkPrioritaet: FunkPrioritaetValue;
  toPersistence(): FunkKontextPersisted;
}

export type EintragKontextShape = StandardKontext | FunkKontext;

/**
 * Factory-Namespace für EintragKontext-Varianten.
 */
export const EintragKontext = {
  standard(): StandardKontext {
    return {
      type: 'standard',
      toPersistence: () => ({ type: 'standard' }),
    };
  },

  funkspruch(args: { kanalId: string; funkPrioritaet: FunkPrioritaetValue }): FunkKontext {
    return {
      type: 'funkspruch',
      kanalId: args.kanalId,
      funkPrioritaet: args.funkPrioritaet,
      toPersistence: () => ({
        type: 'funkspruch',
        kanalId: args.kanalId,
        funkPrioritaet: args.funkPrioritaet,
      }),
    };
  },

  /**
   * Rekonstruiert einen EintragKontext aus persistierter Form
   * (kontextType + kontextData aus der DB).
   *
   * Bei unbekanntem type wird defensiv der Standard-Kontext zurückgegeben.
   */
  fromPersistence(type: string, data: unknown): EintragKontextShape {
    if (type === 'funkspruch' && data && typeof data === 'object') {
      const d = data as Partial<FunkKontextPersisted>;
      if (typeof d.kanalId === 'string' && typeof d.funkPrioritaet === 'string') {
        return EintragKontext.funkspruch({
          kanalId: d.kanalId,
          funkPrioritaet: d.funkPrioritaet as FunkPrioritaetValue,
        });
      }
    }
    return EintragKontext.standard();
  },
};
