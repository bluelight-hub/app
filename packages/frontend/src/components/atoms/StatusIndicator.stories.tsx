import type { Meta, StoryObj } from '@storybook/react';
import { StatusIndicator } from './StatusIndicator';
import { fn } from '@storybook/test';
import { http, HttpResponse } from 'msw';

const meta = {
  title: 'Atoms/StatusIndicator',
  component: StatusIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes for styling',
    },
    withText: {
      control: 'boolean',
      description: 'Whether to show the status text',
      defaultValue: false,
    },
    onStatusChange: {
      description: 'Callback when status changes',
    },
    'data-testid': {
      control: 'text',
      description: 'Test ID for testing purposes',
      defaultValue: 'status-indicator',
    },
  },
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock the backend health endpoint
const mockHandlers = {
  online: http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      info: {
        database: { status: 'up' },
        memory: { status: 'up' },
      },
    });
  }),
  offline: http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'offline',
      info: {
        database: { status: 'down' },
      },
    });
  }),
  error: http.get('/api/health', () => {
    return HttpResponse.error();
  }),
};

export const Online: Story = {
  args: {
    onStatusChange: fn(),
  },
  parameters: {
    msw: {
      handlers: [mockHandlers.online],
    },
  },
};

export const OnlineWithText: Story = {
  args: {
    withText: true,
    onStatusChange: fn(),
  },
  parameters: {
    msw: {
      handlers: [mockHandlers.online],
    },
  },
};

export const Offline: Story = {
  args: {
    withText: true,
    onStatusChange: fn(),
  },
  parameters: {
    msw: {
      handlers: [mockHandlers.offline],
    },
  },
};

export const Error: Story = {
  args: {
    withText: true,
    onStatusChange: fn(),
  },
  parameters: {
    msw: {
      handlers: [mockHandlers.error],
    },
  },
};

export const CustomStyling: Story = {
  args: {
    className: 'scale-150',
    withText: true,
    onStatusChange: fn(),
  },
  parameters: {
    msw: {
      handlers: [mockHandlers.online],
    },
    docs: {
      description: {
        story: 'Status indicator with custom scale',
      },
    },
  },
};