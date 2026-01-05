/**
 * Mismatch-Severity für Version-Vergleiche
 *
 * - `critical`: Major-Version unterschiedlich → Prominente Warnung
 * - `warning`: Minor-Version unterschiedlich → Subtle Hinweis
 * - `none`: Patch oder gleich → Keine Warnung
 */
export type MismatchSeverity = 'critical' | 'warning' | 'none';

/**
 * Parst einen Semver-String in Major, Minor und Patch
 *
 * Unterstützt auch Prerelease-Versionen wie `1.0.0-alpha.37`
 *
 * @param version - Semver String (z.B. "1.2.3" oder "1.0.0-alpha.37")
 * @returns Parsed Version Object oder null bei ungültigem Format
 */
export function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

/**
 * Ermittelt die Mismatch-Severity zwischen Frontend- und Backend-Version
 *
 * Semver-basierte Logik:
 * - Major-Unterschied (1.x vs 2.x) → `critical`
 * - Minor-Unterschied (1.0.x vs 1.1.x) → `warning`
 * - Patch-Unterschied (1.0.0 vs 1.0.1) → `none`
 *
 * @param frontendVersion - Frontend-Version (z.B. "1.0.0-alpha.37")
 * @param backendVersion - Backend-Version (z.B. "1.0.0-alpha.36")
 * @returns Severity Level
 */
export function getMismatchSeverity(frontendVersion: string, backendVersion: string): MismatchSeverity {
  const frontend = parseSemver(frontendVersion);
  const backend = parseSemver(backendVersion);

  if (!frontend || !backend) {
    return 'none';
  }

  if (frontend.major !== backend.major) {
    return 'critical';
  }

  if (frontend.minor !== backend.minor) {
    return 'warning';
  }

  return 'none';
}
