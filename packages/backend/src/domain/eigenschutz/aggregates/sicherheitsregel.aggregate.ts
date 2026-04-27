import { AggregateRoot } from '@domain/common/aggregate-root';
import { EntityId } from '@domain/common/entity-id';
import { Result } from '@domain/common/result';
import { SicherheitsregelAusgerufenEvent, type SicherheitsregelAusgerufenChangedFields, type SicherheitsregelFieldKey } from '../events/sicherheitsregel-ausgerufen.event';
import { SicherheitsregelQuittiertEvent } from '../events/sicherheitsregel-quittiert.event';

/**
 * Sentinel-Error aus `update`, wenn der Client mit einer veralteten
 * `expectedVersion` kam. Der Controller mappt diesen Präfix auf HTTP 409 mit
 * `context.currentVersion` + `context.attemptedVersion` (analog zu Story 2.3
 * Version-Chain-Hardening). Der Handler ergänzt den Sentinel um einen
 * `:current=<n>`-Suffix, damit die aktuelle Version im Context landet.
 */
export const SICHERHEITSREGEL_CONFLICT_DETECTED = 'ConflictDetected:Sicherheitsregel';

/**
 * Sentinel-Error aus `update`, wenn der Client-seitige Diff keine Änderung
 * erzeugt (Titel, Inhalt und Einheit sind identisch zum alten Stand). Der
 * Controller mappt den `BusinessRule:`-Prefix auf HTTP 422 — ein No-Op-Update
 * ist kein Server-Fehler, aber auch kein gültiger Write.
 */
export const SICHERHEITSREGEL_NO_CHANGES_DETECTED = 'BusinessRule:NoChangesDetected';

/**
 * Sentinel-Error aus `acknowledge`, wenn die Regel zum Quittungs-Zeitpunkt
 * bereits logisch abgekündigt ist (deprecated). Story 2.7 lässt eine Quittung
 * auf einer abgekündigten Regel nicht zu — der Banner sollte beim Empfänger
 * spätestens beim nächsten WS-Refresh verschwunden sein. Controller mappt
 * `BusinessRule:`-Prefix auf HTTP 422.
 */
export const SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT = 'BusinessRule:RegelAbgekuendigt';

/**
 * Sentinel-Error aus `acknowledge`, wenn die übergebene `einheitId` nicht
 * zur Regel passt — die Regel ist weder einsatzweit (`null`) noch konkret
 * dieser Einheit zugeordnet. Defense-in-Depth: Der Handler prüft das gleiche
 * Mapping vorher, das Aggregate verteidigt sich nochmals.
 */
export const SICHERHEITSREGEL_BUSINESS_RULE_REGEL_TRIFFT_NICHT_AUF_EINHEIT = 'BusinessRule:RegelTrifftNichtAufEinheit';

/**
 * Business-Limits für Titel und Inhalt nach `.trim()` (Epic 2.6 AC5/AC9).
 *
 * Titel: 1–80 Zeichen (DB-Limit 200 bleibt Sicherheitsnetz).
 * Inhalt: 1–2000 Zeichen.
 */
const TITEL_MAX_LENGTH = 80;
const INHALT_MAX_LENGTH = 2000;

/**
 * Type-Safe Identifier für `Sicherheitsregel`. Nutzt die generische
 * EntityId-Basis mit Literal-Type-Tag, damit der Compiler eine Sicherheits-
 * regel-ID nicht versehentlich mit einer anderen Entity-ID verwechselt.
 */
export class SicherheitsregelId extends EntityId<'Sicherheitsregel'> {}

/**
 * Properties für die Factory-Methode `Sicherheitsregel.create`.
 *
 * - `einheitId: null` = Regel gilt einsatzweit (AC1 „gesamter Einsatz")
 * - `propagationGroupId` wird vom Handler pro logischem Create-Aufruf
 *   **einmal** generiert und auf alle Fanout-Rows verteilt (AC2)
 */
export interface CreateSicherheitsregelProps {
  id?: string;
  einsatzId: string;
  einheitId: string | null;
  titel: string;
  inhalt: string;
  erstelltVonUserId: string;
  propagationGroupId: string;
}

/**
 * Properties für `Sicherheitsregel.reconstitute` — wird vom Mapper beim Read
 * aus der DB genutzt. Im Unterschied zu `create` wird `version` mitgegeben
 * (statt auf 1 fixiert) und es werden keine Domain-Events emittiert.
 *
 * `istAktiv` ist optional und defaultet auf `true` — Mapper-Pfade ohne
 * Versions-Join (`findById`) lassen es weg, Pfade mit Versions-Join
 * (`findActiveById`) setzen den effektiven Wert. Das Aggregate akzeptiert
 * den Default als Best-Effort, der Quittungs-Handler verlässt sich auf den
 * Repository-Pfad für die scharfe Prüfung.
 */
export interface ReconstituteSicherheitsregelProps {
  id: string;
  einsatzId: string;
  einheitId: string | null;
  titel: string;
  inhalt: string;
  version: number;
  erstelltVonUserId: string;
  aktualisiertVonUserId: string;
  istAktiv?: boolean;
}

/**
 * Aggregate Root für eine Sicherheitsregel (Story 2.6).
 *
 * **Scope Story 2.6:** Create + Update + logische Abkündigung (Re-Wire).
 * Die Quittung (ACK) ist explizit Story 2.7 — dieses Aggregate kennt keine
 * Quittungs-Semantik.
 *
 * **Invarianten (AC9):**
 * 1. `titel` nach `.trim()` nicht leer und ≤ 80 Zeichen
 * 2. `inhalt` nach `.trim()` nicht leer und ≤ 2000 Zeichen
 * 3. `einsatzId` non-empty
 * 4. `einheitId` nullable (`null` = einsatzweit); falls gesetzt non-empty
 * 5. `version` ≥ 1
 * 6. `erstelltVonUserId` und `aktualisiertVonUserId` non-empty
 *
 * **Events:**
 * - `create` emittiert `SicherheitsregelAusgerufenEvent` mit
 *   `{ created: true }`, `fromVersion: null`, `toVersion: 1`.
 * - `update` emittiert `SicherheitsregelAusgerufenEvent` mit
 *   `{ updated: SicherheitsregelFieldKey[] }`, `fromVersion: N`, `toVersion: N+1`.
 * - `deprecate` emittiert `SicherheitsregelAusgerufenEvent` mit
 *   `{ deprecated: true }`, `fromVersion === toVersion === N` (keine
 *   Versions-Inkrementierung, da die Row logisch abgekündigt wird — AC4).
 */
export class Sicherheitsregel extends AggregateRoot<SicherheitsregelId> {
  private constructor(
    id: SicherheitsregelId,
    private readonly _einsatzId: string,
    private _einheitId: string | null,
    private _titel: string,
    private _inhalt: string,
    private _version: number,
    private readonly _erstelltVonUserId: string,
    private _aktualisiertVonUserId: string,
    private _istAktiv: boolean,
  ) {
    super(id);
  }

  static create(props: CreateSicherheitsregelProps): Result<Sicherheitsregel> {
    const validation = Sicherheitsregel.validateMutableFields({
      titel: props.titel,
      inhalt: props.inhalt,
      einheitId: props.einheitId,
    });
    if (validation.isFailure) {
      return Result.fail<Sicherheitsregel>(validation.error!);
    }
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail<Sicherheitsregel>('einsatzId ist erforderlich');
    }
    if (!props.erstelltVonUserId || props.erstelltVonUserId.trim().length === 0) {
      return Result.fail<Sicherheitsregel>('erstelltVonUserId ist erforderlich');
    }
    if (!props.propagationGroupId || props.propagationGroupId.trim().length === 0) {
      return Result.fail<Sicherheitsregel>('propagationGroupId ist erforderlich');
    }

    const idResult = SicherheitsregelId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Sicherheitsregel>(idResult.error ?? 'Ungültige ID');
    }

    const titel = props.titel.trim();
    const inhalt = props.inhalt.trim();
    const einheitId = props.einheitId === null ? null : props.einheitId;

    const aggregate = new Sicherheitsregel(idResult.value as SicherheitsregelId, props.einsatzId, einheitId, titel, inhalt, 1, props.erstelltVonUserId, props.erstelltVonUserId, true);

    const changedFields: SicherheitsregelAusgerufenChangedFields = { created: true };
    aggregate.addDomainEvent(
      new SicherheitsregelAusgerufenEvent(props.einsatzId, props.erstelltVonUserId, einheitId ?? undefined, aggregate.id.value, props.propagationGroupId, null, 1, changedFields, titel, inhalt),
    );

    return Result.ok(aggregate);
  }

  /**
   * Rekonstruiert ein Aggregate aus DB-State (Mapper-Pfad). Setzt die
   * tatsächliche DB-`version` und emittiert **keine** Domain-Events — der
   * Persisted-State wurde bereits seinerzeit veröffentlicht.
   *
   * Wird nur vom Infrastructure-Mapper aufgerufen; Anwendungs-/Handler-Code
   * verwendet ausschließlich `create` oder lädt via Repository.
   */
  static reconstitute(props: ReconstituteSicherheitsregelProps): Result<Sicherheitsregel> {
    const validation = Sicherheitsregel.validateMutableFields({
      titel: props.titel,
      inhalt: props.inhalt,
      einheitId: props.einheitId,
    });
    if (validation.isFailure) {
      return Result.fail<Sicherheitsregel>(`Sicherheitsregel.reconstitute: ${validation.error}`);
    }
    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail<Sicherheitsregel>('Sicherheitsregel.reconstitute: einsatzId ist erforderlich');
    }
    if (!props.erstelltVonUserId || props.erstelltVonUserId.trim().length === 0) {
      return Result.fail<Sicherheitsregel>('Sicherheitsregel.reconstitute: erstelltVonUserId ist erforderlich');
    }
    if (!props.aktualisiertVonUserId || props.aktualisiertVonUserId.trim().length === 0) {
      return Result.fail<Sicherheitsregel>('Sicherheitsregel.reconstitute: aktualisiertVonUserId ist erforderlich');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      return Result.fail<Sicherheitsregel>(`Sicherheitsregel.reconstitute: version muss Integer ≥ 1 sein (erhalten: ${String(props.version)})`);
    }

    const idResult = SicherheitsregelId.create(props.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Sicherheitsregel>(`Sicherheitsregel.reconstitute: ungültige ID ${props.id} (${idResult.error ?? 'unknown'})`);
    }

    return Result.ok(
      new Sicherheitsregel(
        idResult.value as SicherheitsregelId,
        props.einsatzId,
        props.einheitId,
        props.titel.trim(),
        props.inhalt.trim(),
        props.version,
        props.erstelltVonUserId,
        props.aktualisiertVonUserId,
        props.istAktiv ?? true,
      ),
    );
  }

  get einsatzId(): string {
    return this._einsatzId;
  }
  get einheitId(): string | null {
    return this._einheitId;
  }
  /**
   * `true` wenn die Regel einsatzweit gilt (AC1 „gesamter Einsatz").
   * Abgeleitet aus `einheitId === null` — konsistent zur Response-Factory.
   */
  get einsatzweit(): boolean {
    return this._einheitId === null;
  }
  get titel(): string {
    return this._titel;
  }
  get inhalt(): string {
    return this._inhalt;
  }
  get version(): number {
    return this._version;
  }
  get erstelltVonUserId(): string {
    return this._erstelltVonUserId;
  }
  get aktualisiertVonUserId(): string {
    return this._aktualisiertVonUserId;
  }
  /**
   * `true` wenn die Regel aktuell aktiv ist (Story 2.7).
   *
   * Wird vom Repository über die Version-Chain ermittelt
   * (`SicherheitsregelVersion.gueltigBis IS NULL` für mindestens eine
   * Versions-Zeile). `findById` ohne Version-Join setzt den Default auf
   * `true` — das ist akzeptiert, weil der Acknowledge-Pfad zwingend über
   * `findActiveById` läuft. Defense-in-Depth: nach `deprecate()` wird der
   * Wert in-memory auf `false` geflippt, damit das Aggregate sich auch im
   * Wiederverwendungs-Fall nicht selbst quittieren lässt.
   */
  get istAktiv(): boolean {
    return this._istAktiv;
  }

  /**
   * Aktualisiert Titel, Inhalt oder Einheiten-Zuordnung atomar,
   * inkrementiert die Version und emittiert ein
   * `SicherheitsregelAusgerufenEvent` mit `{ updated: [...] }` (Story 2.6 AC3).
   *
   * **Optimistic-Concurrency:** `expectedVersion` muss exakt der aktuellen
   * Aggregate-Version entsprechen. Ein Mismatch liefert
   * `SICHERHEITSREGEL_CONFLICT_DETECTED`; der Handler ergänzt den Sentinel
   * um `:current=<n>`, damit der Controller HTTP 409 mit beiden Versionen
   * im Context rendern kann (analog zu Story 2.3).
   *
   * **No-Op-Guard:** Wenn Titel, Inhalt und Einheit identisch zum aktuellen
   * Stand sind, liefert die Methode `SICHERHEITSREGEL_NO_CHANGES_DETECTED`
   * (HTTP 422). Der Diff-Vergleich erfolgt nach `.trim()`, damit rein
   * whitespace-basierte Client-Unterschiede nicht als Change gelten.
   */
  update(props: { titel: string; inhalt: string; einheitId: string | null }, expectedVersion: number, userId: string, propagationGroupId: string): Result<void> {
    if (this._version !== expectedVersion) {
      return Result.fail<void>(SICHERHEITSREGEL_CONFLICT_DETECTED);
    }
    if (!userId || userId.trim().length === 0) {
      return Result.fail<void>('userId ist erforderlich');
    }
    if (!propagationGroupId || propagationGroupId.trim().length === 0) {
      return Result.fail<void>('propagationGroupId ist erforderlich');
    }

    const validation = Sicherheitsregel.validateMutableFields(props);
    if (validation.isFailure) {
      return Result.fail<void>(validation.error!);
    }

    const newTitel = props.titel.trim();
    const newInhalt = props.inhalt.trim();
    const newEinheitId = props.einheitId;

    // Diff-Berechnung: strikter `!==`-Vergleich auf den drei mutable Feldern.
    // Whitespace-only-Änderungen am Titel/Inhalt werden durch `.trim()` oben
    // eliminiert und zählen damit nicht als Change.
    const updatedFields: SicherheitsregelFieldKey[] = [];
    if (newTitel !== this._titel) updatedFields.push('titel');
    if (newInhalt !== this._inhalt) updatedFields.push('inhalt');
    if (newEinheitId !== this._einheitId) updatedFields.push('einheitId');

    if (updatedFields.length === 0) {
      return Result.fail<void>(SICHERHEITSREGEL_NO_CHANGES_DETECTED);
    }

    const fromVersion = this._version;
    const toVersion = this._version + 1;

    this._titel = newTitel;
    this._inhalt = newInhalt;
    this._einheitId = newEinheitId;
    this._version = toVersion;
    this._aktualisiertVonUserId = userId;

    this.addDomainEvent(
      new SicherheitsregelAusgerufenEvent(
        this._einsatzId,
        userId,
        newEinheitId ?? undefined,
        this.id.value,
        propagationGroupId,
        fromVersion,
        toVersion,
        { updated: updatedFields },
        newTitel,
        newInhalt,
      ),
    );

    return Result.ok();
  }

  /**
   * Markiert die Regel logisch als abgekündigt (Story 2.6 AC4 Re-Wire-Pfad).
   *
   * Die `version` wird **nicht** inkrementiert — die bisherige aktive
   * `SicherheitsregelVersion` bekommt nur `gueltigBis = now()` ohne Follower.
   * Dadurch fällt die Row aus `findActiveByEinsatz` heraus, ohne dass eine
   * neue Version-Zeile nötig wäre.
   *
   * Emittiert ein `SicherheitsregelAusgerufenEvent` mit `{ deprecated: true }`,
   * `fromVersion === toVersion === currentVersion`, damit Consumer (Audit,
   * Ampel-Projection) die logische Abkündigung mit `propagationGroupId`
   * nachvollziehen können.
   */
  deprecate(userId: string, propagationGroupId: string): Result<void> {
    if (!userId || userId.trim().length === 0) {
      return Result.fail<void>('userId ist erforderlich');
    }
    if (!propagationGroupId || propagationGroupId.trim().length === 0) {
      return Result.fail<void>('propagationGroupId ist erforderlich');
    }

    this._aktualisiertVonUserId = userId;
    this._istAktiv = false;

    this.addDomainEvent(
      new SicherheitsregelAusgerufenEvent(
        this._einsatzId,
        userId,
        this._einheitId ?? undefined,
        this.id.value,
        propagationGroupId,
        this._version,
        this._version,
        { deprecated: true },
        this._titel,
        this._inhalt,
      ),
    );

    return Result.ok();
  }

  /**
   * Erfasst eine Quittung der Regel durch eine konkrete `EinsatzEinheit`
   * (Story 2.7 AC8).
   *
   * **Invarianten:**
   * 1. Die Regel ist aktiv (`istAktiv === true`) — sonst
   *    `BusinessRule:RegelAbgekuendigt`. Eine logisch abgekündigte Regel kann
   *    nicht mehr quittiert werden; der Banner sollte beim Empfänger durch
   *    den `:deprecated`-Broadcast bzw. die nächste Cache-Invalidation
   *    spätestens verschwunden sein.
   * 2. Die `einheitId` muss zur Regel passen: entweder ist die Regel
   *    einsatzweit (`einheitId === null`, dann quittiert jede Einheit für
   *    sich), oder sie ist exakt dieser konkreten Einheit zugeordnet.
   *    Sonst `BusinessRule:RegelTrifftNichtAufEinheit`.
   * 3. `userId` und `einheitId` sind nicht-leere Strings; sonst
   *    `Invariant:InvalidId`.
   *
   * **Rückgabewert:** Bei Erfolg liefert die Methode den
   * `SicherheitsregelQuittiertEvent` zurück (für die Outbox-Persistierung).
   * Die Methode wirft niemals — alle Pfade liefern `Result.ok | Result.fail`
   * (Lesson Learned aus Stories 2.5/2.6 AC9). Der eigentliche Quittungs-
   * Insert (`SicherheitsregelQuittung`) bleibt im Application-Layer; die
   * Idempotenz wird über den DB-Unique-Constraint
   * `@@unique([regelId, einheitId])` (Prisma P2002) sichergestellt.
   *
   * **propagationGroupId:** Das Aggregate kennt die `propagationGroupId`
   * nicht (sie lebt im Event-Stream, nicht auf der Haupt-Row). Der Handler
   * resolved sie via Outbox-Lookup auf das jüngste
   * `SicherheitsregelAusgerufen`-Event und schiebt sie in den Event-Konstruktor.
   * Diese Methode initialisiert das Event mit `null` — der Handler ersetzt
   * das Event durch eine angereicherte Variante (oder erzeugt sie direkt mit
   * der korrekten Gruppen-ID, abhängig vom Pfad). Default `null` bewahrt das
   * „Aggregate ist self-sufficient"-Invariant.
   */
  acknowledge(einheitId: string, userId: string): Result<{ event: SicherheitsregelQuittiertEvent }> {
    if (!userId || userId.trim().length === 0) {
      return Result.fail<{ event: SicherheitsregelQuittiertEvent }>('Invariant:InvalidId:userId');
    }
    if (!einheitId || einheitId.trim().length === 0) {
      return Result.fail<{ event: SicherheitsregelQuittiertEvent }>('Invariant:InvalidId:einheitId');
    }
    if (!this._istAktiv) {
      return Result.fail<{ event: SicherheitsregelQuittiertEvent }>(SICHERHEITSREGEL_BUSINESS_RULE_REGEL_ABGEKUENDIGT);
    }
    if (this._einheitId !== null && this._einheitId !== einheitId) {
      return Result.fail<{ event: SicherheitsregelQuittiertEvent }>(SICHERHEITSREGEL_BUSINESS_RULE_REGEL_TRIFFT_NICHT_AUF_EINHEIT);
    }

    const event = new SicherheitsregelQuittiertEvent(this._einsatzId, userId, einheitId, this.id.value, null, new Date(), this.id.value);
    return Result.ok({ event });
  }

  /**
   * Gemeinsame Invariant-Prüfung für `create`, `reconstitute` und `update`.
   * Liefert `Result.fail` mit sprechender Fehlermeldung bei der ersten
   * Verletzung — Callsite-seitige Prefix-Dekoration (z. B. "reconstitute:")
   * bleibt beim Aufrufer.
   */
  private static validateMutableFields(props: { titel: string; inhalt: string; einheitId: string | null }): Result<void> {
    if (typeof props.titel !== 'string') {
      return Result.fail<void>('titel muss ein String sein');
    }
    const titelTrim = props.titel.trim();
    if (titelTrim.length === 0) {
      return Result.fail<void>('titel ist erforderlich');
    }
    if (titelTrim.length > TITEL_MAX_LENGTH) {
      return Result.fail<void>(`titel darf höchstens ${TITEL_MAX_LENGTH} Zeichen lang sein`);
    }

    if (typeof props.inhalt !== 'string') {
      return Result.fail<void>('inhalt muss ein String sein');
    }
    const inhaltTrim = props.inhalt.trim();
    if (inhaltTrim.length === 0) {
      return Result.fail<void>('inhalt ist erforderlich');
    }
    if (inhaltTrim.length > INHALT_MAX_LENGTH) {
      return Result.fail<void>(`inhalt darf höchstens ${INHALT_MAX_LENGTH} Zeichen lang sein`);
    }

    if (props.einheitId !== null) {
      if (typeof props.einheitId !== 'string' || props.einheitId.trim().length === 0) {
        return Result.fail<void>('einheitId muss null oder ein nicht-leerer String sein');
      }
    }

    return Result.ok();
  }
}
