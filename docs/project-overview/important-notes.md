# Important Notes

## BREAKING RULES (Never Break!)

1. **API Client Generation:**
   - NEVER create manual API helpers with `fetch()`
   - ALWAYS use generated client from `packages/shared`
   - Run `pnpm run generate-api` after every backend change

2. **UI Framework:**
   - ONLY Tailwind CSS + Headless UI
   - NEVER mix other CSS frameworks or CSS-in-JS
   - For TailwindUI (premium) components: Ask user to provide code

3. **Forms & State:**
   - Forms: ONLY @tanstack/react-form with Zod schemas
   - State: @tanstack/react-store for global state
   - NEVER use HTML forms, Redux, or other libraries

4. **Commit Rules:**
   - NEVER use `--no-verify` (bypasses hooks)
   - ALWAYS commit after each subtask
   - Format: `<emoji>(<context>): <title>`

## Tests Currently Disabled

**Important:** Test infrastructure was removed in PR #257 (2025-01-28).

- `pnpm test` - Not functional
- `pnpm test:cov` - Not functional
- `pnpm test:ui` - Not functional

See [README.md](../README.md#tests) for future testing strategy.

## No-Delete Policy

**Einsätze (missions) can ONLY be archived, NEVER deleted.**

This is a business requirement for regulatory compliance (10-year retention).

**Implementation:**
- No DELETE endpoint for Einsätze
- Only PATCH `/api/einsaetze/:id/archive` allowed
- Archived missions flagged with `isArchived=true`
- Bulk archive endpoint: POST `/api/einsaetze/bulk-archive`

---
