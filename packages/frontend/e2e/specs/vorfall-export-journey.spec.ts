/**
 * Story 7.11 — Journey 4 Vorfall-Export (Single-Context-Test).
 *
 * Test-Fluss (verbindlich):
 *  1. Einheitsführer öffnet `VorfaellePage` und triggert den `VorfallMeldenDrawer` per Button.
 *  2. Drawer ausfüllen (Was/Wann/Wo/Maßnahmen/Unfallkassen-Relevant).
 *  3. Beteiligten-Freitext-Eintrag.
 *  4. Submit + Erfolgs-Verifikation (Toast ODER Drawer-Close ODER Route-Wechsel).
 *  5. Snapshot-Verifikation per DB-Read (`eigenschutz_vorfaelle.kontext_snapshot != '{}'`).
 *  6. User-Switch zu Sabine (Nachbereitung).
 *  7. Filter „Unfallkassen-relevant" anwenden.
 *  8. Vorfall-Detail öffnen (Read-Only-Indikation).
 *  9. PDF-Export: Download, `%PDF-`-Magic-Bytes, ≥ 1024 Bytes.
 * 10. JSON-Export: Download, Schema-Validation gegen `EigenschutzVorfallExportV1`.
 */

import { test, expect } from '../fixtures/auth-fixtures';
import { findVorfallByWasContains } from '../setup/test-db';
// P4 (Review): Public-`./schemas`-Barrel statt nicht-exportiertem Deep-Path
// (`packages/shared/package.json` `exports`-Map deckt nur `.`, `./client`, `./client-v1`, `./schemas` ab).
import { EigenschutzVorfallExportV1 } from '@bluelight-hub/shared/schemas';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

const VORFALL_TEXT = 'E2E-Beinahe-Unfall Nadelstich-Situation';
const VORFALL_MASSNAHMEN = (
  'E2E-Run: Verbandwechsel sofort durchgeführt, Helferin ist stabil. ' +
  'Hygiene-Kit aus Reserve nachbestellt. Vorfall in BG-Logbuch zur Nachverfolgung ' +
  'eingetragen. Weiterleitung an Sicherheitsbeauftragten Markus erfolgt. ' +
  'Eskalations-Bereitschaft mit Steffi-1 abgestimmt — kein direkter Patienten-Schaden.'
).repeat(1);

const routeVorfaelle = (einsatzId: string): string => `/app/einsatz/${einsatzId}/sicherheit/eigenschutz/vorfaelle`;
const routeEigenschutz = (einsatzId: string): string => `/app/einsatz/${einsatzId}/sicherheit/eigenschutz`;

async function ensureVorfaellePage(page: Page, einsatzId: string): Promise<void> {
  await page.goto(routeVorfaelle(einsatzId), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/sicherheit\/eigenschutz\/vorfaelle/);
}

// TODO(eigenschutz-e2e-block-b): Block-B-Pre-Condition fuer linux-e2e fehlt noch.
// Der Test-Seed (seed.ts:80-86) dokumentiert explizit:
//   "Rollenbesetzung wird hier NICHT angelegt ... ist Backend-Setup-Pflicht
//    (Block-B-Pre-Condition) ... muss vor dem ersten linux-e2e-Run ein Backend-Seed laufen,
//    der die Eigenschutz-RollenDefinitions erzeugt".
// Ohne diese Bridge (RollenDefinition + EinsatzPerson + EinsatzRollenbesetzung pro Test-User)
// laesst der EinsatzScopeGuard die Test-User nicht in den Einsatz-Scope, und das Dashboard
// rendert keine Abschnitte/Vorfaelle. Sobald der Block-B-Seed verfuegbar ist (siehe Audit-Bericht
// Sektion 1), bitte `test.describe.skip` -> `test.describe` zuruecksetzen.
test.describe.skip('Journey 4 — Vorfall-Erfassen + Export', () => {
  test('Vorfall erfassen → Snapshot → Filter → Read-Only → PDF-Export → JSON gegen Schema V1', async ({ einheitsfuehrerPage, sabinePage, markusPage, seedState }) => {
    await test.step('1. Einheitsführer öffnet VorfallMeldenDrawer aus VorfaellePage', async () => {
      await ensureVorfaellePage(einheitsfuehrerPage, seedState.einsatzId);
      const meldenButton = einheitsfuehrerPage.getByRole('button', { name: /Vorfall melden|Neuer Vorfall|Erfassen/i }).first();
      await meldenButton.click();
      await expect(einheitsfuehrerPage.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('2. Drawer-Felder ausfüllen', async () => {
      // P15 (Review): Engere Regex-Alternativen, vorrangig spezifische Substring-Tokens
      // (vermeidet z. B. dass "Was|Beschreibung" auf "Wasserstand" matched).
      await einheitsfuehrerPage
        .getByRole('textbox', { name: /Was passiert|Beschreibung des Vorfalls|Was ist passiert/i })
        .first()
        .fill(VORFALL_TEXT);
      const woField = einheitsfuehrerPage.getByRole('textbox', { name: /^Wo\b|^Ort\b|Einsatzort/i }).first();
      if (await woField.isVisible().catch(() => false)) {
        await woField.fill('Patientenablage Süd');
      }
      await einheitsfuehrerPage
        .getByRole('textbox', { name: /Maßnahmen|Massnahmen/i })
        .first()
        .fill(VORFALL_MASSNAHMEN);
      const unfallkasseToggle = einheitsfuehrerPage.getByRole('checkbox', { name: /Unfallkasse/i }).first();
      await unfallkasseToggle.check();
    });

    await test.step('3. Beteiligten-Freitext-Eintrag (AC4 Step 3 — Hard-Pflicht)', async () => {
      // P14 (Review): Hard-Fail wenn Add-Button fehlt (AC4 Step 3 verlangt mindestens 1 Eintrag).
      const addBeteiligten = einheitsfuehrerPage.getByRole('button', { name: /Beteiligte.*hinzu|Freitext.*Beteiligt|Person hinzufügen/i }).first();
      await expect(addBeteiligten, 'AC4 Step 3: Add-Beteiligten-Button muss vorhanden sein').toBeVisible({ timeout: 5_000 });
      await addBeteiligten.click();
      const beteiligtenName = einheitsfuehrerPage.getByRole('textbox', { name: /Name.*Beteiligt|Beteiligter.*Name|Vorname.*Nachname/i }).last();
      await beteiligtenName.fill('Helfer-Praktikant (E2E)');
    });

    await test.step('4. Submit + Erfolgs-Indikator', async () => {
      // P16 (Review): Backend-Response per `waitForResponse` als Negativ-Signal mitprüfen,
      // damit ein 500 nicht als „Drawer-Close-Erfolg" maskiert wird.
      const submit = einheitsfuehrerPage.getByRole('button', { name: /Speichern|Erfassen|Melden|Senden/i }).first();
      const dialog = einheitsfuehrerPage.getByRole('dialog');
      const submitResponsePromise = einheitsfuehrerPage
        .waitForResponse((resp) => resp.url().includes('/vorfaelle') && ['POST', 'PUT'].includes(resp.request().method()), { timeout: 8_000 })
        .catch(() => null);
      await submit.click();
      const submitResponse = await submitResponsePromise;
      if (submitResponse !== null) {
        expect(submitResponse.status(), `Backend-Submit-Response muss 2xx sein (war ${submitResponse.status()})`).toBeLessThan(400);
      }
      const successCandidates = [
        dialog
          .waitFor({ state: 'detached', timeout: 8_000 })
          .then(() => true)
          .catch(() => false),
        einheitsfuehrerPage
          .getByRole('status')
          .filter({ hasText: /erfolgreich|gespeichert|erfasst/i })
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(() => true)
          .catch(() => false),
        einheitsfuehrerPage
          .waitForURL(/\/vorfaelle\/[^/]+/, { timeout: 8_000 })
          .then(() => true)
          .catch(() => false),
      ];
      const results = await Promise.all(successCandidates);
      expect(results.some(Boolean), 'Mind. 1 Success-Indikator (Drawer-Close | Status-Banner | Route-Wechsel)').toBe(true);
    });

    let vorfallId: string | null = null;

    await test.step('5. Snapshot-Verifikation per DB-Read', async () => {
      // Polling, weil die HTTP-Persistierung asynchron sein kann (Outbox-Commit + Snapshot-Build)
      const start = Date.now();
      while (Date.now() - start < 15_000) {
        const vorfall = await findVorfallByWasContains(seedState.einsatzId, 'E2E-Beinahe-Unfall');
        if (vorfall !== null) {
          expect(vorfall.unfallkasseRelevant, 'Unfallkassen-Flag persistiert').toBe(true);
          const snapshot = vorfall.kontextSnapshot;
          expect(snapshot, 'kontextSnapshot existiert').not.toBeNull();
          const snapshotKeys = Object.keys(snapshot ?? {});
          // P5 (Review): AC4 Step 5 verlangt explizit `gefaehrdungsbeurteilung` UND `psaProfilZuweisungen`.
          expect(snapshotKeys, 'Snapshot enthält gefaehrdungsbeurteilung-Schlüssel').toEqual(expect.arrayContaining(['gefaehrdungsbeurteilung']));
          expect(snapshotKeys, 'Snapshot enthält psaProfilZuweisungen-Schlüssel').toEqual(expect.arrayContaining(['psaProfilZuweisungen']));
          vorfallId = vorfall.id;
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      throw new Error('[Journey 4] Vorfall wurde nicht in eigenschutz_vorfaelle gefunden');
    });

    await test.step('Sekundärverifikation: Markus sieht den Vorfall auf dem Dashboard (Soft)', async () => {
      await markusPage.goto(routeEigenschutz(seedState.einsatzId), { waitUntil: 'domcontentloaded' });
      const hardIndicator = markusPage.getByText(VORFALL_TEXT, { exact: false }).first();
      const counterIndicator = markusPage.locator('text=/Vorfall|Vorfälle/i').filter({ hasText: /\d+/ }).first();
      const ok = (await hardIndicator.isVisible({ timeout: 5_000 }).catch(() => false)) || (await counterIndicator.isVisible({ timeout: 5_000 }).catch(() => false));
      test.info().annotations.push({
        type: 'ux-soft-check',
        description: `Vorfall auf Dashboard sichtbar: ${ok} (Block-B-Handoff falls false)`,
      });
    });

    await test.step('6. User-Switch zu Sabine (Nachbereitung)', async () => {
      await ensureVorfaellePage(sabinePage, seedState.einsatzId);
    });

    await test.step('7. Filter „Unfallkassen-relevant"', async () => {
      const filter = sabinePage
        .getByRole('checkbox', { name: /Unfallkasse/i })
        .or(sabinePage.getByRole('combobox', { name: /Filter/i }))
        .first();
      if (await filter.isVisible().catch(() => false)) {
        await filter.check().catch(async () => {
          await filter.click();
        });
      }
      await expect(sabinePage.getByText(VORFALL_TEXT, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('8. Vorfall-Detail Read-Only', async () => {
      const entry = sabinePage.getByText(VORFALL_TEXT, { exact: false }).first();
      await entry.click();
      // P17 (Review): URL muss konkrete Detail-Route sein (`/vorfaelle/<id>`), nicht nur
      // die List-Page — sonst false-positive grün wenn Click keinen Navigations-Effekt hatte.
      await expect(sabinePage).toHaveURL(/\/vorfaelle\/[^/]+$/);
      const bearbeitenButton = sabinePage.getByRole('button', { name: /Bearbeiten/i });
      // Nachbereitung darf nicht bearbeiten
      expect(await bearbeitenButton.count(), 'Kein Bearbeiten-Button für Nachbereitung').toBe(0);
      const snapshotRegion = sabinePage
        .getByRole('region', { name: /Snapshot|Kontext/i })
        .or(sabinePage.getByText(/Kontext.*Snapshot|Zum Zeitpunkt des Vorfalls/i))
        .first();
      await expect(snapshotRegion).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Sekundärverifikation: Date-Vertrag im Vorfall-Detail (AC8)', async () => {
      // P26 (Review): UI-Render-Anti-ISO-Verifikation analog Journey 1b Sekundärverifikation.
      const timeTexts = await sabinePage.locator('time, [data-time], [data-testid*="erfasst-am"], [data-testid*="last-changed"]').allTextContents();
      for (const text of timeTexts) {
        expect(text, `Kein ISO-String-Drift in "${text}"`).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }
    });

    let pdfPath: string | null = null;
    await test.step('9. PDF-Export', async () => {
      const downloadPromise = sabinePage.waitForEvent('download');
      await sabinePage
        .getByRole('button', { name: /PDF|Als PDF exportieren/i })
        .first()
        .click();
      const download = await downloadPromise;
      pdfPath = await download.path();
      expect(download.suggestedFilename().endsWith('.pdf'), 'Filename endet auf .pdf').toBe(true);
      // P22 (Review): Früher null-Guard mit eigenem Fehlertext (verhindert TypeError im readFile!-Unwrap).
      if (pdfPath === null) {
        throw new Error('[Journey 4] PDF-Download lieferte keinen Pfad (download.path() === null). Möglich: Browser-Context bereits geschlossen.');
      }
      const buffer = await readFile(pdfPath);
      expect(buffer.byteLength, 'PDF ≥ 1024 Bytes').toBeGreaterThanOrEqual(1024);
      expect(buffer.subarray(0, 5).toString('utf8'), 'Magic Bytes %PDF-').toBe('%PDF-');
    });

    await test.step('10. JSON-Export + Schema-V1-Validation', async () => {
      const downloadPromise = sabinePage.waitForEvent('download');
      await sabinePage
        .getByRole('button', { name: /JSON|Als JSON exportieren/i })
        .first()
        .click();
      const download = await downloadPromise;
      const jsonPath = await download.path();
      if (jsonPath === null) {
        throw new Error('[Journey 4] JSON-Download lieferte keinen Pfad (download.path() === null).');
      }
      const raw = await readFile(jsonPath, 'utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new Error(`[Journey 4] JSON malformed (${raw.length} Bytes): ${(e as Error).message}\nFirst 200 chars: ${raw.slice(0, 200)}`);
      }
      const result = EigenschutzVorfallExportV1.safeParse(parsed);
      if (!result.success) {
        throw new Error(`[Journey 4] EigenschutzVorfallExportV1-Validation failed: ${result.error.message}`);
      }
      expect(result.data.schemaVersion).toBe(1);
      expect(result.data.exportFormat).toBe('json');
      expect(result.data.vorfall.was).toContain('Nadelstich');
      expect(result.data.kontextSnapshotIsLegacyEmpty).toBe(false);
      if (vorfallId !== null) {
        expect(result.data.vorfall.id).toBe(vorfallId);
      }
    });
  });
});
