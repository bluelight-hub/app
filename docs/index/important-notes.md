# Important Notes

## ⚠️ BREAKING RULES (Never Break!)

### 1. API Client Generation

**NEVER create manual API helpers!**

```typescript
// ❌ WRONG: Manual fetch
const fetchAlerts = async () => {
  return await fetch('/api/security/alerts');
};

// ✅ RIGHT: Use generated client
const useSecurityAlerts = () => {
  return useQuery({
    queryKey: ['security', 'alerts'],
    queryFn: () => api.security().getSecurityAlerts(),
  });
};
```

**Workflow:** Backend endpoint → `pnpm run generate-api` → TanStack Query Hook → Component

### 2. UI Framework

**ONLY Tailwind CSS + Headless UI** - no other frameworks!

- NEVER mix other CSS frameworks or CSS-in-JS
- ALWAYS use Tailwind classes and Headless UI components
- **TailwindUI (Premium):** ALWAYS ask user to provide code (never invent!)

### 3. Forms & State

- **Forms:** ONLY @tanstack/react-form with Zod schemas
- **State:** @tanstack/react-store for global state
- **Timing:** @tanstack/pacer for debouncing/throttling
- **NEVER:** HTML Forms, Redux, or other libraries

### 4. Commit Rules

- **NEVER** use `--no-verify` (bypasses hooks)
- **ALWAYS** commit after each subtask
- **Format:** `<emoji>(<context>): <title>`

**Semantic Emojis:**
- 💥 Breaking - Major version bump
- ✨ Feature - Minor version bump
- 🐛 Fix - Patch version bump
- 🚑 Hotfix - Critical patch
- 🔒 Security - Security patch
- ♻️ Refactor - Code refactoring

## ⚠️ Tests Currently Disabled

**Important:** Test infrastructure was removed in PR #257 (2025-01-28).

- `pnpm test` - Not functional
- `pnpm test:cov` - Not functional
- `pnpm test:ui` - Not functional

See [README.md](../README.md#tests) for future testing strategy.

## ⚠️ No-Delete Policy for Einsätze

**Einsätze (missions) can ONLY be archived, NEVER deleted.**

This is a **business requirement** for regulatory compliance (10-year retention).

**Implementation:**
- No DELETE endpoint for Einsätze
- Only `PATCH /api/einsaetze/:id/archive`
- Archived missions flagged with `isArchived=true`
- Bulk archive: `POST /api/einsaetze/bulk-archive`

---
