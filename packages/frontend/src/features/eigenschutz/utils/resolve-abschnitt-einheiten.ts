import type { EinsatzEinheitDto } from '@bluelight-hub/shared/client';

/**
 * Cap für die ans Backend übermittelte `einheitIds`-Liste (Story 5.3, AC4).
 *
 * Wenn die Resolution > `MAX_EINHEIT_IDS` Einheiten ergibt (z. B. 5 Abschnitte
 * mit jeweils 15 Untereinheiten = 75), wird das Result auf die ersten
 * `MAX_EINHEIT_IDS` (Hierarchie-Stable-Sort, deterministische CUID-aufsteigend
 * bei Tie-Break) gekürzt und `truncated` auf `true` gesetzt. Damit erreichen
 * wir niemals den Backend-`EINHEIT_IDS_CAP`-400 (Defense-in-depth gegen
 * Silent-400 vom Server).
 */
export const MAX_EINHEIT_IDS = 50 as const;

/**
 * Maximale Tiefe für den `parentId`-Walk. Schützt gegen versehentliche Zykel
 * im Hierarchie-Datenmodell (parent verweist zurück auf einen Vorfahren).
 * MVP: ABSCHNITT → ZUG → GRUPPE → STAFFEL/TRUPP, also Tiefe ≤ 3.
 */
export const RESOLVE_DEPTH_CAP = 3 as const;

export interface ResolvedAbschnittEinheiten {
  readonly einheitIds: ReadonlyArray<string>; // ≤ MAX_EINHEIT_IDS
  readonly truncated: boolean; // true wenn echte Untermenge geliefert wurde
  /**
   * Anzahl der Einheiten, die wegen `MAX_EINHEIT_IDS` aus dem Result fielen.
   * `truncated === false` ⇒ `droppedCount === 0`. Wird vom Filter-Bar-Hint
   * genutzt: „N weitere Einheiten ignoriert (Backend-Cap 50)".
   */
  readonly droppedCount: number;
}

/**
 * Expandiert eine Auswahl von Abschnitt-Einheiten zu allen direkten und
 * transitiven Untereinheiten (Story 5.3, AC4).
 *
 * Verfahren:
 * 1. Für jede `abschnittId` in der Eingabe: `abschnittId` selbst ist eine
 *    `EinsatzEinheit` mit `typ === 'ABSCHNITT'`.
 * 2. Rekursiver `parentId`-Walk: alle Einheiten finden, deren `parentId`
 *    direkt oder transitiv = `abschnittId`. Tiefen-Cap = `RESOLVE_DEPTH_CAP`.
 * 3. Result = Set aus `abschnittId` selbst + allen Untereinheiten,
 *    dedupliziert.
 * 4. Bei leerem `abschnittIds`-Input: Result = `[]`.
 * 5. Bei > `MAX_EINHEIT_IDS` Einheiten: stable-sort + Trunkierung +
 *    `truncated: true`.
 */
export function resolveAbschnittToEinheitIds(abschnittIds: ReadonlyArray<string>, alleEinheiten: ReadonlyArray<EinsatzEinheitDto>): ResolvedAbschnittEinheiten {
  if (abschnittIds.length === 0) {
    return { einheitIds: [], truncated: false, droppedCount: 0 };
  }

  const byParentId = new Map<string, EinsatzEinheitDto[]>();
  for (const einheit of alleEinheiten) {
    const parentId = typeof einheit.parentId === 'string' ? einheit.parentId : null;
    if (!parentId) continue;
    const bucket = byParentId.get(parentId);
    if (bucket) {
      bucket.push(einheit);
    } else {
      byParentId.set(parentId, [einheit]);
    }
  }

  const result = new Set<string>();
  for (const abschnittId of abschnittIds) {
    if (result.has(abschnittId)) continue;
    result.add(abschnittId);
    expandRecursive(abschnittId, byParentId, result, RESOLVE_DEPTH_CAP);
  }

  // Stable-Sort: deterministische Reihenfolge für Truncation. CUIDs aufsteigend
  // sortieren — kein semantischer Sortierschlüssel ist „richtiger" als ein
  // anderer, aber er muss deterministisch sein, damit die UI-Anzeige
  // („Abschnitt: A, B") und die Truncation-Auswahl übereinstimmen.
  const sorted = Array.from(result).sort();

  if (sorted.length > MAX_EINHEIT_IDS) {
    return { einheitIds: sorted.slice(0, MAX_EINHEIT_IDS), truncated: true, droppedCount: sorted.length - MAX_EINHEIT_IDS };
  }
  return { einheitIds: sorted, truncated: false, droppedCount: 0 };
}

function expandRecursive(parentId: string, byParentId: Map<string, EinsatzEinheitDto[]>, result: Set<string>, remainingDepth: number): void {
  if (remainingDepth <= 0) return;
  const children = byParentId.get(parentId);
  if (!children) return;
  for (const child of children) {
    if (result.has(child.id)) continue; // Zykel-Defense
    result.add(child.id);
    expandRecursive(child.id, byParentId, result, remainingDepth - 1);
  }
}
