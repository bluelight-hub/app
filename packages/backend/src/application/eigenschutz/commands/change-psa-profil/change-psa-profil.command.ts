import type { PsaProfil } from '@/generated/prisma/enums';

/**
 * Toggle-Anweisung pro PSA-Profil im `ChangePsaProfilCommand` (Story 3.1).
 *
 * `aktivieren = true` legt eine neue aktive `PsaProfilZuweisung`-Row an
 * (sofern keine bestehende existiert). `aktivieren = false` schließt die
 * aktuell aktive Row.
 *
 * `expectedVersion` ist Pflicht für Schließ-Pfade (Deaktivierung) — der
 * Handler prüft die Version des Aggregates und der Repository sichert
 * den Lost-Update-Schutz auf DB-Ebene via
 * `updateMany WHERE version = expectedVersion` (Story 2.3 Pattern).
 *
 * Für reine Aktivierungen ohne Vor-Profil ist `expectedVersion` irrelevant
 * und wird ignoriert; das Repository prüft per Application-Guard, dass
 * keine Doppelaktivierung passiert (AC8).
 */
export interface PsaProfilToggle {
  profil: PsaProfil;
  aktivieren: boolean;
  expectedVersion?: number;
}

/**
 * Command zum Aktivieren/Deaktivieren eines oder mehrerer PSA-Profile
 * an einer oder mehreren `EinsatzEinheit`s (Story 3.1 + Story 3.2 Bulk).
 *
 * **Scope:** `einheitIds.length >= 1`. Single-Select (Story 3.1) und
 * Bulk-Multi-Select (Story 3.2, bis 50 Einheiten) teilen sich dasselbe
 * Command-Shape. Der Handler iteriert äußerlich über die Einheiten und
 * innen über die Toggles; die TX umschließt alle Mutationen atomar — bei
 * jedem Teil-Konflikt wird die gesamte Bulk-Operation zurückgerollt.
 *
 * **`propagationGroupId`:** wird vom Handler **einmal** pro Bulk-Operation
 * erzeugt (CUID2) und an **alle** resultierenden Domain-Events über alle
 * Einheiten × alle Toggles gehängt — gemeinsame Klammer für die
 * `SeverityBanner`-Gruppierung in Story 3.3.
 */
export class ChangePsaProfilCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly einheitIds: string[],
    public readonly profilToggles: PsaProfilToggle[],
    public readonly begruendung: string,
    public readonly callerUserId: string,
  ) {}
}

/**
 * Erfolgs-Payload des Handlers. Trägt die `propagationGroupId` der
 * Operation, damit das Controller-Response-DTO sie an das Frontend
 * weitergeben und die Telemetrie-Queue (Story 3.11) sie konsumieren kann.
 */
export interface ChangePsaProfilResult {
  propagationGroupId: string;
  affectedZuweisungen: Array<{
    einheitId: string;
    profil: PsaProfil;
    aktion: 'AKTIVIERT' | 'DEAKTIVIERT';
    zuweisungId: string;
    version: number;
  }>;
}
