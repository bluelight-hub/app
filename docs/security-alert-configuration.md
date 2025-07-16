# Security Alert Configuration

This document describes the configuration options for the security alert webhook system with retry mechanism and circuit breaker pattern.

## Overview

The security alert system now includes:

- **Exponential backoff retry mechanism** for transient failures
- **Circuit breaker pattern** to prevent cascading failures
- **Configurable timeouts** and retry behavior

## Environment Variables

### Basic Configuration

- `SECURITY_ALERTS_ENABLED` (boolean, default: `false`)
  - Enables/disables the security alert system
- `SECURITY_ALERT_WEBHOOK_URL` (string, required if enabled)
  - The webhook endpoint URL to send security alerts to
- `SECURITY_ALERT_AUTH_TOKEN` (string, optional)
  - Bearer token for webhook authentication

### Retry Configuration

- `SECURITY_ALERT_MAX_RETRIES` (number, default: `3`)
  - Maximum number of retry attempts for failed webhook calls
- `SECURITY_ALERT_BASE_DELAY` (number, default: `1000`)
  - Base delay in milliseconds for the first retry
- `SECURITY_ALERT_MAX_DELAY` (number, default: `30000`)
  - Maximum delay in milliseconds between retries
- `SECURITY_ALERT_BACKOFF_MULTIPLIER` (number, default: `2`)
  - Multiplier for exponential backoff (e.g., 2 means delays of 1s, 2s, 4s, 8s...)
- `SECURITY_ALERT_JITTER_FACTOR` (number, default: `0.1`)
  - Random jitter factor (0-1) to prevent thundering herd
- `SECURITY_ALERT_TIMEOUT` (number, default: `5000`)
  - Timeout in milliseconds for individual webhook requests

### Circuit Breaker Configuration

- `SECURITY_ALERT_FAILURE_THRESHOLD` (number, default: `5`)
  - Number of consecutive failures before opening the circuit
- `SECURITY_ALERT_FAILURE_WINDOW` (number, default: `60000`)
  - Time window in milliseconds for counting failures
- `SECURITY_ALERT_OPEN_DURATION` (number, default: `30000`)
  - Duration in milliseconds to keep the circuit open
- `SECURITY_ALERT_SUCCESS_THRESHOLD` (number, default: `3`)
  - Number of successful calls needed in half-open state to close the circuit
- `SECURITY_ALERT_FAILURE_RATE` (number, default: `50`)
  - Failure rate percentage (0-100) that triggers circuit opening
- `SECURITY_ALERT_MIN_CALLS` (number, default: `5`)
  - Minimum number of calls before circuit breaker becomes active

## Example Configuration

### Development Environment

```env
SECURITY_ALERTS_ENABLED=true
SECURITY_ALERT_WEBHOOK_URL=https://dev-webhook.example.com/alerts
SECURITY_ALERT_AUTH_TOKEN=dev-token
SECURITY_ALERT_MAX_RETRIES=2
SECURITY_ALERT_BASE_DELAY=500
SECURITY_ALERT_TIMEOUT=3000
```

### Production Environment

```env
SECURITY_ALERTS_ENABLED=true
SECURITY_ALERT_WEBHOOK_URL=https://alerts.example.com/security
SECURITY_ALERT_AUTH_TOKEN=prod-secure-token
SECURITY_ALERT_MAX_RETRIES=3
SECURITY_ALERT_BASE_DELAY=1000
SECURITY_ALERT_MAX_DELAY=30000
SECURITY_ALERT_BACKOFF_MULTIPLIER=2
SECURITY_ALERT_JITTER_FACTOR=0.1
SECURITY_ALERT_TIMEOUT=5000
SECURITY_ALERT_FAILURE_THRESHOLD=5
SECURITY_ALERT_FAILURE_WINDOW=60000
SECURITY_ALERT_OPEN_DURATION=30000
SECURITY_ALERT_SUCCESS_THRESHOLD=3
SECURITY_ALERT_FAILURE_RATE=50
SECURITY_ALERT_MIN_CALLS=5
```

## Behavior

### Retry Logic

1. When a webhook call fails with a retryable error (network issues, 5xx errors, timeouts), the system will:

   - Wait for `BASE_DELAY * (BACKOFF_MULTIPLIER ^ attempt) + random_jitter`
   - Retry up to `MAX_RETRIES` times
   - Stop retrying if the delay would exceed `MAX_DELAY`

2. Non-retryable errors (4xx client errors except 408 and 429) fail immediately

### Circuit Breaker States

1. **CLOSED** (Normal operation)

   - All requests are forwarded to the webhook
   - Failures are counted within the time window

2. **OPEN** (Protecting the system)

   - Triggered when failures exceed threshold or failure rate
   - All requests are immediately rejected without calling the webhook
   - Prevents cascading failures and gives the webhook time to recover

3. **HALF_OPEN** (Testing recovery)
   - Entered after `OPEN_DURATION` expires
   - Limited requests are allowed through
   - If `SUCCESS_THRESHOLD` consecutive successes occur, circuit closes
   - Any failure immediately reopens the circuit

## Monitoring

The system logs detailed information about:

- Retry attempts and delays
- Circuit breaker state transitions
- Failed webhook deliveries
- Dropped alerts due to open circuit

Monitor these logs to tune the configuration for your specific use case.
