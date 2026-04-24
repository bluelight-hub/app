# Story 8.1: Scope-Korrektur für Eigenschutz-Seeds und UI-Copy

Status: review

## Story

As a **Produktverantwortlicher**,
I want **dass bereits umgesetzte Seed-Inhalte und MVP-Copy des Eigenschutz-Moduls wieder sauber auf den dokumentierten Scope für weiße Hilfsorganisationen ausgerichtet werden**,
so that **die bestehende Implementierung keine feuerwehrspezifischen Atemschutz- oder Feuerwehr-Workflows als Teil des MVP suggeriert, obwohl diese explizit außerhalb der Zielausrichtung liegen**.

## Scope-Grenze

Diese Story ist **keine** fachliche Neuplanung des Eigenschutz-Moduls und **kein** Schema-Rollback.

Nicht Bestandteil:

- Keine Prisma-Migration
- Keine Enum-/Schema-Änderung
- Keine API-Änderung
- Kein Rückbau bestehender Feature-Slices
- Keine Änderung an bereits laufenden Implementierungsdateien mit fremden Worktree-Änderungen

## Acceptance Criteria

1. `packages/backend/prisma/seed.ts` verwendet in den Eigenschutz-Vorlagen keine feuerwehrspezifischen Atemschutz- oder Feuerwehr-Workflows als MVP-Beispieltext mehr.
2. Das Seed-Szenario `cbrn-patientenversorgung` bleibt funktional erhalten, beschreibt aber weiße-Zone-/Dekon-/Übergabepunkt-Logik statt Atemschutztrupp-/Innenangriff-Logik.
3. `packages/frontend/src/features/eigenschutz/constants/seed-szenarien.constants.ts` ist terminologisch mit dem korrigierten Scope synchronisiert.
4. PRD, Architecture, UX-Spec und Epics stellen Feuerwehr nicht mehr als Zielgruppe oder Persona des Eigenschutz-MVP dar.
5. Weitergehende Spezialschutz-/Sonderlagen-Workflows werden nur noch generisch als separater Post-MVP-/Folge-PRD-Pfad beschrieben.
6. Prisma-Schema, Migrationen, Enums und API-Oberfläche bleiben unverändert.

## Umsetzungsnotizen

- Primäre betroffene Code-Dateien:
  - `packages/backend/prisma/seed.ts`
  - `packages/frontend/src/features/eigenschutz/constants/seed-szenarien.constants.ts`
- Primäre betroffene Planungsartefakte:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/epics.md`
- Ergänzende Synchronisierung:
  - `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-21.md`

## Ergebnis

- Scope-Korrektur durchgeführt, ohne laufende Eigenschutz-Implementierung in bereits geänderten Worktree-Dateien zu stören.
- Drift auf Copy-/Seed-/Planungsniveau bereinigt.
- Folgearbeit für Spezialschutz bleibt explizit ausgelagert statt implizit in MVP-Narrative eingebettet.
- Verifikation ausgeführt:
  - Frontend gezielt: 35/35 Tests grün
  - Backend gezielt: 8/8 Tests grün
  - Frontend Eigenschutz-Suite: 155/155 Tests grün
  - Backend Eigenschutz-Suite: 249 Tests grün, 12 bewusst geskippt, 0 Failures
