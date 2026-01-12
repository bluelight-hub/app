/**
 * Server Color Utilities
 *
 * Bietet Farb-Konstanten und Hilfsfunktionen für die visuelle
 * Unterscheidung von Server-Konfigurationen. Nutzt Tailwind-Farben
 * für konsistentes Styling.
 *
 * @module features/server/utils/server-color
 */

/**
 * Typ für ein einzelnes Farb-Preset mit deutschem Namen,
 * Tailwind-Farbwert und Hex-Code für Preview-Anzeigen.
 */
export interface ServerColorPreset {
  /** Deutscher Anzeigename der Farbe */
  readonly name: string;
  /** Tailwind-Farbwert (z.B. 'sky', 'emerald') */
  readonly value: string;
  /** Hex-Farbcode für Preview-Anzeigen */
  readonly hex: string;
}

/**
 * Vordefinierte Farbpalette für Server-Konfigurationen.
 *
 * Enthält 9 gut unterscheidbare Farben mit deutschen Namen
 * und zugehörigen Tailwind-Klassen. Die Farben sind so gewählt,
 * dass sie auch bei Farbenblindheit gut unterscheidbar sind.
 *
 * @example
 * ```tsx
 * // Farbe in Dropdown anzeigen
 * {SERVER_COLOR_PRESETS.map(({ name, value, hex }) => (
 *   <option key={value} value={value} style={{ backgroundColor: hex }}>
 *     {name}
 *   </option>
 * ))}
 * ```
 */
// M9 Fix: Object.freeze() auf jeden Preset für Runtime-Immutability
// (as const gibt nur Compile-Time Type-Safety, nicht Runtime-Protection)
export const SERVER_COLOR_PRESETS = Object.freeze([
  Object.freeze({ name: 'Himmelblau', value: 'sky', hex: '#0ea5e9' }),
  Object.freeze({ name: 'Smaragd', value: 'emerald', hex: '#10b981' }),
  Object.freeze({ name: 'Bernstein', value: 'amber', hex: '#f59e0b' }),
  Object.freeze({ name: 'Rose', value: 'rose', hex: '#f43f5e' }),
  Object.freeze({ name: 'Violett', value: 'violet', hex: '#8b5cf6' }),
  Object.freeze({ name: 'Cyan', value: 'cyan', hex: '#06b6d4' }),
  Object.freeze({ name: 'Orange', value: 'orange', hex: '#f97316' }),
  Object.freeze({ name: 'Fuchsia', value: 'fuchsia', hex: '#d946ef' }),
  Object.freeze({ name: 'Grau', value: 'slate', hex: '#64748b' }),
]) as readonly Readonly<ServerColorPreset>[];

/**
 * Union Type aller gültigen Server-Farbwerte.
 * Explizit definiert da Object.freeze() den Literal-Type verliert.
 */
export type ServerColorValue = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'orange' | 'fuchsia' | 'slate';

/**
 * Varianten für Tailwind-Farbklassen.
 * Unterstützt background, ring, text und border.
 */
export type ColorVariant = 'bg' | 'ring' | 'text' | 'border';

/**
 * Standard-Fallback-Farbe für ungültige Eingaben.
 */
const FALLBACK_COLOR: ServerColorValue = 'slate';

/**
 * Prüft ob ein Farbwert ein gültiger Server-Farbwert ist.
 *
 * Verwendet strict equality check gegen die vordefinierten
 * Farbwerte in SERVER_COLOR_PRESETS. Case-sensitive.
 *
 * @param color - Der zu prüfende Farbwert
 * @returns true wenn der Wert ein gültiger Server-Farbwert ist
 *
 * @example
 * ```ts
 * isValidServerColor('sky')     // true
 * isValidServerColor('blue')    // false
 * isValidServerColor('SKY')     // false (case-sensitive)
 * isValidServerColor('#0ea5e9') // false (kein Hex)
 * ```
 */
export function isValidServerColor(color: string): color is ServerColorValue {
  return SERVER_COLOR_PRESETS.some((preset) => preset.value === color);
}

/**
 * Farben die eine dunklere Shade (600) für besseren Kontrast mit weißem Text benötigen.
 * Diese Farben haben bei 500er-Shade weniger als 4.5:1 Kontrast mit Weiß.
 */
const LOW_CONTRAST_COLORS: readonly string[] = ['amber', 'orange', 'cyan'];

/**
 * Gibt die Tailwind-CSS-Klasse für eine Server-Farbe zurück.
 *
 * Unterstützt verschiedene Varianten (bg, ring, text, border).
 * Verwendet automatisch die 600er-Shade für Farben mit niedrigem Kontrast
 * (amber, orange, cyan) um WCAG 4.5:1 Kontrast mit weißem Text zu gewährleisten.
 * Bei ungültigen Farben wird die Fallback-Farbe (slate) verwendet.
 *
 * @param color - Der Server-Farbwert (z.B. 'sky', 'emerald')
 * @param variant - Die CSS-Variante ('bg', 'ring', 'text', 'border')
 * @returns Die vollständige Tailwind-CSS-Klasse
 *
 * @example
 * ```ts
 * getServerColorClass('sky', 'bg')     // 'bg-sky-500'
 * getServerColorClass('amber', 'bg')   // 'bg-amber-600' (besserer Kontrast)
 * getServerColorClass('emerald', 'ring') // 'ring-emerald-500'
 * getServerColorClass('invalid', 'bg')  // 'bg-slate-500' (Fallback)
 * ```
 */
export function getServerColorClass(color: string, variant: ColorVariant): string {
  const validColor = isValidServerColor(color) ? color : FALLBACK_COLOR;
  // Verwende 600er-Shade für Farben mit niedrigem Kontrast (WCAG 4.5:1 mit Weiß)
  const shade = LOW_CONTRAST_COLORS.includes(validColor) ? '600' : '500';
  return `${variant}-${validColor}-${shade}`;
}

/**
 * Gibt den Hex-Farbcode für einen Server-Farbwert zurück.
 *
 * Nützlich für Kontexte wo Tailwind-Klassen nicht verwendbar sind,
 * z.B. in Canvas-Zeichnungen oder dynamischen Style-Attributen.
 *
 * @param color - Der Server-Farbwert (z.B. 'sky', 'emerald')
 * @returns Der Hex-Farbcode oder undefined bei ungültiger Farbe
 *
 * @example
 * ```ts
 * getServerColorHex('sky')      // '#0ea5e9'
 * getServerColorHex('invalid')  // undefined
 * ```
 */
export function getServerColorHex(color: string): string | undefined {
  const preset = SERVER_COLOR_PRESETS.find((p) => p.value === color);
  return preset?.hex;
}

/**
 * Gibt die Standard-Server-Farbe zurück.
 *
 * Wird verwendet wenn ein neuer Server erstellt wird und
 * noch keine Farbe ausgewählt wurde.
 *
 * @returns Der Farbwert der Standard-Farbe ('sky')
 *
 * @example
 * ```ts
 * const defaultColor = getDefaultServerColor(); // 'sky'
 * ```
 */
export function getDefaultServerColor(): ServerColorValue {
  // Explizite Type Assertion da Object.freeze() den Literal-Type verliert
  return SERVER_COLOR_PRESETS[0].value as ServerColorValue;
}
