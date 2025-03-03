import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
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

describe('UserProfile', () => {
    // Unit Test - Grundlegendes Rendering
    it('should render with profile data', () => {
        render(<UserProfile href="/profile" data-testid="user-profile" />);

        const profileElement = screen.getByTestId('user-profile');
        expect(profileElement).toBeInTheDocument();
        expect(profileElement).toHaveAttribute('href', '/profile');
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    // Unit Test - Prüft, ob das Bild korrekt gerendert wird
    it('should render the profile image correctly', () => {
        render(<UserProfile href="/profile" data-testid="user-profile" />);

        const imageElement = screen.getByAltText('Test User');
        expect(imageElement).toBeInTheDocument();
        expect(imageElement).toHaveAttribute('src', 'test-image-url');
        expect(imageElement).toHaveClass('rounded-full');
    });

    // Unit Test - Prüft, ob onClick richtig aufgerufen wird
    it('should handle onClick event', () => {
        const handleClick = vi.fn();
        render(<UserProfile href="/profile" onClick={handleClick} data-testid="user-profile" />);

        fireEvent.click(screen.getByTestId('user-profile'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // Unit Test - Prüft, ob der hideText Parameter funktioniert
    it('should hide text when hideText is true', () => {
        render(<UserProfile href="/profile" hideText={true} data-testid="user-profile" />);

        // Bild sollte noch sichtbar sein
        expect(screen.getByAltText('Test User')).toBeInTheDocument();

        // Name sollte nicht sichtbar sein
        expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });

    // Integration Test - Im Layout-Kontext
    it('should work properly in a sidebar layout', () => {
        render(
            <div data-testid="sidebar">
                <nav>
                    <UserProfile href="/profile" data-testid="user-profile" />
                </nav>
            </div>
        );

        const sidebar = screen.getByTestId('sidebar');
        const profileElement = screen.getByTestId('user-profile');
        expect(sidebar).toContainElement(profileElement);
    });

    // Snapshot Test
    it('should match snapshot', () => {
        const { container } = render(<UserProfile href="/profile" data-testid="user-profile" />);
        expect(container).toMatchSnapshot();
    });

    // Snapshot Test with hideText
    it('should match snapshot with hidden text', () => {
        const { container } = render(<UserProfile href="/profile" hideText={true} data-testid="user-profile" />);
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

        const { container } = render(<UserProfile href="/profile" data-testid="user-profile" />);
        expect(container.firstChild).toBeNull();
    });
}); 