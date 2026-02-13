-- Fix: wurde_eskaliert und eskaliert_am were never persisted in the update block
-- of PrismaErinnerungRepository.save(). This migration corrects existing data.
--
-- LIMITATION: Bei mehrfach eskalierten Erinnerungen ist der ursprüngliche
-- "First Escalation Timestamp" (eskaliert_am) verloren, da er nie persistiert wurde.
-- COALESCE setzt eskaliert_am auf escalated_at (letzter Eskalationszeitpunkt) als Best-Effort.

-- Case 1: Erinnerungen mit Status ESKALIERT → definitiv eskaliert
UPDATE "erinnerungen"
SET "wurde_eskaliert" = true,
    "eskaliert_am" = COALESCE("eskaliert_am", "escalated_at")
WHERE "status" = 'ESKALIERT'
  AND "wurde_eskaliert" = false;

-- Case 2: Erinnerungen die eskaliert WAREN aber inzwischen weitergeleitet
-- (z.B. ACKNOWLEDGED, ERLEDIGT nach Eskalation) - erkennbar an escalated_at != null
UPDATE "erinnerungen"
SET "wurde_eskaliert" = true,
    "eskaliert_am" = COALESCE("eskaliert_am", "escalated_at")
WHERE "escalated_at" IS NOT NULL
  AND "wurde_eskaliert" = false;
