/**
 * Utility zum Aufbauen einer Baumstruktur aus der flachen Einheiten-Liste.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Transformiert die flache API-Antwort (EinsatzEinheitDto[]) in eine
 * hierarchische Baumstruktur für die Darstellung als Organigramm.
 */

import type { EinsatzEinheitDto } from '@bluelight-hub/shared/client';

/**
 * Baum-Knoten für eine taktische Einheit.
 *
 * Erweitert alle Felder von EinsatzEinheitDto um eine children-Liste
 * für die rekursive Darstellung.
 */
export interface EinheitTreeNode {
  /** Eindeutige ID der EinsatzEinheit (CUID2) */
  id: string;
  /** Einsatz-ID zu dem diese Einheit gehört */
  einsatzId: string;
  /** Name der Einheit */
  name: string;
  /** Typ der taktischen Einheit (TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT) */
  typ: string;
  /** Funktion/Aufgabe der Einheit */
  funktion: object | null;
  /** Aktueller Status der Einheit */
  status: string;
  /** Übergeordnete Einheit-ID, null für Root-Einheiten */
  parentId: object | null;
  /** EinsatzPerson-ID des Einheitenführers */
  einheitenfuehrerId: object | null;
  /** Name des Einheitenführers (Vorname Nachname) */
  einheitenfuehrerName: string | null;
  /** Soll-Stärke (geplante Personenanzahl) */
  sollStaerke: number;
  /** Ist-Stärke (tatsächlich zugewiesene Personen) */
  istStaerke: number;
  /** Aktueller Auftrag der Einheit */
  auftrag: object | null;
  /** Einsatzort der Einheit */
  einsatzort: object | null;
  /** Erstellungszeitpunkt (ISO 8601) */
  createdAt: string;
  /** Letzte Aktualisierung (ISO 8601) */
  updatedAt: string;
  /** Untergeordnete Einheiten */
  children: EinheitTreeNode[];
}

/**
 * Baut eine Baumstruktur aus der flachen Einheiten-Liste auf.
 *
 * Verwendet einen O(n) Algorithmus:
 * 1. Erstelle eine Map aller Einheiten (id → TreeNode)
 * 2. Iteriere einmal durch alle Einheiten und hänge sie an ihre Eltern
 * 3. Gib die Root-Knoten zurück (parentId === null/undefined)
 *
 * @param flatList - Flache Liste der Einheiten aus der API
 * @returns Array der Root-Knoten mit verschachtelten Children
 *
 * @example
 * ```tsx
 * const { data: einheiten } = useEinsatzEinheiten(einsatzId);
 * const tree = buildEinheitenTree(einheiten ?? []);
 * ```
 */
export function buildEinheitenTree(flatList: EinsatzEinheitDto[]): EinheitTreeNode[] {
  // Map für schnellen Zugriff: id → TreeNode
  const nodeMap = new Map<string, EinheitTreeNode>();

  // Phase 1: Alle Knoten erstellen
  for (const item of flatList) {
    nodeMap.set(item.id, {
      id: item.id,
      einsatzId: item.einsatzId,
      name: item.name,
      typ: item.typ,
      funktion: item.funktion ?? null,
      status: item.status,
      parentId: item.parentId ?? null,
      einheitenfuehrerId: item.einheitenfuehrerId ?? null,
      einheitenfuehrerName: ((item as Record<string, unknown>).einheitenfuehrerName as string | null) ?? null,
      sollStaerke: item.sollStaerke,
      istStaerke: item.istStaerke,
      auftrag: item.auftrag ?? null,
      einsatzort: item.einsatzort ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      children: [],
    });
  }

  // Phase 2: Kinder an Eltern hängen, Root-Knoten sammeln
  const roots: EinheitTreeNode[] = [];

  for (const item of flatList) {
    const node = nodeMap.get(item.id)!;
    const parentId = item.parentId as string | null | undefined;

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
