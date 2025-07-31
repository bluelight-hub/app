import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JWTPayload } from '../types/jwt.types';

/**
 * Parameter-Decorator zum Abrufen des aktuellen Benutzers aus dem Request
 * 
 * Dieser Decorator ermöglicht den Zugriff auf den authentifizierten Benutzer
 * oder einzelne Eigenschaften des JWT-Payloads in Controller-Methoden.
 * 
 * @example
 * ```typescript
 * // Gesamtes Benutzerobjekt abrufen
 * @Get('profile')
 * getProfile(@CurrentUser() user: JWTPayload) {
 *   return user;
 * }
 * 
 * // Nur die Benutzer-ID abrufen
 * @Get('my-data')
 * getMyData(@CurrentUser('userId') userId: string) {
 *   return this.service.findByUserId(userId);
 * }
 * ```
 * 
 * @constant
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JWTPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
