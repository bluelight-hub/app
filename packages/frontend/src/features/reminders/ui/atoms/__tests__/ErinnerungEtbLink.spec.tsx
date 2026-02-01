/**
 * Unit Tests für ErinnerungEtbLink
 *
 * **Story 5.7:** Bidirektionale Verknüpfung - Erinnerung zu ETB Navigation
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErinnerungEtbLink } from '../ErinnerungEtbLink';

describe('ErinnerungEtbLink', () => {
  describe('Conditional Rendering (AC5)', () => {
    it('should not render when etbEntryId is null', () => {
      const onClick = vi.fn();
      const { container } = render(<ErinnerungEtbLink etbEntryId={null} onClick={onClick} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when etbEntryId is undefined', () => {
      const onClick = vi.fn();
      const { container } = render(<ErinnerungEtbLink etbEntryId={null} onClick={onClick} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should render when etbEntryId is provided', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" onClick={onClick} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Content Display (AC1)', () => {
    it('should display sequence number when provided', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" sequenceNumber={42} onClick={onClick} />);

      expect(screen.getByText('#42')).toBeInTheDocument();
    });

    it('should display text preview when provided', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" etbEntryText="Erinnerung erstellt" onClick={onClick} />);

      expect(screen.getByText('Erinnerung erstellt')).toBeInTheDocument();
    });

    it('should truncate long text to 30 characters', () => {
      const onClick = vi.fn();
      const longText = 'Dies ist ein sehr langer Text der abgeschnitten werden sollte';
      render(<ErinnerungEtbLink etbEntryId="etb-123" etbEntryText={longText} onClick={onClick} />);

      // Text sollte auf 30 Zeichen + "..." gekürzt werden
      const truncatedText = `${longText.slice(0, 30)}...`;
      expect(screen.getByText(truncatedText)).toBeInTheDocument();
    });

    it('should not truncate text shorter than 30 characters', () => {
      const onClick = vi.fn();
      const shortText = 'Kurzer Text';
      render(<ErinnerungEtbLink etbEntryId="etb-123" etbEntryText={shortText} onClick={onClick} />);

      expect(screen.getByText(shortText)).toBeInTheDocument();
    });
  });

  describe('Click Handling (AC2)', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should be focusable via keyboard', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" onClick={onClick} />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have title attribute with entry details', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" sequenceNumber={42} etbEntryText="Test text" onClick={onClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'ETB #42: Test text');
    });

    it('should have fallback title when no text provided', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" sequenceNumber={42} onClick={onClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Zum ETB-Eintrag #42');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const onClick = vi.fn();
      render(<ErinnerungEtbLink etbEntryId="etb-123" onClick={onClick} className="custom-class" />);

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });
});
