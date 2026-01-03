/**
 * HiOrg-Server Port - Framework-agnostic HiOrg-Server API Interface.
 *
 * Dieser Port ermöglicht die Integration mit der HiOrg-Server REST API
 * im Application Layer ohne direkte HTTP-Client-Abhängigkeiten.
 *
 * **Clean Architecture:**
 * - Domain/Application Layer hängen von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert diesen Port mit HTTP-Client
 * - Ermöglicht einfaches Testen (Mock API) und Framework-Unabhängigkeit
 *
 * **HiOrg-Server API:**
 * - Base URL: https://api.hiorg-server.de/core/v1
 * - Format: JSON:API (application/vnd.api+json)
 * - OAuth2 Bearer Token Authentifizierung
 *
 * @module domain/ports
 * @see HiOrgServerAdapter - Infrastructure Adapter für HTTP-Client
 */

import type { Result } from '@domain/common/result';

/**
 * Verbindungsinformationen nach erfolgreichem Connection Test.
 */
export interface HiOrgConnectionInfo {
  /** Name der Organisation (aus API-Response) */
  organisationName: string;
  /** Zeitpunkt des erfolgreichen Tests */
  testedAt: Date;
}

/**
 * Optionen für den Personen-Abruf.
 */
export interface HiOrgFetchOptions {
  /** Nur Personen die nach diesem Datum geändert wurden (inkrementeller Sync) */
  updatedSince?: Date;
  /** Filter nach Status (aktiv, eingeschraenkt, gesperrt, extern) */
  status?: ('aktiv' | 'eingeschraenkt' | 'gesperrt' | 'extern')[];
}

/**
 * Qualifikation einer Person aus HiOrg-Server.
 *
 * Qualifikationen sind hierarchisch (Position = Rang).
 */
export interface HiOrgQualifikation {
  /** Hierarchie-Stufe (niedrigere Zahl = höherer Rang) */
  position: number;
  /** HiOrg-interne Listen-ID */
  liste_id: number;
  /** Rang-Bezeichnung (z.B. "Leitender Notarzt") */
  rang?: string;
  /** Vollständiger Name der Qualifikation */
  name: string;
  /** Kurzbezeichnung (z.B. "LNA") */
  name_kurz?: string;
  /** Datum des Erwerbs */
  erwerb_datum?: string;
}

/**
 * Ausbildung einer Person aus HiOrg-Server.
 *
 * Ausbildungen sind einzelne Lehrgänge mit Ablaufdatum.
 */
export interface HiOrgAusbildung {
  /** HiOrg-interne ID */
  id: string;
  /** Bezeichnung der Ausbildung (z.B. "Erste Hilfe Kurs") */
  bezeichnung: string;
  /** Datum der Ausbildung */
  datum?: string;
  /** Ablaufdatum (z.B. für Auffrischungskurse) */
  gueltig_bis?: string;
  /** Lehrgangsnummer */
  lehrgangsnummer?: string;
}

/**
 * Person aus HiOrg-Server (DTO für Import).
 *
 * Enthält alle relevanten Daten für den Import in Bluelight Hub.
 */
export interface HiOrgPersonDto {
  /** Eindeutiger Benutzername in HiOrg (primärer Identifier für Duplikatserkennung) */
  username: string;
  /** Mitgliedsnummer (alternativer Identifier) */
  mitgliednr?: string;
  /** Vorname */
  vorname: string;
  /** Nachname */
  nachname: string;
  /** E-Mail-Adresse */
  email?: string;
  /** Mobiltelefonnummer */
  handy?: string;
  /** Private Telefonnummer */
  telpriv?: string;
  /** Dienstliche Telefonnummer */
  teldienst?: string;
  /** Zugehörige Gruppennamen */
  gruppen_namen: string[];
  /** Qualifikationen (hierarchisches System) */
  qualifikationen: HiOrgQualifikation[];
  /** Ausbildungen (einzelne Lehrgänge) */
  ausbildungen: HiOrgAusbildung[];
}

/**
 * Framework-agnostisches HiOrg-Server API Interface.
 *
 * Verwendet von Application Layer Handlers für HiOrg-Server Integration.
 * Die Organisation wird automatisch anhand des OAuth2-Tokens bestimmt.
 */
export interface IHiOrgServerPort {
  /**
   * Testet die Verbindung zum HiOrg-Server.
   *
   * Ruft den Organisations-Stammdaten-Endpoint auf und validiert die Credentials.
   * Die Organisation wird anhand des Tokens automatisch ermittelt.
   *
   * @param token - OAuth2 Bearer Token (Klartext)
   * @returns Result mit Verbindungsinformationen bei Erfolg
   *
   * **Mögliche Fehler:**
   * - INTEGRATION_002: Verbindung fehlgeschlagen (Netzwerk)
   * - INTEGRATION_003: Token ungültig (401)
   * - INTEGRATION_004: Feature gesperrt/nicht lizenziert (423)
   */
  testConnection(token: string): Promise<Result<HiOrgConnectionInfo>>;

  /**
   * Lädt Personen aus HiOrg-Server.
   *
   * Unterstützt inkrementellen Sync via `updatedSince` Filter.
   * Die Organisation wird anhand des Tokens automatisch ermittelt.
   *
   * @param token - OAuth2 Bearer Token (Klartext)
   * @param options - Optionale Filter (updatedSince, status)
   * @returns Result mit Liste der Personen bei Erfolg
   *
   * **Mögliche Fehler:**
   * - INTEGRATION_002: Verbindung fehlgeschlagen (Netzwerk)
   * - INTEGRATION_003: Token ungültig (401)
   * - INTEGRATION_004: Feature gesperrt/nicht lizenziert (423)
   * - INTEGRATION_005: Rate Limit überschritten
   */
  fetchPersons(token: string, options?: HiOrgFetchOptions): Promise<Result<HiOrgPersonDto[]>>;
}
