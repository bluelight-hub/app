import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes as public.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as publicly accessible without authentication.
 * Routes with this decorator bypass the global JWT authentication guard.
 * 
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * checkHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);