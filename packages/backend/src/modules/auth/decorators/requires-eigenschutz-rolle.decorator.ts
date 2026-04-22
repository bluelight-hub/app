import { SetMetadata } from '@nestjs/common';
import type { EigenschutzRolle } from '@domain/eigenschutz/enums/eigenschutz-rolle.enum';

/**
 * Metadata-Key, unter dem `@RequiresEigenschutzRolle(...)` die erwarteten
 * Short-Form-Rollen-Namen ablegt. `EigenschutzRolleGuard` liest diesen Key
 * via `Reflector.getAllAndOverride` und prepended `EIGENSCHUTZ_ROLE_PREFIX`.
 */
export const EIGENSCHUTZ_ROLE_KEY = 'eigenschutzRoles';

/**
 * Decorator zum Festlegen erforderlicher Eigenschutz-Rollen für Handler oder
 * Controller-Klasse. Short-Form: der Präfix `Eigenschutz: ` wird vom Guard
 * selbst vorangestellt — hier nur die reine Rollen-Bezeichnung angeben.
 *
 * **Match-Semantik:** OR — ein Nutzer muss **eine** der aufgelisteten Rollen
 * haben, um den Handler aufrufen zu dürfen (analog `@Roles(...)`/`RolesGuard`).
 *
 * **Kombination mit anderen Guards:** Die Kette
 * `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)` ist
 * verbindlich — der Guard liest `request.einsatzContext.einsatzRollenNamen`,
 * das ausschließlich von `EinsatzScopeGuard` gesetzt wird.
 *
 * @example Handler-Level
 * ```typescript
 * @Post('psa-profile')
 * @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)
 * async updatePsaProfil() { ... }
 * ```
 *
 * @example Klassen-Level (alle Handler erben)
 * ```typescript
 * @Controller('einsaetze/:einsatzId/sicherheit/eigenschutz')
 * @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Nachbereitung')
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)
 * export class EigenschutzController { ... }
 * ```
 *
 * @param rollen - Short-Form-Rollen (ohne `Eigenschutz: `-Präfix). Variadic.
 */
export const RequiresEigenschutzRolle = (...rollen: EigenschutzRolle[]) => SetMetadata(EIGENSCHUTZ_ROLE_KEY, rollen);
