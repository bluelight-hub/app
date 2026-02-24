import { createHash } from 'node:crypto';

/**
 * Generiert einen irreversiblen 6-Zeichen-Hash aus einem Namen mit Salt.
 *
 * Der Salt wird pro Einsatz generiert und NICHT gespeichert.
 * Innerhalb eines Einsatzes: gleicher Name → gleicher Hash (Konsistenz).
 * Ueber Einsaetze hinweg: verschiedener Salt → verschiedener Hash (keine Verkettung).
 *
 * @remarks Story 5.5 AC2 — Echte DSGVO-Anonymisierung (nicht Pseudonymisierung)
 */
export function anonymisiereString(name: string, salt: string): string {
  const hash = createHash('sha256')
    .update(name + salt)
    .digest('hex')
    .substring(0, 6);
  return `[ANON-${hash}]`;
}
