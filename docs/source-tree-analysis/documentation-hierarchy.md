# Documentation Hierarchy

## arc42 Architecture Documentation (PFLICHT für Architektur!)

Alle Architekturdokumentation MUSS in `docs/architecture/` gepflegt werden:

- **01-introduction-goals.adoc** - Einführung und Ziele
- **02-constraints.adoc** - Randbedingungen (Technologie, Organisation, Konventionen)
- **03-context.adoc** - Kontextabgrenzung (Systemgrenzen, externe Schnittstellen)
- **04-solution-strategy.adoc** - Lösungsstrategie (Architekturansatz)
- **05-building-block-view.adoc** - Bausteinsicht (Module, Packages, Komponenten)
- **06-runtime-view.adoc** - Laufzeitsicht (Sequenzdiagramme, User Flows)
- **07-deployment-view.adoc** - Verteilungssicht (Infrastruktur, Deployment)
- **08-concepts.adoc** - Querschnittliche Konzepte (Security, Persistence, UI, etc.)
- **09-architecture-decisions.adoc** - Entscheidungen (Index zu ADRs)
- **10-quality-requirements.adoc** - Qualitätsanforderungen (Performance, Security, etc.)
- **11-risks.adoc** - Risiken und technische Schulden
- **12-glossary.adoc** - Glossar (Fachbegriffe, Abkürzungen)

**Architecture Decision Records (ADRs):** `docs/architecture/adr/`

21 ADRs dokumentieren wichtige Architekturentscheidungen:
- ADR-001: Verbindungskonzept
- ADR-007: JWT-Authentifizierung
- ADR-011: Admin-Roles-System
- ADR-013: Tailwind-Migration
- ADR-016: Unified Authentication
- ADR-020: Optimistic UI Updates
- ... (weitere ADRs)

**NIEMALS** separate Architektur-Markdowns außerhalb arc42 erstellen!

## BMM Documentation (AI-Generated Docs)

AI-generierte Dokumentation in `docs/`:

- **.bmm-backend-api-contracts.md** - Backend API Dokumentation
- **.bmm-backend-data-models.md** - Datenbankmodelle (Prisma Schema)
- **.bmm-frontend-components.md** - Komponenten-Inventar (Atomic Design)
- **.bmm-frontend-state-management.md** - State Management (TanStack Query + Store)
- **.bmm-frontend-api-integration.md** - API-Integration (BackendApi + Hooks)
- **.bmm-technology-stack.md** - Tech-Stack Dokumentation
- **.bmm-project-structure.md** - Projekt-Struktur
- **.bmm-project-parts.json** - Projekt-Teile Metadaten
- **.bmm-source-tree-analysis.md** - Source Tree Analyse (DIESES DOKUMENT)
- **project-scan-report.json** - Projekt-Scan Metadaten

**WICHTIG:** BMM-Docs sind AI-generiert und sollten NICHT manuell gepflegt werden. Nutze BMM-Workflows zur Aktualisierung.

---
