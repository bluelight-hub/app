import { BadRequestException } from '@nestjs/common';
import { EinsatzStatus } from '@prisma/client';

/**
 * Definiert erlaubte Status-Übergänge für Einsätze
 *
 * Business Rules:
 * - OFFEN → IN_BEARBEITUNG, ABGESCHLOSSEN
 * - IN_BEARBEITUNG → ABGESCHLOSSEN, OFFEN (Zurücksetzen)
 * - ABGESCHLOSSEN → ARCHIVIERT, IN_BEARBEITUNG (Wiedereröffnen)
 * - ARCHIVIERT → keine weiteren Übergänge (Endstatus)
 */
export class EinsatzStatusTransitions {
  private static readonly ALLOWED_TRANSITIONS: Record<EinsatzStatus, EinsatzStatus[]> = {
    [EinsatzStatus.ANGELEGT]: [EinsatzStatus.IN_BEARBEITUNG, EinsatzStatus.ABGESCHLOSSEN],
    [EinsatzStatus.IN_BEARBEITUNG]: [EinsatzStatus.ABGESCHLOSSEN],
    [EinsatzStatus.ABGESCHLOSSEN]: [EinsatzStatus.ARCHIVIERT],
    [EinsatzStatus.ARCHIVIERT]: [], // Keine weiteren Übergänge erlaubt
  };

  /**
   * Prüft ob ein Status-Übergang erlaubt ist
   */
  static isTransitionAllowed(from: EinsatzStatus, to: EinsatzStatus): boolean {
    if (from === to) return true; // Gleicher Status ist immer erlaubt

    const allowedTransitions = EinsatzStatusTransitions.ALLOWED_TRANSITIONS[from];
    return allowedTransitions?.includes(to) ?? false;
  }

  /**
   * Validiert einen Status-Übergang und wirft Exception bei Fehler
   */
  static validateTransition(from: EinsatzStatus, to: EinsatzStatus): void {
    if (!EinsatzStatusTransitions.isTransitionAllowed(from, to)) {
      throw new BadRequestException(
        `Status-Übergang von "${from}" zu "${to}" ist nicht erlaubt. ` + `Erlaubte Übergänge von "${from}": ${EinsatzStatusTransitions.ALLOWED_TRANSITIONS[from].join(', ') || 'keine'}`,
      );
    }
  }

  /**
   * Prüft ob Archivierung erlaubt ist
   */
  static canArchive(currentStatus: EinsatzStatus): boolean {
    return currentStatus === EinsatzStatus.ABGESCHLOSSEN;
  }

  /**
   * Prüft ob ein Einsatz bearbeitet werden kann
   */
  static canEdit(currentStatus: EinsatzStatus): boolean {
    return currentStatus !== EinsatzStatus.ARCHIVIERT;
  }

  /**
   * Gibt erlaubte Zielstatus für einen gegebenen Status zurück
   */
  static getAllowedTransitions(from: EinsatzStatus): EinsatzStatus[] {
    return EinsatzStatusTransitions.ALLOWED_TRANSITIONS[from] ?? [];
  }
}
