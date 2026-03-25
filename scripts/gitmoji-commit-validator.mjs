#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GITMOJI_SOURCE_URL = 'https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const GITMOJI_SNAPSHOT_PATH = path.resolve(SCRIPT_DIR, 'gitmojis.snapshot.json');
export const FIRST_LINE_MAX_LENGTH = 72;

const SUBJECT_PATTERN = /^(?<emoji>\S+)\((?<context>[a-zA-Z0-9-]+)\): (?<description>.+)$/u;

let cachedSnapshot = null;

export function normalizeEmoji(value) {
  return value.normalize('NFC').replace(/\uFE0F/gu, '');
}

export async function loadGitmojiSnapshot() {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const raw = await readFile(GITMOJI_SNAPSHOT_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.gitmojis)) {
    throw new Error(`Ungültiger Snapshot in ${GITMOJI_SNAPSHOT_PATH}`);
  }

  cachedSnapshot = {
    sourceUrl: typeof parsed.sourceUrl === 'string' ? parsed.sourceUrl : GITMOJI_SOURCE_URL,
    gitmojis: parsed.gitmojis,
  };

  return cachedSnapshot;
}

export async function getAllowedGitmojis() {
  const snapshot = await loadGitmojiSnapshot();
  return snapshot.gitmojis;
}

function createAllowedEmojiSet(gitmojis) {
  const set = new Set();

  for (const gitmoji of gitmojis) {
    if (gitmoji && typeof gitmoji.emoji === 'string') {
      set.add(normalizeEmoji(gitmoji.emoji));
    }
  }

  return set;
}

export async function validateCommitMessage(commitMessage) {
  const gitmojis = await getAllowedGitmojis();
  const allowedEmojiSet = createAllowedEmojiSet(gitmojis);

  const lines = commitMessage.split(/\r?\n/u);
  const firstLine = lines[0] ?? '';
  const nonEmptyLineCount = lines.filter((line) => line.trim().length > 0).length;

  const errors = [];
  const warnings = [];

  if (firstLine.length === 0) {
    errors.push({
      code: 'EMPTY_MESSAGE',
      message: 'Commit-Nachricht ist leer.',
    });
  }

  if (firstLine.length > FIRST_LINE_MAX_LENGTH) {
    errors.push({
      code: 'FIRST_LINE_TOO_LONG',
      message: `Erste Zeile ist zu lang (${firstLine.length}/${FIRST_LINE_MAX_LENGTH}).`,
    });
  }

  const subjectMatch = firstLine.match(SUBJECT_PATTERN);

  if (!subjectMatch || !subjectMatch.groups) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: 'Erste Zeile entspricht nicht dem Format <emoji>(<scope>): <message>.',
    });
  } else {
    const { emoji, context, description } = subjectMatch.groups;

    if (!allowedEmojiSet.has(normalizeEmoji(emoji))) {
      errors.push({
        code: 'UNKNOWN_EMOJI',
        message: `Emoji "${emoji}" ist nicht in der offiziellen Gitmoji-Liste enthalten.`,
      });
    }

    if (!context || !description) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Scope oder Beschreibung fehlt in der ersten Zeile.',
      });
    }
  }

  if (nonEmptyLineCount > 0 && nonEmptyLineCount < 3) {
    warnings.push({
      code: 'SHORT_MESSAGE',
      message: 'Einzeilige Commit-Nachricht erkannt. Für substantielle Änderungen sind mehrzeilige Commits erwünscht.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    firstLine,
    firstLineLength: firstLine.length,
    nonEmptyLineCount,
    allowedEmojiCount: allowedEmojiSet.size,
  };
}

function printHumanErrors(result) {
  console.error('❌ FEHLER: Commit-Nachricht ist ungültig.');
  for (const error of result.errors) {
    console.error(`- ${error.message}`);
  }
  console.error('📋 Erwartetes Format: <emoji>(<scope>): <message>');
  console.error('💡 Beispiel: ✨(frontend): Neue Benutzeroberfläche für Dashboard');
  console.error(`🔎 Erlaubte Emojis: ${result.allowedEmojiCount} (Source of Truth: ${GITMOJI_SOURCE_URL})`);
}

function parseCliArgs(argv) {
  const args = {
    file: null,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--json') {
      args.json = true;
      continue;
    }

    if (token === '--file') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Fehlender Wert für --file');
      }
      args.file = value;
      index += 1;
      continue;
    }

    if (token === '--help' || token === '-h') {
      console.log('Usage: node scripts/gitmoji-commit-validator.mjs --file <path> [--json]');
      process.exit(0);
    }

    throw new Error(`Unbekanntes Argument: ${token}`);
  }

  if (!args.file) {
    throw new Error('Bitte --file <path> angeben.');
  }

  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const commitMessage = await readFile(args.file, 'utf8');
  const result = await validateCommitMessage(commitMessage);

  if (args.json) {
    console.log(JSON.stringify(result));
  } else if (!result.valid) {
    printHumanErrors(result);
  }

  if (!result.valid) {
    process.exit(1);
  }
}

const invokedAsScript = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (invokedAsScript) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}
