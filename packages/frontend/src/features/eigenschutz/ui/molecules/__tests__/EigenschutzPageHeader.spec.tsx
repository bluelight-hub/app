import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EigenschutzPageHeader } from '../EigenschutzPageHeader';

describe('EigenschutzPageHeader', () => {
  it('rendert nur den Titel, wenn weder Description noch Actions gesetzt sind', () => {
    const { container } = render(<EigenschutzPageHeader title="Eigenschutz" />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Eigenschutz' });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText(/.+/, { selector: 'p' })).not.toBeInTheDocument();
    const header = container.querySelector('header');
    expect(header?.children).toHaveLength(1);
  });

  it('wrappt eine String-Description in einen muted Text-Absatz', () => {
    render(<EigenschutzPageHeader title="Gefährdungsbeurteilungen" description="Pro Einheit eine Beurteilung anlegen." />);

    const description = screen.getByText('Pro Einheit eine Beurteilung anlegen.');
    expect(description.tagName).toBe('P');
    expect(description.className).toContain('text-text-muted');
  });

  it('rendert eine ReactNode-Description unverändert', () => {
    render(
      <EigenschutzPageHeader
        title="Vorfall vom 12.05.2026"
        description={
          <p data-testid="custom-description" className="text-status-warning-text">
            Unfallkassen-relevant
          </p>
        }
      />,
    );

    const description = screen.getByTestId('custom-description');
    expect(description).toHaveTextContent('Unfallkassen-relevant');
    expect(description.className).toContain('text-status-warning-text');
  });

  it('rendert den Actions-Slot rechts neben Titel/Description', () => {
    const { container } = render(
      <EigenschutzPageHeader
        title="Vorfälle"
        actions={
          <button type="button" data-testid="primary-action">
            Vorfall melden
          </button>
        }
      />,
    );

    expect(screen.getByTestId('primary-action')).toBeInTheDocument();
    const header = container.querySelector('header');
    expect(header?.children).toHaveLength(2);
    expect(header?.lastElementChild).toContainElement(screen.getByTestId('primary-action'));
  });

  it('rendert keinen Actions-Wrapper, wenn actions nicht gesetzt ist', () => {
    const { container } = render(<EigenschutzPageHeader title="Sync-Konflikte" description="Konflikte auflösen — durch den Sicherheitsbeauftragten." />);

    const header = container.querySelector('header');
    expect(header?.children).toHaveLength(1);
  });
});
