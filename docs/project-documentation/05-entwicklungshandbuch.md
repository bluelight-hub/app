# Entwicklungshandbuch

> **Stand:** 2026-01-04
> **Node.js:** 22.x (LTS)
> **Package Manager:** pnpm 10.x

---

## 1. Projekt-Setup

### 1.1 Voraussetzungen

- Node.js 22.x
- pnpm 10.x
- Docker (für PostgreSQL)
- Rust (für Tauri)

### 1.2 Installation

```bash
# Repository klonen
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub

# Dependencies installieren
pnpm install

# Umgebungsvariablen kopieren
cp .env.example .env

# Datenbank starten
docker-compose up -d

# Prisma Migrationen ausführen
pnpm --filter @bluelight-hub/backend prisma:migrate

# Development Server starten
pnpm -r dev
```

---

## 2. Ports & URLs

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3090 | http://localhost:3090 |
| Backend (NestJS) | 3091 | http://localhost:3091/api |
| PostgreSQL | 3092 | postgresql://localhost:3092 |
| Prisma Studio | 3093 | http://localhost:3093 |

---

## 3. Wichtige Commands

### 3.1 Development

```bash
# Alle Services starten
pnpm -r dev

# Nur Backend
pnpm --filter @bluelight-hub/backend dev

# Nur Frontend (Tauri)
pnpm --filter @bluelight-hub/frontend dev

# Nur Vite (ohne Tauri)
pnpm --filter @bluelight-hub/frontend dev:vite
```

### 3.2 API Client

```bash
# Nach Backend-Änderungen IMMER ausführen!
pnpm run generate-api
```

### 3.3 Testing

```bash
# Backend Tests
pnpm --filter @bluelight-hub/backend test           # Alle
pnpm --filter @bluelight-hub/backend test:unit      # Unit
pnpm --filter @bluelight-hub/backend test:e2e       # E2E

# Frontend Tests
pnpm --filter @bluelight-hub/frontend test
```

### 3.4 Linting

```bash
# Biome lint + fix
pnpm lint

# Nur Check (ohne fix)
pnpm lint:check

# Architektur-Check (Circular Dependencies)
pnpm --filter @bluelight-hub/backend check:arch
```

### 3.5 Database

```bash
# Migrationen ausführen
pnpm --filter @bluelight-hub/backend prisma:migrate

# Prisma Studio
pnpm --filter @bluelight-hub/backend prisma:studio

# Schema formatieren
pnpm --filter @bluelight-hub/backend exec prisma format
```

---

## 4. Code-Konventionen

### 4.1 Datei-Benennung

| Typ | Pattern | Beispiel |
|-----|---------|----------|
| Entity | `kebab-case.entity.ts` | `einsatz.entity.ts` |
| Handler | `kebab-case.handler.ts` | `create-einsatz.handler.ts` |
| DTO | `kebab-case.dto.ts` | `create-einsatz.dto.ts` |
| Repository | `i-kebab-case.repository.ts` | `i-einsatz.repository.ts` |
| Komponente | `PascalCase.tsx` | `EinsatzList.tsx` |
| Hook | `use-kebab-case.ts` | `use-einsaetze.ts` |

### 4.2 Klassen-Benennung

| Typ | Pattern | Beispiel |
|-----|---------|----------|
| Entity | `PascalCase` | `Einsatz` |
| Command | `PascalCaseCommand` | `CreateEinsatzCommand` |
| Handler | `PascalCaseHandler` | `CreateEinsatzHandler` |
| DTO | `PascalCaseDto` | `CreateEinsatzDto` |
| Interface | `IPascalCase` | `IEinsatzRepository` |

### 4.3 Import-Reihenfolge

```typescript
// 1. Externe Packages
import { Injectable } from '@nestjs/common';

// 2. Path Aliases
import { DI_TOKENS } from '@infrastructure/di-tokens';
import { Result } from '@domain/common/result';

// 3. Relative Imports
import { CreateEinsatzCommand } from './create-einsatz.command';
```

---

## 5. Commit-Konventionen

### 5.1 Format

```
<emoji>(<scope>): <message>
```

### 5.2 Emojis

Erlaubte Emojis kommen ausschließlich aus der offiziellen Gitmoji-Quelle:

- `https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json`

Im Repository wird diese Liste lokal als Snapshot gepflegt:

- `scripts/gitmojis.snapshot.json`

Nützliche Befehle:

```bash
# Snapshot mit offizieller Quelle synchronisieren
pnpm gitmoji:sync

# Prüfen, ob der Snapshot aktuell ist (Exit-Code 1 bei Drift)
pnpm gitmoji:check
```

### 5.3 Beispiele

```bash
✨(einsatz): Add status filter endpoint
🐛(auth): Fix token expiration handling
♻️(etb): Extract validation logic
📝(readme): Update setup instructions
```

---

## 6. Git Workflow

### 6.1 Branch-Naming

```
feature/XX-kurze-beschreibung
fix/XX-bug-beschreibung
refactor/bereich
```

### 6.2 Pull Request

```bash
# Feature-Branch erstellen
git checkout -b feature/123-neue-funktion

# Commits machen (mit Emoji!)
git commit -m "✨(scope): message"

# Push & PR erstellen
git push -u origin feature/123-neue-funktion
gh pr create
```

---

## 7. Breaking Rules (NIEMALS brechen!)

### 7.1 API Client

```typescript
// ✅ RICHTIG: Generierter Client + TanStack Query
const useEinsaetze = () => useQuery({
  queryKey: QUERY_KEYS.einsatz.list(),
  queryFn: () => api.einsatz.findAll(),
});

// ❌ FALSCH: Manueller fetch
const fetchEinsaetze = () => fetch('/api/einsaetze');
```

### 7.2 Styling

```typescript
// ✅ RICHTIG: Tailwind CSS + shadcn/ui
<Dialog open={isOpen} onOpenChange={setOpen}>
  <DialogContent className="rounded-lg bg-white p-6">

// ❌ FALSCH: Andere CSS-in-JS oder Frameworks
<StyledDialog>  // styled-components
<Modal>         // MUI, Chakra, etc.
```

Neue oder grundlegend überarbeitete Komponenten müssen auf `shadcn/ui` basieren. Bereits vorhandene Headless-UI-Komponenten sind Legacy-Bestand und werden nur noch im Rahmen gezielter Migrationen weitergeführt.

### 7.3 Forms

```typescript
// ✅ RICHTIG: TanStack Form + Zod
const form = useForm({
  validatorAdapter: zodValidator(),
  validators: { onChange: schema },
});

// ❌ FALSCH: React Hook Form, Formik, HTML Forms
<form onSubmit={handleSubmit}>
  <input {...register('name')} />
</form>
```

### 7.4 Git Hooks

```bash
# ✅ RICHTIG: Hooks respektieren
git commit -m "message"  # pre-commit läuft

# ❌ NIEMALS: Hooks umgehen
git commit --no-verify
```

---

## 8. Troubleshooting

### 8.1 API Client nicht aktuell

```bash
# Backend muss laufen!
pnpm --filter @bluelight-hub/backend dev

# Dann generieren
pnpm run generate-api
```

### 8.2 Database-Fehler

```bash
# Container neustarten
docker-compose down && docker-compose up -d

# Migrationen neu ausführen
pnpm --filter @bluelight-hub/backend prisma:migrate
```

### 8.3 Tauri startet nicht

```bash
# Rust toolchain prüfen
rustup update

# Dependencies neu installieren
cd packages/frontend && pnpm install
```

---

## 9. IDE Setup

### 9.1 Empfohlene Extensions

- **Biome** (Linting/Formatting)
- **Tailwind CSS IntelliSense**
- **Prisma**
- **rust-analyzer**

### 9.2 Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

---

*Dokumentation generiert durch BMad Document-Project Workflow v1.2.0*
