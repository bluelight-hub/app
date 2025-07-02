import type { Meta, StoryObj } from '@storybook/react';
import UserProfile from './UserProfile';
import { fn } from '@storybook/test';
import { EinsatzProvider } from '../../contexts/EinsatzContext';
import { useUserProfileStore } from '../../stores/useUserProfileStore';

const meta = {
  title: 'Atoms/UserProfile',
  component: UserProfile,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    href: {
      control: 'text',
      description: 'Link href (not used but required)',
      defaultValue: '#',
    },
    hideText: {
      control: 'boolean',
      description: 'Hide the user name text',
      defaultValue: false,
    },
    onClick: {
      description: 'Callback when profile is clicked',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    'data-testid': {
      control: 'text',
      description: 'Test ID for testing purposes',
      defaultValue: 'user-profile',
    },
  },
  decorators: [
    (Story) => {
      // Set up mock user profile
      useUserProfileStore.setState({
        profile: {
          id: '1',
          name: 'Max Mustermann',
          email: 'max.mustermann@example.com',
          imageUrl: 'https://ui-avatars.com/api/?name=Max+Mustermann&background=0D8ABC&color=fff',
          roles: ['user'],
        },
      });

      return (
        <EinsatzProvider>
          <div className="w-64 bg-white dark:bg-gray-900">
            <Story />
          </div>
        </EinsatzProvider>
      );
    },
  ],
} satisfies Meta<typeof UserProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: '#',
    onClick: fn(),
  },
};

export const HiddenText: Story = {
  args: {
    href: '#',
    hideText: true,
    onClick: fn(),
  },
};

export const WithLongName: Story = {
  args: {
    href: '#',
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      useUserProfileStore.setState({
        profile: {
          id: '2',
          name: 'Friedrich-Wilhelm von Brandenburg-Preußen',
          email: 'friedrich.wilhelm@example.com',
          imageUrl: 'https://ui-avatars.com/api/?name=FW&background=0D8ABC&color=fff',
          roles: ['admin'],
        },
      });
      return <Story />;
    },
  ],
};

export const NoProfile: Story = {
  args: {
    href: '#',
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      useUserProfileStore.setState({ profile: null });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'When no user profile is available, the component renders nothing',
      },
    },
  },
};