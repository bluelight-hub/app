import { SetMetadata } from '@nestjs/common';

/**
 * Metadata-Key unter dem `@EinsatzParam` den Pfad-Parameter-Namen ablegt.
 * Exportiert für Test-Assertions und direkten Reflector-Zugriff im Guard.
 */
export const EINSATZ_PARAM_KEY = 'einsatzParam';

/**
 * Decorator, der `EinsatzScopeGuard` mitteilt, unter welchem Pfad-Parameter-
 * Namen die `einsatzId` im Request steht (Default: `'einsatzId'`).
 *
 * **Kein `createParamDecorator`** — der Decorator injiziert keinen Wert,
 * sondern setzt ausschließlich Metadata, die der Guard später via
 * `Reflector.getAllAndOverride` liest.
 *
 * Nutzbar auf **Handler-Ebene** und auf **Controller-Klassen-Ebene**
 * (analog `@RequiresOperativeRole`, siehe `operative-roles.decorator.ts`).
 *
 * @example Handler-Level Override (z. B. wenn Route-Parameter `:id` heißt):
 * ```typescript
 * @Get(':id/detail')
 * @EinsatzParam('id')
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard)
 * async detail(@Param('id') id: string) { ... }
 * ```
 *
 * @example Klassen-Level (alle Handler des Controllers erben den Override):
 * ```typescript
 * @Controller('legacy/:legacyEinsatzId')
 * @EinsatzParam('legacyEinsatzId')
 * @UseGuards(JwtAuthGuard, EinsatzScopeGuard)
 * export class LegacyController { ... }
 * ```
 *
 * @param paramName - Name des Pfad-Parameters, in dem die `einsatzId` steht.
 */
export const EinsatzParam = (paramName: string) => SetMetadata(EINSATZ_PARAM_KEY, paramName);
