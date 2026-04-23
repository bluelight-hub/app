import { Result } from '@domain/common/result';
import type { GefaehrdungItemFieldKey } from '../events/gefaehrdungsbeurteilung-aktualisiert.event';
import {
  EINTRITTSWAHRSCHEINLICHKEIT_WERTE,
  GEFAEHRDUNG_ITEM_LIMITS,
  RISIKOKLASSE_WERTE,
  SCHADENSAUSMASS_WERTE,
  type Eintrittswahrscheinlichkeit,
  type Risikoklasse,
  type Schadensausmass,
} from './gefaehrdung-enums';
import { calculateRisikoklasse } from './risikoklasse-berechnung';

// Re-Export der Enum-Konstanten + Types, damit Konsumenten des VO-Moduls
// nicht zusätzlich `gefaehrdung-enums.ts` importieren müssen. Die Konstanten
// selbst leben in `gefaehrdung-enums.ts` — siehe dortiger Header-Kommentar
// zum Circular-Dependency-Grund.
export { EINTRITTSWAHRSCHEINLICHKEIT_WERTE, GEFAEHRDUNG_ITEM_LIMITS, RISIKOKLASSE_WERTE, SCHADENSAUSMASS_WERTE };
export type { Eintrittswahrscheinlichkeit, Risikoklasse, Schadensausmass };

/**
 * Rohdaten-Shape eines Items — genau die Form, in der das Item im JSONB-Feld
 * persistiert wird. Entspricht 1:1 dem Shared-Zod-Schema `GefaehrdungItem`,
 * wird hier aber noch einmal im Domain-Layer redeklariert, um Domain-Purity
 * zu wahren (kein Import aus `@bluelight-hub/shared`).
 */
export interface GefaehrdungItemProps {
  id?: string;
  title: string;
  description?: string;
  eintritt?: Eintrittswahrscheinlichkeit;
  schaden?: Schadensausmass;
  risikoklasse?: Risikoklasse;
  schutzmassnahmen?: string;
}

/**
 * Wert-Objekt für ein einzelnes Gefährdungs-Item im JSONB-Array einer
 * Gefährdungsbeurteilung.
 *
 * **Invarianten:**
 * - `title` ist Pflicht, nach Trim ≥ 1 und ≤ 120 Zeichen.
 * - `description` optional, nach Trim ≤ 2000 Zeichen.
 * - `schutzmassnahmen` optional, nach Trim ≤ 2000 Zeichen.
 * - Risiko-Felder optional — Vorlagen dürfen vorbereitete Leer-Items haben,
 *   die der Sicherheitsbeauftragte in Story 2.2 befüllt.
 *
 * **Deep-Clone:** `clone()` liefert eine vollständige Kopie des Items. Wird im
 * CreateHandler für die Deep-Copy-Semantik aus Vorlagen genutzt (FR5,
 * „Vorlagen-Drift"-Mitigation): Items einer Vorlage dürfen sich auf einer
 * bereits angelegten Beurteilung niemals nachträglich verändern.
 */
export class GefaehrdungItem {
  private constructor(private readonly props: GefaehrdungItemProps) {}

  static create(props: GefaehrdungItemProps): Result<GefaehrdungItem> {
    const title = props.title?.trim() ?? '';
    if (title.length < GEFAEHRDUNG_ITEM_LIMITS.titleMin) {
      return Result.fail<GefaehrdungItem>('Titel ist erforderlich');
    }
    if (title.length > GEFAEHRDUNG_ITEM_LIMITS.titleMax) {
      return Result.fail<GefaehrdungItem>(`Titel darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.titleMax} Zeichen haben`);
    }

    const description = props.description?.trim();
    if (description !== undefined && description.length > GEFAEHRDUNG_ITEM_LIMITS.descriptionMax) {
      return Result.fail<GefaehrdungItem>(`Beschreibung darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.descriptionMax} Zeichen haben`);
    }

    // AC5: Leere Strings (auch nach Trim) werden als `undefined` persistiert,
    // damit die Ampel-Projection (FR40 / Story 6.1) „fehlend oder leer"
    // einheitlich behandelt. Dasselbe für `description` aus Konsistenz-Gründen.
    const schutzmassnahmenTrimmed = props.schutzmassnahmen?.trim();
    if (schutzmassnahmenTrimmed !== undefined && schutzmassnahmenTrimmed.length > GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax) {
      return Result.fail<GefaehrdungItem>(`Schutzmaßnahmen dürfen maximal ${GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax} Zeichen haben`);
    }
    const schutzmassnahmen = schutzmassnahmenTrimmed === undefined || schutzmassnahmenTrimmed.length === 0 ? undefined : schutzmassnahmenTrimmed;
    const normalizedDescription = description === undefined || description.length === 0 ? undefined : description;

    if (props.eintritt !== undefined && !EINTRITTSWAHRSCHEINLICHKEIT_WERTE.includes(props.eintritt)) {
      return Result.fail<GefaehrdungItem>('Ungültige Eintrittswahrscheinlichkeit');
    }
    if (props.schaden !== undefined && !SCHADENSAUSMASS_WERTE.includes(props.schaden)) {
      return Result.fail<GefaehrdungItem>('Ungültiges Schadensausmaß');
    }
    if (props.risikoklasse !== undefined && !RISIKOKLASSE_WERTE.includes(props.risikoklasse)) {
      return Result.fail<GefaehrdungItem>('Ungültige Risikoklasse');
    }

    // Backend-Autorität (ADR-013, AC3): Die Risikoklasse wird ausschließlich
    // aus dem aktuellen (eintritt, schaden)-Paar berechnet — ein vom Client
    // mitgelieferter `risikoklasse`-Wert wird **nie** übernommen. Wenn eine
    // der Dimensionen fehlt, ist die Klasse `undefined` (noch nicht bewertet);
    // ein veralteter Client-Wert darf nicht silent durchreichen.
    const risikoklasse = props.eintritt !== undefined && props.schaden !== undefined ? calculateRisikoklasse(props.eintritt, props.schaden) : undefined;

    return Result.ok(
      new GefaehrdungItem({
        id: props.id,
        title,
        description: normalizedDescription,
        eintritt: props.eintritt,
        schaden: props.schaden,
        risikoklasse,
        schutzmassnahmen,
      }),
    );
  }

  get id(): string | undefined {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get eintritt(): Eintrittswahrscheinlichkeit | undefined {
    return this.props.eintritt;
  }
  get schaden(): Schadensausmass | undefined {
    return this.props.schaden;
  }
  get risikoklasse(): Risikoklasse | undefined {
    return this.props.risikoklasse;
  }
  get schutzmassnahmen(): string | undefined {
    return this.props.schutzmassnahmen;
  }

  /**
   * Serialisiert das Item in sein Roh-Shape — genau so wird es im JSONB-Feld
   * der Datenbank abgelegt.
   */
  toJSON(): GefaehrdungItemProps {
    const raw: GefaehrdungItemProps = { title: this.props.title };
    if (this.props.id !== undefined) raw.id = this.props.id;
    if (this.props.description !== undefined) raw.description = this.props.description;
    if (this.props.eintritt !== undefined) raw.eintritt = this.props.eintritt;
    if (this.props.schaden !== undefined) raw.schaden = this.props.schaden;
    if (this.props.risikoklasse !== undefined) raw.risikoklasse = this.props.risikoklasse;
    if (this.props.schutzmassnahmen !== undefined) raw.schutzmassnahmen = this.props.schutzmassnahmen;
    return raw;
  }

  /**
   * Deep-Clone — echte Kopie des Wert-Objekts. Nutzt `structuredClone`, damit
   * auch künftige komplexere Item-Felder (Arrays, verschachtelte Objekte)
   * sicher dupliziert werden.
   */
  clone(): GefaehrdungItem {
    return new GefaehrdungItem(structuredClone(this.props));
  }

  /**
   * Liefert `true`, wenn dieses Item auf den fünf Diff-Feldern (siehe
   * `GefaehrdungItemFieldKey`) bit-identisch zu `other` ist. Die Felder
   * `id` und `risikoklasse` werden bewusst nicht verglichen — `id` ist
   * Identitätsträger (nicht Diff-Material), `risikoklasse` ist server-
   * abgeleitet aus `(eintritt, schaden)` und damit redundant.
   */
  equalsContent(other: GefaehrdungItem): boolean {
    return this.diffFields(other).length === 0;
  }

  /**
   * Liefert die Liste der Diff-Felder, deren Werte sich zwischen `this` und
   * `other` unterscheiden. Strikter Vergleich auf den normalisierten Werten
   * aus `create()` — `undefined` und Leerstring werden dort bereits auf
   * `undefined` kollabiert, also gilt für den Diff `===`-Gleichheit.
   *
   * **Ordering-Contract (verbindlich für Consumer):** Die Ausgabe folgt einer
   * festen Deklarationsreihenfolge — `title`, `description`, `eintritt`,
   * `schaden`, `schutzmassnahmen`. Event-Deserializer-Tests, Audit-Report-
   * Snapshots (Story 2.4 Timeline, Story 6.1 Ampel) und die Event-Payload-
   * Round-Trip-Tests assertieren auf exakte Array-Equality, nicht auf
   * Set-Equality. Änderungen an dieser Reihenfolge sind ein Breaking-Change
   * und müssen durch alle dependent Tests begleitet werden.
   */
  diffFields(other: GefaehrdungItem): GefaehrdungItemFieldKey[] {
    const fields: GefaehrdungItemFieldKey[] = [];
    if (this.props.title !== other.props.title) fields.push('title');
    if (this.props.description !== other.props.description) fields.push('description');
    if (this.props.eintritt !== other.props.eintritt) fields.push('eintritt');
    if (this.props.schaden !== other.props.schaden) fields.push('schaden');
    if (this.props.schutzmassnahmen !== other.props.schutzmassnahmen) fields.push('schutzmassnahmen');
    return fields;
  }
}
