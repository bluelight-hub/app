# Setup & Validation Steps

## Manuelle Schritte erforderlich

### 1. Dependencies installieren

```bash
cd /Users/rubeen/dev/personal/bluelight-hub
pnpm install
```

### 2. Shared Package bauen

```bash
pnpm --filter @bluelight-hub/shared build
```

### 3. Backend bauen (testet shared schema integration)

```bash
pnpm --filter @bluelight-hub/backend build
```

### 4. Frontend bauen (testet shared schema integration)

```bash
pnpm --filter @bluelight-hub/frontend build
```

### 5. Commits erstellen

```bash
# Shared Package
git add packages/shared/
git commit -m "$(cat <<'EOF'
✨(shared): Add shared Zod schemas package for consistent validation

Created shared schemas package in @bluelight-hub/shared/schemas:
- usernameSchema: 3-20 chars, alphanumeric + dashes/underscores
- passwordSchema: Min 8 chars, complexity rules (upper/lower/number/symbol)
- serverUrlSchema: Valid http/https URLs

Benefits:
- Single source of truth for validation rules
- Consistent Frontend (TanStack Form) + Backend (NestJS DTO) validation
- TypeScript types auto-generated from schemas
- Package export: @bluelight-hub/shared/schemas

Structure:
- /packages/shared/src/schemas/auth/
- README with usage examples
- Export via package.json exports field

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Backend Refactoring
git add packages/backend/
git commit -m "$(cat <<'EOF'
♻️(backend): Refactor DTOs to use shared Zod schemas

Backend-Änderungen:
- Created ValidateWithZod decorator for class-validator + Zod integration
- Refactored CompleteSetupDto to use shared usernameSchema + passwordSchema
- Removed duplicate validation rules (now in @bluelight-hub/shared/schemas)

Benefits:
- Consistent validation rules with Frontend
- DRY principle: Single source of truth
- Type-safe validation with TypeScript inference

Files:
- src/application/common/validation/zod-validator.decorator.ts (NEW)
- src/application/admin/dto/complete-setup.dto.ts (REFACTORED)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Frontend Refactoring
git add packages/frontend/
git commit -m "$(cat <<'EOF'
♻️(frontend): Refactor forms to use shared Zod schemas

Frontend-Änderungen:
- auth.schema.ts: Use shared usernameSchema
- setup-form.schema.ts: Use shared usernameSchema + passwordSchema
- Removed duplicate validation rules

Benefits:
- Consistent validation rules with Backend
- DRY principle: Single source of truth
- Better maintainability

Files:
- src/features/auth/schemas/auth.schema.ts (REFACTORED)
- src/features/auth/schemas/setup-form.schema.ts (REFACTORED)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

## Validierung

Nach den Builds sollte folgendes funktionieren:

### Backend Validation Test

```bash
curl -X POST http://localhost:3091/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "ab", "password": "weak"}'

# Erwartete Response: 400 Bad Request mit Zod-Validierungsfehler
```

### Frontend Validation Test

1. Frontend starten: `pnpm --filter @bluelight-hub/frontend dev`
2. Setup-Seite öffnen
3. Username "ab" eingeben (zu kurz) → Fehlermeldung
4. Passwort "weak" eingeben → Fehlermeldung wegen Komplexitätsregeln

## Troubleshooting

Falls Build-Fehler auftreten:

```bash
# Clean rebuild
pnpm -r clean
pnpm install
pnpm -r build
```

Falls TypeScript-Fehler bei Importen:

```bash
# Prüfe tsconfig paths
cat packages/backend/tsconfig.json | grep -A 5 "paths"
cat packages/frontend/tsconfig.json | grep -A 5 "paths"
```

## Cleanup

Nach erfolgreichem Test kann diese Datei gelöscht werden:

```bash
rm /Users/rubeen/dev/personal/bluelight-hub/SETUP_VALIDATION.md
```
