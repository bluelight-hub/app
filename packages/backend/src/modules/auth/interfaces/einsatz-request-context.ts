/**
 * Einsatz-spezifischer Request-Kontext, den `EinsatzScopeGuard` nach
 * erfolgreichem Membership-Check an den Express-Request hängt (Story 1.3 AC1/AC2).
 *
 * **Lesepfad (Controller):**
 * ```typescript
 * const { einsatzPermissions } = req.einsatzContext!;
 * ```
 *
 * **Warum `?`-optional im Declaration-Merging?** Routen ohne `EinsatzScopeGuard`
 * sollen keinen Typfehler provozieren — dort bleibt `einsatzContext` `undefined`.
 *
 * **Warum NICHT im ValidatedUser / JWT-Payload?** AC2 hält den JWT klein und
 * isoliert einsatz-bezogene Permissions pro Request. Der Scope-Guard ist die
 * einzige Stelle, die diese Werte populates — alles andere ist Read-Only.
 */
export interface EinsatzRequestContext {
  /** Der im Request bestätigte, zugehörige Einsatz (aus Pfad-Parameter). */
  einsatzId: string;
  /**
   * Globale User-Permissions aus `User.permissions` (JSON-Array, robust geparsed).
   * Leer bei null / ungültigem JSON / Nicht-Array-JSON.
   */
  einsatzPermissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Gesetzt durch `EinsatzScopeGuard`, wenn der Guard den Request freigibt.
       * Für andere Routen (ohne Guard) `undefined`.
       */
      einsatzContext?: EinsatzRequestContext;
    }
  }
}

// Notwendig, damit TypeScript die Datei als Modul behandelt und das
// `declare global`-Augmentation greift.
