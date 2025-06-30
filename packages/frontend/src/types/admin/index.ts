export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  organization: string;
  organizationId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'feuerwehr' | 'drk' | 'thw' | 'polizei' | 'andere';
  address: string;
  contact: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  memberCount: number;
  createdAt: string;
  updatedAt?: string;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  maxUsers?: number;
  features: string[];
}

export interface SystemSettings {
  siteName: string;
  siteUrl: string;
  adminEmail: string;
  maintenanceMode: boolean;
  autoBackup: boolean;
  backupInterval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  smtp: SmtpSettings;
  notifications: NotificationSettings;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

export interface NotificationSettings {
  newUserRegistration: boolean;
  systemErrors: boolean;
  securityWarnings: boolean;
  backupStatus: boolean;
  notificationEmail?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: 'auth' | 'security' | 'system' | 'admin' | 'api' | 'user' | 'data';
  user: string;
  action: string;
  details: string;
  ip: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  activeOrganizations: number;
  totalEinsaetze: number;
  activeEinsaetze: number;
  systemHealth: 'ok' | 'warning' | 'error';
  lastBackup?: string;
  diskUsage?: number;
  memoryUsage?: number;
}
