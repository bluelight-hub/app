# Issue L1: Test-Mock für CUID2 dupliziert - Investigation Report

## Status: RESOLVED ✅

**Finding:** A centralized test helper DOES already exist.

## Key Discovery

**Location:** `/packages/backend/src/domain/__tests__/test-helpers.ts`

This file contains:
- ✅ `mockCuid2ForJest()` - Central function to mock CUID2 for all tests
- ✅ Documentation on proper usage
- ✅ Additional ID generation helpers (deterministic, UUID-based, counter-based)
- ✅ Date/time helpers and Result pattern assertions

## Problem: Duplication Across 73+ Test Files

The centralized helper is **NOT being used**. Instead:
- **73+ test files** duplicate the CUID2 mock inline
- Each file contains its own `jest.mock('@paralleldrive/cuid2', ...)`
- Located in: `/packages/backend/src/application/etb/event-handlers/__tests__/erinnerung-erstellt.handler.spec.ts` and many others

Example from `erinnerung-erstellt.handler.spec.ts`:
```typescript
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));
```

## Affected Test Files (73 total)

**ETB Event Handlers:**
- erinnerung-erstellt.handler.spec.ts
- erinnerung-assigned.handler.spec.ts
- erinnerung-eskaliert.handler.spec.ts
- erinnerung-intensiviert.handler.spec.ts
- etc.

**Plus tests in:**
- application/etb/commands/__tests__/
- application/etb/queries/__tests__/
- domain/aggregates/
- domain/value-objects/
- domain/entities/
- infrastructure/repositories/
- modules/etb/controllers/
- And many more...

## Recommended Solution

**Create a setup file or jest.setup.ts that imports and calls the centralized helper once globally** instead of duplicating in each test file.

This would:
1. Eliminate 73 duplicate mock definitions
2. Centralize CUID2 mocking logic
3. Ensure consistency across all tests
4. Make future maintenance easier

## Implementation Path (Future Task)

1. Create `/packages/backend/jest.setup.ts`
2. Import and call `mockCuid2ForJest()` from test-helpers.ts
3. Configure Jest to run setup file in jest.config.ts
4. Remove inline mocks from all 73 test files
