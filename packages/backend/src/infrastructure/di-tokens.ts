/**
 * Dependency Injection Tokens für Infrastructure Layer.
 *
 * Verwendet Symbol() für Compile-Time Type Safety und
 * Vermeidung von String-basierten Token Collisions.
 *
 * **Warum Symbol statt String:**
 * - Type Safety: TypeScript kann Symbol Types validieren
 * - Keine Namenskollisionen: Jedes Symbol ist einzigartig
 * - Bessere IDE-Unterstützung: Autocomplete und Refactoring
 * - Konsistent mit modernen DI Best Practices
 *
 * @example
 * ```typescript
 * // In Application Layer:
 * constructor(
 *   @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository
 * ) {}
 * ```
 */

/** Repository Token für IUserRepository */
export const USER_REPOSITORY = Symbol('IUserRepository');

/** Service Token für IJwtAuthServicePort */
export const JWT_AUTH_SERVICE = Symbol('IJwtAuthServicePort');

/** Logger Token für ILogger */
export const LOGGER = Symbol('ILogger');

/** Repository Token für IEinsatzRepository (bereits in Story 4-5) */
export const EINSATZ_REPOSITORY = Symbol('IEinsatzRepository');

/** Repository Token für IEtbRepository */
export const ETB_REPOSITORY = Symbol('IEtbRepository');

/** Repository Token für IOutboxRepository */
export const OUTBOX_REPOSITORY = Symbol('IOutboxRepository');

/** Repository Token für ILagekarteRepository */
export const LAGEKARTE_REPOSITORY = Symbol('ILagekarteRepository');

/**
 * Kräftemanagement Repository Tokens (Epic 1+).
 *
 * Verwaltung von Admin-Konfigurationsdaten:
 * - QUALIFIKATION: Qualifikations-Definitionen (Story 1-1)
 * - FAHRZEUGTYP: Fahrzeugtyp-Definitionen (Story 1-2)
 * - ROLLE: Rollen-Definitionen (Story 1-3, future)
 *
 * **WARUM nested Object statt flat Symbols wie bei anderen Repositories?**
 * - **Namespacing:** Kräfte-Modul hat mehrere zusammenhängende Repositories
 * - **Zukunftssicher:** Epic 1+ wird weitere Repositories hinzufügen (Fahrzeugtyp, Rolle)
 * - **Gruppierung:** Logische Gruppierung von verwandten Tokens für bessere Übersicht
 * - **Konsistenz innerhalb Epic:** Alle Kräfte-Repositories unter einem Namespace
 * - **Andere Module:** USER_REPOSITORY, EINSATZ_REPOSITORY sind einzelne Repositories pro Modul
 *
 * **Verwendung:**
 * ```typescript
 * @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION) private readonly repo: IQualifikationRepository
 * ```
 */
export const KRAEFTE_REPOSITORIES = {
  /** Repository Token für IQualifikationRepository */
  QUALIFIKATION: Symbol('IQualifikationRepository'),
  /** Repository Token für IFahrzeugtypRepository */
  FAHRZEUGTYP: Symbol('IFahrzeugtypRepository'),
  /** Repository Token für IRollenDefinitionRepository (Story 1-3) */
  ROLLEN_DEFINITION: Symbol('IRollenDefinitionRepository'),
  /** Repository Token für IFunkStatusConfigRepository (Story 1-4) */
  FUNK_STATUS_CONFIG: Symbol('IFunkStatusConfigRepository'),
  /** Repository Token für IStammFahrzeugRepository (Story 2-1) */
  STAMM_FAHRZEUG: Symbol('IStammFahrzeugRepository'),
  /** Repository Token für IStammPersonRepository (Story 2-2) */
  STAMM_PERSON: Symbol('IStammPersonRepository'),
  /** Repository Token für IEinsatzFahrzeugRepository (Story 3-1) */
  EINSATZ_FAHRZEUG: Symbol('IEinsatzFahrzeugRepository'),
  /** Repository Token für IEinsatzPersonRepository (Story 4-1) */
  EINSATZ_PERSON: Symbol('IEinsatzPersonRepository'),
} as const;

/** Transaction Manager Token für ITransactionManager */
export const TRANSACTION_MANAGER = Symbol('ITransactionManager');

/** Event Publisher Token für IEventPublisher */
export const EVENT_PUBLISHER = Symbol('IEventPublisher');

/** Alert Service Token für IAlertService */
export const ALERT_SERVICE = Symbol('IAlertService');

/**
 * Passport Strategy Names für AuthGuards.
 *
 * Diese Konstanten vermeiden Typo-Fehler bei Passport Strategy Names
 * und ermöglichen IDE-Unterstützung (Autocomplete, Refactoring).
 *
 * **Warum Constants:**
 * - Type Safety: String Literals sind typo-anfällig
 * - IDE-Unterstützung: Autocomplete und Go-to-Definition
 * - Konsistenz: Zentrale Definition statt verteilter Magic Strings
 */
export const PASSPORT_STRATEGIES = {
  /** Admin JWT Strategy Name */
  ADMIN_JWT: 'admin-jwt',
} as const;

/**
 * Event Handler Tokens für IEventHandler<TEvent> Implementations.
 *
 * Diese Tokens ermöglichen die Dependency Injection von Event Handlers
 * via Infrastructure Adapters. Der Adapter (mit @OnEvent Decorator) delegiert
 * an den Application Layer Handler (ohne Framework-Abhängigkeiten).
 *
 * **Pattern:**
 * 1. Application Layer Handler implementiert IEventHandler<TEvent>
 * 2. Handler wird mit diesem Token registriert
 * 3. Infrastructure Adapter injiziert Handler via Token
 * 4. Adapter delegiert @OnEvent Calls an Handler.handle()
 */
export const EVENT_HANDLER = {
  /** ETB Auto-Creation Handler Token */
  ETB_AUTO_CREATION: Symbol('IEventHandler<EinsatzCreatedEvent>:EtbAutoCreation'),

  /** Lagekarte Auto-Creation Handler Token */
  LAGEKARTE_AUTO_CREATION: Symbol('IEventHandler<EinsatzCreatedEvent>:LagekarteAutoCreation'),

  /** FahrzeugErfasst ETB-Eintrag Handler Token (Story 3-1) */
  FAHRZEUG_ERFASST_ETB: Symbol('IEventHandler<FahrzeugErfasstEvent>:EtbEintrag'),

  /** FmsStatusGeaendert ETB-Eintrag Handler Token (Story 3-3) */
  FMS_STATUS_GEAENDERT_ETB: Symbol('IEventHandler<FmsStatusGeaendertEvent>:EtbEintrag'),

  /** EinsatzPersonHinzugefuegt ETB-Eintrag Handler Token (Story 4-1) */
  EINSATZ_PERSON_HINZUGEFUEGT_ETB: Symbol('IEventHandler<EinsatzPersonHinzugefuegtEvent>:EtbEintrag'),
} as const;
