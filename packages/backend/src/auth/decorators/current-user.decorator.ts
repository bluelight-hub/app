import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ValidatedUser } from '../strategies/jwt.strategy';

/**
 * Custom Parameter Decorator zum Abrufen des aktuellen Benutzers
 *
 * Extrahiert den authentifizierten Benutzer aus der Request.
 * Funktioniert nur mit Guards, die den Benutzer in req.user setzen.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * getCurrentUser(@CurrentUser() user: ValidatedUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ValidatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
