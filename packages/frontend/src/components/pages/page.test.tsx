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

    // Layout and structure test
    test('has correct layout and structure', () => {
        render(
            <BrowserRouter>
                <IndexPage />
            </BrowserRouter>
        );

        // Check container layout
        const container = screen.getByRole('button').parentElement;
        expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'h-screen', 'w-screen');

        // Check button properties
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Anmelden');
        expect(button).toHaveAttribute('type', 'button');
    });
}); 