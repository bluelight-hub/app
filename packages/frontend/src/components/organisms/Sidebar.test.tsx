import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationItem } from '../../config/navigation';
import Sidebar from './Sidebar';

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
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

// Mock MainSidebar component
vi.mock('../molecules/sidebar/MainSidebar', () => ({
  __esModule: true,
  default: vi.fn(({ isOpen, onClose, isMobile, navigation }) => (
    <div data-testid="main-sidebar">
      <div data-testid="props-display">
        isOpen: {String(isOpen)}, isMobile: {String(isMobile)}, navItems: {navigation.length}
      </div>
      <button data-testid="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  )),
}));

const mockNavigation: NavigationItem[] = [
  {
    type: 'item',
    key: '/test',
    path: '/test',
    label: 'Test Item',
  },
];

describe('Sidebar', () => {
  it('should render MainSidebar with all props', () => {
    const mockOnClose = vi.fn();

    render(<Sidebar isOpen={true} onClose={mockOnClose} isMobile={true} navigation={mockNavigation} />);

    // Check if MainSidebar is rendered
    expect(screen.getByTestId('main-sidebar')).toBeInTheDocument();

    // Check if props were passed correctly
    expect(screen.getByTestId('props-display')).toHaveTextContent('isOpen: true');
    expect(screen.getByTestId('props-display')).toHaveTextContent('isMobile: true');
    expect(screen.getByTestId('props-display')).toHaveTextContent('navItems: 1');
  });

  it('should pass onClose function to MainSidebar', () => {
    const mockOnClose = vi.fn();

    render(<Sidebar isOpen={true} onClose={mockOnClose} navigation={mockNavigation} />);

    // Trigger close function
    screen.getByTestId('close-button').click();

    // Verify onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Snapshot test
  it('should match snapshot', () => {
    const { container } = render(<Sidebar navigation={mockNavigation} />);

    expect(container).toMatchSnapshot();
  });
});
