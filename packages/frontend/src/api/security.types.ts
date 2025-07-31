// Re-export types from generated API
export type { SessionDto as Session } from '@bluelight-hub/shared/client';
export type { ThreatRuleDto as ThreatRule } from '@bluelight-hub/shared/client';

// SecurityAlert is not yet in generated API, define it here
export interface SecurityAlert {
  id: string;
  type:
    | 'LOGIN_FAILURE'
    | 'SUSPICIOUS_ACTIVITY'
    | 'IP_BLOCKED'
    | 'SESSION_HIJACKING'
    | 'BRUTE_FORCE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ipAddress: string;
  timestamp: Date;
  resolved: boolean;
}

// Custom types not in generated API
export interface DashboardMetrics {
  totalLoginAttempts: number;
  failedLoginAttempts: number;
  activeSessions: number;
  suspiciousActivities: number;
  blockedIPs: number;
  alertsCount: number;
  loginAttemptsChart: Array<{
    time: string;
    successful: number;
    failed: number;
  }>;
  threatDistribution: Array<{
    name: string;
    value: number;
  }>;
  sessionsByLocation: Array<{
    location: string;
    count: number;
  }>;
  avgSessionDuration: number;
  securityScore: number;
  // Additional fields from backend
  summary?: {
    failedLogins?: {
      last24Hours: number;
      last7Days: number;
      trend: number;
    };
    accountLockouts?: {
      last24Hours: number;
      last7Days: number;
      trend: number;
    };
    suspiciousActivities?: {
      last24Hours: number;
      last7Days: number;
      trend: number;
    };
  };
  details?: {
    topFailedLoginIps?: Array<{ ip: string; count: number }>;
    topLockedUsers?: Array<{ userId: string; count: number }>;
    suspiciousActivityTypes?: Array<{ type: string; count: number }>;
  };
}

export interface IPWhitelistRule {
  id: string;
  ipAddress: string;
  ipRange?: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface SecurityReport {
  id: string;
  type: 'compliance' | 'audit' | 'incident' | 'summary';
  title: string;
  description: string;
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  fileUrl?: string;
  metrics: Record<string, unknown>;
}

export interface SecurityLog {
  id: string;
  eventType: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  details: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sequenceNumber?: number;
  createdAt?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}
