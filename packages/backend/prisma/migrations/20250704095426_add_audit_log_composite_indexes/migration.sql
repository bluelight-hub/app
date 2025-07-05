-- CreateIndex for common query patterns
CREATE INDEX "idx_audit_timestamp_action_severity" ON "AuditLog"("timestamp", "actionType", "severity");

-- CreateIndex for retention queries
CREATE INDEX "idx_audit_archived_timestamp" ON "AuditLog"("archivedAt", "timestamp");

-- CreateIndex for user-specific queries
CREATE INDEX "idx_audit_user_email_timestamp" ON "AuditLog"("userEmail", "timestamp");

-- CreateIndex for resource-based queries
CREATE INDEX "idx_audit_resource_timestamp_success" ON "AuditLog"("resource", "timestamp", "success");

-- Add GIN indexes for JSONB columns to improve JSON queries
CREATE INDEX "idx_audit_old_values_gin" ON "AuditLog" USING GIN ("oldValues");
CREATE INDEX "idx_audit_new_values_gin" ON "AuditLog" USING GIN ("newValues");
CREATE INDEX "idx_audit_metadata_gin" ON "AuditLog" USING GIN ("metadata");

-- Add covering index for statistics queries
CREATE INDEX "idx_audit_stats_covering" ON "AuditLog"("timestamp", "actionType", "severity", "success") 
  INCLUDE ("resource", "userId", "userEmail");

-- Add partial index for active logs (not archived)
CREATE INDEX "idx_audit_active_logs" ON "AuditLog"("timestamp", "actionType") 
  WHERE "archivedAt" IS NULL;
