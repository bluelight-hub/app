import { api } from './index';
import { fetchWithAuth } from '../utils/authInterceptor';
import { securityReportsApi, ipWhitelistApi, accountManagementApi } from './security.helpers';
import type {
  SecurityLog,
  SecurityAlert,
  DashboardMetrics,
  Session,
  ThreatRule,
} from './security.types';

// Re-export types
export * from './security.types';

/**
 * Security API wrapper for frontend usage
 * Uses the generated API clients from shared package
 */
export const securityApi = {
  // Dashboard
  getDashboardMetrics: async (
    timeRange: 'today' | 'week' | 'month' = 'today',
  ): Promise<DashboardMetrics> => {
    try {
      // Calculate date ranges based on timeRange
      const endDate = new Date();
      const startDate = new Date();

      if (timeRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }

      // Use the generated API client - it returns void but we need to get the actual response
      const url = new URL(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/v1/api/security/metrics/dashboard`,
      );
      url.searchParams.append('startDate', startDate.toISOString());
      url.searchParams.append('endDate', endDate.toISOString());

      const response = await fetchWithAuth(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const data = await response.json();

      // Transform the response to match our DashboardMetrics interface
      // The backend returns a different structure, so we need to map it correctly
      return {
        totalLoginAttempts: data.totalLoginAttempts || 0,
        failedLoginAttempts: data.failedLoginAttempts || 0,
        activeSessions: data.activeSessions || 0,
        suspiciousActivities: data.suspiciousActivities || 0,
        blockedIPs: data.blockedIPs || 0,
        alertsCount: data.alertsCount || 0,
        loginAttemptsChart: data.loginAttemptsChart || [],
        threatDistribution: data.threatDistribution || [],
        sessionsByLocation: data.sessionsByLocation || [],
        avgSessionDuration: data.avgSessionDuration || 0,
        securityScore: data.securityScore || 0,
        // Add the full summary and details from backend
        summary: data.summary,
        details: data.details,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      // Return default metrics on error
      return {
        totalLoginAttempts: 0,
        failedLoginAttempts: 0,
        activeSessions: 0,
        suspiciousActivities: 0,
        blockedIPs: 0,
        alertsCount: 0,
        loginAttemptsChart: [],
        threatDistribution: [],
        sessionsByLocation: [],
        avgSessionDuration: 0,
        securityScore: 0,
      };
    }
  },

  // Alerts
  getSecurityAlerts: async (_params?: {
    severity?: string;
    resolved?: boolean;
    limit?: number;
  }): Promise<SecurityAlert[]> => {
    try {
      const response = await fetchWithAuth('/api/security/alerts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch security alerts');
      }

      const data = await response.json();

      // Transform the response to match our SecurityAlert interface
      return (data.alerts || []).map((alert: any) => ({
        id: alert.id || '',
        type: alert.type || 'SUSPICIOUS_ACTIVITY',
        severity: alert.severity || 'medium',
        message: alert.message || '',
        userId: alert.userId,
        ipAddress: alert.ipAddress || '',
        timestamp: new Date(alert.timestamp || Date.now()),
        resolved: alert.resolved || false,
      }));
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
      return [];
    }
  },

  resolveAlert: async (alertId: string): Promise<void> => {
    try {
      const response = await fetchWithAuth(`/api/security/alerts/${alertId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  },

  // Sessions
  getActiveSessions: async (params?: {
    userId?: string;
    pageSize?: number;
  }): Promise<Session[]> => {
    try {
      const result = await api.sessions.sessionControllerGetSessionsV1({
        userId: params?.userId,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to fetch active sessions:', error);
      return [];
    }
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    try {
      await api.sessions.sessionControllerRevokeSessionV1({ id: sessionId });
    } catch (error) {
      console.error('Failed to revoke session:', error);
      throw error;
    }
  },

  revokeUserSessions: async (userId: string): Promise<void> => {
    try {
      await api.sessions.sessionControllerRevokeUserSessionsV1({ userId });
    } catch (error) {
      console.error('Failed to revoke user sessions:', error);
      throw error;
    }
  },

  // Threat Rules
  getThreatRules: async (): Promise<ThreatRule[]> => {
    try {
      const result = await api.threatDetection.threatRuleControllerGetRulesV1();
      return result || [];
    } catch (error) {
      console.error('Failed to fetch threat rules:', error);
      return [];
    }
  },

  createThreatRule: async (
    rule: Omit<ThreatRule, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ThreatRule> => {
    try {
      const response = await fetchWithAuth('/api/threat-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        throw new Error('Failed to create threat rule');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create threat rule:', error);
      throw error;
    }
  },

  updateThreatRule: async (id: string, updates: Partial<ThreatRule>): Promise<void> => {
    try {
      const response = await fetchWithAuth(`/api/threat-rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update threat rule');
      }
    } catch (error) {
      console.error('Failed to update threat rule:', error);
      throw error;
    }
  },

  deleteThreatRule: async (id: string): Promise<void> => {
    try {
      const response = await fetchWithAuth(`/api/threat-rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete threat rule');
      }
    } catch (error) {
      console.error('Failed to delete threat rule:', error);
      throw error;
    }
  },

  testThreatRule: async (
    ruleId: string,
    context: Record<string, unknown>,
  ): Promise<{ passed: boolean; details?: string }> => {
    try {
      const response = await fetchWithAuth('/api/threat-rules/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ruleId, context }),
      });

      if (!response.ok) {
        throw new Error('Failed to test threat rule');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to test threat rule:', error);
      throw error;
    }
  },

  // Reports - delegated to helpers
  ...securityReportsApi,

  // Security Logs
  getSecurityLogs: async (params?: {
    eventType?: string;
    userId?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<SecurityLog[]> => {
    try {
      const result = await api.securityLogs.securityLogControllerGetSecurityLogsV1({
        eventType: params?.eventType,
        userId: params?.userId,
        from: params?.startDate,
        to: params?.endDate,
        pageSize: params?.limit || 100,
        page: 1,
      });

      // Transform the response to match our SecurityLog interface
      return (result.data || []).map((log: any) => ({
        id: log.id || '',
        eventType: log.eventType || '',
        userId: log.user?.id,
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent,
        timestamp: new Date(log.timestamp || Date.now()),
        details: log.details || {},
        severity: log.severity || 'medium',
        sequenceNumber: log.sequenceNumber,
        createdAt: log.createdAt || log.timestamp,
        message: log.message,
        metadata: log.metadata,
      }));
    } catch (error) {
      console.error('Failed to fetch security logs:', error);
      return [];
    }
  },

  // IP Whitelist - delegated to helpers
  ...ipWhitelistApi,

  // Account Management - delegated to helpers
  ...accountManagementApi,
};
