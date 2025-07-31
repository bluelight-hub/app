# Notification System Configuration Guide

## Overview

The Bluelight Hub notification system provides pluggable channels for sending security and system alerts. This guide explains how to configure the notification channels.

## Environment Variables

### General Configuration

```env
# Enable/disable the entire notification system
NOTIFICATION_ENABLED=true

# Default language for notifications (de, en)
NOTIFICATION_DEFAULT_LANGUAGE=de

# Queue configuration
NOTIFICATION_QUEUE_CONCURRENCY=5
```

### Email Channel Configuration

```env
# Enable email notifications
EMAIL_ENABLED=true

# SMTP Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false  # true for 465, false for other ports
EMAIL_USER=notifications@bluelight-hub.org
EMAIL_PASSWORD=your-secure-password

# Email sender information
EMAIL_FROM_NAME=Bluelight Hub Security
EMAIL_FROM_ADDRESS=security@bluelight-hub.org

# Retry configuration
EMAIL_MAX_RETRIES=3
```

### Webhook Channel Configuration

```env
# Enable webhook notifications
WEBHOOK_ENABLED=true

# Webhook endpoint
WEBHOOK_URL=https://your-webhook-endpoint.com/notifications
WEBHOOK_AUTH_TOKEN=your-webhook-auth-token

# Webhook configuration
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3

# Optional custom headers (JSON format)
WEBHOOK_HEADERS='{"X-Custom-Header": "value"}'
```

### Security Alerts Configuration

```env
# Enable security alerts
SECURITY_ALERTS_ENABLED=true

# Legacy webhook configuration (for backward compatibility)
SECURITY_ALERT_WEBHOOK_URL=https://your-security-webhook.com
SECURITY_ALERT_AUTH_TOKEN=your-security-token

# Circuit breaker configuration
SECURITY_ALERT_FAILURE_THRESHOLD=5
SECURITY_ALERT_FAILURE_WINDOW=60000
SECURITY_ALERT_OPEN_DURATION=30000
```

### Redis Configuration (for Queue)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Usage Examples

### Sending a Test Notification

```bash
# Using the admin API
curl -X POST http://localhost:3000/api/admin/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SYSTEM_ALERT",
    "priority": "MEDIUM",
    "subject": "Test Notification",
    "message": "This is a test notification",
    "recipient": {
      "email": "admin@example.com"
    }
  }'
```

### Checking System Health

```bash
# Get notification system health metrics
curl -X GET http://localhost:3000/api/admin/notifications/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Migration from Legacy System

The new notification system is backward compatible with the existing SecurityAlertService. To migrate:

1. Add the new environment variables listed above
2. The system will automatically use SecurityAlertServiceV2 when NotificationModule is available
3. Legacy webhook configuration will continue to work
4. Gradually update your code to use the new NotificationService directly

## Templates

Default security event templates are automatically loaded on system startup. Available templates:

- `account_locked` - Account lockout notification
- `suspicious_login` - Suspicious login attempt
- `brute_force_detected` - Brute force attack detection
- `multiple_failed_attempts` - Multiple failed login attempts

## Monitoring and Troubleshooting

### Health Endpoints

- `/api/admin/notifications/health` - Overall system health
- `/api/admin/notifications/channels/validate` - Validate channel configurations
- `/api/admin/notifications/queue/stats` - Queue statistics

### Logs

The notification system logs all activities with the following loggers:

- `NotificationService` - Core service operations
- `EmailChannel` - Email-specific operations
- `WebhookChannel` - Webhook-specific operations
- `NotificationHealthService` - Health monitoring

### Common Issues

1. **Emails not sending**

   - Check SMTP credentials
   - Verify firewall allows outbound SMTP
   - Check email channel health status

2. **Webhook failures**

   - Verify webhook URL is accessible
   - Check authentication token
   - Review circuit breaker status

3. **Queue processing issues**
   - Ensure Redis is running
   - Check queue statistics for failed jobs
   - Review processor logs for errors

## Security Considerations

1. Store sensitive credentials (passwords, tokens) in environment variables
2. Use HTTPS for webhook endpoints
3. Implement IP whitelisting for webhook endpoints if possible
4. Monitor failed notification attempts for potential security issues
5. Regularly rotate authentication tokens

## Performance Tuning

1. Adjust `NOTIFICATION_QUEUE_CONCURRENCY` based on your server capacity
2. Configure retry delays to prevent overwhelming external services
3. Use circuit breakers to prevent cascading failures
4. Monitor queue depth and adjust processing rates accordingly
