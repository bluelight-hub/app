/**
 * Barrel export für StammPerson DTOs.
 *
 * **Pattern:**
 * - CreateStammPersonDto: Input für POST /api/admin/kraefte/stamm-personen
 * - UpdateStammPersonDto: Input für PATCH /api/admin/kraefte/stamm-personen/:id
 * - StammPersonDto: Response für GET /api/admin/kraefte/stamm-personen
 * - StammPersonQualifikationDto: Nested DTO für Qualifikationen in StammPersonDto
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer DTOs
 */

export { CreateStammPersonDto } from './create-stamm-person.dto';
export { UpdateStammPersonDto } from './update-stamm-person.dto';
export { StammPersonDto, StammPersonQualifikationDto } from './stamm-person.dto';
