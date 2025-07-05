// Setup matchMedia mock before imports
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, // Default to light mode
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import { render } from '@testing-library/react';
import { ReactNode } from 'react';
import { ThemeContext } from '../providers/ThemeContext';
import { useThemeStore } from '../stores/useThemeStore';
import { Theme, useTheme, useThemeInternal } from './useTheme';

// Mock the theme store
vi.mock('../stores/useThemeStore', () => ({
  useThemeStore: vi.fn(),
}));

describe('useTheme', () => {
  test('should throw error when used outside ThemeContext', () => {
    // Mock console.error to prevent test output from being cluttered
    const originalError = console.error;
    console.error = vi.fn();

    // Define a test component that uses the hook
    function TestComponent() {
      useTheme();
      return null;
    }

    // Expect the render to throw an error
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme muss innerhalb eines ThemeProviders verwendet werden');

    // Restore console.error
    console.error = originalError;
  });

  test('should return context value when used within ThemeContext', () => {
    // Setup context value
    const contextValue = {
      theme: 'dark' as Theme,
      isDark: true,
      isAuto: false,
      setIsDark: vi.fn(),
      setAutoTheme: vi.fn(),
      toggleTheme: vi.fn(),
    };

    // Store hook result
    let hookResult: ReturnType<typeof useTheme> | undefined;

    // Create test component
    function TestComponent() {
      hookResult = useTheme();
      return null;
    }

    // Create a wrapper with the provider
    function Wrapper({ children }: { children: ReactNode }) {
      return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
    }

    // Render with provider wrapper
    render(<TestComponent />, { wrapper: Wrapper });

    // Assert that hook returns the context value
    expect(hookResult).toBe(contextValue);
  });
});

describe('useThemeInternal', () => {
  // Define type for mocked store
  type MockStore = {
    dark: boolean;
    auto: boolean;
    setManualDark: ReturnType<typeof vi.fn>;
    setSystemDark: ReturnType<typeof vi.fn>;
    setAuto: ReturnType<typeof vi.fn>;
  };

  // Define type for mocked media query
  type MockMediaQuery = {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  // Variables to hold mocks
  let mockStore: MockStore;
  let mockMediaQuery: MockMediaQuery;
  let mockMediaQueryAddListener: ReturnType<typeof vi.fn>;
  let mockMediaQueryRemoveListener: ReturnType<typeof vi.fn>;
  let mockMetaTheme: { setAttribute: ReturnType<typeof vi.fn> };

  // Variable to hold hook result
  let hookResult: ReturnType<typeof useThemeInternal> | undefined;

  // Test component
  function TestComponent() {
    hookResult = useThemeInternal();
    return <div data-testid="test-component">{hookResult.theme}</div>;
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock store
    mockStore = {
      dark: false,
      auto: false,
      setManualDark: vi.fn(),
      setSystemDark: vi.fn(),
      setAuto: vi.fn(),
    };
    (useThemeStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

    // Setup mock matchMedia
    mockMediaQueryAddListener = vi.fn();
    mockMediaQueryRemoveListener = vi.fn();
    mockMediaQuery = {
      matches: false,
      addEventListener: mockMediaQueryAddListener,
      removeEventListener: mockMediaQueryRemoveListener,
    };
    window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery);

    // Setup document mocks
    document.documentElement.classList.toggle = vi.fn();
    mockMetaTheme = { setAttribute: vi.fn() };
    document.querySelector = vi.fn().mockReturnValue(mockMetaTheme);

    // Reset hook result
    hookResult = undefined;
  });

  test('should initialize with correct values', () => {
    // Render the test component
    render(<TestComponent />);

    // Assert initial values
    expect(hookResult?.theme).toBe('light');
    expect(hookResult?.isDark).toBe(false);
    expect(hookResult?.isAuto).toBe(false);
    expect(typeof hookResult?.toggleTheme).toBe('function');
    expect(typeof hookResult?.setIsDark).toBe('function');
    expect(typeof hookResult?.setAutoTheme).toBe('function');
  });

  test('should initialize with dark theme when system prefers dark', () => {
    // Setup dark theme preference
    mockMediaQuery.matches = true;
    mockStore.dark = true;
    (useThemeStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

    // Render component
    render(<TestComponent />);

    // Assert dark theme is active
    expect(hookResult?.theme).toBe('dark');
    expect(hookResult?.isDark).toBe(true);
    expect(mockStore.setSystemDark).toHaveBeenCalledWith(true);
  });

  test('should toggle theme when toggleTheme is called', () => {
    // Render component
    render(<TestComponent />);

    // Call toggle function
    hookResult?.toggleTheme();

    // Assert toggle function called store update
    expect(mockStore.setManualDark).toHaveBeenCalledWith(true);
  });

  test('should change document classes when theme changes', () => {
    // Setup dark theme
    mockStore.dark = true;
    (useThemeStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

    // Render component
    render(<TestComponent />);

    // Assert DOM is updated
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    expect(mockMetaTheme.setAttribute).toHaveBeenCalledWith('content', '#0f0f17');
  });

  test('should update theme when system preference changes', () => {
    // Render component
    render(<TestComponent />);

    // Get and call the media query change handler
    const mediaQueryEvent = { matches: true } as MediaQueryListEvent;
    const changeHandler = mockMediaQueryAddListener.mock.calls[0][1];
    changeHandler(mediaQueryEvent);

    // Assert system theme update was called
    expect(mockStore.setSystemDark).toHaveBeenCalledWith(true);
  });

  test('should clean up media query listener on unmount', () => {
    // Render and unmount component
    const { unmount } = render(<TestComponent />);
    unmount();

    // Assert cleanup was called
    expect(mockMediaQueryRemoveListener).toHaveBeenCalled();
  });

  test('should set auto theme when setAutoTheme is called', () => {
    // Render component
    render(<TestComponent />);

    // Call auto theme function
    hookResult?.setAutoTheme(true);

    // Assert store update
    expect(mockStore.setAuto).toHaveBeenCalledWith(true);
  });

  test('should set manual dark theme when setIsDark is called', () => {
    // Render component
    render(<TestComponent />);

    // Call set dark function
    hookResult?.setIsDark(true);

    // Assert store update
    expect(mockStore.setManualDark).toHaveBeenCalledWith(true);
  });
});
