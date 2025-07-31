// Helper functions for admin API

import { fetchWithAuth } from '../utils/authInterceptor';

export interface Activity {
  id: string;
  action: string;
  entityType: 'user' | 'organization' | 'system' | 'security';
  entityId?: string;
  entityName?: string;
  userId: string;
  userName: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface DashboardStats {
  users: number;
  organizations: number;
  activeEinsaetze: number;
  systemHealth: string;
}

// Admin API helper functions
export const adminApi = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await fetchWithAuth('/api/admin/stats');
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    return await response.json();
  },

  /**
   * Get recent activities
   */
  getActivities: async (limit?: number): Promise<Activity[]> => {
    const url = limit ? `/api/admin/activities?limit=${limit}` : '/api/admin/activities';
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return await response.json();
  },
};
