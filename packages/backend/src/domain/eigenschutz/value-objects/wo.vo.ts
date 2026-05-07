import { Result } from '@domain/common/result';

/**
 * Discriminated-Union-Shape für den Vorfall-Ort `Wo` (Story 5.1).
 *
 * Spiegelt das Epic-Wortlaut „Wo (Freitext oder Koordinate, optional)".
 * Persistenz: Aggregate hält `Wo | null`. Der Mapper konvertiert `null` zu
 * Empty-String `""` und das `Wo`-VO zu `JSON.stringify(toJSON())`, weil die
 * DB-Spalte `EigenschutzVorfall.wo VARCHAR(500)` NOT NULL ist und Story 5.1
 * keine Migration zieht. Aggregate-Invariante stellt sicher, dass
 * `freitext.text.length ≥ 1` — Empty-String kollidiert nie mit `null`-Sentinel.
 */
export type WoProps = { kind: 'coordinate'; longitude: number; latitude: number; addressHint?: string } | { kind: 'freitext'; text: string };

const ADDRESS_HINT_MAX = 300;
const FREITEXT_MIN = 1;
const FREITEXT_MAX = 480;
/** Persistenz-Cap: stringifiziertes JSON muss in `wo VARCHAR(500)` passen. */
const JSON_PERSISTENCE_MAX = 500;

/**
 * Wert-Objekt `Wo`. Längen-Caps stellen sicher, dass das stringifizierte JSON
 * in die `VarChar(500)`-DB-Spalte passt:
 * - `freitext`: `{"kind":"freitext","text":"…"}` ≈ 25 Zeichen Overhead → 480 + 25 ≈ 505.
 *   Wir lassen 5 Zeichen Sicherheits-Reserve für JSON-Escaping (`\"`, `\\`).
 * - `coordinate`: 80 Zeichen Overhead für Numerik + addressHint ≤ 300 → ≤ 460.
 *
 * Invarianten:
 * - `kind = 'coordinate'`: longitude ∈ [−180, 180], latitude ∈ [−90, 90],
 *   `addressHint` optional und nach Trim ≤ 300 Zeichen.
 * - `kind = 'freitext'`: `text` nach Trim 1–480 Zeichen.
 */
export class Wo {
  private constructor(private readonly props: WoProps) {}

  static create(props: WoProps): Result<Wo> {
    if (!props || typeof props !== 'object') {
      return Result.fail<Wo>('Wo ist erforderlich');
    }

    if (props.kind === 'coordinate') {
      if (!Number.isFinite(props.longitude) || props.longitude < -180 || props.longitude > 180) {
        return Result.fail<Wo>('longitude muss zwischen -180 und 180 liegen');
      }
      if (!Number.isFinite(props.latitude) || props.latitude < -90 || props.latitude > 90) {
        return Result.fail<Wo>('latitude muss zwischen -90 und 90 liegen');
      }
      let addressHint: string | undefined;
      if (props.addressHint !== undefined) {
        const trimmed = props.addressHint.trim();
        if (trimmed.length > ADDRESS_HINT_MAX) {
          return Result.fail<Wo>(`addressHint darf maximal ${ADDRESS_HINT_MAX} Zeichen haben`);
        }
        addressHint = trimmed.length === 0 ? undefined : trimmed;
      }
      const candidate = new Wo({ kind: 'coordinate', longitude: props.longitude, latitude: props.latitude, addressHint });
      const overflow = Wo.checkPersistenceOverflow(candidate);
      if (overflow !== null) return overflow;
      return Result.ok(candidate);
    }

    if (props.kind === 'freitext') {
      const text = props.text?.trim() ?? '';
      if (text.length < FREITEXT_MIN) {
        return Result.fail<Wo>('text ist erforderlich');
      }
      if (text.length > FREITEXT_MAX) {
        return Result.fail<Wo>(`text darf maximal ${FREITEXT_MAX} Zeichen haben`);
      }
      const candidate = new Wo({ kind: 'freitext', text });
      const overflow = Wo.checkPersistenceOverflow(candidate);
      if (overflow !== null) return overflow;
      return Result.ok(candidate);
    }

    return Result.fail<Wo>('Unbekannter Wo-Typ');
  }

  // JSON-Escape-Aware Cap-Prüfung: `text` mit vielen `"`/`\\`-Zeichen
  // verdoppelt sich beim `JSON.stringify`. Raw-`length`-Cap (480) reicht nicht
  // für die `wo VARCHAR(500)`-Spalte. Wir validieren die tatsächliche
  // Persistenz-Länge nach JSON-Serialisierung.
  private static checkPersistenceOverflow(candidate: Wo): Result<Wo> | null {
    const serialized = JSON.stringify(candidate.toJSON());
    if (serialized.length > JSON_PERSISTENCE_MAX) {
      return Result.fail<Wo>(`Wo-Payload überschreitet ${JSON_PERSISTENCE_MAX}-Zeichen-Persistenz-Cap (${serialized.length} Zeichen nach JSON-Escape)`);
    }
    return null;
  }

  toJSON(): WoProps {
    if (this.props.kind === 'coordinate') {
      return {
        kind: 'coordinate',
        longitude: this.props.longitude,
        latitude: this.props.latitude,
        ...(this.props.addressHint !== undefined ? { addressHint: this.props.addressHint } : {}),
      };
    }
    return { kind: 'freitext', text: this.props.text };
  }

  get kind(): WoProps['kind'] {
    return this.props.kind;
  }

  equals(other: Wo): boolean {
    if (this.props.kind !== other.props.kind) return false;
    if (this.props.kind === 'coordinate' && other.props.kind === 'coordinate') {
      return this.props.longitude === other.props.longitude && this.props.latitude === other.props.latitude && (this.props.addressHint ?? null) === (other.props.addressHint ?? null);
    }
    if (this.props.kind === 'freitext' && other.props.kind === 'freitext') {
      return this.props.text === other.props.text;
    }
    return false;
  }
}
