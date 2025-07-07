import { Session, SessionActivity, User } from '../../../../prisma/generated/prisma';

export interface SessionWithUser extends Session {
  user: User;
}

export interface SessionWithActivities extends Session {
  activities: SessionActivity[];
}

export interface SessionWithDetails extends Session {
  user: User;
  activities: SessionActivity[];
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  revokedSessions: number;
  highRiskSessions: number;
  averageSessionDuration: number;
  sessionsPerUser: number;
}

export interface DeviceInfo {
  type: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
}

export interface LocationInfo {
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface SessionRiskFactors {
  newLocation: boolean;
  newDevice: boolean;
  unusualTime: boolean;
  rapidLocationChange: boolean;
  suspiciousUserAgent: boolean;
  highFailedLoginCount: boolean;
  concurrentSessionLimit: boolean;
}

export interface SessionHeartbeatData {
  sessionId: string;
  timestamp: Date;
  activity?: {
    type: string;
    resource?: string;
    metadata?: Record<string, any>;
  };
}

export interface SessionWebSocketPayload {
  type: 'session_created' | 'session_updated' | 'session_terminated' | 'session_activity';
  session: SessionWithUser;
  activity?: SessionActivity;
}

export const SESSION_EVENTS = {
  SESSION_CREATED: 'session.created',
  SESSION_UPDATED: 'session.updated',
  SESSION_TERMINATED: 'session.terminated',
  SESSION_ACTIVITY: 'session.activity',
  SESSION_RISK_DETECTED: 'session.risk.detected',
  SESSION_HEARTBEAT: 'session.heartbeat',
} as const;

export const SUSPICIOUS_FLAGS = {
  NEW_LOCATION: 'new_location',
  NEW_DEVICE: 'new_device',
  UNUSUAL_TIME: 'unusual_time',
  RAPID_LOCATION_CHANGE: 'rapid_location_change',
  SUSPICIOUS_USER_AGENT: 'suspicious_user_agent',
  HIGH_FAILED_LOGIN_COUNT: 'high_failed_login_count',
  CONCURRENT_SESSION_LIMIT: 'concurrent_session_limit',
  TOKEN_REUSE: 'token_reuse',
  ABNORMAL_ACTIVITY: 'abnormal_activity',
} as const;

export const RISK_SCORE_THRESHOLDS = {
  LOW: 0,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 80,
} as const;

export type SuspiciousFlag = (typeof SUSPICIOUS_FLAGS)[keyof typeof SUSPICIOUS_FLAGS];
export type SessionEvent = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS];
