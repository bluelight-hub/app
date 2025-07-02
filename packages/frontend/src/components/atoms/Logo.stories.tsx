import type { Meta, StoryObj } from '@storybook/react';
import Logo from './Logo';
import { ThemeProvider } from '../../providers/ThemeProvider';

const meta = {
  title: 'Atoms/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes for styling',
    },
    'data-testid': {
      control: 'text',
      description: 'Test ID for testing purposes',
      defaultValue: 'logo',
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: {
    className: 'h-8 w-auto',
  },
};

export const Large: Story = {
  args: {
    className: 'h-16 w-auto',
  },
};

export const ExtraLarge: Story = {
  args: {
    className: 'h-24 w-auto',
  },
};

export const WithCustomStyling: Story = {
  args: {
    className: 'h-12 w-auto drop-shadow-lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo with drop shadow effect',
      },
    },
  },
};