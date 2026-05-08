import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { PsaProfil } from '@/generated/prisma/enums';
import type { AmpelStatus } from '../services/ampel-status-berechnung.service';

export interface AmpelProjectionReadRow {
  einsatzId: string;
  einheitId: string;
  status: AmpelStatus;
  aktivePsaProfile: PsaProfil[];
  offeneGefaehrdungenHoch: number;
  ausstehendePsaQuittungen: number;
  ausstehendeRegelQuittungen: number;
  offeneVorfaelle: number;
  ungeloesteRueckmeldungen: number;
  letzteAenderungAm: Date;
  letzteAenderungVonUserId: string | null;
}

export type AmpelProjectionUpsertRow = AmpelProjectionReadRow;

export interface RecalculateAmpelProjectionParams {
  einsatzId: string;
  einheitId: string;
  letzteAenderungAm: Date;
  letzteAenderungVonUserId: string | null;
}

export interface IAmpelProjectionRepository {
  upsert(row: AmpelProjectionUpsertRow, tx?: TransactionContext): Promise<Result<AmpelProjectionReadRow>>;

  findByEinsatz(einsatzId: string, tx?: TransactionContext): Promise<Result<AmpelProjectionReadRow[]>>;

  recalculateForEinheit(params: RecalculateAmpelProjectionParams, tx?: TransactionContext): Promise<Result<AmpelProjectionReadRow>>;
}
