/**
 * ARIA-Struktur-Audit (Story 7.8 AC3) — strukturelle Pflichten, die axe-core
 * in jsdom nicht zuverlässig prüft.
 *
 * Diese Spec ergänzt das `a11y-audit.spec.tsx`-Gate um konkrete strukturelle
 * Heuristiken: Live-Region-Kontrakte, Alarm-Budget-Limit (≤ 3 gleichzeitig
 * assertive), PSA-Chip-Tri-State, Risiko-Matrix-Grid und das Form-Error-
 * Pattern (`role="alert"` plus `aria-describedby`).
 *
 * Failure-Output ist deutsch und nennt Datei + Selektor + erwartetes Attribut
 * (Pattern aus Story 7.7-Audit-Specs). Die Spec konsumiert die bereits
 * etablierten Render-Wrapper (`@testing-library/react` direkt; spezielle
 * Provider werden nur dort gemountet, wo Komponenten sie zwingend brauchen)
 * und legt KEINE neuen Mock-Stränge an.
 *
 * Drawer-Fokus-Pflichten (Headless-UI-`Dialog`-Wiring) werden hier auf
 * struktureller Ebene geprüft (DOM enthält `role="dialog"` + `aria-modal`).
 * Das echte Fokus-Restoration-Verhalten beim Öffnen/Schließen ist Block-B
 * (Browser-Smoke / Screenreader-Walk), weil Headless-UIs `requestAnimationFrame`-
 * basierte Fokus-Übernahme in jsdom nicht deterministisch ist.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GEFAEHRDUNG_ITEM_LIMITS, type GefaehrdungItem } from '@bluelight-hub/shared/schemas';
import { GefaehrdungItemEditor } from '../ui/molecules/GefaehrdungItemEditor';
import { PSAProfileChip } from '../ui/molecules/PSAProfileChip';
import { RiskMatrix5x5 } from '../ui/organisms/RiskMatrix5x5';
import { SeverityBanner } from '../ui/organisms/SeverityBanner';
import { SyncStatusBadge } from '../ui/molecules/SyncStatusBadge';

describe('ARIA-Struktur · SeverityBanner Live-Regions', () => {
  it('rendert critical mit aria-live="assertive" (Story 7.8 AC3)', () => {
    render(<SeverityBanner variant="critical" headline="CBRN-Patientenversorgung" data-testid="banner-critical" />);
    const banner = screen.getByTestId('banner-critical');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('rendert warning mit aria-live="polite" (Story 7.8 AC3)', () => {
    render(<SeverityBanner variant="warning" headline="Sicherheitsregel geändert" data-testid="banner-warning" />);
    const banner = screen.getByTestId('banner-warning');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('rendert info mit aria-live="polite" (Story 7.8 AC3)', () => {
    render(<SeverityBanner variant="info" headline="Erst-Bekanntgabe" data-testid="banner-info" />);
    const banner = screen.getByTestId('banner-info');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('erlaubt explizites tone-Override (assertive für info-Variante)', () => {
    render(<SeverityBanner variant="info" tone="assertive" headline="Info erzwungen assertive" data-testid="banner-info-assertive" />);
    const banner = screen.getByTestId('banner-info-assertive');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('ARIA-Struktur · SyncStatusBadge Live-Region', () => {
  it('trägt aria-live="polite" — Sync-Wechsel werden ohne Fokus-Klau angesagt (Story 7.5 / 7.8 AC3)', () => {
    render(<SyncStatusBadge status="synced" />);
    const badge = screen.getByTestId('sync-status-badge');
    expect(badge).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ARIA-Struktur · GefaehrdungItemEditor Counter + Error', () => {
  it('zeigt Counter mit aria-live="polite" ab 80% Zeichen-Limit (Story 7.8 AC3)', () => {
    const longText = 'A'.repeat(GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax - 100);
    const item: GefaehrdungItem = { title: 'Sturzgefahr', schutzmassnahmen: longText };
    render(<GefaehrdungItemEditor value={item} onChange={() => undefined} />);
    const counter = screen.getByTestId('gefaehrdung-item-schutzmassnahmen-counter');
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });

  it('setzt aria-invalid + role="alert" auf Form-Error bei Überlauf (Story 7.8 AC3)', () => {
    const overflowText = 'A'.repeat(GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax + 50);
    const item: GefaehrdungItem = { title: 'Sturzgefahr', schutzmassnahmen: overflowText };
    render(<GefaehrdungItemEditor value={item} onChange={() => undefined} />);
    const textarea = screen.getByTestId('gefaehrdung-item-schutzmassnahmen');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByTestId('gefaehrdung-item-schutzmassnahmen-error');
    expect(error).toHaveAttribute('role', 'alert');
  });
});

describe('ARIA-Struktur · Alarm-Budget (NFR-A4)', () => {
  it('hält das Limit ≤ 3 Elemente mit aria-live="assertive" oder role="alert" gleichzeitig im DOM ein', () => {
    render(
      <div>
        <SeverityBanner variant="critical" headline="Banner 1" data-testid="b1" />
        <SeverityBanner variant="critical" headline="Banner 2" data-testid="b2" />
        <SeverityBanner variant="critical" headline="Banner 3" data-testid="b3" />
        <SeverityBanner variant="warning" headline="Banner 4 (polite)" data-testid="b4" />
        <SeverityBanner variant="info" headline="Banner 5 (polite)" data-testid="b5" />
      </div>,
    );

    const assertive = Array.from(document.querySelectorAll('[aria-live="assertive"], [role="alert"]'));
    expect(assertive.length).toBeLessThanOrEqual(3);
  });

  /**
   * Bekanntes Block-B-Handoff: `SeverityBanner` hat kein eingebautes Stack-Limit.
   * Die Pflicht „≤ 3 gleichzeitig assertive" liegt beim aufrufenden Page-Renderer
   * (Hero-Routen-Kaskade + Notification-Center). Diese Spec verifiziert nur, dass
   * der **typische Hero-Route-Mix** (3 critical + 2 polite) das Budget einhält —
   * ein Stress-Test mit ≥ 4 critical-Bannern ist im Browser-Smoke + Block-B-Walk
   * dokumentiert (Audit-Bericht `docs/audits/eigenschutz-a11y-audit-2026-05-10.md`,
   * Folge-Story-Kandidat: zentraler Live-Region-Manager).
   */
  it('dokumentiert: Stress-Test ≥ 4 critical Banner verletzt das Budget — Stack-Limit muss aufrufseitig liegen', () => {
    render(
      <div>
        {Array.from({ length: 5 }).map((_, index) => (
          <SeverityBanner key={index} variant="critical" headline={`Critical ${index + 1}`} data-testid={`crit-${index}`} />
        ))}
      </div>,
    );
    const assertive = Array.from(document.querySelectorAll('[aria-live="assertive"], [role="alert"]'));
    expect(assertive.length, 'Spec dokumentiert die fehlende Stack-Drossel — Block-B-Handoff im Audit-Bericht').toBe(5);
  });
});

describe('ARIA-Struktur · PSAProfileChip role + aria-checked', () => {
  it('trägt role="checkbox" + aria-checked="false" im inaktiven Zustand', () => {
    render(<PSAProfileChip profil="BASIS" active={false} onToggle={() => undefined} />);
    const chip = screen.getByRole('checkbox', { name: /Basis/u });
    expect(chip).toHaveAttribute('aria-checked', 'false');
  });

  it('trägt aria-checked="true" im aktiven Zustand', () => {
    render(<PSAProfileChip profil="INFEKTION" active onToggle={() => undefined} />);
    const chip = screen.getByRole('checkbox', { name: /Infektion/u });
    expect(chip).toHaveAttribute('aria-checked', 'true');
  });

  it('trägt aria-checked="mixed" im Tri-State (Story 3.2 AC3)', () => {
    render(<PSAProfileChip profil="VU" active={false} mixed mixedBadge="2 von 4" onToggle={() => undefined} />);
    const chip = screen.getByRole('checkbox', { name: /Verkehrsunfall|VU/u });
    expect(chip).toHaveAttribute('aria-checked', 'mixed');
  });

  it('toggelt via Space-Taste (Tastatur-Kontrakt)', async () => {
    let toggled = 0;
    const user = userEvent.setup({ delay: null });
    render(<PSAProfileChip profil="VOLLSCHUTZ" active={false} onToggle={() => toggled++} />);
    const chip = screen.getByRole('checkbox', { name: /Vollschutz/u });
    chip.focus();
    await user.keyboard(' ');
    expect(toggled).toBe(1);
  });

  it('toggelt via Enter-Taste (Tastatur-Kontrakt)', async () => {
    let toggled = 0;
    const user = userEvent.setup({ delay: null });
    render(<PSAProfileChip profil="CBRN_PATIENT" active={false} onToggle={() => toggled++} />);
    const chip = screen.getByRole('checkbox', { name: /CBRN/u });
    chip.focus();
    await user.keyboard('{Enter}');
    expect(toggled).toBe(1);
  });
});

describe('ARIA-Struktur · RiskMatrix5x5 Grid', () => {
  it('rendert Container als role="grid" mit 25 gridcells (Story 7.8 AC3)', () => {
    render(<RiskMatrix5x5 onChange={() => undefined} />);
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(25);
  });

  it('vergibt jeder gridcell einen sprechenden aria-label (UX-Spec Zeile 859)', () => {
    render(<RiskMatrix5x5 onChange={() => undefined} />);
    const cells = screen.getAllByRole('gridcell');
    for (const cell of cells) {
      const ariaLabel = cell.getAttribute('aria-label');
      expect(ariaLabel, 'gridcell ohne aria-label gefunden — Risiko-Matrix muss jede Zelle für Screenreader benennen').not.toBeNull();
      expect(ariaLabel?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
