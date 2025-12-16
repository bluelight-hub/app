/**
 * Query zum Abrufen aller RollenDefinitionen mit optionaler Filterung.
 *
 * Diese Query lädt alle Rollen-Definitionen aus dem System.
 * Optionaler Filter ermöglicht Filterung nach Aktivitätsstatus (istAktiv).
 *
 * **Warum Query Pattern:**
 * - CQRS: Trennung von Read (Query) und Write (Command)
 * - Explizite Intent: GetAllRollenDefinitionenQuery ≠ generic "fetch data"
 * - Testbarkeit: Query-Objekte können isoliert validiert werden
 *
 * **Unterschied zu Commands:**
 * - Commands ändern State (CreateRollenDefinitionCommand)
 * - Queries lesen State (GetAllRollenDefinitionenQuery)
 * - Commands haben Business-Validierung, Queries nur Input-Validierung
 */
export class GetAllRollenDefinitionenQuery {
  /**
   * Erstellt eine Query zum Abrufen aller RollenDefinitionen.
   *
   * **Filter-Optionen:**
   * - Wenn filter undefined: Alle RollenDefinitionen werden zurückgegeben
   * - Wenn filter.istAktiv = true: Nur aktive Rollen
   * - Wenn filter.istAktiv = false: Nur inaktive Rollen
   *
   * @param filter - Optionale Filter-Kriterien (z.B. istAktiv)
   *
   * @example
   * ```typescript
   * // Alle RollenDefinitionen (aktiv + inaktiv)
   * const query1 = new GetAllRollenDefinitionenQuery();
   * // → Gibt alle Rollen zurück
   *
   * // Nur aktive Rollen (für Dropdown-Selects)
   * const query2 = new GetAllRollenDefinitionenQuery({ istAktiv: true });
   * // → Gibt nur aktive Rollen zurück
   *
   * // Nur inaktive Rollen (für Admin-Archive)
   * const query3 = new GetAllRollenDefinitionenQuery({ istAktiv: false });
   * // → Gibt nur inaktive Rollen zurück
   * ```
   */
  constructor(public readonly filter?: { istAktiv?: boolean }) {}
}
