import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { AuditLogEntity } from '@bluelight-hub/shared/client/models';
import { message } from 'antd';
import { useState } from 'react';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  actionType?: string;
  severity?: string;
  userId?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  success?: boolean;
}

export interface AuditLogStatistics {
  total: number;
  errors: number;
  warnings: number;
  critical: number;
  successRate: number;
}

interface AuditLogResponse {
  data: AuditLogEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const queryKey = ['audit-logs', filters];
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery<AuditLogResponse, Error>({
    queryKey,
    queryFn: async () => {
      // Make a direct fetch request since the generated client has issues
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      if (filters.success !== undefined) params.append('success', String(filters.success));

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/audit/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Transform backend response structure to frontend expected structure
      // Backend returns: { items: [], pagination: { currentPage, itemsPerPage, totalItems, totalPages, ... } }
      // Frontend expects: { data: [], meta: { total, page, limit, totalPages } }
      return {
        data: rawData.items || [],
        meta: {
          total: rawData.pagination?.totalItems || 0,
          page: rawData.pagination?.currentPage || 1,
          limit: rawData.pagination?.itemsPerPage || 20,
          totalPages: rawData.pagination?.totalPages || 1,
        },
      } as AuditLogResponse;
    },
    staleTime: 30000, // 30 seconds
  });

  return {
    logs: data?.data || [],
    meta: data?.meta,
    isLoading,
    error,
    refetch,
    selectedLogs,
    setSelectedLogs,
  };
}

export function useAuditLogById(id: string | undefined) {
  return useQuery({
    queryKey: ['audit-log', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const response = await api.auditLogs.auditLogControllerFindOneV1({
        id,
      });
      return response;
    },
    enabled: !!id,
  });
}

export function useAuditLogStatistics(filters: Omit<AuditLogFilters, 'page' | 'limit'> = {}) {
  return useQuery<AuditLogStatistics, Error>({
    queryKey: ['audit-log-statistics', filters],
    queryFn: async () => {
      // Make a direct fetch request
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/audit/logs/statistics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit log statistics: ${response.statusText}`);
      }

      const stats = await response.json();

      // Transform backend response to frontend expected format
      // Backend returns: totalLogs, actionTypes, severities, successRate, topUsers, topResources
      // Frontend expects: total, errors, warnings, critical, successRate
      return {
        total: stats.totalLogs || 0,
        errors: stats.severities?.HIGH || 0,
        warnings: stats.severities?.MEDIUM || 0,
        critical: stats.severities?.CRITICAL || 0,
        successRate:
          stats.totalLogs > 0
            ? Math.round(((stats.successRate?.success || 0) / stats.totalLogs) * 100)
            : 100,
      } as AuditLogStatistics;
    },
    staleTime: 60000, // 1 minute
  });
}

export function useDeleteAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.auditLogs.auditLogControllerRemoveV1({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log-statistics'] });
      message.success('Audit Log erfolgreich gelöscht');
    },
    onError: (error: Error) => {
      message.error(`Fehler beim Löschen des Audit Logs: ${error.message || 'Unbekannter Fehler'}`);
    },
  });
}

export function useDeleteAuditLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete each log individually since bulk delete by IDs is not available
      await Promise.all(ids.map((id) => api.auditLogs.auditLogControllerRemoveV1({ id })));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log-statistics'] });
      message.success(`${variables.length} Audit Logs erfolgreich gelöscht`);
    },
    onError: (error: Error) => {
      message.error(`Fehler beim Löschen der Audit Logs: ${error.message || 'Unbekannter Fehler'}`);
    },
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: 'csv' | 'json';
      filters?: Omit<AuditLogFilters, 'page' | 'limit'>;
    }) => {
      // Use the raw method to get the actual response
      const response = await (api.auditLogs as any).auditLogControllerExportV1Raw({
        format,
        actionType: filters?.actionType as any,
        severity: filters?.severity as any,
        userId: filters?.userId,
        resource: filters?.resource,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        search: filters?.search,
        success: filters?.success,
      });
      // Get the response data for export
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/csv')) {
        return await response.text();
      } else {
        return await response.json();
      }
    },
    onSuccess: (data: unknown, variables) => {
      // Create a download link
      const blob = new Blob([data as BlobPart], {
        type: variables.format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Export erfolgreich heruntergeladen');
    },
    onError: (error: Error) => {
      message.error(`Fehler beim Exportieren: ${error.message || 'Unbekannter Fehler'}`);
    },
  });
}

/**
 * Archive old audit logs
 */
export function useArchiveAuditLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beforeDate: string) => {
      // Calculate days to keep based on the beforeDate
      const daysToKeep = Math.floor(
        (new Date().getTime() - new Date(beforeDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      await api.auditLogs.auditLogControllerArchiveOldLogsV1({
        daysToKeep,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log-statistics'] });
      message.success('Audit Logs erfolgreich archiviert');
    },
    onError: (error: Error) => {
      message.error(`Fehler beim Archivieren: ${error.message || 'Unbekannter Fehler'}`);
    },
  });
}

/**
 * Cleanup old audit logs
 */
export function useCleanupAuditLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_retentionDays: number) => {
      // The API doesn't take parameters, just applies the configured policy
      const response = await api.auditLogs.auditLogControllerApplyRetentionPolicyV1();
      return response;
    },
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log-statistics'] });
      const result = data as { deletedCount: number };
      message.success(`${result.deletedCount} alte Audit Logs gelöscht`);
    },
    onError: (error: Error) => {
      message.error(`Fehler beim Bereinigen: ${error.message || 'Unbekannter Fehler'}`);
    },
  });
}
