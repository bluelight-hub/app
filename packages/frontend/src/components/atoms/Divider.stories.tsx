import type { Meta, StoryObj } from '@storybook/react';
import Divider from './Divider';

const meta = {
  title: 'Atoms/Divider',
  component: Divider,
  parameters: {
    layout: 'padded',
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
      defaultValue: 'divider',
    },
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomSpacing: Story = {
  args: {
    className: 'my-8',
  },
};

export const Thicker: Story = {
  args: {
    className: 'border-t-2',
  },
};

export const ColoredDivider: Story = {
  args: {
    className: 'border-blue-500',
  },
  parameters: {
    docs: {
      description: {
        story: 'A divider with custom color',
      },
    },
  },
};