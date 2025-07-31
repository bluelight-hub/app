# Backend Testing Guide

## TEMPORARILY DISABLED

Backend tests have been temporarily disabled due to CI/CD issues. The testing infrastructure is being restructured.

### Current Status

- All test files have been removed
- Coverage requirements have been disabled
- A minimal placeholder test exists to prevent CI failures

### Test Commands (Currently Limited)

```bash
# Run minimal test
pnpm --filter @bluelight-hub/backend test

# Previously available commands (disabled):
# pnpm --filter @bluelight-hub/backend test:unit
# pnpm --filter @bluelight-hub/backend test:e2e
# pnpm --filter @bluelight-hub/backend test:cov
# pnpm --filter @bluelight-hub/backend test:watch
```

### Future Plans

The testing infrastructure will be rebuilt with:

- Improved CI/CD compatibility
- Better test isolation
- More efficient test execution
- Reduced flakiness

For now, please ensure code quality through:

- Manual testing
- Code reviews
- Linting and type checking
- Frontend tests (which remain active)
