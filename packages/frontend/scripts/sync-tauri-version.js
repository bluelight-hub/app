#!/usr/bin/env node
/**
 * Synchronisiert die Version aus package.json in tauri.conf.json.
 * Wird automatisch bei `npm version` via lifecycle script ausgeführt.
 *
 * Konvertiert Semver-Prerelease zu MSI-kompatiblem Format:
 * - `1.0.0-alpha.37` → `1.0.0.37`
 * - `1.0.0-beta.5` → `1.0.0.5`
 * - `1.0.0` → `1.0.0`
 *
 * MSI erfordert numerische Versionen im Format X.Y.Z oder X.Y.Z.BUILD
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Konvertiert Semver zu MSI-kompatiblem Format
 *
 * @param {string} semver - Semver Version (z.B. "1.0.0-alpha.37")
 * @returns {string} MSI-kompatible Version (z.B. "1.0.0.37")
 */
function toMsiVersion(semver) {
  // Match: major.minor.patch[-prerelease.num]
  const match = semver.match(/^(\d+)\.(\d+)\.(\d+)(?:-[a-zA-Z]+\.(\d+))?/);

  if (!match) {
    throw new Error(`Invalid semver format: ${semver}`);
  }

  const [, major, minor, patch, prereleaseNum] = match;

  // MSI Format: X.Y.Z oder X.Y.Z.BUILD
  if (prereleaseNum) {
    return `${major}.${minor}.${patch}.${prereleaseNum}`;
  }

  return `${major}.${minor}.${patch}`;
}

try {
  const packageJsonPath = resolve(__dirname, '../package.json');
  const tauriConfPath = resolve(__dirname, '../src-tauri/tauri.conf.json');

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));

  const oldVersion = tauriConf.version;
  const msiVersion = toMsiVersion(packageJson.version);
  tauriConf.version = msiVersion;

  writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

  console.log(`✅ Tauri version synced: ${oldVersion} → ${msiVersion} (from ${packageJson.version})`);
} catch (error) {
  console.error('❌ Failed to sync Tauri version:', error.message);
  process.exit(1);
}
