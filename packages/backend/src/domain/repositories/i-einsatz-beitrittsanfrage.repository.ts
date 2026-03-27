import type { TransactionContext } from '@domain/common/transaction';

export interface EinsatzBeitrittsanfrageData {
  id: string;
  einsatzId: string;
  userId: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface IEinsatzBeitrittsanfrageRepository {
  save(data: { einsatzId: string; userId: string }, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData>;
  findById(id: string): Promise<EinsatzBeitrittsanfrageData | null>;
  findOpenByEinsatzAndUser(einsatzId: string, userId: string): Promise<EinsatzBeitrittsanfrageData | null>;
  findByEinsatz(einsatzId: string, status?: string): Promise<EinsatzBeitrittsanfrageData[]>;
  resolve(id: string, decision: string, resolvedBy: string, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData>;
}
