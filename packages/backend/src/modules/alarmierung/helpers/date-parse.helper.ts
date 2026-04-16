/**
 * Übersetzt ein Request-Datum (`Date | string | undefined | null`) in ein
 * `Date` oder `undefined`. Akzeptiert ISO-Strings aus JSON-Bodies.
 *
 * Ungültige Strings (nicht parsebar) liefern `undefined` — der Caller muss
 * entscheiden, ob daraus ein 400 / eine ignorierte Eingabe wird.
 *
 * Wird von allen Alarmierungs-Controllern genutzt, um DTO-Zeitstempel
 * uniform in Domain-`Date`-Werte umzuwandeln.
 */
export function toOptionalDate(value: Date | string | undefined | null): Date | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
