/**
 * Barrel export für Fahrzeugtyp DTOs.
 *
 * **Pattern:**
 * - CreateFahrzeugtypDto: Input für POST /api/admin/kraefte/fahrzeugtypen
 * - UpdateFahrzeugtypDto: Input für PATCH /api/admin/kraefte/fahrzeugtypen/:id
 * - FahrzeugtypDto: Response für GET /api/admin/kraefte/fahrzeugtypen
 * - FahrzeugtypSollbesatzungDto: Nested DTO für Sollbesatzung (JSONB)
 *
 * **Story Context:**
 * Story 1-2 (Fahrzeugtypen verwalten) - Application Layer DTOs
 */

export { CreateFahrzeugtypDto } from './create-fahrzeugtyp.dto';
export { UpdateFahrzeugtypDto } from './update-fahrzeugtyp.dto';
export { FahrzeugtypDto } from './fahrzeugtyp.dto';
export { FahrzeugtypSollbesatzungDto } from './fahrzeugtyp-sollbesatzung.dto';
