/**
 * Hook zum Ableiten einer Zeichen-Definition aus einer Kräfte-Entität.
 *
 * Leitet aus Einheiten (EinsatzEinheitDto) und Fahrzeugen (EinsatzFahrzeugDto)
 * eine vorausgefüllte ZeichenDefinition ab, die als Startpunkt für den
 * ZeichenEditor oder den ZeichenBaukasten verwendet werden kann.
 *
 * Mapping-Regeln:
 * - Einheiten: typ → EinheitId (TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT)
 * - Fahrzeuge: Grundzeichen 'kraftfahrzeug-gelaendegaengig'
 * - Organisation und Fachaufgabe werden nicht automatisch abgeleitet
 *   (keine entsprechenden Felder in den DTOs)
 */

import { useMemo } from 'react';
import type { EinheitId, GrundzeichenId } from 'taktische-zeichen-core';
import type { ZeichenDefinition } from '../rendering/renderer';
import type { EinsatzEinheitDto, EinsatzFahrzeugDto } from '@bluelight-hub/shared/client';

/** Typ der Quell-Entität */
export type ZeichenEntityTyp = 'einheit' | 'fahrzeug';

/** Ergebnis des Hooks */
export interface UseZeichenFromEntityResult {
  /** Vorausgefüllte Zeichen-Definition */
  definition: ZeichenDefinition;
  /** Vorgeschlagenes Label (Name der Einheit / Funkrufname des Fahrzeugs) */
  suggestedLabel: string;
}

/** Mapping von EinsatzEinheitDtoTypEnum → EinheitId (taktische-zeichen-core) */
const EINHEIT_TYP_ZU_ZEICHEN_ID: Record<string, EinheitId> = {
  TRUPP: 'trupp',
  STAFFEL: 'staffel',
  GRUPPE: 'gruppe',
  ZUG: 'zug',
  ABSCHNITT: 'abschnitt',
};

/** Standard-Grundzeichen für taktische Einheiten */
const DEFAULT_GRUNDZEICHEN_EINHEIT: GrundzeichenId = 'person';

/** Standard-Grundzeichen für Fahrzeuge */
const DEFAULT_GRUNDZEICHEN_FAHRZEUG: GrundzeichenId = 'kraftfahrzeug-gelaendegaengig';

/**
 * Leitet aus einer EinsatzEinheit eine ZeichenDefinition ab.
 */
export function useZeichenFromEinheit(einheit: EinsatzEinheitDto): UseZeichenFromEntityResult {
  return useMemo(() => {
    const einheitId = EINHEIT_TYP_ZU_ZEICHEN_ID[einheit.typ];

    const definition: ZeichenDefinition = {
      grundzeichen: DEFAULT_GRUNDZEICHEN_EINHEIT,
      einheit: einheitId,
    };

    return {
      definition,
      suggestedLabel: einheit.name,
    };
  }, [einheit.typ, einheit.name]);
}

/**
 * Leitet aus einem EinsatzFahrzeug eine ZeichenDefinition ab.
 */
export function useZeichenFromFahrzeug(fahrzeug: EinsatzFahrzeugDto): UseZeichenFromEntityResult {
  return useMemo(() => {
    const definition: ZeichenDefinition = {
      grundzeichen: DEFAULT_GRUNDZEICHEN_FAHRZEUG,
    };

    return {
      definition,
      suggestedLabel: fahrzeug.funkrufname,
    };
  }, [fahrzeug.funkrufname]);
}

/**
 * Generischer Hook: leitet aus Einheit oder Fahrzeug eine ZeichenDefinition ab.
 *
 * @example
 * ```tsx
 * // Für Einheit
 * const { definition, suggestedLabel } = useZeichenFromEntity('einheit', einheit);
 *
 * // Für Fahrzeug
 * const { definition, suggestedLabel } = useZeichenFromEntity('fahrzeug', fahrzeug);
 * ```
 */
export function useZeichenFromEntity(typ: 'einheit', entity: EinsatzEinheitDto): UseZeichenFromEntityResult;
export function useZeichenFromEntity(typ: 'fahrzeug', entity: EinsatzFahrzeugDto): UseZeichenFromEntityResult;
export function useZeichenFromEntity(typ: ZeichenEntityTyp, entity: EinsatzEinheitDto | EinsatzFahrzeugDto): UseZeichenFromEntityResult {
  // Overload-Dispatch über useMemo — beide Zweige rufen dieselbe Logik auf
  return useMemo(() => {
    if (typ === 'einheit') {
      const einheit = entity as EinsatzEinheitDto;
      const einheitId = EINHEIT_TYP_ZU_ZEICHEN_ID[einheit.typ];
      return {
        definition: { grundzeichen: DEFAULT_GRUNDZEICHEN_EINHEIT, einheit: einheitId },
        suggestedLabel: einheit.name,
      };
    }

    const fahrzeug = entity as EinsatzFahrzeugDto;
    return {
      definition: { grundzeichen: DEFAULT_GRUNDZEICHEN_FAHRZEUG },
      suggestedLabel: fahrzeug.funkrufname,
    };
    // entity-Referenz als Dep reicht nicht — spezifische Felder verwenden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typ, (entity as EinsatzEinheitDto).typ ?? '', (entity as EinsatzFahrzeugDto).funkrufname ?? '', (entity as EinsatzEinheitDto).name ?? '']);
}
