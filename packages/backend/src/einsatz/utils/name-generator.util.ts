import { formatNatoDateTime } from '@/utils/date.util';
import type { Einsatz } from '@prisma/client';

/**
 * Generiert einen deterministischen Namen für einen Einsatz
 * basierend auf den verfügbaren Feldern
 */
export class EinsatzNameGenerator {
  static generate(einsatz: Partial<Einsatz>): string {
    const components: string[] = [];

    // Priorität 1: Alarmstichwort
    if (einsatz.alarmstichwort) {
      components.push(einsatz.alarmstichwort);
    }

    // Priorität 2: Alarmierungszeit
    if (einsatz.alarmierungszeit) {
      const date = new Date(einsatz.alarmierungszeit);
      const dateStr = EinsatzNameGenerator.formatDateTime(date);
      components.push(dateStr);
    } else if (einsatz.createdAt) {
      // Fallback: Erstellungszeit
      const date = new Date(einsatz.createdAt);
      const dateStr = EinsatzNameGenerator.formatDateTime(date);
      components.push(dateStr);
    } else {
      // Letzter Fallback: Aktuelle Zeit
      const dateStr = EinsatzNameGenerator.formatDateTime(new Date());
      components.push(dateStr);
    }

    return components.join(' - ');
  }

  static getNameComponents(einsatz: Partial<Einsatz>) {
    const date = einsatz.alarmierungszeit || einsatz.createdAt || new Date();
    const dateObj = new Date(date);

    return {
      alarmstichwort: einsatz.alarmstichwort || undefined,
      zeit: EinsatzNameGenerator.formatTime(dateObj),
      datum: EinsatzNameGenerator.formatDate(dateObj),
    };
  }

  private static formatDateTime(date: Date): string {
    return formatNatoDateTime(date);
  }

  private static formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  }

  private static formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}
