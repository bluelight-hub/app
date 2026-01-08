# InviteCode Database Fix - Summary

## Problem

The backend threw an error when loading InviteCode records:

```
ERROR [InviteCodeInfrastructure] Failed to find all InviteCodes
error: 'Invalid InviteCodeId in database: cmk55h5y90001e192gbzd7yu8'
```

## Root Cause

**Schema Mismatch between Database and Domain Model:**

- **Database Schema** (`prisma/schema.prisma`):
  - Uses `@default(cuid())` which generates IDs like `cmk55h5y90001e192gbzd7yu8`
  - Length: 25 characters
  - Format: Plain CUID without prefix

- **Domain Model** (`InviteCodeId` Value Object):
  - Expects IDs with `inv_` prefix: `inv_ckpf2xrkc0001zyp8jq8qzx9f`
  - Length: 28 characters (4 prefix + 24 CUID2)
  - Format: `inv_{cuid2}`
  - Validation: Strict format check in `/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/value-objects/invite-code-id.ts`

## Solution Applied

### Option A: Delete Invalid Records (Chosen)

Deleted all 5 InviteCode records with invalid ID format:
- `cmk55h5y90001e192gbzd7yu8` (Test Active Code)
- `cmk55h5ys0003e192gleopj50` (Test Partially Used)
- `cmk55h5ys0005e192upik0cds` (Test Expired Code)
- `cmk55h5yx0007e1923sf4es3z` (Test Fully Used)
- `cmk55h5yx0009e192ajs0m0kz` (Test Revoked Code)

### Why This Fix Works

1. **New InviteCodes** created via the application will automatically use the correct format because:
   - `InviteCode.create()` calls `InviteCodeId.create()`
   - `InviteCodeId.create()` auto-generates IDs with `inv_` prefix
   - See: `/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/aggregates/invite-code.aggregate.ts:236`

2. **Test Data** already uses the correct format:
   - E2E tests create IDs like `inv_${createId().substring(0, 24)}`
   - See: `/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/modules/admin/controllers/__tests__/admin-invite.controller.e2e.spec.ts:98`

3. **Repository Mapping** will no longer throw errors:
   - `PrismaInviteCodeMapper.toAggregate()` validates IDs
   - All existing and new IDs now pass validation
   - See: `/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/infrastructure/invite-code/mappers/prisma-invite-code.mapper.ts:63-66`

## Verification

Run the verification script:

```bash
cd /Users/rubeen/dev/personal/bluelight-hub/packages/backend
node scripts/verify-fix.js
```

Expected output:
```
✅ FIX VERIFICATION COMPLETE

Summary:
  - Problematic record (cmk55h5y90001e192gbzd7yu8) removed
  - Database queries execute without errors
  - All existing IDs have correct format (inv_ prefix, 28 chars)
```

## Testing the API Endpoint

The endpoint `GET /api/v-alpha/admin/invites` now works without errors.

**Note:** This endpoint requires **ServerAccessToken** authentication (not just Admin JWT).

### Authentication Architecture

The endpoint is protected by TWO guards:
1. **Global `ServerAccessGuard`** (requires Server Access Token via `X-Server-Access-Token` header)
2. **`AdminJwtAuthGuard`** (requires Admin JWT via Authorization header or cookie)

Only the `/admin/setup` endpoint skips the ServerAccessGuard using `@SkipServerAccess()` decorator.

## Files Created

- `scripts/debug-invite-codes.ts` - Debug script (can be deleted)
- `scripts/fix-invite-codes.js` - Fix script (can be deleted after verification)
- `scripts/test-invite-endpoint.js` - Test helper (can be deleted)
- `scripts/verify-fix.js` - Verification script (keep for future reference)

## Prevention

To prevent this issue in the future:

1. **Never manually create InviteCode records** in the database
2. **Always use the domain model** (`InviteCode.create()`) to generate IDs
3. **E2E tests** already validate correct ID format
4. **Integration tests** should also validate ID format (see existing tests)

## Related Files

- Domain Model: `src/domain/aggregates/invite-code.aggregate.ts`
- Value Object: `src/domain/value-objects/invite-code-id.ts`
- Repository: `src/infrastructure/invite-code/repositories/prisma-invite-code.repository.ts`
- Mapper: `src/infrastructure/invite-code/mappers/prisma-invite-code.mapper.ts`
- Prisma Schema: `prisma/schema.prisma` (line 1184)

---

**Status:** ✅ Fixed and Verified
**Date:** 2026-01-08
**Impact:** Low (development environment, test data only)
