# Backend Testing Guide

## Overview

This guide covers testing practices for the Bluelight Hub backend, including unit tests, integration tests, E2E tests, and performance tests.

## Test Structure

```
packages/backend/
├── src/
│   └── modules/
│       └── [module]/
│           ├── __tests__/           # Module-specific tests
│           ├── services/__tests__/  # Service tests
│           └── controllers/__tests__/ # Controller tests
├── e2e/                            # End-to-end tests
└── test/                           # Shared test utilities
```

## Running Tests

### All Tests

```bash
pnpm --filter @bluelight-hub/backend test
```

### Unit Tests Only

```bash
pnpm --filter @bluelight-hub/backend test:unit
```

### E2E Tests

```bash
pnpm --filter @bluelight-hub/backend test:e2e
```

### Coverage

```bash
pnpm --filter @bluelight-hub/backend test:cov
```

### Watch Mode

```bash
pnpm --filter @bluelight-hub/backend test:watch
```

### Single Test

```bash
pnpm --filter @bluelight-hub/backend test -- -t "test name"
```

## Audit Tests

The audit module has comprehensive test coverage including unit, integration, E2E, and performance tests.

### Test Files

- **Unit Tests**: `src/modules/audit/**/*.spec.ts`
- **Integration Test**: `src/modules/audit/__tests__/audit-integration.spec.ts`
- **E2E Test**: `e2e/audit-logging.e2e-spec.ts`
- **Performance Test**: `src/modules/audit/__tests__/audit-performance.spec.ts`

### Running Audit Tests

```bash
# All audit tests
pnpm --filter @bluelight-hub/backend test -- audit

# E2E audit tests only
pnpm --filter @bluelight-hub/backend test:e2e -- audit-logging

# Performance tests
pnpm --filter @bluelight-hub/backend test -- audit-performance
```

### Audit Test Utils

The audit module provides test utilities in `src/modules/audit/__tests__/utils/auditTestUtils.ts`:

```typescript
import {
  buildAuditEntryMatcher,
  createTestAuditLog,
  waitForAuditProcessing,
  AuditTestScenarios,
} from '@/modules/audit/__tests__/utils/auditTestUtils';

// Example usage
const matcher = buildAuditEntryMatcher({
  actionType: AuditActionType.CREATE,
  severity: AuditSeverity.MEDIUM,
  success: true,
});

expect(auditLog).toMatchObject(matcher);
```

### Using Audit Decorators in Tests

The audit module provides decorators for controlling audit behavior:

```typescript
import { NoAudit, Audit, AuditDelete } from '@/modules/audit/decorators/audit.decorator';

@Controller('test')
export class TestController {
  @NoAudit() // Skip audit logging
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Audit({
    action: AuditActionType.APPROVE,
    severity: AuditSeverity.HIGH,
    resourceType: 'document',
  })
  @Post('approve/:id')
  approve(@Param('id') id: string) {
    // Custom audit metadata
  }

  @AuditDelete('user') // Shorthand for delete operations
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    // Automatically sets HIGH severity
  }
}
```

### Performance Test Configuration

Performance thresholds can be configured via environment variables:

```bash
# .env.test
AUDIT_PERF_SINGLE_CREATE=50      # Max ms for single create operation (default: 50)
AUDIT_PERF_SINGLE_QUERY=100      # Max ms for single query (default: 100)
AUDIT_PERF_BULK_TIMEOUT=10000    # Max ms for bulk operations (default: 10000)
AUDIT_PERF_MIN_THROUGHPUT=100    # Min operations per second (default: 100)
AUDIT_PERF_COMPLEX_QUERY=200     # Max ms for complex queries (default: 200)
AUDIT_PERF_STATISTICS=300        # Max ms for statistics (default: 300)
AUDIT_PERF_ARCHIVE=1000          # Max ms for archive operation (default: 1000)
AUDIT_PERF_DELETE=2000           # Max ms for delete operation (default: 2000)
```

## Testing Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clean up test data in `afterEach` or `afterAll`

### 2. Mocking

```typescript
// Mock external services
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// Use in test module
Test.createTestingModule({
  providers: [UserService, { provide: PrismaService, useValue: mockPrismaService }],
});
```

### 3. Async Testing

```typescript
// Wait for async operations
await waitForAuditProcessing(100);

// Use proper async/await
it('should process async operation', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### 4. E2E Testing

```typescript
// Use supertest for HTTP requests
const response = await request(app.getHttpServer())
  .post('/api/users')
  .set('Authorization', `Bearer ${token}`)
  .send(userData)
  .expect(201);
```

## CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run Backend Tests
  run: pnpm --filter @bluelight-hub/backend test:cov

- name: Run E2E Tests
  run: pnpm --filter @bluelight-hub/backend test:e2e
```

### Test Requirements

- All tests must pass before merging
- Code coverage must remain above 80%
- No skipped tests in production code
- Performance tests must meet configured thresholds

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Ensure test database is running
   - Check `.env.test` configuration

2. **Flaky Tests**

   - Increase timeout values
   - Add proper wait conditions
   - Use deterministic test data

3. **Performance Test Failures**
   - Adjust thresholds via environment variables
   - Run tests in isolation
   - Check for resource constraints

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* pnpm --filter @bluelight-hub/backend test

# Run specific test in debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand
```
