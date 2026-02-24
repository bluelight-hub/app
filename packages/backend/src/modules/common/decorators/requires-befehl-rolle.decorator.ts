import { SetMetadata } from '@nestjs/common';

/**
 * Metadata-Key fuer BefehlRollenGuard.
 */
export const BEFEHL_ROLLEN_KEY = 'befehl-rollen';

/**
 * Decorator zum Festlegen erforderlicher Befehl-Rollen fuer Endpoints.
 *
 * Der BefehlRollenGuard prueft, ob der User im Einsatz-Kontext eine der
 * angegebenen Rollen hat.
 *
 * Story 5.2 AC5: Authorization-Guard fuer Befehl-Aktionen.
 *
 * @param rollen - Erlaubte Rollen (OR-Verknuepfung)
 *
 * @example
 * ```typescript
 * @RequiresBefehlRolle('ERSTELLER', 'BEFEHLSGEBER')
 * @UseGuards(JwtAuthGuard, BefehlRollenGuard)
 * async create(@Body() dto: CreateBefehlDto) { ... }
 * ```
 */
export const RequiresBefehlRolle = (...rollen: string[]) => SetMetadata(BEFEHL_ROLLEN_KEY, rollen);
