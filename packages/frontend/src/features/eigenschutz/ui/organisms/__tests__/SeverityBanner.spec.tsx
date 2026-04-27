import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeverityBanner } from '../SeverityBanner';

describe('SeverityBanner (Story 2.7 AC1)', () => {
  it('rendert role="status" + aria-live="polite" als Default', () => {
    render(<SeverityBanner variant="info" headline="Neue Sicherheitsregel: Atemschutz" />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveAttribute('data-variant', 'info');
  });

  it('akzeptiert tone="assertive" für kritische Bekanntgaben', () => {
    render(<SeverityBanner variant="critical" tone="assertive" headline="PSA-Hochstufung erforderlich" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive');
  });

  it('kürzt Headline > 60 Zeichen mit Ellipsis', () => {
    const longHeadline = 'X'.repeat(80);
    render(<SeverityBanner variant="info" headline={longHeadline} />);
    expect(screen.getByText(/X{57}…/)).toBeInTheDocument();
  });

  it('kürzt Body > 140 Zeichen mit Ellipsis', () => {
    const longBody = 'Y'.repeat(160);
    render(<SeverityBanner variant="info" headline="Test" body={longBody} />);
    expect(screen.getByText(/Y{137}…/)).toBeInTheDocument();
  });

  it('ruft onPrimary bei Klick auf Primary-Action', () => {
    const onPrimary = vi.fn();
    render(<SeverityBanner variant="warning" headline="Test" primaryActionLabel="Quittieren" onPrimary={onPrimary} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quittieren' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('disabled Primary-Action im pending-State', () => {
    render(<SeverityBanner variant="warning" headline="Test" primaryActionLabel="Quittieren" onPrimary={() => undefined} pending />);
    expect(screen.getByRole('button', { name: /Wird verarbeitet/ })).toBeDisabled();
  });

  it('rendert inlineError als role="alert"', () => {
    render(<SeverityBanner variant="info" headline="Test" inlineError="Quittung fehlgeschlagen" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Quittung fehlgeschlagen');
  });

  it('rendert Retry-Button neben inlineError und ruft onRetry', () => {
    const onRetry = vi.fn();
    render(<SeverityBanner variant="info" headline="Test" inlineError="Fehler" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('rendert sekundäre Action separat, ohne Primary zu doppeln', () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(<SeverityBanner variant="warning" headline="Test" primaryActionLabel="Quittieren" onPrimary={onPrimary} secondaryActionLabel="Details" onSecondary={onSecondary} />);
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onPrimary).not.toHaveBeenCalled();
  });
});
