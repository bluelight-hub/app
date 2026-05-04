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
export type { ISicherheitsregelRepository, SicherheitsregelReadModel } from './i-sicherheitsregel.repository';
export type { ISicherheitsregelVersionRepository, SaveSicherheitsregelVersionArgs } from './i-sicherheitsregel-version.repository';
export type {
  ISicherheitsregelQuittungRepository,
  SicherheitsregelQuittungReadModel,
  UpsertSicherheitsregelQuittungParams,
  UpsertSicherheitsregelQuittungResult,
} from './i-sicherheitsregel-quittung.repository';
export type { IPsaProfilZuweisungRepository, IPsaProfilZuweisungReadRepository, PsaProfilZuweisungReadRow } from './i-psa-profil-zuweisung.repository';
export type { IPsaProfilQuittungRepository, PsaProfilQuittungReadModel, UpsertPsaProfilQuittungParams, UpsertPsaProfilQuittungResult } from './i-psa-profil-quittung.repository';
export type { IPsaPropagationOverdueQueryPort, PsaPropagationOverdueRow } from './i-psa-propagation-overdue-query.port';
export type { IPushRecipientLookupPort } from './i-push-recipient-lookup.port';
