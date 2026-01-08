import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createTestQueryClient, renderWithProviders } from './utils';

describe('Test Utils', () => {
  describe('createTestQueryClient', () => {
    it('should create a QueryClient with disabled retries', () => {
      const client = createTestQueryClient();
      expect(client).toBeInstanceOf(QueryClient);
      expect(client.getDefaultOptions().queries?.retry).toBe(false);
      expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    });

    it('should create isolated QueryClient instances', () => {
      const client1 = createTestQueryClient();
      const client2 = createTestQueryClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('renderWithProviders', () => {
    it('should render component with QueryClientProvider', () => {
      const TestComponent = () => <div>Test Component</div>;
      const { getByText } = renderWithProviders(<TestComponent />);
      expect(getByText('Test Component')).toBeInTheDocument();
    });

    it('should accept custom QueryClient', () => {
      const customClient = createTestQueryClient();
      const TestComponent = () => <div>Custom Client Test</div>;
      const { getByText } = renderWithProviders(<TestComponent />, {
        queryClient: customClient,
      });
      expect(getByText('Custom Client Test')).toBeInTheDocument();
    });
  });
});
