# Audit Module

## Overview

The Audit Module provides comprehensive audit logging capabilities for the BlueLight Hub backend. It includes an interceptor that automatically logs all admin actions, decorators for fine-grained control, and utilities for managing audit logs.

## Components

### AuditInterceptor

The `AuditInterceptor` automatically captures and logs all admin API calls, including:

- Request details (method, path, body, query parameters)
- Response data and status codes
- User information and IP addresses
- Execution duration
- Success/failure status

### Decorators

- `@Audit()` - Configure audit behavior for specific endpoints
- `@NoAudit()` - Skip audit logging for specific endpoints
- `@AuditCreate()`, `@AuditUpdate()`, `@AuditDelete()` - Predefined decorators for common actions

## Usage

### Applying the Interceptor Globally

To apply the audit interceptor to all admin routes, add it to your module or globally in `main.ts`:

```typescript
// In a specific module (e.g., AdminModule)
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/interceptors';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AdminModule {}
```

Or globally in `main.ts`:

```typescript
import { AuditInterceptor } from './modules/audit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the interceptor instance from the IoC container
  const auditInterceptor = app.get(AuditInterceptor);
  app.useGlobalInterceptors(auditInterceptor);

  // ... rest of bootstrap
}
```

### Using Decorators

```typescript
import { Controller, Post, Get, Delete } from '@nestjs/common';
import { Audit, NoAudit, AuditCreate, AuditDelete, AuditCritical } from '../audit/decorators';
import { AuditAction } from '../audit/types';

@Controller('admin/users')
export class UserController {
  // Automatically logged as CREATE action with MEDIUM severity
  @Post()
  @AuditCreate('user')
  createUser() {
    // ...
  }

  // Custom audit configuration
  @Post(':id/approve')
  @Audit({
    action: AuditAction.APPROVE,
    severity: AuditSeverity.HIGH,
    resourceType: 'user',
    description: 'Admin approved user account',
  })
  approveUser() {
    // ...
  }

  // Skip audit logging for this endpoint
  @Get('stats')
  @NoAudit()
  getUserStatistics() {
    // ...
  }

  // Critical action with custom description
  @Delete('purge')
  @AuditCritical(AuditAction.DELETE, 'user', 'Permanently delete all inactive users')
  purgeInactiveUsers() {
    // ...
  }
}
```

### Custom Configuration

You can customize the interceptor behavior by providing a custom configuration:

```typescript
import { Module } from '@nestjs/common';
import { AuditInterceptor, createAuditInterceptorConfig } from './audit';

@Module({
  providers: [
    {
      provide: AuditInterceptor,
      useFactory: (auditLogger: AuditLoggerUtil) => {
        const customConfig = createAuditInterceptorConfig({
          excludePaths: ['/admin/debug'],
          sensitiveFields: ['socialSecurityNumber', 'bankAccount'],
          maxBodySize: 50 * 1024, // 50KB
        });
        return new AuditInterceptor(auditLogger, customConfig);
      },
      inject: [AuditLoggerUtil],
    },
  ],
})
export class AdminModule {}
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
