/**
 * Barrel export für StammPerson Command Handlers.
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Commands
 */

// Command Handlers
export { CreateStammPersonHandler } from './create-stamm-person/create-stamm-person.handler';
export { UpdateStammPersonHandler } from './update-stamm-person/update-stamm-person.handler';
export { ArchiveStammPersonHandler } from './archive-stamm-person/archive-stamm-person.handler';
export { RestoreStammPersonHandler } from './restore-stamm-person/restore-stamm-person.handler';

// Commands
export { CreateStammPersonCommand } from './create-stamm-person/create-stamm-person.command';
export { UpdateStammPersonCommand } from './update-stamm-person/update-stamm-person.command';
export { ArchiveStammPersonCommand } from './archive-stamm-person/archive-stamm-person.command';
export { RestoreStammPersonCommand } from './restore-stamm-person/restore-stamm-person.command';
