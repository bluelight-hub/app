import {
  SicherheitsregelCreateSchemaV1,
  SicherheitsregelDtoSchemaV1,
  SicherheitsregelUpdateSchemaV1,
  type CreateSicherheitsregelInput,
  type SicherheitsregelDto,
  type UpdateSicherheitsregelInput,
} from '@bluelight-hub/shared/schemas';

/**
 * Re-Export der Shared-Zod-Schemas für Sicherheitsregeln (Story 2.6, Task 8.1
 * bzw. Task 7 Pre-Work).
 *
 * Die Schemas leben in `packages/shared/src/schemas/eigenschutz/` und sind die
 * Single Source of Truth für Backend-DTO-Gate **und** Frontend-Form. Dieses
 * Modul reicht sie als Feature-lokale Re-Exports durch, damit Komponenten nur
 * `@/features/eigenschutz/schemas/sicherheitsregel.schema` kennen müssen (DRY
 * + Deep-Import-Grenze analog zum `gefaehrdungsbeurteilung.schema.ts`-Muster).
 *
 * Zuordnungs-Logik (diskriminierte Union):
 * - `einsatzweit: true` — keine `einheitIds` zulässig.
 * - `einsatzweit: false` — `einheitIds` muss mindestens einen Eintrag haben.
 */
export { SicherheitsregelCreateSchemaV1, SicherheitsregelDtoSchemaV1, SicherheitsregelUpdateSchemaV1 };
export type { CreateSicherheitsregelInput, SicherheitsregelDto, UpdateSicherheitsregelInput };
