import type { EinsatzCompleteness, MissingField } from '@/application/einsatz/dto/einsatz-response.dto';

/**
 * Interface für die zu prüfenden Einsatz-Felder.
 *
 * Entkoppelt die Util von Prisma-Typen und ermöglicht Verwendung
 * mit verschiedenen Datenquellen (Domain Aggregates, DTOs, etc.)
 */
export interface EinsatzFields {
  alarmstichwort?: string | null;
  alarmierungszeit?: Date | string | null;
  // Weitere Felder können später hinzugefügt werden
}

/**
 * Berechnet die Vollständigkeit eines Einsatzes basierend auf kritischen Feldern.
 *
 * Diese Klasse ist Framework-agnostisch und arbeitet mit einem generischen Interface,
 * um Prisma-Coupling zu vermeiden. Die Vollständigkeitsberechnung erfolgt gewichtet
 * und priorisiert kritische Felder wie Alarmstichwort und Alarmierungszeit.
 *
 * @example
 * ```typescript
 * const completeness = EinsatzCompletenessCalculator.calculate({
 *   alarmstichwort: 'Brand 3',
 *   alarmierungszeit: new Date(),
 * });
 * console.log(completeness.score); // 100
 * ```
 */
export class EinsatzCompletenessCalculator {
  private static readonly FIELD_WEIGHTS = {
    alarmstichwort: { weight: 30, priority: 'critical' as const },
    alarmierungszeit: { weight: 25, priority: 'critical' as const },
    // Weitere Felder können später hinzugefügt werden
  };

  private static readonly PERCENT_MULTIPLIER = 100;

  /**
   * Berechnet die Vollständigkeit eines Einsatzes.
   *
   * Gibt einen Score von 0-100% zurück, basierend auf ausgefüllten Pflichtfeldern.
   * Wenn keine Felder definiert sind (totalWeight === 0), wird 0% zurückgegeben.
   *
   * @param einsatz - Die zu prüfenden Einsatz-Felder
   * @returns Vollständigkeits-Objekt mit Score, Status und fehlenden Feldern
   */
  static calculate(einsatz: EinsatzFields): EinsatzCompleteness {
    const missingFields: MissingField[] = [];
    let totalWeight = 0;
    let achievedWeight = 0;

    // Prüfe Alarmstichwort
    const alarmstichwortConfig = EinsatzCompletenessCalculator.FIELD_WEIGHTS.alarmstichwort;
    totalWeight += alarmstichwortConfig.weight;
    if (!einsatz.alarmstichwort || einsatz.alarmstichwort.trim() === '') {
      missingFields.push({
        field: 'alarmstichwort',
        fieldPath: 'alarmstichwort',
        priority: alarmstichwortConfig.priority,
        message: 'Das Alarmstichwort fehlt',
        suggestedAction: 'Bitte geben Sie ein Alarmstichwort an (z.B. "Brand 3", "TH1")',
      });
    } else {
      achievedWeight += alarmstichwortConfig.weight;
    }

    // Prüfe Alarmierungszeit
    const alarmierungszeitConfig = EinsatzCompletenessCalculator.FIELD_WEIGHTS.alarmierungszeit;
    totalWeight += alarmierungszeitConfig.weight;

    // CRITICAL FIX: Handhabt Date, ISO-String und null/undefined
    const dateValue = einsatz.alarmierungszeit;
    const isValidDate = dateValue && !Number.isNaN(new Date(dateValue).getTime());

    if (!isValidDate) {
      missingFields.push({
        field: 'alarmierungszeit',
        fieldPath: 'alarmierungszeit',
        priority: alarmierungszeitConfig.priority,
        message: 'Die Alarmierungszeit fehlt',
        suggestedAction: 'Bitte geben Sie den Zeitpunkt der Alarmierung an',
      });
    } else {
      achievedWeight += alarmierungszeitConfig.weight;
    }

    // Berechne Score (MEDIUM FIX: Edge Case totalWeight === 0)
    const score = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * EinsatzCompletenessCalculator.PERCENT_MULTIPLIER) : 0;
    const isComplete = score === 100;

    return {
      score,
      isComplete,
      missingFields,
    };
  }
}
