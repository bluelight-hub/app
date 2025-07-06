import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    TooManyRequestsException,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

interface RateLimitEntry {
    count: number;
    firstRequestTime: number;
}

/**
 * Rate limiting interceptor for IP whitelist endpoints
 * Prevents abuse of admin security endpoints
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
    private readonly logger = new Logger(RateLimitInterceptor.name);
    private readonly requests = new Map<string, RateLimitEntry>();
    private readonly maxRequests = 10; // Maximum requests per window
    private readonly windowMs = 60000; // Time window in milliseconds (1 minute)

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const clientIp = this.getClientIp(request);
        const key = `${clientIp}:${request.method}:${request.route?.path || request.url}`;

        // Clean up old entries periodically
        this.cleanupOldEntries();

        // Check rate limit
        if (this.isRateLimited(key)) {
            this.logger.warn(`Rate limit exceeded for IP: ${clientIp} on ${request.method} ${request.url}`);
            throw new TooManyRequestsException('Rate limit exceeded. Please try again later.');
        }

        // Record this request
        this.recordRequest(key);

        return next.handle();
    }

    private getClientIp(request: Request): string {
        return (
            request.get('x-forwarded-for') ||
            request.get('x-real-ip') ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown'
        );
    }

    private isRateLimited(key: string): boolean {
        const entry = this.requests.get(key);
        if (!entry) {
            return false;
        }

        const now = Date.now();
        const timeSinceFirst = now - entry.firstRequestTime;

        // If window has passed, reset the counter
        if (timeSinceFirst > this.windowMs) {
            this.requests.delete(key);
            return false;
        }

        // Check if exceeded max requests in current window
        return entry.count >= this.maxRequests;
    }

    private recordRequest(key: string): void {
        const now = Date.now();
        const entry = this.requests.get(key);

        if (!entry || (now - entry.firstRequestTime) > this.windowMs) {
            // Start new window
            this.requests.set(key, {
                count: 1,
                firstRequestTime: now,
            });
        } else {
            // Increment counter in current window
            entry.count++;
            this.requests.set(key, entry);
        }
    }

    private cleanupOldEntries(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.requests.entries()) {
            if (now - entry.firstRequestTime > this.windowMs) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.requests.delete(key));
    }
}