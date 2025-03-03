import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import IndexPage from './page';

// Mock for useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

describe('IndexPage', () => {
    // Reset mocks before each test
    beforeEach(() => {
        mockNavigate.mockReset();
    });

    // Unit test: Component renders correctly
    test('renders correctly with login button', () => {
        render(
            <BrowserRouter>
                <IndexPage />
            </BrowserRouter>
        );

        // Check if the button exists
        const loginButton = screen.getByText('Anmelden');
        expect(loginButton).toBeInTheDocument();
    });

    // Integration test: Button interaction works correctly
    test('navigates to /app when button is clicked', () => {
        render(
            <BrowserRouter>
                <IndexPage />
            </BrowserRouter>
        );

        // Find the button and click it
        const loginButton = screen.getByText('Anmelden');
        fireEvent.click(loginButton);

        // Verify navigation was called with correct path
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    // Snapshot test
    test('matches snapshot', () => {
        const { container } = render(
            <BrowserRouter>
                <IndexPage />
            </BrowserRouter>
        );
        expect(container).toMatchSnapshot();
    });
}); 