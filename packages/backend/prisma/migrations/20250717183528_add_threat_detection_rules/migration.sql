-- CreateEnum
CREATE TYPE "ThreatSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TESTING');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('THRESHOLD', 'PATTERN', 'ANOMALY', 'TIME_BASED', 'GEO_BASED');

-- CreateTable
CREATE TABLE "ThreatDetectionRule" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "status" "RuleStatus" NOT NULL DEFAULT 'INACTIVE',
    "severity" "ThreatSeverity" NOT NULL,
    "conditionType" "ConditionType" NOT NULL,
    "config" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" VARCHAR(255),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatDetectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEvaluation" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "sessionId" VARCHAR(255),
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "severity" "ThreatSeverity",
    "reason" TEXT,
    "evidence" JSONB,
    "actionsTriggered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionTime" INTEGER,

    CONSTRAINT "RuleEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreatDetectionRule_name_key" ON "ThreatDetectionRule"("name");

-- CreateIndex
CREATE INDEX "idx_threat_rule_status_severity" ON "ThreatDetectionRule"("status", "severity");

-- CreateIndex
CREATE INDEX "idx_threat_rule_condition_type" ON "ThreatDetectionRule"("conditionType");

-- CreateIndex
CREATE INDEX "idx_threat_rule_tags" ON "ThreatDetectionRule"("tags");

-- CreateIndex
CREATE INDEX "idx_threat_rule_created" ON "ThreatDetectionRule"("createdAt");

-- CreateIndex
CREATE INDEX "idx_rule_eval_rule_time" ON "RuleEvaluation"("ruleId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "idx_rule_eval_matched_time" ON "RuleEvaluation"("matched", "evaluatedAt");

-- CreateIndex
CREATE INDEX "idx_rule_eval_user_time" ON "RuleEvaluation"("userId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "idx_rule_eval_ip_time" ON "RuleEvaluation"("ipAddress", "evaluatedAt");

-- CreateIndex
CREATE INDEX "idx_rule_eval_severity_time" ON "RuleEvaluation"("severity", "evaluatedAt");

-- AddForeignKey
ALTER TABLE "RuleEvaluation" ADD CONSTRAINT "RuleEvaluation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ThreatDetectionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
