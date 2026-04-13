import { Result } from '@domain/common/result';

/**
 * Props für die ZeichenDefinition.
 * Kapselt alle relevanten Felder für die Definition eines taktischen Zeichens.
 */
export interface ZeichenDefinitionProps {
  grundzeichen: string;
  organisation?: string;
  fachaufgabe?: string;
  einheit?: string;
  verwaltungsstufe?: string;
  symbol?: string;
  text?: string;
}

/**
 * Value Object für die Definition eines taktischen Zeichens.
 *
 * Kapselt die Zeichenkonfiguration gemäß dem Standard für taktische Zeichen
 * im deutschen Katastrophenschutz (DIN 14011, THW-Vorschriften etc.).
 *
 * Das Grundzeichen ist Pflicht; alle weiteren Eigenschaften sind optional
 * und verfeinern das Symbol (Organisation, Fachaufgabe, Einheit usw.).
 */
export class ZeichenDefinition {
  private constructor(
    public readonly grundzeichen: string,
    public readonly organisation: string | undefined,
    public readonly fachaufgabe: string | undefined,
    public readonly einheit: string | undefined,
    public readonly verwaltungsstufe: string | undefined,
    public readonly symbol: string | undefined,
    public readonly text: string | undefined,
  ) {}

  /**
   * Factory Method mit Validierung.
   * Grundzeichen ist Pflichtfeld und darf nicht leer sein.
   *
   * @param props - ZeichenDefinitionProps mit Grundzeichen und optionalen Feldern
   * @returns Result<ZeichenDefinition> - Erfolg oder Fehler mit Meldung
   */
  static create(props: ZeichenDefinitionProps): Result<ZeichenDefinition> {
    if (!props.grundzeichen || props.grundzeichen.trim() === '') {
      return Result.fail<ZeichenDefinition>('GRUNDZEICHEN_REQUIRED');
    }
    return Result.ok<ZeichenDefinition>(
      new ZeichenDefinition(
        props.grundzeichen.trim(),
        props.organisation?.trim() || undefined,
        props.fachaufgabe?.trim() || undefined,
        props.einheit?.trim() || undefined,
        props.verwaltungsstufe?.trim() || undefined,
        props.symbol?.trim() || undefined,
        props.text?.trim() || undefined,
      ),
    );
  }

  /**
   * Erstellt eine ZeichenDefinition aus einem JSON-Objekt (z.B. aus der Datenbank).
   * Wird vom Repository-Mapper für die Rekonstruktion verwendet.
   *
   * @param json - Rohes JSON-Objekt aus der Persistenz
   * @returns Result<ZeichenDefinition>
   */
  static fromJson(json: Record<string, unknown>): Result<ZeichenDefinition> {
    return ZeichenDefinition.create({
      grundzeichen: json.grundzeichen as string,
      organisation: json.organisation as string | undefined,
      fachaufgabe: json.fachaufgabe as string | undefined,
      einheit: json.einheit as string | undefined,
      verwaltungsstufe: json.verwaltungsstufe as string | undefined,
      symbol: json.symbol as string | undefined,
      text: json.text as string | undefined,
    });
  }

  /**
   * Serialisiert die ZeichenDefinition in ein einfaches Objekt für die Persistenz.
   * Lässt undefined-Felder weg (kein unnötiger Speicherverbrauch).
   *
   * @returns ZeichenDefinitionProps ohne undefined-Felder
   */
  toJson(): ZeichenDefinitionProps {
    return {
      grundzeichen: this.grundzeichen,
      ...(this.organisation && { organisation: this.organisation }),
      ...(this.fachaufgabe && { fachaufgabe: this.fachaufgabe }),
      ...(this.einheit && { einheit: this.einheit }),
      ...(this.verwaltungsstufe && { verwaltungsstufe: this.verwaltungsstufe }),
      ...(this.symbol && { symbol: this.symbol }),
      ...(this.text && { text: this.text }),
    };
  }

  /**
   * Strukturelle Gleichheit: Zwei ZeichenDefinitionen sind gleich wenn
   * alle Felder übereinstimmen.
   *
   * @param other - Andere ZeichenDefinition zum Vergleich
   * @returns true wenn alle Felder übereinstimmen
   */
  equals(other: ZeichenDefinition): boolean {
    return (
      this.grundzeichen === other.grundzeichen &&
      this.organisation === other.organisation &&
      this.fachaufgabe === other.fachaufgabe &&
      this.einheit === other.einheit &&
      this.verwaltungsstufe === other.verwaltungsstufe &&
      this.symbol === other.symbol &&
      this.text === other.text
    );
  }
}
