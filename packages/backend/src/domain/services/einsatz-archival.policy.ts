import type { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { EinsatzStatus } from '@domain/value-objects/einsatz-status';

/**
 * Domain Policy für die Archivierung und Aufbewahrung von Einsätzen (DRK-Standard).
 *
 * **Business Rules:**
 * - **Archivierung:** Ein Einsatz kann archiviert werden wenn Status ABGESCHLOSSEN ist
 * - **Aufbewahrung:** Archivierte Einsätze müssen 10 Jahre im Archiv bleiben (Löschschutz)
 * - **Löschung:** Nach 10 Jahren im Archiv kann ein Einsatz gelöscht werden
 *
 * **WICHTIG: Die 10-Jahres-Frist gilt für die Aufbewahrung IM ARCHIV, nicht als
 * Wartezeit vor der Archivierung!**
 *
 * **Warum 10-Jahres-Aufbewahrung im Archiv?**
 * - DRK Compliance: Einsatzdaten müssen 10 Jahre aufbewahrt werden
 * - DSGVO Art. 17: "Recht auf Vergessenwerden" gilt erst nach Aufbewahrungsfrist
 * - Statistische Auswertung: Langfristige Einsatztrends analysieren
 * - Rechtssicherheit: Einsatzdokumentation für Versicherungsfälle
 *
 * **Lifecycle:**
 * ```
 * ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT (10 Jahre) → löschbar
 * ```
 *
 * @example
 * ```typescript
 * const policy = new EinsatzArchivalPolicy();
 *
 * // Archivierung prüfen (sofort nach Abschluss möglich)
 * if (policy.canBeArchived(einsatz)) {
 *   einsatz.archive(userId);
 * }
 *
 * // Löschung prüfen (erst nach 10 Jahren im Archiv)
 * if (policy.canBeDeleted(einsatz, new Date())) {
 *   await einsatzRepo.delete(einsatz);
 * }
 * ```
 */
export class EinsatzArchivalPolicy {
  /**
   * DRK Standard: Aufbewahrungsfrist für archivierte Einsatzdaten in Jahren.
   *
   * **Warum Konstante?**
   * - Zentrale Definition verhindert Magic Numbers
   * - Einfache Anpassung bei Änderung der Richtlinie
   * - Dokumentiert den Ursprung der Zahl (DRK Standard)
   */
  private static readonly RETENTION_YEARS = 10;

  /**
   * Prüft, ob ein Einsatz archiviert werden darf.
   *
   * **Validierungslogik:**
   * - Status muss ABGESCHLOSSEN sein (nicht ANGELEGT, IN_BEARBEITUNG, oder bereits ARCHIVIERT)
   *
   * **WICHTIG:** Die 10-Jahres-Frist gilt für die Aufbewahrung IM ARCHIV,
   * nicht als Wartezeit vor der Archivierung! Ein abgeschlossener Einsatz
   * kann sofort archiviert werden.
   *
   * @param einsatz - Der zu prüfende Einsatz
   * @returns true wenn archivierbar, false wenn nicht
   *
   * @example
   * ```typescript
   * const policy = new EinsatzArchivalPolicy();
   * const einsatz = createAbgeschlossenerEinsatz();
   *
   * const canArchive = policy.canBeArchived(einsatz);
   * console.log(canArchive); // true - sofort archivierbar
   * ```
   */
  public canBeArchived(einsatz: Einsatz): boolean {
    // Check status: must be ABGESCHLOSSEN (not ANGELEGT, IN_BEARBEITUNG, or already ARCHIVIERT)
    return einsatz.status.equals(EinsatzStatus.ABGESCHLOSSEN());
  }

  /**
   * Prüft, ob ein archivierter Einsatz gelöscht werden darf (10-Jahres-Frist abgelaufen).
   *
   * **Validierungslogik:**
   * - Status muss ARCHIVIERT sein
   * - `archivedAt` muss mindestens 10 Jahre vor currentDate liegen
   * - Präzise Datumsberechnung (berücksichtigt Schaltjahre)
   *
   * **Warum currentDate als Parameter?**
   * - Deterministische Tests (mockbare Zeit)
   * - Batch-Jobs können festes Datum übergeben (z.B. Monatsende)
   * - NO `new Date()` in Domain Layer (Side Effects vermeiden)
   *
   * @param einsatz - Der zu prüfende Einsatz
   * @param currentDate - Das aktuelle Datum (für deterministische Tests)
   * @returns true wenn löschbar (10 Jahre im Archiv), false wenn nicht
   *
   * @example
   * ```typescript
   * const policy = new EinsatzArchivalPolicy();
   * const now = new Date('2034-11-17');
   * const einsatz = createArchiviertAt(new Date('2024-11-17')); // 10 Jahre im Archiv
   *
   * const canDelete = policy.canBeDeleted(einsatz, now);
   * console.log(canDelete); // true
   * ```
   */
  public canBeDeleted(einsatz: Einsatz, currentDate: Date): boolean {
    // Check status: must be ARCHIVIERT
    if (!einsatz.status.equals(EinsatzStatus.ARCHIVIERT())) {
      return false;
    }

    // Check archivedAt exists
    if (!einsatz.archivedAt) {
      return false;
    }

    // Calculate deletion date (archivedAt + 10 years)
    const deletionDate = this.getDeletionDate(einsatz);

    // Compare: currentDate must be >= deletionDate
    return currentDate >= deletionDate;
  }

  /**
   * Berechnet das Datum, ab dem ein archivierter Einsatz gelöscht werden darf
   * (10 Jahre nach Archivierung).
   *
   * **Berechnung:**
   * - Nimmt `archivedAt` als Basis
   * - Addiert genau 10 Jahre (berücksichtigt Schaltjahre automatisch via setFullYear)
   * - Gibt neues Date-Objekt zurück (immutable, kein Side Effect)
   *
   * @param einsatz - Der Einsatz, für den die Löschfrist berechnet wird
   * @returns Datum, ab dem Einsatz gelöscht werden darf (archivedAt + 10 Jahre)
   * @throws Error wenn Einsatz nicht archiviert ist (archivedAt fehlt)
   *
   * @example
   * ```typescript
   * const policy = new EinsatzArchivalPolicy();
   * const einsatz = createArchiviertAt(new Date('2024-11-17'));
   *
   * const deletionDate = policy.getDeletionDate(einsatz);
   * console.log(deletionDate.toISOString()); // "2034-11-17T..."
   * ```
   */
  public getDeletionDate(einsatz: Einsatz): Date {
    // Check archivedAt exists
    if (!einsatz.archivedAt) {
      throw new Error('Einsatz ist nicht archiviert - archivedAt fehlt');
    }

    // Create new Date (copy to avoid mutation)
    const deletionDate = new Date(einsatz.archivedAt);

    // Add RETENTION_YEARS (setFullYear handles leap years automatically)
    deletionDate.setFullYear(deletionDate.getFullYear() + EinsatzArchivalPolicy.RETENTION_YEARS);

    return deletionDate;
  }
}
