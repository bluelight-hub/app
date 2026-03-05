#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline/promises';
import { getAllowedGitmojis, normalizeEmoji } from './gitmoji-commit-validator.mjs';

const COMMIT_MESSAGE_FILE = path.resolve(process.cwd(), 'commit-message.txt');

function runGit(args, options = {}) {
  return spawnSync('git', args, {
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    encoding: options.encoding ?? 'utf8',
  });
}

function getStagedFiles() {
  const result = runGit(['diff', '--staged', '--name-only']);

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || 'Unbekannter Git-Fehler.';
    throw new Error(stderr);
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function askYesNo(readlineInterface, prompt, defaultYes) {
  const suffix = defaultYes ? ' (Y/n): ' : ' (y/N): ';
  const answer = (await readlineInterface.question(`${prompt}${suffix}`)).trim().toLowerCase();

  if (!answer) {
    return defaultYes;
  }

  if (answer === 'y' || answer === 'yes' || answer === 'j' || answer === 'ja') {
    return true;
  }

  if (answer === 'n' || answer === 'no' || answer === 'nein') {
    return false;
  }

  return defaultYes;
}

async function askRequired(readlineInterface, prompt) {
  while (true) {
    const answer = (await readlineInterface.question(prompt)).trim();
    if (answer.length > 0) {
      return answer;
    }
    console.log('⚠️ Eingabe darf nicht leer sein.');
  }
}

async function askShortDescription(readlineInterface) {
  while (true) {
    const value = (await readlineInterface.question('📋 Kurze Beschreibung (max. 50 Zeichen): ')).trim();

    if (value.length === 0) {
      console.log('⚠️ Beschreibung darf nicht leer sein.');
      continue;
    }

    if (value.length > 50) {
      console.log(`⚠️ Beschreibung ist zu lang (${value.length}/50). Bitte kürzen.`);
      continue;
    }

    return value;
  }
}

async function chooseGitmoji(readlineInterface, gitmojis) {
  console.log('📝 Wähle den Commit-Typ aus der offiziellen Gitmoji-Liste:');

  gitmojis.forEach((gitmoji, index) => {
    console.log(` ${String(index + 1).padStart(2, ' ')} ) ${gitmoji.emoji} ${gitmoji.code} - ${gitmoji.description}`);
  });

  while (true) {
    const rawChoice = (await readlineInterface.question(`Auswahl (1-${gitmojis.length}): `)).trim();
    const choice = Number.parseInt(rawChoice, 10);

    if (!Number.isNaN(choice) && choice >= 1 && choice <= gitmojis.length) {
      return gitmojis[choice - 1];
    }

    console.log('❌ Ungültige Auswahl. Bitte erneut versuchen.');
  }
}

function printStagedFiles(files) {
  console.log('📁 Staged Changes gefunden:');
  for (const file of files) {
    console.log(`  ✓ ${file}`);
  }
  console.log('');
}

async function createCommit() {
  console.log('🚀 Bluelight-Hub Commit Helper');
  console.log('===============================');

  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    let stagedFiles = getStagedFiles();

    if (stagedFiles.length === 0) {
      console.log('⚠️ Keine staged Changes gefunden!');
      const stageAll = await askYesNo(rl, '🔧 Alle Änderungen automatisch stagen?', false);

      if (!stageAll) {
        console.log('❌ Bitte zuerst Änderungen stagen: git add <files>');
        process.exit(1);
      }

      const stageResult = runGit(['add', '.'], {
        stdio: 'inherit',
      });

      if (stageResult.status !== 0) {
        process.exit(stageResult.status ?? 1);
      }

      stagedFiles = getStagedFiles();

      if (stagedFiles.length === 0) {
        console.log('❌ Nach git add . sind weiterhin keine staged Änderungen vorhanden.');
        process.exit(1);
      }
    }

    printStagedFiles(stagedFiles);

    const gitmojis = await getAllowedGitmojis();
    const selectedGitmoji = await chooseGitmoji(rl, gitmojis);

    console.log('');
    const context = await askRequired(rl, '🏷️ Context (z. B. frontend, backend, shared): ');

    console.log('');
    const shortDescription = await askShortDescription(rl);

    console.log('');
    const detailedDescription = (await rl.question('📝 Detaillierte Beschreibung (optional): ')).trim();

    console.log('');
    console.log('📌 Stichpunkte (Enter ohne Eingabe zum Beenden):');
    const bulletPoints = [];

    while (true) {
      const bullet = (await rl.question(`  ${bulletPoints.length + 1}) `)).trim();
      if (bullet.length === 0) {
        break;
      }
      bulletPoints.push(`- ${bullet}`);
    }

    let breakingDescription = '';
    if (normalizeEmoji(selectedGitmoji.emoji) === normalizeEmoji('💥')) {
      console.log('');
      breakingDescription = await askRequired(rl, '⚠️ Breaking Change Beschreibung: ');
    }

    const lines = [`${selectedGitmoji.emoji}(${context}): ${shortDescription}`];

    if (detailedDescription || bulletPoints.length > 0 || breakingDescription) {
      lines.push('');
    }

    if (detailedDescription) {
      lines.push(detailedDescription);
    }

    if (bulletPoints.length > 0) {
      lines.push(...bulletPoints);
    }

    if (breakingDescription) {
      lines.push('');
      lines.push(`💥 BREAKING CHANGE: ${breakingDescription}`);
    }

    await writeFile(COMMIT_MESSAGE_FILE, `${lines.join('\n')}\n`, 'utf8');

    console.log('');
    console.log('📋 Commit-Message Vorschau:');
    console.log('=================================');
    console.log(lines.join('\n'));
    console.log('=================================');
    console.log('');

    const shouldCommit = await askYesNo(rl, '✅ Commit erstellen?', true);
    if (!shouldCommit) {
      console.log('❌ Commit abgebrochen');
      process.exit(0);
    }

    const commitResult = runGit(['commit', '-F', COMMIT_MESSAGE_FILE], {
      stdio: 'inherit',
      encoding: undefined,
    });

    if (commitResult.status !== 0) {
      process.exit(commitResult.status ?? 1);
    }

    console.log('');
    console.log('🎉 Commit erfolgreich erstellt!');
    console.log('🔍 Letzter Commit:');

    const logResult = runGit(['log', '--oneline', '-1'], {
      stdio: 'inherit',
      encoding: undefined,
    });

    if (logResult.status !== 0) {
      process.exit(logResult.status ?? 1);
    }
  } finally {
    rl.close();
    await rm(COMMIT_MESSAGE_FILE, { force: true });
  }
}

try {
  await createCommit();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${message}`);
  process.exit(1);
}
