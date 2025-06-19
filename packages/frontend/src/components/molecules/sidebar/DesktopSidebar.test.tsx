import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationItem } from '../../../config/navigation';
import DesktopSidebar from './DesktopSidebar';

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

// Mock SidebarContent component
vi.mock('./SidebarContent', () => ({
  __esModule: true,
  default: vi.fn(({ navigation }) => (
    <div data-testid="sidebar-content">
      <div data-testid="nav-items-count">{navigation.length} items</div>
      <div>Mock Desktop Content</div>
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

describe('DesktopSidebar', () => {
  // Unit Tests
  it('should render correctly', () => {
    render(<DesktopSidebar navigation={mockNavigation} />);

    // Check if SidebarContent is rendered
    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();

    // Check if container has the right CSS classes
    const container = screen.getByTestId('sidebar-content').parentElement;
    expect(container).toHaveClass('hidden');
    expect(container).toHaveClass('lg:fixed');
    expect(container).toHaveClass('lg:flex');
  });

  it('should pass navigation to SidebarContent', () => {
    render(<DesktopSidebar navigation={mockNavigation} />);

    // Verify navigation prop was passed correctly
    expect(screen.getByTestId('nav-items-count')).toHaveTextContent('1 items');
  });

  // Snapshot test
  it('should match snapshot', () => {
    const { container } = render(<DesktopSidebar navigation={mockNavigation} />);

    expect(container).toMatchSnapshot();
  });
});
