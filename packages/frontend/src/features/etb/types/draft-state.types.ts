import { AddEintragDtoKategorieEnum as EtbKategorie } from '@/shared';
import { z } from 'zod';

const ETB_DRAFT_VERSION = 1;

/**
 * Zod-Schema für den persistierten ETB-Draft-Zustand
 *
 * Validiert Daten beim Laden aus dem Storage — ungültige Daten werden
 * verworfen statt stillschweigend akzeptiert.
 */
export const etbDraftStateSchema = z.object({
  version: z.literal(ETB_DRAFT_VERSION),
  kategorie: z.nativeEnum(EtbKategorie),
  text: z.string(),
  absender: z.string().optional(),
  empfaenger: z.string().optional(),
  etbId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

/** Persistierter ETB-Draft-Zustand */
export type EtbDraftState = z.infer<typeof etbDraftStateSchema>;

/** Scope für ETB-Draft-Persistenz (identisch zu WorkspaceResumeScope) */
export interface EtbDraftScope {
  serverId: string;
  userId: string;
  role: string;
  einsatzId: string;
}

export { ETB_DRAFT_VERSION };
