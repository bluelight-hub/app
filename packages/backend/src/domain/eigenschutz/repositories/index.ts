/**
 * Barrel-Export der Eigenschutz-Repository-Ports (Hexagonal Architecture).
 *
 * Die Interfaces leben im Domain-Layer; die konkreten Prisma-Implementierungen
 * sitzen in `infrastructure/eigenschutz/repositories/`. Der Application-Layer
 * injiziert die Ports über DI-Tokens aus `infrastructure/di-tokens.ts`.
 */
export type { IGefaehrdungsbeurteilungRepository, GefaehrdungsbeurteilungReadModel } from './i-gefaehrdungsbeurteilung.repository';
export type { IGefaehrdungsbeurteilungVorlageRepository, GefaehrdungsbeurteilungVorlageReadModel } from './i-gefaehrdungsbeurteilung-vorlage.repository';
export type { IGefaehrdungsbeurteilungVersionRepository, SaveInitialVersionArgs, SaveNewVersionArgs, GefaehrdungsbeurteilungVersionRow } from './i-gefaehrdungsbeurteilung-version.repository';
