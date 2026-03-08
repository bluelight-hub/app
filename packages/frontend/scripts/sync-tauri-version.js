#!/usr/bin/env node
/**
 * Synchronisiert die Version aus package.json in tauri.conf.json.
 * Wird automatisch bei `npm version` via lifecycle script ausgeführt.
 *
 * Konvertiert Semver-Prerelease zu Tauri/MSI-kompatiblem Format:
 * - `1.0.0-alpha.37` → `1.0.0-37`
 * - `1.0.0-beta.5` → `1.0.0-5`
 * - `1.0.0` → `1.0.0`
 *
 * Numerisches Prerelease ist gültiges Semver UND MSI-kompatibel.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Konvertiert Semver zu Tauri/MSI-kompatiblem Format
 *
 * @param {string} semver - Semver Version (z.B. "1.0.0-alpha.37")
 * @returns {string} Tauri-kompatible Version (z.B. "1.0.0-37")
 */
function toTauriVersion(semver) {
  // Match: major.minor.patch[-prerelease.num]
  const match = semver.match(/^(\d+)\.(\d+)\.(\d+)(?:-[a-zA-Z]+\.(\d+))?/);

  if (!match) {
    throw new Error(`Invalid semver format: ${semver}`);
  }

  const [, major, minor, patch, prereleaseNum] = match;

  // Format: X.Y.Z-NUM (gültiges Semver mit numerischem Prerelease)
  if (prereleaseNum) {
    return `${major}.${minor}.${patch}-${prereleaseNum}`;
  }

  return `${major}.${minor}.${patch}`;
}

try {
  const packageJsonPath = resolve(__dirname, '../package.json');
  const tauriConfPath = resolve(__dirname, '../src-tauri/tauri.conf.json');

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));

  const oldVersion = tauriConf.version;
  const tauriVersion = toTauriVersion(packageJson.version);
  tauriConf.version = tauriVersion;

  writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

  console.log(`✅ Tauri version synced: ${oldVersion} → ${tauriVersion} (from ${packageJson.version})`);
} catch (error) {
  console.error('❌ Failed to sync Tauri version:', error.message);
  let process;
  process.exit(1);
}
