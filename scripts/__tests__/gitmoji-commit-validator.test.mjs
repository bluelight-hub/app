import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAllowedGitmojis,
  normalizeEmoji,
  validateCommitMessage,
} from '../gitmoji-commit-validator.mjs';

test('akzeptiert gültige Commit-Nachrichten mit offiziellem Gitmoji', async () => {
  const gitmojis = await getAllowedGitmojis();
  const commitMessage = `${gitmojis[0].emoji}(backend): Add commit validation\n\n- Adds strict gitmoji parsing`;

  const result = await validateCommitMessage(commitMessage);

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('lehnt unbekannte Emojis ab', async () => {
  const commitMessage = '🧯(backend): This emoji is not in gitmojis list\n\n- should fail';
  const result = await validateCommitMessage(commitMessage);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'UNKNOWN_EMOJI'));
});

test('akzeptiert FE0F-Varianten tolerant', async (t) => {
  const gitmojis = await getAllowedGitmojis();
  const withVariation = gitmojis.find((gitmoji) => gitmoji.emoji.includes('\uFE0F'));

  if (!withVariation) {
    t.skip('Kein Gitmoji mit Variation Selector gefunden');
    return;
  }

  const withoutVariation = withVariation.emoji.replace(/\uFE0F/gu, '');
  const commitMessage = `${withoutVariation}(tooling): Variation selector tolerant check\n\n- keeps strict list`;

  const result = await validateCommitMessage(commitMessage);

  assert.equal(result.valid, true);
  assert.equal(normalizeEmoji(withVariation.emoji), normalizeEmoji(withoutVariation));
});

test('lehnt ungültiges Format ohne Scope ab', async () => {
  const gitmojis = await getAllowedGitmojis();
  const commitMessage = `${gitmojis[0].emoji}: Missing scope\n\n- should fail`;

  const result = await validateCommitMessage(commitMessage);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'INVALID_FORMAT'));
});

test('lehnt zu lange erste Zeile ab', async () => {
  const gitmojis = await getAllowedGitmojis();
  const tooLong = 'a'.repeat(80);
  const commitMessage = `${gitmojis[0].emoji}(frontend): ${tooLong}\n\n- should fail`;

  const result = await validateCommitMessage(commitMessage);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'FIRST_LINE_TOO_LONG'));
});
