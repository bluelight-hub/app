import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DashboardLayout from './DashboardLayout';

// Mock für Outlet
vi.mock('react-router', () => ({
    Outlet: () => <div data-testid="outlet-content">Dashboard Content</div>
}));

describe('DashboardLayout', () => {
    it('renders correctly with all components', () => {
        render(<DashboardLayout />);

        // Check if main content area is rendered
        expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    });

    it('has correct layout classes', () => {
        const { container } = render(<DashboardLayout />);

        // Check for correct container classes
        const layoutContainer = container.firstChild as HTMLElement;
        expect(layoutContainer).toHaveClass('min-h-screen');
        expect(layoutContainer).toHaveClass('bg-white');
        expect(layoutContainer).toHaveClass('dark:bg-gray-900');
    });

    // Snapshot test
    it('matches snapshot', () => {
        const { container } = render(<DashboardLayout />);
        expect(container).toMatchSnapshot();
    });
}); 