import { formatNatoDateTime } from '@/shared/utils/date.util';
import { format } from 'date-fns';

/**
 * Felder die zur Generierung eines Einsatz-Namens benötigt werden.
 * Entkoppelt von Prisma-Client für bessere Testbarkeit und Wiederverwendbarkeit.
 */
interface EinsatzNameFields {
  alarmstichwort?: string | null;
  alarmierungszeit?: Date | string | null;
  createdAt?: Date | string | null;
}

/**
 * Generiert einen deterministischen Namen für einen Einsatz
 * basierend auf den verfügbaren Feldern.
 *
 * Die Generierung folgt einer klaren Priorität:
 * 1. Alarmstichwort als Prefix (falls vorhanden)
 * 2. Alarmierungszeit als Zeitstempel
 * 3. Fallback zu createdAt wenn keine Alarmierungszeit
 * 4. Fallback zu aktuellem Zeitstempel als letzter Ausweg
 */
export class EinsatzNameGenerator {
  private static readonly SEPARATOR = ' - ';

  /**
   * Generiert einen menschenlesbaren Namen für einen Einsatz.
   *
   * @param einsatz - Einsatzdaten mit mindestens einem Zeitstempel
   * @returns Formatierter Name im Format "Alarmstichwort - DDHHMMZMMMYY"
   */
  static generate(einsatz: Partial<EinsatzNameFields>): string {
    const components: string[] = [];

    // Priorität 1: Alarmstichwort
    if (einsatz.alarmstichwort) {
      components.push(einsatz.alarmstichwort);
    }

    // Priorität 2-4: Zeitstempel mit Fallback-Kette
    const validDate = EinsatzNameGenerator.getValidDate(einsatz);
    const dateStr = formatNatoDateTime(validDate);
    components.push(dateStr);

    return components.join(EinsatzNameGenerator.SEPARATOR);
  }

  /**
   * Extrahiert einzelne Namenskomponenten für flexible Verwendung.
   *
   * @param einsatz - Einsatzdaten
   * @returns Objekt mit alarmstichwort, zeit und datum
   */
  static getNameComponents(einsatz: Partial<EinsatzNameFields>) {
    const validDate = EinsatzNameGenerator.getValidDate(einsatz);

    return {
      alarmstichwort: einsatz.alarmstichwort ?? undefined,
      zeit: EinsatzNameGenerator.formatTime(validDate),
      datum: EinsatzNameGenerator.formatDate(validDate),
    };
  }

  /**
   * Ermittelt ein valides Datum aus den Einsatzdaten mit Fallback-Kette.
   * Validiert Datumskonvertierung um "Invalid Date" zu vermeiden.
   *
   * @param einsatz - Einsatzdaten
   * @returns Valides Date-Objekt
   */
  private static getValidDate(einsatz: Partial<EinsatzNameFields>): Date {
    // Priorität 1: Alarmierungszeit
    if (einsatz.alarmierungszeit) {
      const date = new Date(einsatz.alarmierungszeit);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    // Priorität 2: Erstellungszeit
    if (einsatz.createdAt) {
      const date = new Date(einsatz.createdAt);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    // Letzter Fallback: Aktuelle Zeit
    return new Date();
  }

  private static formatDate(date: Date): string {
    return format(date, 'dd.MM.yyyy');
  }

  private static formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}
