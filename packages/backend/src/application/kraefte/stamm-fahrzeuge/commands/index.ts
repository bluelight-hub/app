/**
 * Barrel export für StammFahrzeug Command Handlers.
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Commands
 */

// Command Handlers
export { CreateStammFahrzeugHandler } from './create-stamm-fahrzeug/create-stamm-fahrzeug.handler';
export { UpdateStammFahrzeugHandler } from './update-stamm-fahrzeug/update-stamm-fahrzeug.handler';
export { ArchiveStammFahrzeugHandler } from './archive-stamm-fahrzeug/archive-stamm-fahrzeug.handler';

// Commands
export { CreateStammFahrzeugCommand } from './create-stamm-fahrzeug/create-stamm-fahrzeug.command';
export { UpdateStammFahrzeugCommand } from './update-stamm-fahrzeug/update-stamm-fahrzeug.command';
export { ArchiveStammFahrzeugCommand } from './archive-stamm-fahrzeug/archive-stamm-fahrzeug.command';
