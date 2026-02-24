/**
 * ComplianceReport Entity — Dokumentation eines DSGVO-Anonymisierungslaufs.
 *
 * Wird automatisch pro anonymisiertem Einsatz erstellt und dient
 * als Audit-Trail für den Datenschutzbeauftragten.
 *
 * @remarks Story 5.5 AC2
 */
export interface ComplianceReport {
  id: string;
  einsatzId: string;
  einsatzName: string | null;
  beendetAm: Date | null;
  befehlCount: number;
  empfaengerCount: number;
  kommentarCount: number;
  aufbewahrungsfrist: number;
  anonymisiertAm: Date;
  reportData: Record<string, unknown> | null;
  createdAt: Date;
}
