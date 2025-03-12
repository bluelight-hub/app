import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationItem } from '../../../config/navigation';
import * as ThemeHook from '../../../hooks/useTheme';
import SidebarContent from './SidebarContent';

// Mock the navigation items
const mockNavigation: NavigationItem[] = [
    {
        type: 'item',
        key: '/test',
        path: '/test',
        label: 'Test Item',
    }
];

// Mock the navigation function
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    ...vi.importActual('react-router'),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/test' }),
}));

// Mock the theme hook
vi.mock('../../../hooks/useTheme', async () => {
    const mockTheme = {
        isDark: false,
        theme: 'light',
        isAuto: false,
        setIsDark: vi.fn(),
        setAutoTheme: vi.fn(),
        toggleTheme: vi.fn(),
    };

    return {
        useTheme: vi.fn().mockReturnValue(mockTheme),
        useThemeInternal: vi.fn().mockReturnValue(mockTheme),
    };
});

describe('SidebarContent', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false
                }
            }
        });
    });

    const renderComponent = (props: { navigation: NavigationItem[], onNavigate?: () => void }) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <SidebarContent {...props} />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders successfully with navigation items', () => {
        renderComponent({ navigation: mockNavigation });

        // Check if the logo and title are rendered
        expect(screen.getByText('Bluelight Hub')).toBeInTheDocument();

        // Check if navigation item is rendered
        expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('calls onNavigate when a menu item is clicked', () => {
        const mockOnNavigate = vi.fn();

        renderComponent({
            navigation: mockNavigation,
            onNavigate: mockOnNavigate
        });

        // Click on the menu item
        fireEvent.click(screen.getByText('Test Item'));

        // Verify that navigate and onNavigate were called
        expect(mockNavigate).toHaveBeenCalledWith('/test');
        expect(mockOnNavigate).toHaveBeenCalled();
    });

    it('applies dark theme when dark mode is active', () => {
        // Mock the theme hook to return dark mode
        vi.spyOn(ThemeHook, 'useThemeInternal').mockReturnValue({
            isDark: true,
            theme: 'dark',
            isAuto: false,
            setIsDark: vi.fn(),
            setAutoTheme: vi.fn(),
            toggleTheme: vi.fn(),
        });

        renderComponent({ navigation: mockNavigation });

        // Check if dark mode classes are applied
        const container = screen.getByText('Bluelight Hub').closest('div');
        expect(container?.parentElement).toHaveClass('dark:bg-gray-900');
    });
}); 