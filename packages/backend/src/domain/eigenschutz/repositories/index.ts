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
export type { ISicherheitsregelVersionRepository, SaveSicherheitsregelVersionArgs, SicherheitsregelVersionAtTimeRow } from './i-sicherheitsregel-version.repository';
export type {
  ISicherheitsregelQuittungRepository,
  SicherheitsregelQuittungReadModel,
  UpsertSicherheitsregelQuittungParams,
  UpsertSicherheitsregelQuittungResult,
} from './i-sicherheitsregel-quittung.repository';
export type { IPsaProfilZuweisungRepository, IPsaProfilZuweisungReadRepository, PsaProfilZuweisungReadRow } from './i-psa-profil-zuweisung.repository';
export type { IPsaProfilQuittungRepository, PsaProfilQuittungReadModel, UpsertPsaProfilQuittungParams, UpsertPsaProfilQuittungResult } from './i-psa-profil-quittung.repository';
export type { IAmpelProjectionRepository, AmpelProjectionReadRow, AmpelProjectionUpsertRow, RecalculateAmpelProjectionParams } from './i-ampel-projection.repository';
export type { IAmpelWarnBadgeReadPort, AmpelWarnBadgeCandidates } from './i-ampel-warn-badge-read.port';
export type { IPsaPropagationOverdueQueryPort, PsaPropagationOverdueRow } from './i-psa-propagation-overdue-query.port';
export type { IPushRecipientLookupPort } from './i-push-recipient-lookup.port';
export type { ISicherungspostenRepository, SicherungspostenReadModel } from './i-sicherungsposten.repository';
export type { ISicherungspostenVersionRepository, SicherungspostenVersionReadModel } from './i-sicherungsposten-version.repository';
export type { IEigenschutzVorfallRepository, VorfallListFilter, VorfallListReadRow } from './i-eigenschutz-vorfall.repository';
export { VORFALL_LIST_HARD_LIMIT } from './i-eigenschutz-vorfall.repository';
