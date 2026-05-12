import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '../dialog.molecule';

describe('Dialog.SlideIn — Footer-Slot', () => {
  it('rendert den Footer-Inhalt unterhalb des scrollenden Content-Bereichs', () => {
    render(
      <Dialog.SlideIn
        isOpen
        onClose={() => {}}
        title="Beispiel-Drawer"
        footer={
          <button type="button" data-testid="slidein-footer-action">
            Speichern
          </button>
        }
      >
        <p data-testid="slidein-content">Inhalt</p>
      </Dialog.SlideIn>,
    );

    const footerButton = screen.getByTestId('slidein-footer-action');
    const content = screen.getByTestId('slidein-content');
    expect(footerButton).toBeInTheDocument();
    expect(content).toBeInTheDocument();

    // Der Footer muss in einem Container mit border-t leben (sticky am Panel-Boden).
    const footerContainer = footerButton.closest('div.border-t');
    expect(footerContainer).not.toBeNull();
    expect(footerContainer?.className).toMatch(/flex-shrink-0/);

    // Der scrollende Content-Bereich existiert separat (overflow-y-auto, flex-1).
    const scrollContainer = content.closest('div.overflow-y-auto');
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer?.className).toMatch(/flex-1/);
  });

  it('rendert keinen Footer-Container ohne footer-Prop', () => {
    render(
      <Dialog.SlideIn isOpen onClose={() => {}} title="Detail-Drawer">
        <p data-testid="slidein-content">Read-only</p>
      </Dialog.SlideIn>,
    );

    const content = screen.getByTestId('slidein-content');
    const panel = content.closest('div.flex.h-full.flex-col');
    expect(panel).not.toBeNull();

    // Innerhalb des Panel-Wrappers darf kein zusätzlicher `border-t`-Container nach dem Content existieren.
    const borderTopChildren = panel!.querySelectorAll(':scope > div.border-t');
    expect(borderTopChildren.length).toBe(0);
  });

  it('hält Header sticky-fähig (flex-shrink-0)', () => {
    render(
      <Dialog.SlideIn isOpen onClose={() => {}} title="Sticky-Header">
        <p>Inhalt</p>
      </Dialog.SlideIn>,
    );

    const heading = screen.getByText('Sticky-Header');
    const headerContainer = heading.closest('div.border-b');
    expect(headerContainer).not.toBeNull();
    expect(headerContainer?.className).toMatch(/flex-shrink-0/);
  });

  it('Submit-Button im Footer-Slot kann via form-Attribut ein Form im Content submitten', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <Dialog.SlideIn
        isOpen
        onClose={() => {}}
        title="Form-Submit"
        footer={
          <button type="submit" form="my-test-form" data-testid="submit-btn">
            Speichern
          </button>
        }
      >
        <form id="my-test-form" onSubmit={onSubmit}>
          <input type="text" defaultValue="hallo" aria-label="Feld" />
        </form>
      </Dialog.SlideIn>,
    );

    screen.getByTestId('submit-btn').click();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
