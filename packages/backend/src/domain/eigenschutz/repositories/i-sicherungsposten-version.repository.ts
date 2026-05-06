import type { Result } from '@domain/common/result';

/**
 * Infrastructure-naher Row-Typ einer Sicherungsposten-Versions-Zeile.
 *
 * Spiegelt die Spalten von `sicherungsposten_versionen`. Der `payload` ist das
 * vollständige JSONB-Snapshot der Top-Level-Felder zum Versionierungs-Zeitpunkt.
 */
export interface SicherungspostenVersionReadModel {
  postenId: string;
  version: number;
  payload: Record<string, unknown>;
  gueltigVon: Date;
  gueltigBis: Date | null;
  changedByUserId: string;
  eventId: string | null;
}

/**
 * Port für die Versions-Chain (`sicherungsposten_versionen`). Story 4.1
 * benötigt nur die History-Read-Methode — die Schreib-Methoden sind im
 * Sicherungsposten-Repo gekapselt (Save schreibt Aggregate + Versions-Zeile in
 * einer Transaktion).
 */
export interface ISicherungspostenVersionRepository {
  /**
   * Lädt alle Version-Zeilen eines Sicherungspostens, sortiert
   * `version DESC` (neueste zuerst).
   *
   * Reiner Read — kein TX-Parameter, da der Read-Pfad orthogonal zum Write-
   * Transactional-Command-Handler-Pfad ist.
   */
  findHistoryByPostenId(postenId: string): Promise<Result<SicherungspostenVersionReadModel[]>>;
}
