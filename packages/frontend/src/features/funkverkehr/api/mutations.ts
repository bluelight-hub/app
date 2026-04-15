/**
 * Funkverkehr Mutation Hooks
 *
 * CRUD + Reorder für Funkkanäle, Zuordnungs-Management, PDF-Export.
 * Alle Endpoints liegen unter `einsatz/:einsatzId/funkkanaele/*` (bzw.
 * `einsatz/:einsatzId/kanalplan/export.pdf`).
 */

import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { downloadExport } from '@/features/reminders/lib/download-export';
import type {
  CreateFunkkanalDto,
  CreateZuordnungDto,
  FunkkanalControllerListVAlpha200Response,
  ReorderFunkkanaeleDto,
  UpdateFunkkanalDto,
  UpdateZuordnungRolleDto,
} from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FUNKVERKEHR_QUERY_KEYS } from './queries';

/**
 * Zeitstempel-Formatierung für PDF-Dateinamen (YYYY-MM-DD).
 * Bewusst ohne `date-fns`, um den Hook-Bundle klein zu halten.
 */
const toDateStamp = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Legt einen neuen Funkkanal an.
 */
export function useCreateFunkkanal(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFunkkanalDto) => api.funkkanal().funkkanalControllerCreateVAlpha({ einsatzId, createFunkkanalDto: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      toast.success('Kanal erstellt');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Kanal konnte nicht erstellt werden.', 'createFunkkanal');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Aktualisiert einen Funkkanal (PATCH; der Backend-Controller dispatcht
 * gesetzte Felder auf feingranulare Aggregat-Commands).
 */
export function useUpdateFunkkanal(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kanalId, dto }: { kanalId: string; dto: UpdateFunkkanalDto }) => api.funkkanal().funkkanalControllerUpdateVAlpha({ einsatzId, kanalId, updateFunkkanalDto: dto }),
    onSuccess: (_data, { kanalId }) => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanal(einsatzId, kanalId) });
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Kanal konnte nicht aktualisiert werden.', 'updateFunkkanal');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Archiviert einen Funkkanal (DELETE → soft-delete im Backend).
 *
 * Die UI sollte für "löschen" einen Confirm-Dialog anzeigen und bei 422
 * (Referenz-Konflikt) den User auf die Archivierungs-Alternative hinweisen.
 */
export function useArchiveFunkkanal(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kanalId }: { kanalId: string }) => api.funkkanal().funkkanalControllerArchiveVAlpha({ einsatzId, kanalId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      toast.success('Kanal archiviert');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Kanal konnte nicht archiviert werden.', 'archiveFunkkanal');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Ändert die Sortierung der Funkkanäle (Bulk-Reorder).
 *
 * Setzt optimistische Cache-Updates, damit Drag-and-Drop in der Tabelle
 * unmittelbar wirkt; bei Fehler wird der Vorzustand wiederhergestellt.
 */
export function useReorderFunkkanaele(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ReorderFunkkanaeleDto) => api.funkkanal().funkkanalControllerReorderVAlpha({ einsatzId, reorderFunkkanaeleDto: dto }),
    onMutate: async (dto) => {
      await qc.cancelQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      const prev = qc.getQueriesData<FunkkanalControllerListVAlpha200Response>({
        queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId),
      });

      const indexByKanalId = new Map(dto.ordering.map((o) => [o.kanalId, o.sortIndex]));

      for (const [queryKey, snapshot] of prev) {
        if (!snapshot) continue;
        qc.setQueryData<FunkkanalControllerListVAlpha200Response>(queryKey, {
          ...snapshot,
          data: [...snapshot.data]
            .map((kanal) => {
              const next = indexByKanalId.get(kanal.id);
              return next === undefined ? kanal : { ...kanal, sortIndex: next };
            })
            .sort((a, b) => a.sortIndex - b.sortIndex),
        });
      }

      return { prev };
    },
    onError: async (error, _dto, context) => {
      context?.prev.forEach(([queryKey, snapshot]) => {
        qc.setQueryData(queryKey, snapshot);
      });
      const message = await getApiErrorMessage(error, 'Sortierung konnte nicht gespeichert werden.', 'reorderFunkkanaele');
      toast.error('Fehler', { description: message });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
    },
  });
}

/**
 * Ordnet eine Kraft (Fahrzeug/Person/Einheit) einem Kanal zu.
 */
export function useCreateZuordnung(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kanalId, dto }: { kanalId: string; dto: CreateZuordnungDto }) => api.funkkanal().funkkanalZuordnungControllerCreateVAlpha({ einsatzId, kanalId, createZuordnungDto: dto }),
    onSuccess: (_data, { kanalId }) => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanal(einsatzId, kanalId) });
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Zuordnung konnte nicht angelegt werden.', 'createZuordnung');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Ändert die Rolle einer bestehenden Zuordnung.
 */
export function useUpdateZuordnungRolle(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kanalId, zuordnungId, dto }: { kanalId: string; zuordnungId: string; dto: UpdateZuordnungRolleDto }) =>
      api.funkkanal().funkkanalZuordnungControllerUpdateRolleVAlpha({ einsatzId, kanalId, zuordnungId, updateZuordnungRolleDto: dto }),
    onSuccess: (_data, { kanalId }) => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanal(einsatzId, kanalId) });
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Rolle konnte nicht geändert werden.', 'updateZuordnungRolle');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Entfernt eine Zuordnung.
 */
export function useRemoveZuordnung(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kanalId, zuordnungId }: { kanalId: string; zuordnungId: string }) => api.funkkanal().funkkanalZuordnungControllerRemoveVAlpha({ einsatzId, kanalId, zuordnungId }),
    onSuccess: (_data, { kanalId }) => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanal(einsatzId, kanalId) });
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Zuordnung konnte nicht entfernt werden.', 'removeZuordnung');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Lädt den aktuellen Kanalplan als PDF-Dokument herunter.
 *
 * Backend liefert `application/pdf` direkt als Stream; der generierte
 * `void`-Rückgabetyp entspricht nicht der Realität, daher greifen wir
 * per `initOverrides` direkt auf den Response zu.
 */
export function useExportKanalplanPdf(einsatzId: string) {
  return useMutation({
    mutationFn: async (): Promise<{ blob: Blob; filename: string }> => {
      // Der generierte Client liefert `Promise<void>`; wir greifen via
      // `*Raw`-Variante direkt auf die Response-`raw`-Instanz zu und lesen
      // den Blob (application/pdf) selbst.
      const response = await api.funkkanal().kanalplanExportControllerExportPdfVAlphaRaw({ einsatzId });
      const blob = await response.raw.blob();
      return { blob, filename: `kanalplan-${einsatzId}-${toDateStamp(new Date())}.pdf` };
    },
    onSuccess: ({ blob, filename }) => {
      void downloadExport(blob, filename);
      toast.success('PDF heruntergeladen', { description: filename });
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'PDF-Export fehlgeschlagen.', 'exportKanalplanPdf');
      toast.error('Fehler', { description: message });
    },
  });
}
