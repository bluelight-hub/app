import { SetMetadata } from '@nestjs/common';

/**
 * Metadata-Key fuer SkipServerAccess Decorator.
 *
 * Wird vom ServerAccessGuard verwendet um zu pruefen, ob ein Endpoint
 * die Server-Access-Token-Validierung ueberspringen soll.
 */
export const SKIP_SERVER_ACCESS_KEY = 'skipServerAccess';

/**
 * Decorator zum Ueberspringen der ServerAccessGuard-Pruefung.
 *
 * Verwende diesen Decorator fuer Endpoints die ohne Server-Access-Token
 * erreichbar sein muessen (Health-Checks, Public Endpoints, Invite-Exchange).
 *
 * Kann auf Controller-Klasse ODER einzelne Methoden angewendet werden.
 *
 * @example
 * ```typescript
 * // Auf Methoden-Ebene (einzelner Endpoint)
 * @SkipServerAccess()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 *
 * // Auf Controller-Ebene (alle Endpoints)
 * @SkipServerAccess()
 * @Controller('public')
 * export class PublicController { ... }
 * ```
 */
export const SkipServerAccess = () => SetMetadata(SKIP_SERVER_ACCESS_KEY, true);
