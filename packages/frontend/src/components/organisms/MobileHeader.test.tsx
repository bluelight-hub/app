import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import MobileHeader from './MobileHeader';

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

// Mock für UserProfile-Komponente
vi.mock('../atoms/UserProfile', () => ({
    default: vi.fn(({ hideText }) => (
        <div data-testid="user-profile-mock" data-hide-text={hideText ? 'true' : 'false'}>
            User Profile Mock {hideText ? '(text hidden)' : '(text visible)'}
        </div>
    ))
}));

// Mock für useMediaQuery
vi.mock('../../hooks/useMediaQuery', () => ({
    default: vi.fn().mockImplementation((query) => {
        // Simuliere die Medienabfrage basierend auf dem Query-String
        if (query === '(max-width: 480px)') {
            // Bei Tests für kleine Bildschirme wird dieser Wert in beforeEach überschrieben
            return false;
        }
        return false;
    })
}));

// Import des gemockten Hooks für explizite Kontrolle in Tests
import useMediaQuery from '../../hooks/useMediaQuery';

describe('MobileHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Setze den Mock zurück
        vi.mocked(useMediaQuery).mockImplementation(() => false);
        vi.restoreAllMocks();
    });

    // Unit Test - Grundlegendes Rendering
    it('should render with title and sidebar button', () => {
        const handleSidebar = vi.fn();
        render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} data-testid="mobile-header" />);

        // Prüfe ob der Titel angezeigt wird
        expect(screen.getByText('Test Title')).toBeInTheDocument();

        // Prüfe ob der Button zum Öffnen der Sidebar vorhanden ist
        const sidebarButton = screen.getByRole('button');
        expect(sidebarButton).toBeInTheDocument();
        expect(screen.getByText('Sidebar öffnen')).toBeInTheDocument();
    });

    // Unit Test - Prüft, ob der onOpenSidebar-Callback aufgerufen wird
    it('should call onOpenSidebar when sidebar button is clicked', () => {
        const handleSidebar = vi.fn();
        render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} />);

        // Finde den Button und klicke ihn
        const sidebarButton = screen.getByRole('button');
        fireEvent.click(sidebarButton);

        // Prüfe ob der Callback aufgerufen wurde
        expect(handleSidebar).toHaveBeenCalledTimes(1);
    });

    // Integration Test - Überprüft, ob die UserProfile-Komponente korrekt gerendert wird
    it('should render UserProfile component', () => {
        const handleSidebar = vi.fn();
        render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} />);

        // Prüfe ob die UserProfile-Komponente (mock) gerendert wird
        expect(screen.getByTestId('user-profile-mock')).toBeInTheDocument();
    });

    // Test für responsive Design - Text auf kleinem Bildschirm verstecken
    it('should hide text in UserProfile on small screens', () => {
        // Überschreibe den Mock für diesen Test
        vi.mocked(useMediaQuery).mockImplementation(() => true);

        const handleSidebar = vi.fn();
        render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} />);

        // Prüfe ob die UserProfile-Komponente mit hideText=true aufgerufen wurde
        const userProfileMock = screen.getByTestId('user-profile-mock');
        expect(userProfileMock).toHaveAttribute('data-hide-text', 'true');
        expect(userProfileMock).toHaveTextContent('(text hidden)');
    });

    // Test für responsive Design - Text auf größerem Bildschirm anzeigen
    it('should show text in UserProfile on larger screens', () => {
        // Überschreibe den Mock für diesen Test
        vi.mocked(useMediaQuery).mockImplementation(() => false);

        const handleSidebar = vi.fn();
        render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} />);

        // Prüfe ob die UserProfile-Komponente mit hideText=false aufgerufen wurde
        const userProfileMock = screen.getByTestId('user-profile-mock');
        expect(userProfileMock).toHaveAttribute('data-hide-text', 'false');
        expect(userProfileMock).toHaveTextContent('(text visible)');
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

        const handleSidebar = vi.fn();
        const { container } = render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} />);

        // Wenn kein Profil vorhanden ist, sollte nichts gerendert werden
        expect(container.firstChild).toBeNull();
    });

    // Snapshot Test
    it('should match snapshot', () => {
        const handleSidebar = vi.fn();
        const { container } = render(<MobileHeader title="Test Title" onOpenSidebar={handleSidebar} />);
        expect(container).toMatchSnapshot();
    });
}); 