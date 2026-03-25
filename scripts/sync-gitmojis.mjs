#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GITMOJI_SOURCE_URL = 'https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_PATH = path.resolve(SCRIPT_DIR, 'gitmojis.snapshot.json');

const USAGE = `Usage:
  node scripts/sync-gitmojis.mjs --write
  node scripts/sync-gitmojis.mjs --check`;

function parseArgs(argv) {
  const hasWrite = argv.includes('--write');
  const hasCheck = argv.includes('--check');

  if ((hasWrite && hasCheck) || (!hasWrite && !hasCheck)) {
    throw new Error(USAGE);
  }

  return {
    mode: hasWrite ? 'write' : 'check',
  };
}

function normalizeGitmoji(raw) {
  const emoji = typeof raw.emoji === 'string' ? raw.emoji : '';
  const code = typeof raw.code === 'string' ? raw.code : '';
  const description = typeof raw.description === 'string' ? raw.description : '';
  const semver = typeof raw.semver === 'string' ? raw.semver : null;

  if (!emoji || !code || !description) {
    throw new Error(`Ungültiger Gitmoji-Eintrag empfangen: ${JSON.stringify(raw)}`);
  }

  return {
    emoji,
    code,
    description,
    semver,
  };
}

function sortGitmojis(gitmojis) {
  return [...gitmojis].sort((left, right) => {
    const byCode = left.code.localeCompare(right.code);
    if (byCode !== 0) {
      return byCode;
    }

    return left.emoji.localeCompare(right.emoji);
  });
}

function stringifySnapshot(gitmojis) {
  return `${JSON.stringify(
    {
      sourceUrl: GITMOJI_SOURCE_URL,
      gitmojis,
    },
    null,
    2,
  )}\n`;
}

async function fetchGitmojis() {
  const response = await fetch(GITMOJI_SOURCE_URL, {
    headers: {
      'User-Agent': 'bluelight-hub-gitmoji-sync',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Download fehlgeschlagen (${response.status} ${response.statusText})`);
  }

  const payload = await response.json();

  if (!payload || !Array.isArray(payload.gitmojis)) {
    throw new Error('Ungültiges Payload: Feld "gitmojis" fehlt oder ist kein Array.');
  }

  const normalized = payload.gitmojis.map(normalizeGitmoji);
  return sortGitmojis(normalized);
}

async function readCurrentSnapshot() {
  try {
    return await readFile(SNAPSHOT_PATH, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function main() {
  const { mode } = parseArgs(process.argv.slice(2));
  const nextGitmojis = await fetchGitmojis();
  const nextSnapshot = stringifySnapshot(nextGitmojis);

  const currentSnapshot = await readCurrentSnapshot();
  const changed = currentSnapshot !== nextSnapshot;

  if (mode === 'check') {
    if (changed) {
      console.error('❌ Gitmoji-Snapshot ist veraltet.');
      console.error(`🔄 Bitte ausführen: node scripts/sync-gitmojis.mjs --write`);
      process.exit(1);
    }

    console.log(`✅ Gitmoji-Snapshot ist aktuell (${nextGitmojis.length} Einträge).`);
    return;
  }

  if (!changed) {
    console.log(`✅ Keine Änderungen erforderlich (${nextGitmojis.length} Einträge).`);
    return;
  }

  await writeFile(SNAPSHOT_PATH, nextSnapshot, 'utf8');
  console.log(`✅ Gitmoji-Snapshot aktualisiert (${nextGitmojis.length} Einträge).`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${message}`);
  process.exit(1);
}
