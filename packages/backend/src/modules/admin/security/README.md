# Security Module

This module implements security features for the BlueLight Hub application, including IP whitelisting and audit logging.

## Features

### IP Whitelist
- **Purpose**: Restrict platform access to approved IP addresses
- **Location**: `/modules/admin/security/ip-whitelist/`
- **Database**: `IpWhitelist` table with indexed lookups
- **Middleware**: Global request filtering with configurable behavior

### Audit Logging
- **Purpose**: Track all security-relevant events for compliance
- **Location**: `/modules/admin/security/audit-log/`
- **Database**: `AuditLog` table with JSON details storage
- **Integration**: Automatic logging for all IP whitelist operations

### Rate Limiting
- **Purpose**: Prevent abuse of admin security endpoints
- **Implementation**: In-memory rate limiting (10 requests/minute per IP)
- **Scope**: Applied to all IP whitelist endpoints

## Architecture

```
AdminModule
└── SecurityModule
    ├── IpWhitelistModule
    │   ├── IpWhitelistService
    │   ├── IpWhitelistController
    │   └── RateLimitInterceptor
    └── AuditLogModule
        └── AuditLogService
```

## Database Schema

### IpWhitelist Table
```sql
CREATE TABLE "IpWhitelist" (
    "id" TEXT PRIMARY KEY,
    "ipAddress" VARCHAR(45) UNIQUE NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255) NOT NULL
);
```

### AuditLog Table
```sql
CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(255),
    "userId" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables
```bash
# IP Whitelist Configuration
IP_WHITELIST_ENABLED=false     # Enable/disable enforcement
IP_WHITELIST_FAIL_OPEN=false   # Fail-safe behavior

# Database
DATABASE_URL="postgresql://..."
```

### Middleware Integration
The IP whitelist middleware is globally applied in `AppModule`:

```typescript
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(IpWhitelistMiddleware)
            .forRoutes('*');
    }
}
```

### Excluded Routes
- `/admin/security/whitelist/*` - Admin endpoints
- `/health/*` - Health check endpoints

## Usage

### Development
```bash
# Disable IP whitelist for development
IP_WHITELIST_ENABLED=false

# Start the server
npm run dev
```

### Production Setup
1. **Add your admin IPs first** (with enforcement disabled):
   ```bash
   curl -X POST http://localhost:3000/api/admin/security/whitelist \
     -H "Content-Type: application/json" \
     -d '{"ipAddress": "YOUR_ADMIN_IP", "description": "Admin access", "createdBy": "admin"}'
   ```

2. **Enable enforcement**:
   ```bash
   IP_WHITELIST_ENABLED=true
   ```

3. **Restart the server**

### Emergency Access
If you get locked out:
1. Set `IP_WHITELIST_FAIL_OPEN=true` temporarily
2. Restart the server
3. Add your IP to the whitelist
4. Set `IP_WHITELIST_FAIL_OPEN=false`
5. Restart the server

## API Reference

See [`docs/ip-whitelist-api.md`](../../../docs/ip-whitelist-api.md) for complete API documentation.

## Testing

### Unit Tests
```bash
# Run IP whitelist service tests
npm test -- ip-whitelist.service.spec.ts

# Run controller tests
npm test -- ip-whitelist.controller.spec.ts
```

### Integration Testing
```bash
# Run the test script
./scripts/test-ip-whitelist-api.sh
```

### Manual Testing
1. Start the server with `IP_WHITELIST_ENABLED=false`
2. Use the test script or curl commands to add/modify IPs
3. Enable enforcement and test access restriction
4. Check audit logs in the database

## Security Considerations

### Fail-Safe Modes
- **Fail Closed** (`IP_WHITELIST_FAIL_OPEN=false`): Deny access on database errors (default)
- **Fail Open** (`IP_WHITELIST_FAIL_OPEN=true`): Allow access on database errors

### Rate Limiting
- 10 requests per minute per IP per endpoint
- In-memory storage (resets on server restart)
- Could be enhanced with Redis for persistence

### Audit Trail
- All operations are logged with full context
- Includes IP addresses, user agents, and request details
- Searchable by resource, user, or time range

### IP Address Handling
- Supports IPv4 and IPv6
- Handles proxy headers (`X-Forwarded-For`, `X-Real-IP`)
- Validates IP format on input

## Future Enhancements

1. **Persistent Rate Limiting**: Use Redis for cross-instance rate limiting
2. **IP Ranges**: Support CIDR notation for network ranges
3. **Geolocation**: Add country-based filtering
4. **Admin UI**: Web interface for IP management
5. **Webhook Integration**: Notify external systems of security events
6. **Export/Import**: Bulk operations for IP lists

## Dependencies

- **NestJS**: Framework and decorators
- **Prisma**: Database ORM
- **class-validator**: DTO validation
- **@nestjs/swagger**: API documentation
- **Express**: Request/response types

## Troubleshooting

### Common Issues

1. **Middleware circular dependency**:
   - Ensure proper module imports in `CommonModule`
   - Check that `AdminModule` is imported before `CommonModule`

2. **Rate limiting not working**:
   - Verify interceptor is applied to controller
   - Check if requests are coming from same IP

3. **IP whitelist not enforcing**:
   - Confirm `IP_WHITELIST_ENABLED=true`
   - Check middleware is applied globally
   - Verify IP format in database

4. **Database migration issues**:
   - Run `npm run prisma:migrate` to apply schema changes
   - Check PostgreSQL connection and permissions

### Debugging
Enable debug logging:
```bash
DEBUG=bluelight:security npm run dev
```