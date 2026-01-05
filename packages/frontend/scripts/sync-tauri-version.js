#!/usr/bin/env node
/**
 * Synchronisiert die Version aus package.json in tauri.conf.json.
 * Wird automatisch bei `npm version` via lifecycle script ausgeführt.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const packageJsonPath = resolve(__dirname, '../package.json');
  const tauriConfPath = resolve(__dirname, '../src-tauri/tauri.conf.json');

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));

  const oldVersion = tauriConf.version;
  tauriConf.version = packageJson.version;

  writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

  console.log(`✅ Tauri version synced: ${oldVersion} → ${packageJson.version}`);
} catch (error) {
  console.error('❌ Failed to sync Tauri version:', error.message);
  process.exit(1);
}
