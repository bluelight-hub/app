/**
 * Story 7.11 — Journey 1b CBRN-Hochstufung (Multi-Context-Browser-Test).
 *
 * Test-Fluss (verbindlich, dokumentiert per `test.step()`):
 *  1. Markus (Sicherheitsbeauftragter) öffnet die Eigenschutz-Startseite.
 *  2. Markus markiert 3 Abschnitte per Multi-Select und öffnet den PSA-Drawer.
 *  3. CBRN-Profil aktivieren.
 *  4. Begründung eintragen.
 *  5. Submit + Stopwatch start.
 *  6. Parallel: Outbox-Event-Verifikation per DB-Read + WS-Banner in Steffi-1/2/3-Contexts.
 *  7. Steffi-1 + Steffi-2 quittieren.
 *  8. Steffi-3 meldet Lücke (Rück-Eskalation).
 *  9. Markus-Dashboard zeigt Mix Grün/Amber.
 * 10. Stopwatch-Auswertung (≤ 90 s als Soft-Gate).
 *
 * Sekundärverifikationen (Epic-AC-Pflicht):
 *  - Eigenschutz-Startseiten-Indikatoren (Offene Punkte, AmpelWarnBadgeList, Fokuslink).
 *  - Date-Vertrag (kein ISO-String-Drift in „letzteAenderungAm"-Anzeigen).
 *
 * Selector-Strategie (AC3 Pivot-Anker §14): `getByRole` / `getByLabel` zuerst, stabile
 * `data-testid="e2e-eigenschutz-*"` nur wenn das Produktiv-UI keinen brauchbaren ARIA-Hook hat.
 * Banner-Match akzeptiert `role="alert"` ODER `role="status" + aria-live` (Story 7.8 Defer).
 */

import { test, expect } from '../fixtures/auth-fixtures';
import { findOutboxEvent } from '../setup/test-db';
import type { Page } from '@playwright/test';

const ROUTE_DASHBOARD = (einsatzId: string): string => `/app/einsatz/${einsatzId}/sicherheit/eigenschutz`;

async function navigateToEigenschutz(page: Page, einsatzId: string): Promise<void> {
  await page.goto(ROUTE_DASHBOARD(einsatzId), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(`/sicherheit/eigenschutz`));
}

async function waitForBroadcastBanner(page: Page, label: string): Promise<void> {
  const alertOrStatus = page.locator(['[role="alert"]', '[role="status"][aria-live]'].join(', '));
  await expect(alertOrStatus.filter({ hasText: /CBRN|PSA-Stufe.?3|Profil.*ge[äa]ndert/i }).first(), `WS-Banner in ${label}`).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Journey 1b — CBRN-Hochstufung', () => {
  test('Multi-Context CBRN: 3 Abschnitte → Quittung × 2 → Rück-Eskalation × 1 → Ampel Mix Grün/Amber', async ({ markusPage, steffi1Page, steffi2Page, steffi3Page, seedState }) => {
    // P17 (Review): Walltime misst die gesamte Journey (Steps 1-10), nicht nur ab Submit.
    const tStart = Date.now();

    await test.step('1. Markus öffnet Eigenschutz-Startseite mit 3 Abschnitten', async () => {
      await navigateToEigenschutz(markusPage, seedState.einsatzId);
      for (const abschnitt of seedState.abschnitte) {
        await expect(markusPage.getByText(abschnitt.name, { exact: false }).first(), `Abschnitt "${abschnitt.name}" sichtbar`).toBeVisible({ timeout: 15_000 });
      }
    });

    await test.step('2. 3 Abschnitte markieren + PSA-Drawer öffnen', async () => {
      for (const abschnitt of seedState.abschnitte) {
        const checkbox = markusPage.getByRole('checkbox', { name: new RegExp(abschnitt.name) });
        await checkbox.check();
      }
      const psaButton = markusPage.getByRole('button', { name: /PSA.*[äa]ndern|PSA-Profil/i }).first();
      await psaButton.click();
    });

    await test.step('3. CBRN-Profil aktivieren', async () => {
      const cbrnToggle = markusPage
        .getByRole('switch', { name: /CBRN/i })
        .or(markusPage.getByRole('checkbox', { name: /CBRN/i }))
        .first();
      await cbrnToggle.check();
    });

    await test.step('4. Begründung eintragen', async () => {
      const reasonField = markusPage.getByRole('textbox', { name: /Begründung|Begruendung/i }).first();
      await reasonField.fill('E2E-Run: Gefahrstoff-Austritt, Identifikation läuft');
    });

    await test.step('5. Submit (Stopwatch läuft seit Test-Start)', async () => {
      const submitButton = markusPage.getByRole('button', { name: /Übernehmen|Speichern|Bestätigen|Aktivieren/i }).first();
      await submitButton.click();
    });

    await test.step('6. Steffi-Contexts navigieren + WS-Subscription, dann Outbox-Event + WS-Banner', async () => {
      // P11 (Review): Erst nach Steffi-Navigationen + WS-Subscription das Outbox-Polling starten,
      // damit der Broadcast nicht verpasst wird, falls der Backend ihn vor dem Subscribe sendet.
      await Promise.all([navigateToEigenschutz(steffi1Page, seedState.einsatzId), navigateToEigenschutz(steffi2Page, seedState.einsatzId), navigateToEigenschutz(steffi3Page, seedState.einsatzId)]);

      // P1 (Review): Kanonischer Event-Name `eigenschutz.psa_profil_geaendert`
      // (siehe `packages/backend/src/domain/events/event-names.ts:79`).
      const [event] = await Promise.all([
        findOutboxEvent('eigenschutz.psa_profil_geaendert', seedState.einsatzId, 15_000, 250),
        Promise.all([waitForBroadcastBanner(steffi1Page, 'Steffi-1'), waitForBroadcastBanner(steffi2Page, 'Steffi-2'), waitForBroadcastBanner(steffi3Page, 'Steffi-3')]),
      ]);

      expect(event, 'Outbox-Event eigenschutz.psa_profil_geaendert muss existieren').not.toBeNull();
      const flat = JSON.stringify(event!.payload);
      expect(flat, 'Payload muss CBRN-Profil enthalten').toMatch(/CBRN/i);
    });

    await test.step('7. Steffi-1 und Steffi-2 quittieren (mit Outbox-Verifikation)', async () => {
      // P12 (Review): Quittung-Click pro Steffi + Server-Side-Verifikation via Outbox-Event.
      for (const [page, label] of [
        [steffi1Page, 'Steffi-1'],
        [steffi2Page, 'Steffi-2'],
      ] as const) {
        const before = Date.now();
        await page
          .getByRole('button', { name: /Quittung|Verstanden|Quittieren/i })
          .first()
          .click();
        // Outbox-Quittung-Event muss innerhalb 10 s persistiert sein
        // (kanonisch `eigenschutz.quittung_abgegeben`, siehe `event-names.ts:93`)
        const quittungEvent = await findOutboxEvent('eigenschutz.quittung_abgegeben', seedState.einsatzId, 10_000, 250);
        expect(quittungEvent, `${label}: Quittung-Outbox-Event muss existieren (seit ${Date.now() - before} ms)`).not.toBeNull();
      }
    });

    await test.step('8. Steffi-3 meldet Lücke (Rück-Eskalation)', async () => {
      await steffi3Page
        .getByRole('button', { name: /Lücke melden|Rückmeldung|Lücke/i })
        .first()
        .click();
      const reason = steffi3Page.getByRole('textbox', { name: /Begründung|Lücke|Begruendung/i }).first();
      await reason.fill('E2E-Run: PSA Stufe-3-Anzug fehlt — Reserve unklar');
      await steffi3Page
        .getByRole('button', { name: /Senden|Speichern|Melden/i })
        .first()
        .click();
    });

    await test.step('9. Markus-Dashboard zeigt Mix Grün/Amber', async () => {
      await markusPage.reload({ waitUntil: 'domcontentloaded' });
      // P2 + P3 (Review): >= 2 unterschiedliche Status-Werte (Spec-Zeile 125), gemessen
      // an einem reinen Status-Token statt am vollen `aria-label` (das den Abschnittsname enthält
      // und damit immer per Name unterscheidet, nicht per Status).
      const statusTokens = new Set<string>();
      for (const abschnitt of seedState.abschnitte) {
        const card = markusPage
          .getByRole('article')
          .filter({ hasText: abschnitt.name })
          .or(markusPage.locator(`[data-testid*="${abschnitt.einheitId}"]`))
          .first();
        // Stabile Token-Quelle: `data-status` Attribut (Konvention `data-status="gruen|amber|rot"`)
        // ODER explizites Status-Sub-Element (`[data-testid="ampel-status"]`/`[role="status"]`).
        const dataStatus = await card.getAttribute('data-status');
        if (dataStatus) {
          statusTokens.add(dataStatus.toLowerCase());
          continue;
        }
        const statusElement = card.locator('[data-testid*="ampel-status"], [data-testid*="status-token"]').or(card.getByRole('status')).first();
        const statusText = (await statusElement.textContent().catch(() => null))?.trim().toLowerCase();
        if (statusText) statusTokens.add(statusText);
      }
      expect(statusTokens.size, `Mindestens 2 unterschiedliche Ampel-Status, sah: ${[...statusTokens].join(', ') || '(leer)'}`).toBeGreaterThanOrEqual(2);
    });

    await test.step('10. Sanity-Schwelle ≤ 90 s (Soft-Gate)', async () => {
      const duration = Date.now() - tStart;
      test.info().annotations.push({
        type: 'sanity-90s',
        description: `Journey 1b Walltime: ${duration} ms (Soft-Gate ≤ 90 000 ms)`,
      });
      if (duration > 90_000) {
        // Soft-Fail: Warnung statt Abbruch (Epic-7-AC11 „Sanity-Check, kein Hard-Gate")
        // eslint-disable-next-line no-console
        console.warn(`[Journey 1b] Sanity-Schwelle überschritten: ${duration} ms > 90 000 ms`);
      }
    });

    await test.step('Sekundärverifikation: Eigenschutz-Startseiten-Indikatoren', async () => {
      const offenePunkte = markusPage.getByText(/Offene\s+(Punkte|Rückmeldungen)/i).first();
      await expect(offenePunkte, 'Offene-Punkte-Indikator sichtbar').toBeVisible({ timeout: 10_000 });

      const warnBadge = markusPage
        .getByRole('list', { name: /Warn-Badges|Warnungen/i })
        .or(markusPage.locator('[aria-label*="Warn"]'))
        .first();
      await expect(warnBadge, 'AmpelWarnBadgeList sichtbar').toBeVisible({ timeout: 10_000 });

      const fokuslink = markusPage.getByRole('link', { name: /Rück-Eskalation|Lücke|Rückmeldung/i }).first();
      await expect(fokuslink, 'Fokuslink zur Rückmeldung sichtbar').toBeVisible({ timeout: 10_000 });
    });

    await test.step('Sekundärverifikation: Date-Vertrag (kein ISO-Drift)', async () => {
      const timeTexts = await markusPage.locator('time, [data-time], [data-testid*="last-changed"]').allTextContents();
      // P21 (Review): Voller ISO-Date-Prefix statt `\dT\d{2}:\d{2}` — letzteres matched
      // legitime deutsche Zeit-Angaben wie "1T 05:00 vor" als False-Positive.
      for (const text of timeTexts) {
        expect(text, `Kein ISO-String-Drift in "${text}"`).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }
    });
  });
});
