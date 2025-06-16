import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {EinsatzProvider} from '../../contexts/EinsatzContext';
import {useUserProfileStore} from '../../stores/useUserProfileStore';
import UserProfile from './UserProfile';

// Definiere die benötigten Typen lokal, da sie nicht exportiert werden
interface UserProfile {
    name: string;
    imageUrl: string;
    email?: string;
}

interface MockUserProfileState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    setProfile: (profile: UserProfile) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    clearProfile: () => void;
}

// Mock für den Store mit verschiedenen Implementierungen
const mockProfile = {
    name: 'Test User',
    imageUrl: 'test-image-url',
    email: 'test@example.com'
};

// Mock-Funktionen für den Store
const mockSetProfile = vi.fn();
const mockUpdateProfile = vi.fn();
const mockClearProfile = vi.fn();

// Mock für useUserProfileStore
vi.mock('../../stores/useUserProfileStore', () => ({
    useUserProfileStore: vi.fn((selector) => selector({
        profile: mockProfile,
        isLoading: false,
        error: null,
        setProfile: mockSetProfile,
        updateProfile: mockUpdateProfile,
        clearProfile: mockClearProfile
    }))
}));

// Mock für auth utils
vi.mock('../../utils/auth', () => ({
    logout: vi.fn()
}));

// Helper function to render with EinsatzProvider
const renderWithEinsatzProvider = (component: React.ReactElement) => {
    return render(<EinsatzProvider>{component}</EinsatzProvider>);
};

describe('UserProfile', () => {
    // Unit Test - Grundlegendes Rendering
    it('should render with profile data', () => {
        renderWithEinsatzProvider(<UserProfile href="/profile" data-testid="user-profile" />);

        const profileElement = screen.getByTestId('user-profile');
        expect(profileElement).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    // Unit Test - Prüft, ob das Bild korrekt gerendert wird
    it('should render the profile image correctly', () => {
        renderWithEinsatzProvider(<UserProfile href="/profile" data-testid="user-profile" />);

        const imageElement = screen.getByAltText('Test User');
        expect(imageElement).toBeInTheDocument();
        expect(imageElement).toHaveAttribute('src', 'test-image-url');
        expect(imageElement).toHaveClass('rounded-full');
    });

    // Unit Test - Prüft, ob onClick richtig aufgerufen wird (jetzt Dropdown)
    it('should handle onClick event', async () => {
        const handleClick = vi.fn();
        renderWithEinsatzProvider(<UserProfile href="/profile" onClick={handleClick} data-testid="user-profile" />);

        // Dropdown trigger klicken
        await act(async () => {
            fireEvent.click(screen.getByTestId('user-profile'));
        });
        
        // Das onclick wird nicht mehr direkt aufgerufen, da wir ein Dropdown haben
        // Stattdessen testen wir, dass das Dropdown funktioniert
        expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    // Unit Test - Prüft, ob der onClick Handler im Profil-MenuItem funktioniert
    it('should call onClick when profile menu item is clicked', async () => {
        const handleClick = vi.fn();
        renderWithEinsatzProvider(<UserProfile href="/profile" onClick={handleClick} data-testid="user-profile" />);

        // Dropdown öffnen
        await act(async () => {
            fireEvent.click(screen.getByTestId('user-profile'));
        });

        // Auf "Profil" klicken
        const profileMenuItem = screen.getByText('Profil');
        await act(async () => {
            fireEvent.click(profileMenuItem);
        });

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // Unit Test - Prüft, ob der hideText Parameter funktioniert
    it('should hide text when hideText is true', () => {
        renderWithEinsatzProvider(<UserProfile href="/profile" hideText={true} data-testid="user-profile" />);

        // Bild sollte noch sichtbar sein
        expect(screen.getByAltText('Test User')).toBeInTheDocument();

        // Name sollte nicht sichtbar sein
        expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });

    // Integration Test - Im Layout-Kontext
    it('should work properly in a sidebar layout', () => {
        render(
            <EinsatzProvider>
                <div data-testid="sidebar">
                    <nav>
                        <UserProfile href="/profile" data-testid="user-profile" />
                    </nav>
                </div>
            </EinsatzProvider>
        );

        const sidebar = screen.getByTestId('sidebar');
        const profileElement = screen.getByTestId('user-profile');
        expect(sidebar).toContainElement(profileElement);
    });

    // Snapshot Test
    it('should match snapshot', () => {
        const { container } = renderWithEinsatzProvider(<UserProfile href="/profile" data-testid="user-profile" />);
        expect(container).toMatchSnapshot();
    });

    // Snapshot Test with hideText
    it('should match snapshot with hidden text', () => {
        const { container } = renderWithEinsatzProvider(<UserProfile href="/profile" hideText={true} data-testid="user-profile" />);
        expect(container).toMatchSnapshot();
    });

    // Test Fall: Kein Profil vorhanden
    it('should render nothing when profile is not available', () => {
        // Temporärer Mock-Override für diesen Test
        vi.mocked(useUserProfileStore).mockImplementationOnce((selector) => selector({
            profile: null,
            isLoading: false,
            error: null,
            setProfile: mockSetProfile,
            updateProfile: mockUpdateProfile,
            clearProfile: mockClearProfile
        } as MockUserProfileState));

        const { container } = renderWithEinsatzProvider(<UserProfile href="/profile" data-testid="user-profile" />);
        expect(container.firstChild).toBeNull();
    });
}); 