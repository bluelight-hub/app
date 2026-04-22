/**
 * Präfix, der von `EigenschutzRolleGuard` vor die Short-Form-Rollen-Namen
 * gesetzt wird, um gegen `EinsatzRollenbesetzung.rollenName` zu matchen.
 *
 * **Single-Source-of-Truth:** Nirgends im Code darf `'Eigenschutz: '` oder
 * `13` (= Präfix-Länge) hartkodiert werden — immer diese Konstante bzw.
 * `EIGENSCHUTZ_ROLE_PREFIX.length` verwenden (Q4-Revision, AC7).
 */
export const EIGENSCHUTZ_ROLE_PREFIX = 'Eigenschutz: ' as const;

/**
 * Short-Form-Union der vier Eigenschutz-Rollen (Q4-Revision: **kein** Prisma-Enum,
 * rein TypeScript — `EinsatzRollenbesetzung.rollenName` bleibt ein freier String
 * und trägt diese Werte mit dem `Eigenschutz: `-Präfix als Snapshot).
 *
 * **Wichtig:** Der Decorator `@RequiresEigenschutzRolle(...)` erwartet diese
 * Short-Form **ohne** Präfix — der Guard prepended `Eigenschutz: ` intern.
 *
 * @see EIGENSCHUTZ_ROLE_PREFIX
 * @see ALL_EIGENSCHUTZ_ROLLEN für Laufzeit-Iteration
 */
export type EigenschutzRolle = 'Sicherheitsbeauftragter' | 'Abschnittsleiter' | 'Einheitsführer' | 'Nachbereitung';

/**
 * Laufzeit-iterierbare Liste aller Eigenschutz-Rollen (Short-Form).
 * Reihenfolge entspricht der Rollen-Hierarchie im Seed (Story 1.4,
 * `prisma/seed.ts:248-289`).
 */
export const ALL_EIGENSCHUTZ_ROLLEN: readonly EigenschutzRolle[] = ['Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung'] as const;
