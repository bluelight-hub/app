# AC1 DI Import Fix - Summary

**Date:** 2025-12-15
**Story:** 1.1 - Qualifikationen verwalten
**Issue:** Round 8 Code Review found AC1 violations (import type used for DI-injectable classes)

## Problem

Five handler files used `import type` for DI-injectable repository interfaces, which breaks NestJS Dependency Injection at runtime. TypeScript's `import type` is erased during compilation, causing NestJS to fail when trying to inject these dependencies.

## CLAUDE.md Rule (AC1)

```typescript
// ✅ RICHTIG: import für DI-Injectable Classes
import { IRepository } from './i-repository';

// ❌ FALSCH: import type bricht NestJS DI zur Laufzeit!
import type { IRepository } from './i-repository';
```

## Fixed Files

### Command Handlers (3 files)

1. **create-qualifikation.handler.ts**
   - Fixed: `IQualifikationRepository` (line 8)
   - Fixed: `IOutboxRepository` (line 10)

2. **update-qualifikation.handler.ts**
   - Fixed: `IQualifikationRepository` (line 7)
   - Fixed: `IOutboxRepository` (line 10)

3. **deactivate-qualifikation.handler.ts**
   - Fixed: `IQualifikationRepository` (line 7)
   - Fixed: `IOutboxRepository` (line 10)

### Query Handlers (2 files)

4. **get-all-qualifikationen.handler.ts**
   - Fixed: `IQualifikationRepository` (line 4)

5. **get-qualifikation-by-id.handler.ts**
   - Fixed: `IQualifikationRepository` (line 4)

## Solution

Changed `import type` to `import` with biome-ignore comments to prevent the linter from auto-converting back:

```typescript
// Before (BROKEN):
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

// After (FIXED):
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
```

## Why biome-ignore Comments?

Biome's `lint/style/useImportType` rule automatically converts unused value imports to type imports. While this is generally good practice, it conflicts with NestJS DI requirements where interfaces must be available at runtime for injection metadata.

The biome-ignore comment prevents the linter from "fixing" our intentional use of value imports for DI interfaces.

## Validation

All changes passed linter validation:
```bash
pnpm --filter @bluelight-hub/backend lint
# No DI import warnings - fixes successful!
```

## Impact

- **Runtime:** NestJS DI will now work correctly with these handlers
- **Type Safety:** No impact - TypeScript still validates types correctly
- **Linter:** biome-ignore comments prevent future auto-conversion
- **Pattern:** Establishes precedent for all future DI-injectable interfaces

## Related Files

All fixed files follow the same pattern used in existing handlers:
- `PrismaService` (lines 12-13 in command handlers) already has biome-ignore
- Same pattern now applied to repository interfaces

## Next Steps

- Consider adding ESLint/Biome rule to auto-detect missing biome-ignore on @Inject() parameters
- Update code review checklist to emphasize AC1 check
- Consider creating a custom lint rule for this pattern
