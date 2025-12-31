/**
 * Mutation Hook für QR-Code Personenregistrierung (Story 4-2)
 *
 * Registriert eine Person via QR-Code Scan (DRK-Format) mit automatischem
 * Stammdaten-Lookup und Duplikat-Erkennung.
 *
 * @module features/einsatz/api
 */

import { KRAEFTE_QUERY_KEYS } from '@/features/kraefte';
import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { RegistrierePersonViaQrCodeDto, ResponseError } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EINSATZ_QUERY_KEYS } from './queries';

/**
 * Input-Daten für die QR-Registrierung
 */
export interface RegistrierePersonQrInput {
  einsatzId: string;
  qrData: RegistrierePersonViaQrCodeDto;
}

/**
 * Mutation Hook zum Registrieren einer Person via QR-Code
 *
 * Implementiert Story 4-2 (Person via QR-Code registrieren):
 * - AC2: Dekodiert DRK-Format (Personalnummer, Vorname, Nachname, opt. Funkkennung)
 * - AC3: Automatischer Stammdaten-Lookup via Personalnummer
 * - AC4: Automatische Registrierung ohne Bestätigungs-Button
 * - AC5: Performance unter 3 Sekunden (E2E)
 * - AC6: Fehlerbehandlung bei ungültigem QR-Code oder Duplikaten
 *
 * Bei Erfolg wird die Person automatisch registriert und relevante Queries
 * werden invalidiert:
 * - EinsatzPersonen Liste des Einsatzes
 * - Einsatz Detail (personenCount)
 * - ETB des Einsatzes (neuer Eintrag)
 *
 * @returns TanStack Mutation Hook
 *
 * @example
 * ```tsx
 * const registriereViaQr = useRegistrierePersonViaQr();
 *
 * // Nach erfolgreichem QR-Scan
 * const handleQrScanned = async (qrData: DrkQrData) => {
 *   try {
 *     const result = await registriereViaQr.mutateAsync({
 *       einsatzId: 'abc-123',
 *       qrData: {
 *         personalnummer: qrData.personalnummer,
 *         vorname: qrData.vorname,
 *         nachname: qrData.nachname,
 *         funkkennung: qrData.funkkennung,
 *       },
 *     });
 *
 *     toast.success(`${result.data?.vorname} ${result.data?.nachname} registriert`);
 *   } catch (error) {
 *     if (error.response?.status === 409) {
 *       toast.warning('Person bereits registriert');
 *     } else {
 *       toast.error('Registrierung fehlgeschlagen');
 *     }
 *   }
 * };
 * ```
 */
export const useRegistrierePersonViaQr = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, qrData }: RegistrierePersonQrInput) => {
      logger.info('Registriere Person via QR-Code', {
        einsatzId,
        personalnummer: qrData.personalnummer,
        vorname: qrData.vorname,
        nachname: qrData.nachname,
        hatFunkkennung: !!qrData.funkkennung,
      });

      const startTime = performance.now();

      const result = await api.einsatzPersonen().einsatzPersonenControllerRegistriereViaQrVAlpha({
        einsatzId,
        registrierePersonViaQrCodeDto: qrData,
      });

      const duration = performance.now() - startTime;
      logger.debug('QR-Registrierung abgeschlossen', {
        durationMs: Math.round(duration),
        personId: result.data?.id,
      });

      return result;
    },
    // MEDIUM FIX #14: Retry bei Netzwerkfehlern (aber NICHT bei 409 Duplikaten oder 4xx Validation)
    retry: (failureCount, error) => {
      const responseError = error as ResponseError;
      const status = responseError.response?.status;

      // Keine Retries bei Client-Fehlern (4xx)
      if (status && status >= 400 && status < 500) {
        return false;
      }

      // Retry bei Netzwerkfehlern oder 5xx (max 2 Retries)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    onSuccess: (result, { einsatzId, qrData }) => {
      logger.debug('Person via QR erfolgreich registriert', {
        einsatzId,
        personId: result.data?.id,
        personalnummer: qrData.personalnummer,
      });

      // Invalidate EinsatzPersonen Liste
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId),
      });

      // Invalidate Einsatz Detail (personenCount aktualisieren)
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.detail(einsatzId),
      });

      // Invalidate ETB (neuer Eintrag wurde erstellt)
      queryClient.invalidateQueries({
        queryKey: ['etb', 'einsatz', einsatzId],
      });

      // Invalidate Kräfte Taktische Stärke (Story 6.1a AC3)
      queryClient.invalidateQueries({
        queryKey: KRAEFTE_QUERY_KEYS.staerke(einsatzId),
      });
    },
    onError: (error: ResponseError, { einsatzId, qrData }) => {
      logger.error('Fehler bei QR-Registrierung', {
        einsatzId,
        personalnummer: qrData.personalnummer,
        error: error.message,
        status: error.response?.status,
      });
    },
  });
};

/**
 * Prüft ob ein API-Fehler ein Duplikat-Fehler ist (409 Conflict)
 *
 * @param error - ResponseError vom API-Call
 * @returns true wenn Person bereits registriert ist
 */
export function isDuplicatePersonError(error: ResponseError): boolean {
  return error.response?.status === 409;
}
