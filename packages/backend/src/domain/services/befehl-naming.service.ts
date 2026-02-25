/**
 * Service für die Generierung eindeutiger Befehlsnummern.
 *
 * **Business Rules:**
 * - Format: B-{LAUFNUMMER} (Beispiel: B-001)
 * - Laufnummer ist pro Einsatz eindeutig
 * - Zero-Padding auf 3 Stellen für einheitliche Sortierung
 *
 * **WICHTIG:** Dieser Service generiert NUR das Format, NICHT die Laufnummer selbst.
 * Die Application-Schicht holt die nächste Sequenznummer vom Repository:
 * `const sequence = await befehlRepo.getNextSequenceNumber(einsatzId)`
 *
 * @example
 * ```typescript
 * const service = new BefehlNamingService()
 * const nummer = service.generateBefehlNummer(1)
 * console.log(nummer) // "B-001"
 * ```
 */
export class BefehlNamingService {
  /**
   * Generiert eine formatierte Befehlsnummer.
   *
   * @param sequenceNumber - Die Laufnummer innerhalb des Einsatzes (1-999+)
   * @returns Formatierte Befehlsnummer (z.B. "B-001")
   */
  public generateBefehlNummer(sequenceNumber: number): string {
    const paddedSequence = String(sequenceNumber).padStart(3, '0');
    return `B-${paddedSequence}`;
  }
}
