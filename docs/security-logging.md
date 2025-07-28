# Security Logging System Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Event Type Catalog](#event-type-catalog)
3. [Troubleshooting Guide](#troubleshooting-guide)
4. [Performance Recommendations](#performance-recommendations)
5. [API Reference](#api-reference)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Guide](#deployment-guide)

## Architecture Overview

### System Components

The BlueLight Hub Security Logging System consists of several key components working together to provide comprehensive security event tracking:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Auth Module  │  API Controllers  │  Interceptors  │  Guards    │
└───────────────┴──────────┬───────────┴──────────────┴───────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Security Logging Service                      │
├─────────────────────────────────────────────────────────────────┤
│  • Event Creation        │  • Priority Handling                 │
│  • Queue Management      │  • Metric Collection                 │
└──────────────────────────┴──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BullMQ Queue                              │
├─────────────────────────────────────────────────────────────────┤
│  • Job Scheduling        │  • Retry Logic                       │
│  • Priority Processing   │  • Backpressure Handling            │
└──────────────────────────┴──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Security Log Processor                         │
├─────────────────────────────────────────────────────────────────┤
│  • Hash Chain Creation   │  • Sequential Processing             │
│  • Data Validation       │  • Metric Recording                  │
└──────────────────────────┴──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
├─────────────────────────────────────────────────────────────────┤
│  SecurityLog Table:                                             │
│  • id, eventType, userId, ipAddress                            │
│  • sequenceNumber, previousHash, currentHash                    │
│  • metadata, createdAt, updatedAt                              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Event Generation**: Security events are generated throughout the application (login, logout, permission changes, etc.)
2. **Queue Insertion**: Events are added to the BullMQ queue with appropriate priority
3. **Processing**: The SecurityLogProcessor picks up jobs and processes them sequentially
4. **Hash Chain**: Each log entry includes a hash of the previous entry, creating an immutable chain
5. **Storage**: Processed logs are stored in PostgreSQL with full indexing
6. **Archival**: Old logs are archived and compressed based on retention policies

### Hash Chain Integrity

The system implements a blockchain-inspired hash chain to ensure log integrity:

```javascript
currentHash = SHA256(
  eventType + userId + ipAddress + userAgent + metadata + sequenceNumber + previousHash + timestamp,
);
```

This ensures that:

- Logs cannot be tampered with without detection
- The order of events is cryptographically guaranteed
- Missing entries can be detected

## Event Type Catalog

### Authentication Events

| Event Type        | Severity | Description           | Metadata                          |
| ----------------- | -------- | --------------------- | --------------------------------- |
| `LOGIN_SUCCESS`   | INFO     | Successful user login | `{email, sessionId, loginMethod}` |
| `LOGIN_FAILED`    | WARNING  | Failed login attempt  | `{email, reason, attemptCount}`   |
| `LOGOUT`          | INFO     | User logout           | `{sessionId, duration}`           |
| `TOKEN_REFRESHED` | INFO     | JWT token refresh     | `{oldTokenId, newTokenId}`        |
| `SESSION_EXPIRED` | INFO     | Session timeout       | `{sessionId, lastActivity}`       |

### Account Management Events

| Event Type                 | Severity | Description              | Metadata              |
| -------------------------- | -------- | ------------------------ | --------------------- |
| `PASSWORD_CHANGED`         | HIGH     | Password modification    | `{method, enforced}`  |
| `PASSWORD_RESET_REQUESTED` | MEDIUM   | Password reset initiated | `{email, requestId}`  |
| `PASSWORD_RESET_COMPLETED` | HIGH     | Password reset completed | `{requestId}`         |
| `ACCOUNT_LOCKED`           | HIGH     | Account locked           | `{reason, duration}`  |
| `ACCOUNT_UNLOCKED`         | HIGH     | Account unlocked         | `{unlockedBy}`        |
| `ACCOUNT_CREATED`          | MEDIUM   | New account created      | `{createdBy, role}`   |
| `ACCOUNT_DELETED`          | HIGH     | Account deleted          | `{deletedBy, reason}` |

### Permission & Role Events

| Event Type             | Severity | Description              | Metadata                        |
| ---------------------- | -------- | ------------------------ | ------------------------------- |
| `ROLE_CHANGED`         | HIGH     | User role modified       | `{oldRole, newRole, changedBy}` |
| `PERMISSION_GRANTED`   | HIGH     | Permission added         | `{permission, grantedBy}`       |
| `PERMISSION_REVOKED`   | HIGH     | Permission removed       | `{permission, revokedBy}`       |
| `ADMIN_ACCESS_GRANTED` | CRITICAL | Admin privileges granted | `{grantedBy, reason}`           |

### Security Events

| Event Type             | Severity | Description              | Metadata                 |
| ---------------------- | -------- | ------------------------ | ------------------------ |
| `SUSPICIOUS_ACTIVITY`  | HIGH     | Anomaly detected         | `{type, details, score}` |
| `BRUTE_FORCE_DETECTED` | CRITICAL | Multiple failed attempts | `{attempts, timeWindow}` |
| `ACCOUNT_COMPROMISED`  | CRITICAL | Potential breach         | `{indicators, actions}`  |
| `INVALID_TOKEN`        | WARNING  | Invalid JWT presented    | `{tokenId, reason}`      |
| `IP_BLOCKED`           | HIGH     | IP address blocked       | `{reason, duration}`     |

### API Access Events

| Event Type            | Severity | Description             | Metadata                    |
| --------------------- | -------- | ----------------------- | --------------------------- |
| `API_ACCESS_DENIED`   | WARNING  | Unauthorized API access | `{endpoint, reason}`        |
| `RATE_LIMIT_EXCEEDED` | WARNING  | Rate limit triggered    | `{endpoint, limit, window}` |
| `ADMIN_API_ACCESSED`  | HIGH     | Admin endpoint accessed | `{endpoint, action}`        |
| `DATA_EXPORTED`       | HIGH     | Data export performed   | `{type, recordCount}`       |

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High Queue Depth

**Symptoms**: Queue size continuously growing, processing delays

**Diagnosis**:

```bash
# Check queue metrics
curl http://localhost:3000/api/metrics/security-logs/extended | jq '.queue'

# Check worker status
docker exec -it app-redis redis-cli
> INFO clients
```

**Solutions**:

- Scale up workers: Increase `SECURITY_LOG_WORKERS` environment variable
- Check for processing errors in logs
- Verify database performance and indexes
- Consider implementing queue rate limiting

#### 2. Chain Integrity Failures

**Symptoms**: Health check reports chain integrity issues

**Diagnosis**:

```sql
-- Find gaps in sequence numbers
SELECT
  s1.sequenceNumber + 1 as missing_start,
  MIN(s2.sequenceNumber) - 1 as missing_end
FROM SecurityLog s1
LEFT JOIN SecurityLog s2 ON s1.sequenceNumber < s2.sequenceNumber
WHERE NOT EXISTS (
  SELECT 1 FROM SecurityLog s3
  WHERE s3.sequenceNumber = s1.sequenceNumber + 1
)
GROUP BY s1.sequenceNumber;

-- Verify hash chain
SELECT
  id,
  sequenceNumber,
  previousHash,
  currentHash,
  CASE
    WHEN LAG(currentHash) OVER (ORDER BY sequenceNumber) = previousHash
    THEN 'Valid'
    ELSE 'Invalid'
  END as chain_status
FROM SecurityLog
ORDER BY sequenceNumber DESC
LIMIT 100;
```

**Solutions**:

- Run integrity verification: `npm run security:verify-chain`
- Restore from backup if tampering detected
- Check for concurrent write issues
- Enable transaction logging for debugging

#### 3. Performance Degradation

**Symptoms**: Slow API responses, high processing times

**Diagnosis**:

```bash
# Check database query performance
EXPLAIN ANALYZE
SELECT * FROM SecurityLog
WHERE eventType = 'LOGIN_SUCCESS'
AND createdAt > NOW() - INTERVAL '1 day'
ORDER BY createdAt DESC
LIMIT 100;

# Monitor real-time metrics
watch -n 1 'curl -s http://localhost:3000/api/metrics/security-logs | grep -E "processing_time|queue_size"'
```

**Solutions**:

- Ensure indexes exist on frequently queried columns
- Implement pagination for large result sets
- Consider partitioning the SecurityLog table by date
- Enable query result caching

#### 4. Redis Memory Issues

**Symptoms**: Redis OOM errors, queue failures

**Diagnosis**:

```bash
# Check Redis memory
redis-cli INFO memory

# Analyze key patterns
redis-cli --scan --pattern "bull:security-log:*" | head -20
```

**Solutions**:

- Configure Redis maxmemory policy: `maxmemory-policy allkeys-lru`
- Reduce job retention time
- Enable Redis persistence (AOF)
- Consider Redis cluster for scaling

### Log Analysis Queries

#### Find Suspicious Activity Patterns

```sql
-- Multiple failed logins from same IP
SELECT
  ipAddress,
  COUNT(*) as failed_attempts,
  MIN(createdAt) as first_attempt,
  MAX(createdAt) as last_attempt
FROM SecurityLog
WHERE eventType = 'LOGIN_FAILED'
AND createdAt > NOW() - INTERVAL '1 hour'
GROUP BY ipAddress
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

#### Track User Activity Timeline

```sql
-- User activity timeline
SELECT
  eventType,
  createdAt,
  ipAddress,
  metadata
FROM SecurityLog
WHERE userId = 'USER_ID_HERE'
ORDER BY createdAt DESC
LIMIT 50;
```

#### Identify Anomalies

```sql
-- Unusual access patterns
WITH user_ips AS (
  SELECT
    userId,
    ipAddress,
    COUNT(*) as access_count
  FROM SecurityLog
  WHERE createdAt > NOW() - INTERVAL '7 days'
  GROUP BY userId, ipAddress
)
SELECT
  userId,
  COUNT(DISTINCT ipAddress) as unique_ips,
  STRING_AGG(ipAddress || ' (' || access_count || ')', ', ') as ip_list
FROM user_ips
GROUP BY userId
HAVING COUNT(DISTINCT ipAddress) > 3
ORDER BY unique_ips DESC;
```

## Performance Recommendations

### Database Optimization

1. **Indexing Strategy**

```sql
-- Essential indexes
CREATE INDEX idx_security_log_event_type ON SecurityLog(eventType);
CREATE INDEX idx_security_log_user_id ON SecurityLog(userId);
CREATE INDEX idx_security_log_created_at ON SecurityLog(createdAt DESC);
CREATE INDEX idx_security_log_ip_address ON SecurityLog(ipAddress);

-- Composite indexes for common queries
CREATE INDEX idx_security_log_user_event_date
  ON SecurityLog(userId, eventType, createdAt DESC);
CREATE INDEX idx_security_log_event_date
  ON SecurityLog(eventType, createdAt DESC);
```

2. **Partitioning**

```sql
-- Partition by month for better performance
CREATE TABLE SecurityLog_2024_01 PARTITION OF SecurityLog
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

3. **Maintenance**

```sql
-- Regular VACUUM and ANALYZE
VACUUM ANALYZE SecurityLog;

-- Update statistics
ANALYZE SecurityLog;
```

### Queue Configuration

1. **Optimal Worker Configuration**

```javascript
// .env configuration
SECURITY_LOG_WORKERS = 4; // Number of CPU cores
SECURITY_LOG_CONCURRENCY = 10; // Jobs per worker
SECURITY_LOG_MAX_JOBS_PER_WORKER = 100;
```

2. **Job Options**

```javascript
// Recommended job options
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600, // 1 hour
    count: 1000, // Keep last 1000
  },
  removeOnFail: {
    age: 24 * 3600, // 24 hours
  },
}
```

### Scaling Guidelines

1. **Horizontal Scaling**

   - Use Redis Cluster for queue distribution
   - Implement database read replicas
   - Deploy multiple worker instances

2. **Vertical Scaling Thresholds**

   - Queue depth > 10,000: Add workers
   - Processing time > 200ms P95: Optimize queries
   - API response > 100ms P95: Add caching

3. **Monitoring Thresholds**
   - Set alerts for queue depth > 5,000
   - Alert on processing time > 500ms
   - Monitor failed job rate > 1%

### Caching Strategy

1. **API Response Caching**

```javascript
// Cache frequently accessed data
@CacheKey('security-logs-summary')
@CacheTTL(300) // 5 minutes
async getLogsSummary() {
  // Implementation
}
```

2. **Query Result Caching**
   - Cache event type counts
   - Cache user activity summaries
   - Invalidate on new events

## API Reference

### Endpoints

#### Query Security Logs

```http
GET /api/admin/security-logs
Authorization: Bearer <admin-token>

Query Parameters:
- page (number): Page number (default: 1)
- pageSize (number): Items per page (max: 100, default: 20)
- eventType (string): Filter by event type
- userId (string): Filter by user ID
- from (ISO 8601): Start date
- to (ISO 8601): End date

Response:
{
  "data": [
    {
      "id": "uuid",
      "eventType": "LOGIN_SUCCESS",
      "userId": "user-id",
      "ipAddress": "192.168.1.1",
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "pageSize": 20,
    "totalPages": 50
  }
}
```

#### Health Check

```http
GET /api/health/security-logs

Response:
{
  "status": "ok",
  "info": {
    "security_queue": {
      "status": "up",
      "waiting": 10,
      "active": 2
    },
    "chain_integrity": {
      "status": "up",
      "isValid": true
    }
  }
}
```

#### Metrics

```http
GET /api/metrics/security-logs

Response: Prometheus formatted metrics
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Queue Metrics**

   - `security_log_queue_size{status="waiting"}` > 5000
   - `security_log_processing_time_ms{quantile="0.95"}` > 200
   - `security_log_failed_jobs_total` rate > 0.01

2. **System Health**

   - `security_log_chain_integrity_status` != 1
   - `disk_space_free_gb` < 5
   - `redis_memory_used_percent` > 80

3. **Security Metrics**
   - `security_events_total{severity="CRITICAL"}` > 0
   - `security_events_total{event_type="LOGIN_FAILED"}` rate > 10/min
   - `security_events_total{event_type="BRUTE_FORCE_DETECTED"}` > 0

### Alert Configuration

```yaml
# Prometheus Alert Rules
groups:
  - name: security_logging
    rules:
      - alert: HighQueueDepth
        expr: security_log_queue_size{status="waiting"} > 5000
        for: 5m
        annotations:
          summary: 'Security log queue depth is high'

      - alert: ChainIntegrityFailure
        expr: security_log_chain_integrity_status != 1
        for: 1m
        annotations:
          summary: 'Security log chain integrity check failed'
          severity: critical

      - alert: CriticalSecurityEvent
        expr: rate(security_events_total{severity="CRITICAL"}[5m]) > 0
        annotations:
          summary: 'Critical security event detected'
          severity: critical
```

### Grafana Dashboard Panels

1. **Overview**

   - Total events (counter)
   - Events per second (gauge)
   - Queue depth (gauge)
   - Failed jobs (counter)

2. **Performance**

   - Processing time histogram
   - API response time
   - Queue throughput
   - Database query time

3. **Security**

   - Failed login attempts (time series)
   - Critical events (table)
   - Top 10 IPs by activity
   - Suspicious activity score

4. **System Health**
   - Chain integrity status
   - Redis memory usage
   - Disk space available
   - Worker status

## Testing Strategy

### Test Coverage Requirements

The Security Logging System maintains comprehensive test coverage across multiple layers:

1. **Unit Tests** (Target: >90%)

   - Service layer tests
   - Processor tests
   - Integrity service tests
   - Health check tests

2. **Integration Tests** (Target: >85%)

   - API endpoint tests
   - Queue processing tests
   - Database interaction tests

3. **E2E Tests** (Target: >80%)

   - Complete flow testing
   - Multi-user scenarios
   - Failure recovery tests

4. **Performance Tests**
   - Load testing (1000+ concurrent logs)
   - Stress testing (queue backpressure)
   - Endurance testing (memory leaks)

### Running Tests

```bash
# Run all tests with coverage
pnpm --filter @bluelight-hub/backend test:cov

# Run specific test suites
pnpm --filter @bluelight-hub/backend test security-log.service.spec
pnpm --filter @bluelight-hub/backend test:e2e security-logging.e2e-spec

# Run performance tests
pnpm --filter @bluelight-hub/backend test performance.spec --runInBand
```

### Test Scenarios

#### Critical Test Cases

1. **Hash Chain Integrity**

   ```typescript
   // Verify chain remains intact under concurrent writes
   it('should maintain chain integrity with concurrent logs', async () => {
     const promises = Array(100)
       .fill(0)
       .map(() => securityLogService.log('LOGIN_SUCCESS', { userId: 'test' }));
     await Promise.all(promises);
     const isValid = await integrityService.verifyChain();
     expect(isValid).toBe(true);
   });
   ```

2. **Queue Resilience**

   ```typescript
   // Test queue recovery after Redis failure
   it('should handle Redis disconnection gracefully', async () => {
     await redisService.disconnect();
     const result = await securityLogService.log('CRITICAL_EVENT', {});
     expect(result.queued).toBe(false);
     // Verify event is logged to fallback
   });
   ```

3. **Performance Benchmarks**
   - Log processing: < 50ms average
   - API response: < 100ms P95
   - Queue throughput: > 1000 logs/second

## Deployment Guide

### Prerequisites

- PostgreSQL 14+ with pgcrypto extension
- Redis 6+ with AOF persistence enabled
- Node.js 18+ with pnpm
- Minimum 4GB RAM, 2 CPU cores

### Environment Configuration

```env
# Required Environment Variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/bluelight

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=strong-password-here
REDIS_MAX_RETRIES=3
REDIS_ENABLE_AOF=true

# Security Log Configuration
SECURITY_LOG_RETENTION_DAYS=90
SECURITY_LOG_ARCHIVE_PATH=/var/lib/bluelight/archives
SECURITY_LOG_BATCH_SIZE=100
SECURITY_LOG_WORKERS=4
SECURITY_LOG_CONCURRENCY=10

# Monitoring
PROMETHEUS_METRICS_PATH=/metrics
HEALTH_CHECK_TIMEOUT=5000
```

### Deployment Steps

1. **Database Setup**

   ```sql
   -- Create database and extensions
   CREATE DATABASE bluelight;
   \c bluelight;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;

   -- Run migrations
   pnpm --filter @bluelight-hub/backend prisma migrate deploy
   ```

2. **Redis Configuration**

   ```conf
   # redis.conf
   appendonly yes
   appendfsync everysec
   maxmemory 2gb
   maxmemory-policy allkeys-lru
   ```

3. **System Service**

   ```ini
   # /etc/systemd/system/bluelight-security.service
   [Unit]
   Description=BlueLight Security Logging Service
   After=network.target postgresql.service redis.service

   [Service]
   Type=simple
   User=bluelight
   WorkingDirectory=/opt/bluelight
   ExecStart=/usr/bin/node dist/main.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

4. **Monitoring Setup**
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'bluelight-security'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: '/api/metrics/security-logs'
   ```

### Production Checklist

- [ ] Enable Redis AOF persistence
- [ ] Configure PostgreSQL backups
- [ ] Set up log rotation for archives
- [ ] Configure firewall rules
- [ ] Enable TLS for all connections
- [ ] Set up monitoring alerts
- [ ] Test disaster recovery procedures
- [ ] Document incident response plan

### Scaling Considerations

1. **Vertical Scaling**

   - Increase Redis memory for larger queues
   - Add CPU cores for more workers
   - Use SSD storage for archives

2. **Horizontal Scaling**

   - Deploy multiple worker instances
   - Use Redis Cluster for queue distribution
   - Implement database read replicas

3. **Performance Tuning**
   - Adjust batch sizes based on load
   - Optimize worker concurrency
   - Enable connection pooling

### Backup and Recovery

1. **Backup Strategy**

   ```bash
   # Daily backup script
   #!/bin/bash
   BACKUP_DIR="/backup/security-logs"
   DATE=$(date +%Y%m%d)

   # Backup database
   pg_dump bluelight -t security_logs > $BACKUP_DIR/db-$DATE.sql

   # Backup Redis AOF
   cp /var/lib/redis/appendonly.aof $BACKUP_DIR/redis-$DATE.aof

   # Backup archives
   tar -czf $BACKUP_DIR/archives-$DATE.tar.gz /var/lib/bluelight/archives
   ```

2. **Recovery Procedures**
   - Stop all services
   - Restore database from backup
   - Verify chain integrity
   - Restore Redis AOF if needed
   - Restart services in order

### Security Hardening

1. **Network Security**

   - Restrict Redis to localhost only
   - Use VPN for cross-service communication
   - Enable firewall rules

2. **Access Control**

   - Implement IP whitelisting
   - Use strong JWT secrets
   - Rotate credentials regularly

3. **Audit Trail**
   - Log all admin actions
   - Monitor configuration changes
   - Regular security audits

---

This documentation should be kept up-to-date as the system evolves. For specific implementation details, refer to the source code and inline documentation.
