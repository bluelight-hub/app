/**
 * Query Hook fuer Compliance-Reports
 *
 * Laedt die durchgefuehrten Anonymisierungs- und Loeschvorgaenge.
 */

import { api } from '@/shared';
import type { ComplianceReportDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { AUFBEWAHRUNG_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Laden der Compliance-Reports
 *
 * Laedt alle durchgefuehrten Anonymisierungen und Loeschungen.
 * Optional filterbar nach Einsatz-ID.
 *
 * @param einsatzId - Optionale Einsatz-ID fuer Filter
 * @returns TanStack Query Result mit ComplianceReportDto Array
 */
export function useComplianceReports(einsatzId?: string) {
  return useQuery<ComplianceReportDto[]>({
    queryKey: einsatzId ? AUFBEWAHRUNG_QUERY_KEYS.reportsByEinsatz(einsatzId) : AUFBEWAHRUNG_QUERY_KEYS.reports(),
    queryFn: async () => {
      const response = await api.aufbewahrung().aufbewahrungControllerGetReportsVAlpha({
        einsatzId,
      });
      return response.data;
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
