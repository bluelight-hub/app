// Helper functions for security API

import { fetchWithAuth } from '../utils/authInterceptor';
import type { SecurityReport, IpWhitelistEntry } from './security.types';

// Reports - these use direct fetch until API is available
export const securityReportsApi = {
  getSecurityReports: async (_params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<SecurityReport[]> => {
    try {
      // Placeholder - API not yet available
      return [];
    } catch (error) {
      console.error('Failed to fetch security reports:', error);
      return [];
    }
  },

  generateSecurityReport: async (_params: {
    type: 'compliance' | 'audit' | 'incident' | 'summary';
    startDate: string;
    endDate: string;
    format: 'pdf' | 'csv';
  }): Promise<{ reportId: string; downloadUrl: string }> => {
    try {
      // Placeholder - API not yet available
      return {
        reportId: Date.now().toString(),
        downloadUrl: '/api/security/reports/download/placeholder',
      };
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  },

  downloadReport: async (_reportId: string): Promise<Blob> => {
    try {
      // Placeholder - API not yet available
      return new Blob(['Report content'], { type: 'application/pdf' });
    } catch (error) {
      console.error('Failed to download report:', error);
      throw error;
    }
  },
};

// IP Whitelist Management - using direct fetch
export const ipWhitelistApi = {
  getIpWhitelist: async (): Promise<IpWhitelistEntry[]> => {
    try {
      const response = await fetchWithAuth('/api/security/ip-whitelist');
      if (!response.ok) throw new Error('Failed to fetch IP whitelist');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch IP whitelist:', error);
      return [];
    }
  },

  addToWhitelist: async (entry: Partial<IpWhitelistEntry>): Promise<IpWhitelistEntry> => {
    try {
      const response = await fetchWithAuth('/api/security/ip-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) throw new Error('Failed to add to whitelist');
      return await response.json();
    } catch (error) {
      console.error('Failed to add to whitelist:', error);
      throw error;
    }
  },

  removeFromWhitelist: async (ipAddress: string): Promise<void> => {
    try {
      const response = await fetchWithAuth(
        `/api/security/ip-whitelist/${encodeURIComponent(ipAddress)}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) throw new Error('Failed to remove from whitelist');
    } catch (error) {
      console.error('Failed to remove from whitelist:', error);
      throw error;
    }
  },

  updateWhitelistEntry: async (
    id: string,
    updates: Partial<IpWhitelistEntry>,
  ): Promise<IpWhitelistEntry> => {
    try {
      const response = await fetchWithAuth(`/api/security/ip-whitelist/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update whitelist entry');
      return await response.json();
    } catch (error) {
      console.error('Failed to update whitelist entry:', error);
      throw error;
    }
  },
};

// Account Management
export const accountManagementApi = {
  unlockAccount: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await fetchWithAuth(
        `/api/security/unlock-account/${encodeURIComponent(email)}`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to unlock account');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to unlock account:', error);
      throw error;
    }
  },
};
