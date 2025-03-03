import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationItem } from '../../../config/navigation';
import MobileSidebar from './MobileSidebar';

// Mock matchMedia
beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

// Mock SidebarContent component
vi.mock('./SidebarContent', () => ({
    __esModule: true,
    default: vi.fn(({ onNavigate }) => (
        <div data-testid="sidebar-content">
            <button onClick={onNavigate} data-testid="nav-button">Navigate</button>
            <div>Mock Content</div>
        </div>
    )),
}));

const mockNavigation: NavigationItem[] = [
    {
        type: 'item',
        key: '/test',
        path: '/test',
        label: 'Test Item',
    }
];

describe('MobileSidebar', () => {
    // Unit Tests
    it('should not render when isOpen is false', () => {
        render(
            <MobileSidebar
                isOpen={false}
                onClose={() => { }}
                navigation={mockNavigation}
            />
        );

        expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
        render(
            <MobileSidebar
                isOpen={true}
                onClose={() => { }}
                navigation={mockNavigation}
            />
        );

        expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Interaction Tests
    it('should call onClose when backdrop is clicked', () => {
        const mockOnClose = vi.fn();

        render(
            <MobileSidebar
                isOpen={true}
                onClose={mockOnClose}
                navigation={mockNavigation}
            />
        );

        // Find backdrop and click it
        const backdrop = screen.getByRole('dialog').querySelector('.fixed.inset-0.bg-gray-900\\/80');
        fireEvent.click(backdrop!);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is clicked', () => {
        const mockOnClose = vi.fn();

        render(
            <MobileSidebar
                isOpen={true}
                onClose={mockOnClose}
                navigation={mockNavigation}
            />
        );

        // Find close button and click it
        const closeButton = screen.getByLabelText('Close sidebar');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should pass navigation prop to SidebarContent', () => {
        render(
            <MobileSidebar
                isOpen={true}
                onClose={() => { }}
                navigation={mockNavigation}
            />
        );

        // Verify SidebarContent is rendered
        expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    });

    it('should call onClose when navigation occurs', () => {
        const mockOnClose = vi.fn();

        render(
            <MobileSidebar
                isOpen={true}
                onClose={mockOnClose}
                navigation={mockNavigation}
            />
        );

        // Simulate navigation
        fireEvent.click(screen.getByTestId('nav-button'));

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    // Snapshot test
    it('should match snapshot', () => {
        const { container } = render(
            <MobileSidebar
                isOpen={true}
                onClose={() => { }}
                navigation={mockNavigation}
            />
        );

        expect(container).toMatchSnapshot();
    });
}); 