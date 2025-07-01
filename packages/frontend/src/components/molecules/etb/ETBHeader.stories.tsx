import type { Meta, StoryObj } from '@storybook/react';
import { ETBHeader } from './ETBHeader';
import { fn } from '@storybook/test';

const meta = {
  title: 'Molecules/ETB/ETBHeader',
  component: ETBHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    inputVisible: {
      control: 'boolean',
      description: 'Whether the input form is visible',
    },
    setInputVisible: {
      description: 'Function to toggle input form visibility',
    },
  },
} satisfies Meta<typeof ETBHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inputVisible: false,
    setInputVisible: fn(),
  },
};

export const WithInputVisible: Story = {
  args: {
    inputVisible: true,
    setInputVisible: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Header state when the input form is visible',
      },
    },
  },
};

export const Mobile: Story = {
  args: {
    inputVisible: false,
    setInputVisible: fn(),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Header appearance on mobile devices',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    inputVisible: false,
    setInputVisible: fn(),
  },
  play: async ({ args, canvasElement }) => {
    // Story interactions can be added here
    // For example, clicking the "Neuer Eintrag" button
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive story demonstrating button clicks',
      },
    },
  },
};