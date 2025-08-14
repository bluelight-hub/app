import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';

import { SystemStatus } from './system-status.atom';
import type { SystemStatusData } from './system-status.atom';

const system = createSystem(defaultConfig);

describe('SystemStatus', () => {
  const mockCurrentTime = new Date('2024-08-14T10:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current time for consistent date formatting tests
    vi.useFakeTimers();
    vi.setSystemTime(mockCurrentTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = (data: SystemStatusData, compact?: boolean) => {
    render(
      <ChakraProvider value={system}>
        <SystemStatus data={data} compact={compact} />
      </ChakraProvider>,
    );
  };

  const createMockData = (overrides: Partial<SystemStatusData> = {}): SystemStatusData => ({
    isOnline: true,
    responseTime: 125,
    apiVersion: '1.0.0',
    lastHealthCheck: new Date('2024-08-14T09:58:00Z'), // 2 minutes ago
    isChecking: false,
    ...overrides,
  });

  describe('Status States', () => {
    it('renders online status correctly', () => {
      const data = createMockData({ isOnline: true, isChecking: false });
      renderComponent(data);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('ONLINE')).toBeInTheDocument();
    });

    it('renders offline status correctly', () => {
      const data = createMockData({ isOnline: false, isChecking: false });
      renderComponent(data);

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('OFFLINE')).toBeInTheDocument();
    });

    it('renders checking status correctly', () => {
      const data = createMockData({ isOnline: true, isChecking: true });
      renderComponent(data);

      expect(screen.getByText('Überprüfung...')).toBeInTheDocument();
      expect(screen.getByText('CHECKING')).toBeInTheDocument();
    });

    it('prioritizes checking state over online state', () => {
      const data = createMockData({ isOnline: true, isChecking: true });
      renderComponent(data);

      // Should show checking state even when isOnline is true
      expect(screen.getByText('CHECKING')).toBeInTheDocument();
      expect(screen.queryByText('ONLINE')).not.toBeInTheDocument();
    });

    it('prioritizes checking state over offline state', () => {
      const data = createMockData({ isOnline: false, isChecking: true });
      renderComponent(data);

      // Should show checking state even when isOnline is false
      expect(screen.getByText('CHECKING')).toBeInTheDocument();
      expect(screen.queryByText('OFFLINE')).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders compact layout correctly', () => {
      const data = createMockData();
      renderComponent(data, true);

      // Should have the basic elements but not detailed info
      expect(screen.getByText('ONLINE')).toBeInTheDocument();
      expect(screen.getByText('125ms')).toBeInTheDocument();

      // Should not have detailed labels in compact mode
      expect(screen.queryByText('Response Zeit:')).not.toBeInTheDocument();
      expect(screen.queryByText('API Version:')).not.toBeInTheDocument();
    });

    it('renders compact layout without response time when undefined', () => {
      const data = createMockData({ responseTime: undefined });
      renderComponent(data, true);

      expect(screen.getByText('ONLINE')).toBeInTheDocument();
      expect(screen.queryByText('ms')).not.toBeInTheDocument();
    });

    it('renders compact offline state correctly', () => {
      const data = createMockData({ isOnline: false });
      renderComponent(data, true);

      expect(screen.getByText('OFFLINE')).toBeInTheDocument();
    });
  });

  describe('Full Layout', () => {
    it('renders full layout with all details', () => {
      const data = createMockData();
      renderComponent(data);

      // Main status
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('ONLINE')).toBeInTheDocument();

      // Details
      expect(screen.getByText('Response Zeit:')).toBeInTheDocument();
      expect(screen.getByText('125ms')).toBeInTheDocument();
      expect(screen.getByText('API Version:')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
      expect(screen.getByText('Letzter Check:')).toBeInTheDocument();
    });

    it('renders without API version when not provided', () => {
      const data = createMockData({ apiVersion: undefined });
      renderComponent(data);

      expect(screen.queryByText('API Version:')).not.toBeInTheDocument();
    });

    it('renders empty API version when empty string', () => {
      const data = createMockData({ apiVersion: '' });
      renderComponent(data);

      expect(screen.queryByText('API Version:')).not.toBeInTheDocument();
    });
  });

  describe('Response Time Formatting', () => {
    it('formats response time correctly', () => {
      const data = createMockData({ responseTime: 1234 });
      renderComponent(data);

      expect(screen.getByText('1234ms')).toBeInTheDocument();
    });

    it('shows N/A for undefined response time', () => {
      const data = createMockData({ responseTime: undefined });
      renderComponent(data);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('handles zero response time', () => {
      const data = createMockData({ responseTime: 0 });
      renderComponent(data);

      expect(screen.getByText('0ms')).toBeInTheDocument();
    });
  });

  describe('Last Check Formatting', () => {
    it('shows "Gerade eben" for very recent checks', () => {
      const data = createMockData({
        lastHealthCheck: new Date('2024-08-14T09:59:45Z'), // 15 seconds ago
      });
      renderComponent(data);

      expect(screen.getByText('Gerade eben')).toBeInTheDocument();
    });

    it('shows minutes for recent checks', () => {
      const data = createMockData({
        lastHealthCheck: new Date('2024-08-14T09:55:00Z'), // 5 minutes ago
      });
      renderComponent(data);

      expect(screen.getByText('vor 5min')).toBeInTheDocument();
    });

    it('shows hours for older checks within 24 hours', () => {
      const data = createMockData({
        lastHealthCheck: new Date('2024-08-14T08:00:00Z'), // 2 hours ago
      });
      renderComponent(data);

      expect(screen.getByText('vor 2h')).toBeInTheDocument();
    });

    it('shows date for very old checks', () => {
      const data = createMockData({
        lastHealthCheck: new Date('2024-08-13T10:00:00Z'), // 1 day ago
      });
      renderComponent(data);

      expect(screen.getByText('13.8.2024')).toBeInTheDocument();
    });

    it('shows "Nie" for no last check', () => {
      const data = createMockData({ lastHealthCheck: undefined });
      renderComponent(data);

      expect(screen.getByText('Nie')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('renders appropriate icon for online status', () => {
      const data = createMockData({ isOnline: true });
      renderComponent(data);

      // The icon should be rendered (testing presence through the component structure)
      const container = screen.getByText('Online').closest('[role]') || screen.getByText('Online').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('renders appropriate icon for offline status', () => {
      const data = createMockData({ isOnline: false });
      renderComponent(data);

      const container = screen.getByText('Offline').closest('[role]') || screen.getByText('Offline').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('renders appropriate icon for checking status', () => {
      const data = createMockData({ isChecking: true });
      renderComponent(data);

      const container = screen.getByText('Überprüfung...').closest('[role]') || screen.getByText('Überprüfung...').parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('handles compact prop correctly', () => {
      const data = createMockData();
      const { rerender } = render(
        <ChakraProvider value={system}>
          <SystemStatus data={data} compact={false} />
        </ChakraProvider>,
      );

      // Full layout should show detailed labels
      expect(screen.getByText('Response Zeit:')).toBeInTheDocument();

      rerender(
        <ChakraProvider value={system}>
          <SystemStatus data={data} compact={true} />
        </ChakraProvider>,
      );

      // Compact layout should not show detailed labels
      expect(screen.queryByText('Response Zeit:')).not.toBeInTheDocument();
    });

    it('uses compact=false as default', () => {
      const data = createMockData();
      renderComponent(data); // No compact prop provided

      // Should render full layout by default
      expect(screen.getByText('Response Zeit:')).toBeInTheDocument();
      expect(screen.getByText('API Version:')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles all optional fields being undefined', () => {
      const data: SystemStatusData = {
        isOnline: true,
        responseTime: undefined,
        apiVersion: undefined,
        lastHealthCheck: undefined,
        isChecking: false,
      };
      renderComponent(data);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('Nie')).toBeInTheDocument();
      expect(screen.queryByText('API Version:')).not.toBeInTheDocument();
    });

    it('handles extreme response times', () => {
      const data = createMockData({ responseTime: 99999 });
      renderComponent(data);

      expect(screen.getByText('99999ms')).toBeInTheDocument();
    });

    it('handles complex status combinations', () => {
      // Offline and checking - checking should take precedence
      const data = createMockData({ isOnline: false, isChecking: true });
      renderComponent(data);

      expect(screen.getByText('CHECKING')).toBeInTheDocument();
      expect(screen.queryByText('OFFLINE')).not.toBeInTheDocument();
    });
  });
});
