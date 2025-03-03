import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationItem } from '../../../config/navigation';
import MainSidebar from './MainSidebar';

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

// Mock child components
vi.mock('./MobileSidebar', () => ({
    __esModule: true,
    default: vi.fn(({ isOpen, navigation }) => (
        isOpen ? <div data-testid="mobile-sidebar">{navigation.length} items</div> : null
    )),
}));

vi.mock('./DesktopSidebar', () => ({
    __esModule: true,
    default: vi.fn(({ navigation }) => (
        <div data-testid="desktop-sidebar">{navigation.length} items</div>
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

describe('MainSidebar', () => {
    // Unit Tests
    it('should render desktop sidebar by default', () => {
        render(
            <MainSidebar
                navigation={mockNavigation}
            />
        );

        // Desktop sidebar should always be rendered
        expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();

        // Mobile sidebar should not be rendered by default
        expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
    });

    it('should render mobile sidebar when isMobile is true and isOpen is true', () => {
        render(
            <MainSidebar
                isOpen={true}
                isMobile={true}
                navigation={mockNavigation}
            />
        );

        // Both sidebars should be rendered
        expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
    });

    it('should not render mobile sidebar when isMobile is true but isOpen is false', () => {
        render(
            <MainSidebar
                isOpen={false}
                isMobile={true}
                navigation={mockNavigation}
            />
        );

        // Desktop sidebar should be rendered, but not mobile
        expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
    });

    it('should pass navigation to both sidebars', () => {
        render(
            <MainSidebar
                isOpen={true}
                isMobile={true}
                navigation={mockNavigation}
            />
        );

        // Verify navigation prop was passed correctly to both sidebars
        expect(screen.getByTestId('desktop-sidebar')).toHaveTextContent('1 items');
        expect(screen.getByTestId('mobile-sidebar')).toHaveTextContent('1 items');
    });

    it('should have correct defaults for optional props', () => {
        const { rerender } = render(
            <MainSidebar
                navigation={mockNavigation}
            />
        );

        // Default: Only desktop sidebar is rendered
        expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();

        // When only isMobile=true but isOpen remains default (false)
        rerender(
            <MainSidebar
                isMobile={true}
                navigation={mockNavigation}
            />
        );

        // Mobile sidebar still shouldn't be visible with default isOpen=false
        expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
    });

    // Snapshot test
    it('should match snapshot', () => {
        const { container } = render(
            <MainSidebar
                navigation={mockNavigation}
            />
        );

        expect(container).toMatchSnapshot();
    });
}); 