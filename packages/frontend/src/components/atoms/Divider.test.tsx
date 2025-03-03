import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Divider from './Divider';

/**
 * Tests für die Divider-Komponente
 */
describe('Divider', () => {
    // Unit Test - Komponente rendert ohne Fehler
    it('should render without crashing', () => {
        const { container } = render(<Divider data-testid="divider" />);
        const dividerElement = container.firstChild;
        expect(dividerElement).toBeInTheDocument();
    });

    // Unit Test - Klassennamen werden korrekt angewendet
    it('should apply default classes correctly', () => {
        const { container } = render(<Divider data-testid="divider" />);
        const dividerElement = container.firstChild;
        expect(dividerElement).toHaveClass('border-t');
        expect(dividerElement).toHaveClass('border-gray-800/10');
        expect(dividerElement).toHaveClass('dark:border-gray-200/10');
        expect(dividerElement).toHaveClass('my-3');
    });

    // Unit Test - zusätzliche Klassen können angegeben werden
    it('should merge additional className prop correctly', () => {
        const { container } = render(<Divider className="additional-class" data-testid="divider" />);
        const dividerElement = container.firstChild;
        expect(dividerElement).toHaveClass('additional-class');
        expect(dividerElement).toHaveClass('border-t');
    });

    // Integration Test - Verhalten im Layout
    it('should apply correct margin in a layout', () => {
        render(
            <div>
                <div>Content above</div>
                <Divider data-testid="divider" />
                <div>Content below</div>
            </div>
        );

        const dividerElement = screen.getByTestId('divider');
        expect(dividerElement).toHaveClass('my-3');
    });

    // Snapshot Test
    it('should match snapshot', () => {
        const { container } = render(<Divider data-testid="divider" />);
        expect(container).toMatchSnapshot();
    });

    // Snapshot Test mit benutzerdefinierten Klassen
    it('should match snapshot with custom className', () => {
        const { container } = render(<Divider className="custom-class" data-testid="divider" />);
        expect(container).toMatchSnapshot();
    });
}); 