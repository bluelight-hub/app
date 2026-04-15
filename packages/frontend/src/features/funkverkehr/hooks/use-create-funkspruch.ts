/**
 * useCreateFunkspruch
 *
 * Legt einen neuen ETB-Eintrag mit FunkKontext an. Kapselt die ETB-API
 * so, dass Frontend-Komponenten nur Funkspruch-relevante Felder liefern
 * müssen (`kanalId`, `funkPrioritaet`, `text`, `absender`, `empfaenger`).
 *
 * Voraussetzung: Ein ETB für den Einsatz existiert bereits — die etbId
 * wird via `useEtb({ einsatzId })` oder ein vorgelagertes Ensure-Hook
 * aufgelöst.
 */

import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AddEintragDtoKategorieEnum } from '@bluelight-hub/shared/client';
import type { FunkPrioritaetFilter } from '../stores/funkprotokoll-filter.store';
import { FUNKVERKEHR_QUERY_KEYS } from '../api/queries';

export interface CreateFunkspruchInput {
  text: string;
  absender?: string;
  empfaenger?: string;
  kanalId: string;
  funkPrioritaet: FunkPrioritaetFilter;
  ereignisZeitpunkt?: string;
}

export interface UseCreateFunkspruchOptions {
  einsatzId: string;
  etbId: string;
}

/**
 * Erstellt einen Funkspruch-Eintrag im ETB.
 *
 * Invalidiert bei Erfolg Funkprotokoll-Queries und Einsatz-ETB-Cache.
 * Der WebSocket-Broadcast (`etb:eintrag-erstellt`) deckt zusätzlich
 * Live-Aktualisierung ab.
 */
export function useCreateFunkspruch({ einsatzId, etbId }: UseCreateFunkspruchOptions) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFunkspruchInput) =>
      api.etb().etbCqrsControllerAddEintragVAlpha({
        etbId,
        addEintragDto: {
          text: input.text,
          absender: input.absender,
          empfaenger: input.empfaenger,
          kategorie: AddEintragDtoKategorieEnum.Kommunikation,
          einsatzId,
          ereignisZeitpunkt: input.ereignisZeitpunkt,
          kontext: {
            type: 'funkspruch',
            kanalId: input.kanalId,
            funkPrioritaet: input.funkPrioritaet,
          },
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.funkprotokoll(einsatzId) });
      qc.invalidateQueries({ queryKey: ['etb'] });
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Funkspruch konnte nicht gespeichert werden.', 'createFunkspruch');
      toast.error('Fehler', { description: message });
    },
  });
}
