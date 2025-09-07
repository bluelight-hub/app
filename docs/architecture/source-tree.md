# Source Tree Documentation - Bluelight Hub

## 📁 Projekt-Struktur Übersicht

```
bluelight-hub/
├── 📦 packages/                    # Monorepo Workspace Packages
│   ├── frontend/                   # React + Vite Frontend Application
│   ├── backend/                    # NestJS Backend Application
│   └── shared/                     # Shared Types & Generated API Clients
├── 📚 docs/                        # Projekt-Dokumentation
│   ├── architecture/               # arc42 Architektur-Dokumentation
│   └── prd/                        # Product Requirements Documents
├── 🤖 .taskmaster/                 # Task Management & AI Workflows
├── 🎨 .bmad-core/                  # BMad Agent System
├── 🔧 .github/                     # GitHub Configuration
├── 🐳 docker/                      # Docker Configurations
└── 📝 Root Config Files            # Workspace Configuration
```

## 📦 Packages Detail

### Frontend Package (`packages/frontend/`)

```
packages/frontend/
├── src/
│   ├── 🎨 components/              # UI Components (Atomic Design)
│   │   ├── atoms/                  # Basic building blocks
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Label/
│   │   │   └── Spinner/
│   │   ├── molecules/              # Composed components
│   │   │   ├── FormField/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   └── Dropdown/
│   │   ├── organisms/              # Complex UI modules
│   │   │   ├── einsaetze/         # Einsatz-specific components
│   │   │   │   ├── EinsatzList/
│   │   │   │   ├── EinsatzDetail/
│   │   │   │   └── NewEinsatzModal/
│   │   │   ├── navigation/         # Navigation components
│   │   │   │   ├── Header/
│   │   │   │   ├── Sidebar/
│   │   │   │   └── Breadcrumb/
│   │   │   └── dashboard/          # Dashboard components
│   │   │       ├── StatsCard/
│   │   │       └── ActivityFeed/
│   │   ├── templates/              # Page layouts
│   │   │   ├── DefaultLayout/
│   │   │   ├── AuthLayout/
│   │   │   └── DashboardLayout/
│   │   └── pages/                  # Route components
│   │       ├── app/                # Main app pages
│   │       │   ├── dashboard/
│   │       │   ├── einsaetze/
│   │       │   └── einheiten/
│   │       └── auth/                # Auth pages
│   │           ├── login/
│   │           └── register/
│   │
│   ├── 🔄 contexts/                # React Contexts
│   │   ├── AuthContext.tsx         # Authentication state
│   │   ├── EinsatzContext.tsx      # Einsatz management
│   │   └── ThemeContext.tsx        # Theme management
│   │
│   ├── 🪝 hooks/                   # Custom React Hooks
│   │   ├── auth/
│   │   │   ├── useAuth.ts
│   │   │   └── usePermissions.ts
│   │   ├── einsatz/
│   │   │   ├── useEinsatz.ts
│   │   │   └── useEinsaetze.ts
│   │   └── common/
│   │       └── useLocalStorage.ts
│   │
│   ├── 📡 api/                     # API Integration
│   │   ├── generated/              # Auto-generated API clients
│   │   │   └── index.ts
│   │   ├── hooks/                  # TanStack Query hooks
│   │   │   ├── useEinsatzApi.ts
│   │   │   └── useAuthApi.ts
│   │   └── config.ts               # API configuration
│   │
│   ├── 🛣️ routes/                  # TanStack Router
│   │   ├── __root.tsx              # Root route
│   │   ├── index.tsx               # Index route
│   │   └── app/                    # App routes
│   │       ├── dashboard.tsx
│   │       └── einsaetze/
│   │           ├── index.tsx
│   │           └── $einsatzId.tsx
│   │
│   ├── 🏪 stores/                  # TanStack Store
│   │   ├── userStore.ts            # User state
│   │   ├── appStore.ts             # App state
│   │   └── uiStore.ts              # UI state
│   │
│   ├── 🛠️ utils/                   # Utility functions
│   │   ├── cn.ts                   # Class name helper
│   │   ├── date.ts                 # Date utilities
│   │   ├── validation.ts           # Validation helpers
│   │   └── constants.ts            # App constants
│   │
│   ├── 🎨 styles/                  # Global styles
│   │   └── globals.css             # Tailwind imports
│   │
│   ├── 📱 tauri/                   # Tauri-specific code
│   │   ├── commands.ts             # Tauri commands
│   │   └── events.ts               # Tauri events
│   │
│   └── 🧪 __tests__/               # Test files
│       ├── components/
│       ├── hooks/
│       └── utils/
│
├── src-tauri/                      # Tauri backend (Rust)
│   ├── src/
│   │   └── main.rs                 # Tauri main entry
│   ├── Cargo.toml                  # Rust dependencies
│   └── tauri.conf.json             # Tauri configuration
│
├── public/                         # Static assets
│   ├── icons/
│   └── images/
│
├── 📝 Configuration Files
│   ├── package.json                # Dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── vite.config.ts              # Vite configuration
│   ├── tailwind.config.js          # Tailwind configuration
│   ├── vitest.config.ts            # Vitest configuration
│   └── playwright.config.ts        # Playwright E2E config
│
└── 🧪 e2e/                         # E2E test files
    ├── auth.spec.ts
    └── einsatz.spec.ts
```

### Backend Package (`packages/backend/`)

```
packages/backend/
├── src/
│   ├── 📦 modules/                 # Feature modules
│   │   ├── auth/                   # Authentication module
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── jwt.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── einsatz/                # Einsatz management
│   │   │   ├── controllers/
│   │   │   │   └── einsatz.controller.ts
│   │   │   ├── services/
│   │   │   │   └── einsatz.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── einsatz.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-einsatz.dto.ts
│   │   │   │   └── update-einsatz.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── einsatz.entity.ts
│   │   │   └── einsatz.module.ts
│   │   │
│   │   ├── einheit/                # Unit management
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── dto/
│   │   │   └── einheit.module.ts
│   │   │
│   │   ├── etb/                    # Einsatztagebuch
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── dto/
│   │   │   └── etb.module.ts
│   │   │
│   │   ├── health/                 # Health checks
│   │   │   ├── controllers/
│   │   │   │   └── health.controller.ts
│   │   │   └── health.module.ts
│   │   │
│   │   └── shared/                 # Shared module
│   │       ├── filters/
│   │       │   └── http-exception.filter.ts
│   │       ├── interceptors/
│   │       │   └── logging.interceptor.ts
│   │       ├── pipes/
│   │       │   └── validation.pipe.ts
│   │       └── shared.module.ts
│   │
│   ├── 🗄️ prisma/                  # Database
│   │   ├── schema.prisma           # Prisma schema
│   │   ├── migrations/             # Database migrations
│   │   └── seed.ts                 # Seed data
│   │
│   ├── 🔧 config/                  # Configuration
│   │   ├── app.config.ts           # App configuration
│   │   ├── database.config.ts      # Database config
│   │   └── jwt.config.ts           # JWT config
│   │
│   ├── 🛠️ utils/                   # Utilities
│   │   ├── logger.ts               # Logger setup
│   │   ├── constants.ts            # Constants
│   │   └── helpers.ts              # Helper functions
│   │
│   ├── 📝 main.ts                  # Application entry
│   ├── 📝 main-cli.ts              # CLI entry point
│   └── 📝 app.module.ts            # Root module
│
├── test/                           # Test configuration
│   ├── jest-e2e.json               # E2E test config
│   └── app.e2e-spec.ts             # E2E tests
│
├── 📝 Configuration Files
│   ├── package.json                # Dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── nest-cli.json               # NestJS CLI config
│   ├── jest.config.js              # Jest configuration
│   └── .env.example                # Environment variables
│
└── 📚 docs/                        # API documentation
    └── compodoc/                   # Generated docs
```

### Shared Package (`packages/shared/`)

```
packages/shared/
├── src/
│   ├── 📡 client/                  # Generated API clients
│   │   └── apis/
│   │       ├── AuthApi.ts
│   │       ├── EinsatzApi.ts
│   │       └── index.ts
│   │
│   ├── 🔢 types/                   # Shared TypeScript types
│   │   ├── auth.types.ts
│   │   ├── einsatz.types.ts
│   │   ├── einheit.types.ts
│   │   └── index.ts
│   │
│   ├── 📏 constants/               # Shared constants
│   │   ├── status.constants.ts
│   │   ├── roles.constants.ts
│   │   └── index.ts
│   │
│   └── 🛠️ utils/                   # Shared utilities
│       ├── date.utils.ts
│       ├── validation.utils.ts
│       └── index.ts
│
├── 📝 Configuration Files
│   ├── package.json
│   ├── tsconfig.json
│   └── openapi-generator.json      # OpenAPI config
│
└── scripts/
    └── generate-api.sh             # API generation script
```

## 📚 Documentation Structure

```
docs/
├── architecture/                   # arc42 Architecture Documentation
│   ├── 01-introduction-goals.adoc
│   ├── 02-constraints.adoc
│   ├── 03-context.adoc
│   ├── 04-solution-strategy.adoc
│   ├── 05-building-block-view.adoc
│   ├── 06-runtime-view.adoc
│   ├── 07-deployment-view.adoc
│   ├── 08-concepts.adoc
│   ├── 09-architecture-decisions.adoc
│   ├── 10-quality-requirements.adoc
│   ├── 11-risks.adoc
│   ├── 12-glossary.adoc
│   ├── adr/                        # Architecture Decision Records
│   │   ├── 001-verbindungskonzept.adoc
│   │   ├── 002-crdts-datensynchronisation.adoc
│   │   └── ...
│   ├── coding-standards.md        # Coding conventions
│   ├── tech-stack.md              # Technology overview
│   └── source-tree.md             # This document
│
└── prd/                           # Product Requirements
    ├── overview.md
    └── features/
        ├── einsatz-management.md
        └── offline-sync.md
```

## 🤖 Task Management & AI

```
.taskmaster/
├── tasks/                         # Task definitions
│   ├── tasks.json                # Main task database
│   └── *.md                      # Individual task files
├── docs/                         # Task documentation
│   └── prd.txt                   # Product requirements
├── reports/                      # Analysis reports
│   └── task-complexity-report.json
├── config.json                   # AI model configuration
└── CLAUDE.md                     # AI agent instructions
```

## 🔧 Configuration Files (Root)

```
bluelight-hub/
├── 📦 Package Management
│   ├── package.json              # Root workspace config
│   ├── pnpm-workspace.yaml       # pnpm workspace definition
│   └── pnpm-lock.yaml           # Lock file
│
├── 🔧 Development Tools
│   ├── .gitignore               # Git ignore rules
│   ├── .gitattributes           # Git attributes
│   ├── biome.json               # Biome linter/formatter
│   ├── .husky/                  # Git hooks
│   │   ├── pre-commit
│   │   └── commit-msg
│   └── .env.example             # Environment template
│
├── 🐳 Docker
│   ├── docker-compose.yml       # Local development
│   ├── docker-compose.prod.yml  # Production setup
│   └── Dockerfile               # Container definition
│
├── 🚀 CI/CD
│   └── .github/
│       ├── workflows/
│       │   ├── ci.yml          # Continuous Integration
│       │   ├── release.yml     # Release workflow
│       │   └── deploy.yml      # Deployment
│       └── dependabot.yml      # Dependency updates
│
└── 📝 Documentation
    ├── README.md               # Project readme
    ├── CONTRIBUTING.md         # Contribution guide
    ├── LICENSE                 # License file
    └── CHANGELOG.md           # Version history
```

## 🎯 Key Directories Explained

### Components (Atomic Design)

- **atoms/**: Smallest UI elements (buttons, inputs)
- **molecules/**: Combinations of atoms (form fields)
- **organisms/**: Complex UI sections (navigation, modals)
- **templates/**: Page layouts without data
- **pages/**: Complete pages with data

### Module Structure (Backend)

Each module follows this pattern:

- **controllers/**: HTTP endpoints
- **services/**: Business logic
- **repositories/**: Data access
- **dto/**: Data transfer objects
- **entities/**: Domain models
- **guards/**: Access control
- **decorators/**: Custom decorators

### Test Organization

- Unit tests: Next to source files (`*.spec.ts`)
- Integration tests: In `test/` directories
- E2E tests: In `e2e/` directories

## 📊 File Naming Conventions

### TypeScript/JavaScript

```
component.tsx         # React component
component.spec.tsx    # Component test
use-hook.ts          # React hook
service.ts           # Service class
controller.ts        # Controller class
dto.ts              # Data transfer object
entity.ts           # Domain entity
utils.ts            # Utility functions
constants.ts        # Constants
types.ts            # Type definitions
```

### Naming Patterns

- **PascalCase**: Components, Classes (`UserProfile.tsx`)
- **camelCase**: Functions, Variables (`getUserById`)
- **kebab-case**: Files, Folders (`user-profile/`)
- **UPPER_SNAKE_CASE**: Constants (`MAX_RETRY_COUNT`)

## 🔍 Import Path Aliases

### Frontend (`@/`)

```typescript
import {Button} from '@/components/atoms/Button';
import {useAuth} from '@/hooks/auth/useAuth';
import {api} from '@/api/generated';
```

### Backend (`@modules/`, `@utils/`)

```typescript
import {AuthService} from '@modules/auth/services/auth.service';
import {Logger} from '@utils/logger';
```

## 📈 Directory Size Guidelines

- **Components**: Max 200 LOC per file
- **Services**: Max 300 LOC per file
- **Modules**: Max 10 sub-modules
- **Utils**: Max 100 LOC per function

## 🚀 Quick Navigation

### Most Important Files

1. `/packages/frontend/src/main.tsx` - Frontend entry
2. `/packages/backend/src/main.ts` - Backend entry
3. `/packages/backend/prisma/schema.prisma` - Database schema
4. `/docs/architecture/01-introduction-goals.adoc` - Project overview
5. `/.taskmaster/tasks/tasks.json` - Current tasks

### Development Entry Points

- Frontend Dev: `pnpm --filter @bluelight-hub/frontend dev`
- Backend Dev: `pnpm --filter @bluelight-hub/backend dev`
- Generate API: `pnpm run generate-api`
- Run Tests: `pnpm test`
- View Tasks: `task-master list`

## 🔄 Data Flow

```
User Interaction (Frontend)
    ↓
TanStack Query Hook
    ↓
Generated API Client
    ↓
HTTP Request
    ↓
NestJS Controller
    ↓
Service Layer
    ↓
Repository/Prisma
    ↓
PostgreSQL Database
```

## 📝 Notes

- All packages use TypeScript strictly
- Monorepo managed with pnpm workspaces
- API clients auto-generated from OpenAPI
- Tests required for all new features
- Documentation in German, code in English