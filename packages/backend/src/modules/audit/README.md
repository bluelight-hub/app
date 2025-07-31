# Audit Module

## Overview

The Audit Module provides comprehensive audit logging capabilities for the BlueLight Hub backend. It includes an interceptor that automatically logs all API calls, decorators for fine-grained control, and utilities for managing audit logs.

## Architecture

The module uses a single, configurable `AuditInterceptor` that provides:

- Automatic request/response logging
- Pattern-based path filtering (include/exclude)
- Decorator support for custom audit behavior
- Sensitive data redaction
- Queue-based asynchronous processing
- Configurable severity mapping

## Components

### Core Services

1. **AuditLogService** - Core service for creating and querying audit logs
2. **AuditLogBatchService** - Batch processing with retention policies and export functionality
3. **AuditLogSchedulerService** - Automated maintenance tasks
4. **AuditLogCacheService** - Caching layer for performance optimization
5. **AuditLogQueue** - Bull queue for asynchronous audit log processing

### AuditInterceptor

The `AuditInterceptor` is registered globally and automatically captures all API calls. It provides:

- Request details (method, path, body, query parameters)
- Response data and status codes
- User information and IP addresses
- Execution duration
- Success/failure status
- Decorator-based customization
- Pattern-based path filtering

### Decorators

- `@SkipAudit()` - Skip audit logging for specific endpoints
- `@AuditAction(action: AuditAction)` - Set custom action type
- `@AuditSeverity(severity: AuditSeverity)` - Set custom severity level
- `@AuditResourceType(resourceType: string)` - Set resource type
- `@AuditContext(context: Record<string, any>)` - Add additional context

## Configuration

The `AuditInterceptor` is registered globally in the `AuditModule` and uses the following default configuration:

```typescript
{
  excludePaths: ['/health', '/metrics', '/api-docs', '/swagger', '/favicon.ico', '/public', '/robots.txt', '/_next', '/static'],
  includePaths: ['/', '/api', '/admin', '/api/admin'],
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'],
  maxBodySize: 10 * 1024, // 10KB
  // ... additional configuration
}
```

### Environment Variables

- `AUDIT_SCHEDULER_ENABLED` - Enable/disable scheduled tasks (default: true)
- `AUDIT_BATCH_SIZE` - Batch processing size (default: 100)
- `AUDIT_DEFAULT_RETENTION_DAYS` - Default retention period (default: 365)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis configuration for audit queue

## Usage

### Using Decorators

```typescript
import { Controller, Post, Get, Delete } from '@nestjs/common';
import {
  SkipAudit,
  AuditAction,
  AuditSeverity,
  AuditResourceType,
  AuditContext,
} from '../audit/decorators';
import { AuditAction as AuditActionType } from '../audit/types';

@Controller('admin/users')
export class UserController {
  // Default behavior - automatically logged
  @Post()
  createUser() {
    // Logged as CREATE action based on HTTP method
  }

  // Custom audit action
  @Post(':id/approve')
  @AuditAction(AuditActionType.APPROVE)
  @AuditSeverity(AuditSeverity.HIGH)
  @AuditResourceType('user')
  approveUser() {
    // ...
  }

  // Skip audit logging for this endpoint
  @Get('stats')
  @SkipAudit()
  getUserStatistics() {
    // ...
  }

  // Add additional context
  @Delete(':id')
  @AuditAction(AuditActionType.DELETE)
  @AuditContext({ reason: 'User requested deletion' })
  deleteUser() {
    // ...
  }
}
```

### Custom Configuration

You can customize the interceptor behavior by creating a custom configuration:

```typescript
import { createAuditInterceptor, createAuditInterceptorConfig } from './audit';
import { AuditLogService, AuditLogQueue } from './audit/services';

// Custom configuration
const customConfig = createAuditInterceptorConfig({
  excludePaths: ['/admin/debug', '/internal'],
  includePaths: ['/api/v2', '/graphql'],
  sensitiveFields: ['socialSecurityNumber', 'bankAccount'],
  maxBodySize: 50 * 1024, // 50KB
  resourceMapping: {
    '/api/v2/accounts': 'account',
    '/api/v2/transactions': 'transaction',
  },
  actionMapping: {
    'POST /api/v2/accounts/*/verify': AuditAction.APPROVE,
    'POST /api/v2/accounts/*/suspend': AuditAction.BLOCK,
  },
});

// Create configured interceptor
const auditInterceptor = createAuditInterceptor(auditLogService, auditLogQueue, customConfig);
```

## Security Considerations

- Sensitive data (passwords, tokens, API keys) are automatically redacted
- Request/response bodies are truncated if they exceed the configured size limit
- IP addresses are extracted from headers to handle proxied requests
- Stack traces are only included in development environments

## Best Practices

1. Use specific audit decorators (`@AuditCreate`, `@AuditUpdate`, etc.) for better semantics
2. Add descriptions to critical actions using the `description` field
3. Use `@NoAudit()` sparingly and only for endpoints that truly don't need auditing
4. Configure appropriate severity levels for different actions
5. Ensure all admin endpoints are covered by the interceptor

## Testing

The module includes comprehensive tests. Run them with:

```bash
npm test -- audit.interceptor.spec.ts
```
