# Repository Structure

## Root Level

```
bluelight-hub/
├── packages/                           # Monorepo workspace
│   ├── backend/                        # NestJS API Backend
│   ├── frontend/                       # React + Tauri Desktop App
│   └── shared/                         # Shared TypeScript types and API client
├── docs/                               # Project documentation
│   ├── architecture/                   # 🏛️ arc42 architecture docs (PFLICHT)
│   │   ├── 01-introduction-goals.adoc  # Einführung und Ziele
│   │   ├── 02-constraints.adoc         # Randbedingungen
│   │   ├── 03-context.adoc             # Kontextabgrenzung
│   │   ├── 04-solution-strategy.adoc   # Lösungsstrategie
│   │   ├── 05-building-block-view.adoc # Bausteinsicht
│   │   ├── 06-runtime-view.adoc        # Laufzeitsicht
│   │   ├── 07-deployment-view.adoc     # Verteilungssicht
│   │   ├── 08-concepts.adoc            # Querschnittliche Konzepte
│   │   ├── 09-architecture-decisions.adoc # Entscheidungen
│   │   ├── 10-quality-requirements.adoc # Qualitätsanforderungen
│   │   ├── 11-risks.adoc               # Risiken
│   │   ├── 12-glossary.adoc            # Glossar
│   │   └── adr/                        # Architecture Decision Records (21 ADRs)
│   │       ├── 001-verbindungskonzept.adoc
│   │       ├── 007-jwt-authentifizierung.adoc
│   │       ├── 011-admin-roles-system.adoc
│   │       ├── 013-tailwind-migration.adoc
│   │       ├── 016-unified-authentication.adoc
│   │       ├── 020-optimistic-ui-updates.adoc
│   │       └── ... (weitere ADRs)
│   ├── .bmm-backend-api-contracts.md   # Backend API Dokumentation
│   ├── .bmm-backend-data-models.md     # Datenbankmodelle
│   ├── .bmm-frontend-components.md     # Komponenten-Inventar
│   ├── .bmm-frontend-state-management.md # State Management
│   ├── .bmm-technology-stack.md        # Tech-Stack Dokumentation
│   └── project-scan-report.json        # Projekt-Scan Metadaten
├── .bmad/                              # BMAD Framework (AI-Workflows)
│   ├── core/                           # Core agents and workflows
│   ├── bmm/                            # BMad Method workflows
│   └── _cfg/                           # Configuration and manifests
├── .claude/                            # Claude-Code Konfiguration
│   ├── agents/                         # Custom agents
│   └── commands/bmad/                  # BMAD commands
├── .github/                            # CI/CD workflows
│   └── workflows/                      # GitHub Actions
├── .husky/                             # Git hooks
│   ├── pre-commit                      # Linting und Formatierung
│   └── commit-msg                      # Commit-Message Validierung
├── pnpm-workspace.yaml                 # 📦 Monorepo configuration
├── package.json                        # Root package scripts
├── CLAUDE.md                           # 🤖 AI Agent Instructions (WICHTIG!)
├── README.md                           # Projekt-Readme
├── docker-compose.yml                  # Docker-Infrastruktur
└── biome.json                          # Biome Linter/Formatter Config
```

**Kritische Root-Dateien:**
- **CLAUDE.md** - Zentrales Regelwerk für AI-Agents (Breaking Rules, Patterns, Workflows)
- **pnpm-workspace.yaml** - Definiert Monorepo-Struktur
- **biome.json** - Shared Linting/Formatting Rules für alle Packages

---
