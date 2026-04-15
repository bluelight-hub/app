import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import type { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';

/**
 * Polymorphe Kraft-Referenz: entweder Fahrzeug, Person oder Einheit.
 *
 * Die Variante wird durch `kind` diskriminiert. Persistenz nutzt drei nullable
 * Foreign Keys + Check-Constraint (siehe Migration), Domain arbeitet mit der
 * Discriminated Union.
 */
export type FunkkanalZuordnungKraftRef =
  | { readonly kind: 'fahrzeug'; readonly fahrzeugId: string }
  | { readonly kind: 'person'; readonly personId: string }
  | { readonly kind: 'einheit'; readonly einheitId: string };

/**
 * Rolle einer Kraft auf einem Funkkanal.
 * - `primaer`  — Kraft hört aktiv und sendet auf dem Kanal
 * - `sekundaer` — Kraft hört zusätzlich zu einem Primärkanal mit
 * - `zuhoeren` — reines Mithören, kein aktives Senden vorgesehen
 */
export type FunkkanalRolle = 'primaer' | 'sekundaer' | 'zuhoeren';

export const FUNKKANAL_ROLLEN: readonly FunkkanalRolle[] = ['primaer', 'sekundaer', 'zuhoeren'];

/**
 * Child-Entity des Funkkanal-Aggregats: verbindet eine Kraft (Fahrzeug / Person
 * / Einheit) mit einem Funkkanal und trägt deren Rolle.
 *
 * `rufnameSnapshot` friert den Rufnamen zum Zeitpunkt der Zuordnung ein, damit
 * Exporte auch dann aussagekräftig bleiben, wenn sich der Rufname später ändert.
 */
export class FunkkanalZuordnung {
  constructor(
    public readonly id: FunkkanalZuordnungId,
    public readonly kanalId: FunkkanalId,
    public readonly kraftRef: FunkkanalZuordnungKraftRef,
    public readonly rufnameSnapshot: string,
    public rolle: FunkkanalRolle,
    public readonly createdAt: Date,
    public readonly createdBy?: string,
  ) {}

  /**
   * Ändert die Rolle der Zuordnung. Kein eigenes Event — das Aggregat
   * emittiert `FunkkanalGeaendert` bzw. `FunkkanalZuordnungErstellt/Entfernt`.
   */
  public changeRolle(rolle: FunkkanalRolle): void {
    this.rolle = rolle;
  }
}
