import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';
import {
  RateLimiter,
  RateLimiterConfig,
  generateSecureRateLimitKey,
} from '../utils/rate-limiter.util';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Rate Limit Decorator Options
 */
export interface RateLimitOptions extends Omit<RateLimiterConfig, 'keyPrefix'> {
  /** Optional custom key prefix */
  prefix?: string;
}

/**
 * Rate Limit Guard
 *
 * Schützt Endpunkte vor übermäßigen Anfragen durch Rate Limiting.
 * Nutzt Redis für verteilte Systeme, fällt auf In-Memory zurück wenn Redis nicht verfügbar ist.
 *
 * @example
 * ```typescript
 * @Controller('api')
 * @UseGuards(RateLimitGuard)
 * export class ApiController {
 *   @Get('data')
 *   @RateLimit({ maxRequests: 10, windowMs: 60000 }) // 10 requests per minute
 *   getData() {
 *     return { data: 'protected' };
 *   }
 * }
 * ```
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiters = new Map<string, RateLimiter>();

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rateLimitOptions) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get or create rate limiter for this configuration
    const limiterKey = this.getLimiterKey(rateLimitOptions);
    let limiter = this.rateLimiters.get(limiterKey);

    if (!limiter) {
      const config: RateLimiterConfig = {
        ...rateLimitOptions,
        keyPrefix: rateLimitOptions.prefix || 'api',
        keyGenerator: rateLimitOptions.keyGenerator || generateSecureRateLimitKey,
      };

      limiter = new RateLimiter(config, this.redisService);
      this.rateLimiters.set(limiterKey, limiter);
    }

    try {
      // Generate key for this request
      const key = limiter['config'].keyGenerator
        ? limiter['config'].keyGenerator(request)
        : generateSecureRateLimitKey(request);

      // Check rate limit
      await limiter.consume(key);

      // Add rate limit headers
      const status = await limiter.getStatus(key);
      response.setHeader('X-RateLimit-Limit', limiter['config'].maxRequests);
      response.setHeader('X-RateLimit-Remaining', status.remaining);
      response.setHeader('X-RateLimit-Reset', new Date(status.reset).toISOString());

      return true;
    } catch (error) {
      if (error.name === 'RateLimitExceededError') {
        response.setHeader('X-RateLimit-Limit', limiter['config'].maxRequests);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + limiter['config'].windowMs).toISOString(),
        );

        if (error.retryAfter) {
          response.setHeader('Retry-After', error.retryAfter);
        }

        response.status(429).json({
          error: 'Too Many Requests',
          message: error.message,
          retryAfter: error.retryAfter,
        });

        return false;
      }

      throw error;
    }
  }

  /**
   * Generate a unique key for rate limiter instances
   */
  private getLimiterKey(options: RateLimitOptions): string {
    return `${options.prefix || 'api'}:${options.maxRequests}:${options.windowMs}`;
  }

  /**
   * Clean up rate limiters on module destroy
   */
  onModuleDestroy() {
    for (const limiter of this.rateLimiters.values()) {
      limiter.destroy();
    }
    this.rateLimiters.clear();
  }
}
