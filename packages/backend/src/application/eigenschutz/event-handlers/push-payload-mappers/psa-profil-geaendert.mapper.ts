import type { PsaProfil } from '@/generated/prisma/enums';
import type { PsaProfilGeaendertEvent, PsaProfilAktion } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { PushPayload } from '@domain/push-notifications/push-payload';

/**
 * Hardcoded deutsche Profil-Labels (Q4 PO-Default — i18n ist Phase 2).
 *
 * Typisiert als `Record<PsaProfil, string>`: Beim Hinzufügen eines neuen
 * `PsaProfil`-Enum-Werts schlägt der TS-Compiler an, solange der Mapper hier
 * nicht erweitert wird. Laufzeit-Fallback siehe {@link profilLabel}.
 */
const PROFIL_LABELS: Record<PsaProfil, string> = {
  BASIS: 'Basis',
  INFEKTION: 'Infektionsschutz',
  VU: 'VU',
  CBRN_PATIENT: 'CBRN-Patientenversorgung',
  VOLLSCHUTZ: 'Vollschutz',
};

/** Laufzeit-Fallback für unbekannte Profile (Type-Cast-Bypass / Forward-Compat). */
const UNKNOWN_PROFIL_LABEL = 'unbekanntes Profil';

/** UX-DR1 Headline-Cap (Story 3.3 AC1) — Konsistenz Banner ↔ Push, in UTF-8 Bytes. */
const TITLE_MAX_BYTES = 60;

/** UX-DR1 Body-Cap (Story 3.3 AC1) — Konsistenz Banner ↔ Push, in UTF-8 Bytes. */
const BODY_MAX_BYTES = 140;

/** Ellipsis-Zeichen U+2026 = 3 UTF-8 Bytes. */
const ELLIPSIS = '…';

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Trimmt einen String auf eine Byte-Cap (UTF-8). Multi-Byte-sicher: zählt
 * tatsächliche Bytes, nicht UTF-16-Code-Units. Hängt {@link ELLIPSIS} an,
 * wenn Trimmung nötig.
 */
function trimToCapBytes(text: string, capBytes: number): string {
  if (byteLength(text) <= capBytes) {
    return text;
  }
  const ellipsisBytes = byteLength(ELLIPSIS);
  if (capBytes <= ellipsisBytes) {
    return text.slice(0, Math.max(1, capBytes));
  }
  let cut = text.length;
  while (cut > 0 && byteLength(text.slice(0, cut)) > capBytes - ellipsisBytes) {
    cut -= 1;
  }
  return text.slice(0, cut) + ELLIPSIS;
}

function profilLabel(profil: PsaProfil): string {
  return PROFIL_LABELS[profil] ?? UNKNOWN_PROFIL_LABEL;
}

function aktionLabel(aktion: PsaProfilAktion): string {
  switch (aktion) {
    case 'AKTIVIERT':
      return 'aktiviert';
    case 'DEAKTIVIERT':
      return 'deaktiviert';
    default: {
      const _exhaustive: never = aktion;
      return String(_exhaustive);
    }
  }
}

/**
 * Mappt `PsaProfilGeaendertEvent` auf `PushPayload` (Story 3.8 AC4).
 *
 * **Konventionen:**
 * - `eventId` = `event.eventId` (Domain-Event-Base-Class) — IDENTISCH zur
 *   `eventId` im WS-Broadcast, damit Client-LRU dedupt (NFR-R3, AR §B7).
 * - `title` ≤ {@link TITLE_MAX_BYTES} Bytes (UTF-8).
 * - `body` ≤ {@link BODY_MAX_BYTES} Bytes — KEINE Begründung (DSGVO/Bandbreiten-
 *   Hygiene, identisch zum WS-Broadcast).
 * - `url` = Deep-Link auf den Einsatz-Eigenschutz-Tab der Einheit (relativer
 *   Same-Origin-Pfad; `sw.js` validiert Same-Origin vor Navigation). IDs
 *   werden via `encodeURIComponent` URL-safe encodiert.
 * - `data.priority = 'high'` — Client-Hinweis für Notification-Channel.
 *   KEIN `polite`-Push für PSA-Events (Q5: `'high'` auch bei DEAKTIVIERT).
 * - `data.einheitId` / `data.propagationGroupId` / `data.aktion` / `data.profil`
 *   — strukturierte Felder für Telemetrie-Korrelation (Story 3.11) und
 *   clientseitiges Routing. `einheitId` ist ohnehin Bestandteil der `url`
 *   (Deep-Link), darum kein zusätzlicher Privacy-Verlust durch Aufnahme in
 *   `data`. Bewusst KEINE `userId` / `begruendung` / `einsatzId` im `data` —
 *   `einsatzId` würde clientseitig korrelierbare Einsatz-Identität persistieren,
 *   `userId` und `begruendung` sind PII-relevant; spätere Stories können
 *   additiv erweitern.
 */
export function mapPsaProfilGeaendertToPushPayload(event: PsaProfilGeaendertEvent): PushPayload {
  const title = trimToCapBytes(`PSA-Profil ${profilLabel(event.profil)} ${aktionLabel(event.aktion)}`, TITLE_MAX_BYTES);
  const body = trimToCapBytes('Schutzstand der Einheit hat sich geändert. Tippen für Details.', BODY_MAX_BYTES);
  // PsaProfilGeaendertEvent-Constructor garantiert einheitId als Pflicht-Param.
  const url = `/app/einsatz/${encodeURIComponent(event.einsatzId)}/sicherheit/eigenschutz/einheit/${encodeURIComponent(event.einheitId!)}`;

  return {
    eventId: event.eventId,
    title,
    body,
    url,
    data: {
      priority: 'high',
      einheitId: event.einheitId,
      propagationGroupId: event.propagationGroupId,
      profil: event.profil,
      aktion: event.aktion,
    },
  };
}
