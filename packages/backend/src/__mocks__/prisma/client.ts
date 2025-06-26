/**
 * Mock für Prisma-Client für Tests
 */

export class PrismaClient {
  constructor() {}

  // Mock-Methoden können nach Bedarf hinzugefügt werden
  $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }
}

// Mock-Typdeklarationen für Entities
export type EtbEntry = {
  id: string;
  // Weitere Felder nach Bedarf
};

export type EtbAttachment = {
  id: string;
  // Weitere Felder nach Bedarf
};

export type AuditLog = {
  id: string;
  actionType: string;
  severity: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  impersonatedBy?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  httpMethod?: string | null;
  oldValues?: any;
  newValues?: any;
  affectedFields: string[];
  metadata?: any;
  timestamp: Date;
  duration?: number | null;
  success: boolean;
  errorMessage?: string | null;
  statusCode?: number | null;
  compliance: string[];
  sensitiveData: boolean;
  requiresReview: boolean;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  retentionPeriod?: number | null;
  archivedAt?: Date | null;
};

// Re-export enums from enums mock
export * from './enums';

// Prisma namespace for types
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Prisma {
  export type AuditLogWhereInput = any;
  export type AuditLogOrderByWithRelationInput = any;
  export type AuditLogGroupByOutputType = any;
  export type AuditLogCountOutputType = any;
}
