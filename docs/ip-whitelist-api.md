# IP Whitelist API Documentation

## Overview
The IP Whitelist API provides CRUD operations for managing allowed IP addresses to access the BlueLight Hub platform. This is a security feature that restricts platform access to pre-approved IP addresses.

## Configuration

### Environment Variables
```bash
# Enable/disable IP whitelist enforcement
IP_WHITELIST_ENABLED=false

# Behavior when whitelist check fails (database error, etc.)
# true = allow access (fail open), false = deny access (fail closed)
IP_WHITELIST_FAIL_OPEN=false
```

### Database Setup
Run the migration to create the required tables:
```bash
cd packages/backend
npm run prisma:migrate
```

## API Endpoints

All endpoints are prefixed with `/api/admin/security/whitelist`

### Rate Limiting
- **Limit**: 10 requests per minute per IP address
- **Response**: `429 Too Many Requests` when exceeded

### Create IP Whitelist Entry
```http
POST /api/admin/security/whitelist
Content-Type: application/json

{
    "ipAddress": "192.168.1.100",
    "description": "Office main gateway",
    "createdBy": "admin"
}
```

**Response**: `201 Created`
```json
{
    "id": "xyz123abc",
    "ipAddress": "192.168.1.100",
    "description": "Office main gateway",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": "admin"
}
```

### Get All IP Whitelist Entries
```http
GET /api/admin/security/whitelist
```

**Response**: `200 OK`
```json
[
    {
        "id": "xyz123abc",
        "ipAddress": "192.168.1.100",
        "description": "Office main gateway",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "createdBy": "admin"
    }
]
```

### Get Active IP Whitelist Entries Only
```http
GET /api/admin/security/whitelist/active
```

### Get Specific IP Whitelist Entry
```http
GET /api/admin/security/whitelist/:id
```

### Update IP Whitelist Entry
```http
PATCH /api/admin/security/whitelist/:id
Content-Type: application/json

{
    "description": "Updated description",
    "isActive": false
}
```

### Delete IP Whitelist Entry
```http
DELETE /api/admin/security/whitelist/:id
```

**Response**: `204 No Content`

### Activate IP Whitelist Entry
```http
PATCH /api/admin/security/whitelist/:id/activate
```

### Deactivate IP Whitelist Entry
```http
PATCH /api/admin/security/whitelist/:id/deactivate
```

## Error Responses

### Validation Errors
```json
{
    "statusCode": 400,
    "message": ["ipAddress must be a valid IP address"],
    "error": "Bad Request"
}
```

### Conflict (IP Already Exists)
```json
{
    "statusCode": 409,
    "message": "IP address 192.168.1.100 is already whitelisted",
    "error": "Conflict"
}
```

### Not Found
```json
{
    "statusCode": 404,
    "message": "IP whitelist entry with ID xyz123abc not found",
    "error": "Not Found"
}
```

### Rate Limited
```json
{
    "statusCode": 429,
    "message": "Rate limit exceeded. Please try again later.",
    "error": "Too Many Requests"
}
```

### Access Denied (IP Not Whitelisted)
```json
{
    "statusCode": 403,
    "message": "Access denied: IP address not whitelisted",
    "error": "Forbidden"
}
```

## Middleware Behavior

When `IP_WHITELIST_ENABLED=true`:
- All requests are checked against the whitelist
- Only requests from active whitelisted IPs are allowed
- Admin whitelist endpoints (`/admin/security/whitelist`) are excluded from checking
- Health endpoints (`/health`) are excluded from checking
- Failed checks are logged to audit trail

## Audit Logging

All IP whitelist operations are automatically logged with:
- Action performed (CREATE, UPDATE, DELETE, ACCESS_GRANTED, ACCESS_DENIED)
- User ID and IP address
- Timestamp and additional details
- Request metadata (User-Agent, etc.)

## Security Considerations

1. **Fail-Safe Modes**: Configure `IP_WHITELIST_FAIL_OPEN` based on your security requirements
2. **Rate Limiting**: Built-in protection against brute force attacks
3. **Audit Trail**: Complete logging of all security events
4. **IP Format Support**: Supports both IPv4 and IPv6 addresses
5. **Proxy Support**: Handles X-Forwarded-For and X-Real-IP headers

## Usage Examples

### Initial Setup
1. Set `IP_WHITELIST_ENABLED=false` in your environment
2. Add your admin IPs to the whitelist via API
3. Test access with the IPs
4. Set `IP_WHITELIST_ENABLED=true` to enforce

### Adding Office Network
```bash
curl -X POST http://localhost:3000/api/admin/security/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "ipAddress": "203.0.113.0/24",
    "description": "Office network range",
    "createdBy": "admin"
  }'
```

### Emergency Access
If locked out, temporarily set `IP_WHITELIST_FAIL_OPEN=true` to regain access, then add your IP and revert the setting.