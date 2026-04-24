/**
 * Formatter für die Zusammenfassung geänderter Felder einer Gefährdungs-
 * beurteilungs-Version (Story 415-2-4, Task 10, AC3).
 *
 * Das Shape des `changedFields`-Objekts entspricht dem Backend-Output aus
 * Story 2.3 (Gefährdungsbeurteilung-Versionierung). Für Version V1 liefert
 * das Backend `{ created: true }` — alle anderen Versionen enthalten einen
 * Diff gegenüber der Vorversion:
 *
 * ```ts
 * {
 *   added: string[];                                   // neue Gefährdungs-IDs
 *   removed: string[];                                 // entfernte Gefährdungs-IDs
 *   updated: Array<{ id: string; fields: string[] }>;  // geänderte Felder pro ID
 *   unchanged: number;                                 // Anzahl unveränderter Einträge
 * }
 * ```
 *
 * Die Ausgabe-Reihenfolge ist fix: `added`, `removed`, `updated`. Leere
 * Bereiche werden übersprungen; wenn keine Änderungen vorliegen, geben wir
 * `'Keine Änderung'` zurück.
 */
export function formatChangedFieldsSummary(changedFields: Record<string, unknown>): string {
  if (changedFields.created === true) return 'Angelegt';
  const added = Array.isArray(changedFields.added) ? changedFields.added.length : 0;
  const removed = Array.isArray(changedFields.removed) ? changedFields.removed.length : 0;
  const updated = Array.isArray(changedFields.updated) ? changedFields.updated.length : 0;
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} ${added === 1 ? 'Gefährdung' : 'Gefährdungen'} hinzugefügt`);
  if (removed > 0) parts.push(`${removed} ${removed === 1 ? 'Gefährdung' : 'Gefährdungen'} entfernt`);
  if (updated > 0) parts.push(`${updated} ${updated === 1 ? 'Gefährdung' : 'Gefährdungen'} geändert`);
  return parts.length === 0 ? 'Keine Änderung' : parts.join(', ');
}
