/**
 * Barrel export für StammFahrzeug DTOs.
 *
 * **Pattern:**
 * - CreateStammFahrzeugDto: Input für POST /api/admin/kraefte/stamm-fahrzeuge
 * - UpdateStammFahrzeugDto: Input für PATCH /api/admin/kraefte/stamm-fahrzeuge/:id
 * - StammFahrzeugDto: Response für GET /api/admin/kraefte/stamm-fahrzeuge
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer DTOs
 */

export { CreateStammFahrzeugDto } from './create-stamm-fahrzeug.dto';
export { UpdateStammFahrzeugDto } from './update-stamm-fahrzeug.dto';
export { StammFahrzeugDto } from './stamm-fahrzeug.dto';
