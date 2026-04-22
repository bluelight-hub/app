import { SetMetadata } from '@nestjs/common';
import type { EigenschutzPermission } from '@domain/eigenschutz/enums/eigenschutz-permission.enum';

/**
 * Metadata-Key, unter dem `@RequiresPermission(...)` die erwarteten
 * Permission-Strings ablegt. `PermissionsGuard` liest diesen Key via
 * `Reflector.getAllAndOverride` und prüft gegen
 * `request.einsatzContext.einsatzPermissions` (exakter String-Match).
 */
export const EIGENSCHUTZ_PERMISSION_KEY = 'eigenschutzPermissions';

/**
 * Decorator zum Festlegen erforderlicher Eigenschutz-Permissions für Handler
 * oder Controller-Klasse.
 *
 * **Match-Semantik:** OR + exakter String-Match (keine Wildcard-Expansion).
 * `eigenschutz:*` matcht **nichts** — FR45/FR47 arbeiten mit konkreten Strings.
 *
 * **Guard-Kette (verbindlich):**
 * `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)` —
 * `PermissionsGuard` liest `request.einsatzContext.einsatzPermissions`,
 * das ausschließlich von `EinsatzScopeGuard` gesetzt wird.
 *
 * @example
 * ```typescript
 * @Post(':id/acknowledge')
 * @RequiresPermission('eigenschutz:sicherheitsregel:acknowledge')
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
 * async acknowledge() { ... }
 * ```
 *
 * @param permissions - Erforderliche Permissions (Type-Safe String-Literal-Union).
 */
export const RequiresPermission = (...permissions: EigenschutzPermission[]) => SetMetadata(EIGENSCHUTZ_PERMISSION_KEY, permissions);
