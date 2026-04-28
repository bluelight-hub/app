-- Story 3.1 (AC8 — Defense-in-Depth):
-- Partial-Unique-Index auf der Tripel-Kombination (einsatz_id, einheit_id, profil)
-- für nur die aktuell aktive Zeile (`gueltig_bis IS NULL`). Verhindert race-bedingte
-- Doppelaktivierungen, die der Application-Layer-Guard im Repository (TOCTOU-frei)
-- abdecken soll. Doppel-Schutz konsistent mit dem Pattern aus Story 2.6/2.7.
--
-- Hinweis: Wird der Index hier als reine raw-SQL-Migration angelegt (ohne
-- entsprechende `@@index([...], where: ...)`-Annotation im `schema.prisma`),
-- meldet `prisma migrate diff` ihn künftig als „extra index in DB" und
-- riskiert einen Drop-/Re-Create im nächsten generierten Migrations-Step.
-- Solange das Schema die `@@index`-Annotation nicht trägt, MUSS der Index
-- in jeder neuen Migration explizit erhalten bleiben — entweder durch ein
-- nachgezogenes Schema-Update oder durch Prisma-`migrate-resolve`-Hygiene.
-- TODO(plattform-haerte): Schema-`@@index([..], where: …)` nachziehen, damit
-- `prisma migrate diff` den Index als Source-of-Truth behält.
CREATE UNIQUE INDEX "psa_profil_zuweisungen_active_unique"
  ON "psa_profil_zuweisungen" ("einsatz_id", "einheit_id", "profil")
  WHERE "gueltig_bis" IS NULL;
