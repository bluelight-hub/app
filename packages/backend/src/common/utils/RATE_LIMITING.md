# Distributed Rate Limiting

## Overview

The BlueLight Hub backend now supports distributed rate limiting that automatically scales across multiple instances and
persists through restarts. The system uses Redis when available for distributed storage and falls back to in-memory
storage for single-instance deployments.

## Key Features

- **Distributed by Default**: When Redis is available, rate limits are automatically shared across all instances
- **Automatic Fallback**: Seamlessly falls back to in-memory storage if Redis is unavailable
- **Multi-Factor Key Generation**: Combines session, user ID, browser fingerprint, and IP for robust identification
- **Flexible Configuration**: Support for both fixed window and token bucket algorithms
- **Easy Integration**: Simple decorators and guards for protecting endpoints

## Configuration

### Environment Setup

Add Redis URL to your `.env` file:

```env
REDIS_URL=redis://localhost:6379
```

### Basic Usage

#### 1. Using the Rate Limit Decorator

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  // Use preset configurations
  @Get('data')
  @RateLimit(RateLimitPresets.standard()) // 100 req/min
  getData() {
    return { data: 'protected' };
  }

  // Custom configuration
  @Post('upload')
  @RateLimit({
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
  })
  uploadFile() {
    return { message: 'Upload limited' };
  }
}
```

#### 2. Available Presets

- `RateLimitPresets.standard()` - 100 requests per minute
- `RateLimitPresets.strict()` - 10 requests per minute
- `RateLimitPresets.auth()` - 5 attempts per 15 minutes
- `RateLimitPresets.upload()` - 10 uploads per hour
- `RateLimitPresets.search()` - 30 searches per minute

#### 3. Custom Key Generation

For advanced use cases, you can customize how rate limit keys are generated:

```typescript
@Get('search')
@RateLimit({
    maxRequests: 30,
    windowMs: 60000,
    keyGenerator: (req) => {
        // Rate limit by user and search query
        const userId = req.user?.id || 'anonymous';
        const query = req.query.q || '';
        return `search:${userId}:${query}`;
    }
})
```

### Programmatic Usage

For more control, use the RateLimiter class directly:

```typescript
import { RateLimiter } from '@/common/utils/rate-limiter.util';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class MyService {
  private rateLimiter: RateLimiter;

  constructor(private redisService: RedisService) {
    this.rateLimiter = new RateLimiter(
      {
        maxRequests: 100,
        windowMs: 60000,
        keyPrefix: 'my-service',
      },
      redisService,
    );
  }

  async performAction(userId: string) {
    try {
      await this.rateLimiter.consume(userId);
      // Perform action
    } catch (error) {
      if (error.name === 'RateLimitExceededError') {
        throw new TooManyRequestsException(error.message);
      }
      throw error;
    }
  }
}
```

### Token Bucket Algorithm

For more flexible rate limiting, use the token bucket algorithm:

```typescript
const config = {
  capacity: 100, // Maximum tokens
  refillRate: 10, // Tokens per second
  initialTokens: 50, // Starting tokens
};

// Consume tokens for expensive operations
const allowed = await rateLimiter.consumeTokens(userId, 10, config);
if (!allowed) {
  throw new Error('Rate limit exceeded');
}
```

## Architecture

### Storage Adapters

The rate limiter uses a storage adapter pattern:

1. **Redis Adapter** (Primary)
   - Distributed across instances
   - Persists through restarts
   - Handles high concurrency

2. **In-Memory Adapter** (Fallback)
   - Single instance only
   - Fast performance
   - Automatic cleanup

### Security Features

The default key generator (`generateSecureRateLimitKey`) combines multiple factors:

1. **Session ID** - Most reliable for logged-in users
2. **User ID** - For authenticated requests
3. **Browser Fingerprint** - Combination of stable headers
4. **IP Address** - Included but not primary identifier
5. **API Key/Token** - For API requests

This multi-factor approach prevents common bypass techniques like IP rotation.

## Monitoring

Rate limit information is included in response headers:

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in current window
- `X-RateLimit-Reset` - When the rate limit window resets
- `Retry-After` - Seconds until next request allowed (429 responses)

## Best Practices

1. **Use Presets**: Start with predefined presets and adjust as needed
2. **Different Limits**: Apply different limits to different endpoints based on cost
3. **User Types**: Consider different limits for authenticated vs anonymous users
4. **Monitor Usage**: Track rate limit hits to adjust limits appropriately
5. **Grace Period**: Consider `skipSuccessfulRequests` for upload endpoints

## Troubleshooting

### Redis Connection Issues

If Redis is unavailable, the system automatically falls back to in-memory storage. Check logs for:

```
Redis: Connection failed, using in-memory fallback
```

### Rate Limits Not Working

1. Ensure `RateLimitGuard` is applied to the controller/route
2. Check Redis connection with `redis-cli ping`
3. Verify environment variables are loaded
4. Check for custom `keyGenerator` issues

### Performance Considerations

- Redis operations are async and non-blocking
- In-memory cleanup runs every minute
- Token buckets have 1-hour TTL
- Consider connection pooling for high-traffic applications
