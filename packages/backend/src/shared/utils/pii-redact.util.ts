import { createHash } from 'node:crypto';

/**
 * Redaktion für personenbeziehbare Identifier in Log-Aggregationen
 * (ELK/Datadog/Loki) — DSGVO-konforme Minimierung im Audit-Trail.
 *
 * **Wahl: gehashte Short-ID (SHA-256, 12 Zeichen hex)** — statt IDs
 * wegzulassen, bleiben sie **korrelierbar** (z. B. „alle Events dieses
 * redigierten Users anzeigen"), ohne direkt auf die Klartext-ID rückführbar
 * zu sein. Wer den Klartext-Wert kennt, kann hashen und vergleichen; reverse
 * Lookup aus dem Log ist aber nicht möglich.
 *
 * **12 Zeichen:** 48 bit Kollisions-Raum ≈ 2²⁴ Erwartungswert für Kollision.
 * Bei < 100 000 aktiven Einsätzen / Nutzern praktisch kollisionsfrei. Wer
 * mehr braucht, kann die Länge per Argument hochschrauben.
 *
 * Das Feld-Prefix `r:` macht redigierte IDs in Log-Tools sofort als redigiert
 * erkennbar (keine Verwechslung mit Klartext-CUIDs möglich).
 */
export function redactId(id: string | null | undefined, length = 12): string | undefined {
  if (id === null || id === undefined || id === '') return undefined;
  const hash = createHash('sha256').update(id).digest('hex');
  return `r:${hash.slice(0, length)}`;
}
