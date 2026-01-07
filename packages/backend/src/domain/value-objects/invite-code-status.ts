/**
 * Status-Enum für InviteCodes.
 *
 * Repräsentiert den berechneten Zustand eines InviteCodes basierend auf
 * seinen Eigenschaften (isRevoked, expiresAt, usedCount, maxUses).
 *
 * **Prioritätsreihenfolge bei der Berechnung:**
 * 1. REVOKED - Manuell widerrufen (höchste Priorität)
 * 2. EXPIRED - Ablaufdatum überschritten
 * 3. USED - Maximale Nutzungen erreicht
 * 4. ACTIVE - Code ist noch verwendbar
 *
 * @example
 * ```typescript
 * const status = inviteCode.computeStatus();
 * if (status === InviteCodeStatus.ACTIVE) {
 *   // Code kann noch verwendet werden
 * }
 * ```
 */
export enum InviteCodeStatus {
  /** Code ist aktiv und kann verwendet werden */
  ACTIVE = 'active',
  /** Code wurde vollständig aufgebraucht (usedCount >= maxUses) */
  USED = 'used',
  /** Code ist abgelaufen (expiresAt <= now) */
  EXPIRED = 'expired',
  /** Code wurde manuell widerrufen */
  REVOKED = 'revoked',
}
