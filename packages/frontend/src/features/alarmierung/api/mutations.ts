/**
 * Alarmierungs-Mutation-Hooks (Issue #408).
 *
 * Kapseln Create-/Update-/Delete-Calls der `AlarmierungApi`:
 * - Alarmierung anlegen/abschließen
 * - Empfänger hinzufügen/entfernen
 * - Zeitpunkte eines Empfängers korrigieren (Optimistic Update)
 * - Nachalarmierung anlegen
 *
 * **Besonderheit `useKorrigiereZeitpunkt`:** Der generierte OpenAPI-Client
 * hat (noch) **kein Body-DTO** für `PATCH …/empfaenger/:id/zeitpunkte`,
 * obwohl das Backend einen JSON-Body erwartet. Deshalb setzen wir den
 * Body hier direkt via `initOverrides` auf der `…Raw`-Variante.
 */

import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import type {
  AlarmierungControllerCreateVAlpha201Response,
  AlarmierungControllerListVAlpha200Response,
  AlarmierungEmpfaengerControllerHinzufuegenVAlphaRequest,
  CreateAlarmierungDto,
  ErstelleNachalarmierungDto,
  SchliesseAlarmierungAbDto,
} from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ZeitpunktFeld } from '../schemas/alarmierung.schema';
import { ALARMIERUNG_QUERY_KEYS } from './queries';

/**
 * Invalidiert alle Alarmierungs-bezogenen Caches eines Einsatzes
 * (Liste + Timeline). Detail wird zusätzlich gezielt invalidiert.
 */
function invalidateAlarmierungCaches(qc: ReturnType<typeof useQueryClient>, einsatzId: string, alarmierungId?: string): void {
  qc.invalidateQueries({ queryKey: ['alarmierung', 'list', einsatzId] });
  qc.invalidateQueries({ queryKey: ALARMIERUNG_QUERY_KEYS.timeline(einsatzId) });
  if (alarmierungId) {
    qc.invalidateQueries({ queryKey: ALARMIERUNG_QUERY_KEYS.detail(einsatzId, alarmierungId) });
  }
}

/**
 * Legt eine neue Alarmierung an.
 */
export function useErstelleAlarmierung(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAlarmierungDto) => api.alarmierung().alarmierungControllerCreateVAlpha({ einsatzId, createAlarmierungDto: dto }),
    onSuccess: (response) => {
      invalidateAlarmierungCaches(qc, einsatzId, response.data.id);
      toast.success('Alarmierung ausgelöst');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Alarmierung konnte nicht erstellt werden.', 'erstelleAlarmierung');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Fügt einen Empfänger zu einer bestehenden Alarmierung hinzu.
 */
export function useFuegeEmpfaengerHinzu(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alarmierungId, dto }: { alarmierungId: string; dto: AlarmierungEmpfaengerControllerHinzufuegenVAlphaRequest }) =>
      api.alarmierung().alarmierungEmpfaengerControllerHinzufuegenVAlpha({
        einsatzId,
        alarmierungId,
        alarmierungEmpfaengerControllerHinzufuegenVAlphaRequest: dto,
      }),
    onSuccess: (_data, { alarmierungId }) => {
      invalidateAlarmierungCaches(qc, einsatzId, alarmierungId);
      toast.success('Empfänger hinzugefügt');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Empfänger konnte nicht hinzugefügt werden.', 'fuegeEmpfaengerHinzu');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Entfernt einen Empfänger aus einer Alarmierung.
 */
export function useEntferneEmpfaenger(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alarmierungId, empfaengerId }: { alarmierungId: string; empfaengerId: string }) =>
      api.alarmierung().alarmierungEmpfaengerControllerEntfernenVAlpha({ einsatzId, alarmierungId, empfaengerId }),
    onSuccess: (_data, { alarmierungId }) => {
      invalidateAlarmierungCaches(qc, einsatzId, alarmierungId);
      toast.success('Empfänger entfernt');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Empfänger konnte nicht entfernt werden.', 'entferneEmpfaenger');
      toast.error('Fehler', { description: message });
    },
  });
}

export interface KorrigiereZeitpunktInput {
  alarmierungId: string;
  empfaengerId: string;
  feld: ZeitpunktFeld;
  /** ISO-String zum Setzen oder `null` zum Zurücksetzen. */
  wert: string | null;
}

/**
 * Body-Workaround: Der generierte Client lässt den Body der
 * PATCH-Route weg (kein Body-DTO im OpenAPI-Spec). Wir setzen ihn
 * manuell via `initOverrides` — bereits JSON-serialisiert, damit der
 * Runtime-Fallback-Pfad (kein JSON-Content-Type im context.headers
 * Pre-Merge) den bereits stringifizierten Body direkt durchreicht.
 */
function buildKorrigiereZeitpunktInit(feld: ZeitpunktFeld, wert: string | null): RequestInit {
  const payload: Record<string, string | null> = { [feld]: wert };
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

/**
 * Korrigiert einen einzelnen Zeitpunkt eines Empfängers (Optimistic Update).
 *
 * Bei Erfolg liefert das Backend die aktualisierte Alarmierung zurück — wir
 * schreiben diese direkt in den Detail-Cache, um einen Roundtrip zu sparen.
 * Bei Fehler wird auf den Snapshot zurückgerollt.
 */
export function useKorrigiereZeitpunkt(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alarmierungId, empfaengerId, feld, wert }: KorrigiereZeitpunktInput) => {
      return api.alarmierung().alarmierungEmpfaengerControllerKorrigiereZeitpunkteVAlpha({ einsatzId, alarmierungId, empfaengerId }, buildKorrigiereZeitpunktInit(feld, wert));
    },
    onMutate: async ({ alarmierungId, empfaengerId, feld, wert }) => {
      await qc.cancelQueries({ queryKey: ALARMIERUNG_QUERY_KEYS.detail(einsatzId, alarmierungId) });
      await qc.cancelQueries({ queryKey: ['alarmierung', 'list', einsatzId] });

      const detailSnapshot = qc.getQueryData<AlarmierungControllerCreateVAlpha201Response>(ALARMIERUNG_QUERY_KEYS.detail(einsatzId, alarmierungId));
      const listSnapshots = qc.getQueriesData<AlarmierungControllerListVAlpha200Response>({ queryKey: ['alarmierung', 'list', einsatzId] });

      const nextValue = wert === null ? null : new Date(wert);

      // Detail-Cache aktualisieren
      if (detailSnapshot) {
        qc.setQueryData<AlarmierungControllerCreateVAlpha201Response>(ALARMIERUNG_QUERY_KEYS.detail(einsatzId, alarmierungId), {
          ...detailSnapshot,
          data: {
            ...detailSnapshot.data,
            empfaenger: detailSnapshot.data.empfaenger.map((e) => (e.id === empfaengerId ? { ...e, [feld]: nextValue } : e)),
          },
        });
      }

      // Listen-Cache(s) aktualisieren
      for (const [queryKey, snapshot] of listSnapshots) {
        if (!snapshot) continue;
        qc.setQueryData<AlarmierungControllerListVAlpha200Response>(queryKey, {
          ...snapshot,
          data: snapshot.data.map((a) =>
            a.id === alarmierungId
              ? {
                  ...a,
                  empfaenger: a.empfaenger.map((e) => (e.id === empfaengerId ? { ...e, [feld]: nextValue } : e)),
                }
              : a,
          ),
        });
      }

      return { detailSnapshot, listSnapshots };
    },
    onError: async (error, _vars, context) => {
      if (context?.detailSnapshot) {
        qc.setQueryData(ALARMIERUNG_QUERY_KEYS.detail(einsatzId, _vars.alarmierungId), context.detailSnapshot);
      }
      context?.listSnapshots?.forEach(([queryKey, snapshot]) => {
        qc.setQueryData(queryKey, snapshot);
      });
      const message = await getApiErrorMessage(error, 'Zeitpunkt konnte nicht gespeichert werden.', 'korrigiereZeitpunkt');
      toast.error('Fehler', { description: message });
    },
    onSettled: (_data, _error, { alarmierungId }) => {
      invalidateAlarmierungCaches(qc, einsatzId, alarmierungId);
    },
  });
}

/**
 * Schließt eine Alarmierung ab (Status → `abgeschlossen`).
 */
export function useAbschliesseAlarmierung(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alarmierungId, dto }: { alarmierungId: string; dto: SchliesseAlarmierungAbDto }) =>
      api.alarmierung().alarmierungControllerAbschliessenVAlpha({ einsatzId, alarmierungId, schliesseAlarmierungAbDto: dto }),
    onSuccess: (_data, { alarmierungId }) => {
      invalidateAlarmierungCaches(qc, einsatzId, alarmierungId);
      toast.success('Alarmierung abgeschlossen');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Alarmierung konnte nicht abgeschlossen werden.', 'abschliesseAlarmierung');
      toast.error('Fehler', { description: message });
    },
  });
}

/**
 * Legt eine Nachalarmierung zu einer bestehenden Alarmierung an.
 * Der Backend-Handler setzt `ursprungAlarmierungId` automatisch.
 */
export function useErstelleNachalarmierung(einsatzId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alarmierungId, dto }: { alarmierungId: string; dto: ErstelleNachalarmierungDto }) =>
      api.alarmierung().alarmierungControllerErstelleNachalarmierungVAlpha({ einsatzId, alarmierungId, erstelleNachalarmierungDto: dto }),
    onSuccess: (response, { alarmierungId }) => {
      // Ursprungs-Alarmierung und neue Nachalarmierung invalidieren
      invalidateAlarmierungCaches(qc, einsatzId, alarmierungId);
      invalidateAlarmierungCaches(qc, einsatzId, response.data.id);
      toast.success('Nachalarmierung ausgelöst');
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Nachalarmierung konnte nicht erstellt werden.', 'erstelleNachalarmierung');
      toast.error('Fehler', { description: message });
    },
  });
}
