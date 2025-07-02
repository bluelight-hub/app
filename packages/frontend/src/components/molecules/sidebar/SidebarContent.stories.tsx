import type { Meta, StoryObj } from '@storybook/react';
import SidebarContent from './SidebarContent';
import { fn } from '@storybook/test';
import { EinsatzProvider } from '../../../contexts/EinsatzContext';
import { useUserProfileStore } from '../../../stores/useUserProfileStore';
import { NavigationItem } from '../../../config/navigation';
import { PiHouse, PiClipboardText, PiUsers } from 'react-icons/pi';

const mockNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/app/dashboard',
    icon: PiHouse,
  },
  {
    name: 'Einsatztagebuch',
    href: '/app/einsatztagebuch',
    icon: PiClipboardText,
  },
  {
    name: 'Team',
    href: '/app/team',
    icon: PiUsers,
    children: [
      { name: 'Mitglieder', href: '/app/team/members' },
      { name: 'Rollen', href: '/app/team/roles' },
    ],
  },
];

const meta = {
  title: 'Molecules/Sidebar/SidebarContent',
  component: SidebarContent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    navigation: {
      description: 'Navigation items to display',
    },
    onNavigate: {
      description: 'Callback when navigation item is clicked',
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
          <div className="h-screen">
            <Story />
          </div>
        </EinsatzProvider>
      );
    },
  ],
} satisfies Meta<typeof SidebarContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    navigation: mockNavigation,
    onNavigate: fn(),
  },
};

export const WithManyItems: Story = {
  args: {
    navigation: [
      ...mockNavigation,
      { name: 'Einsätze', href: '/app/einsaetze', icon: PiClipboardText },
      { name: 'Fahrzeuge', href: '/app/fahrzeuge', icon: PiClipboardText },
      { name: 'Gefahren', href: '/app/gefahren', icon: PiClipboardText },
      { name: 'Checklisten', href: '/app/checklisten', icon: PiClipboardText },
      { name: 'Kommunikation', href: '/app/kommunikation', icon: PiClipboardText },
      { name: 'Kräfte', href: '/app/kraefte', icon: PiClipboardText },
      { name: 'Lagekarte', href: '/app/lagekarte', icon: PiClipboardText },
      { name: 'Notizen', href: '/app/notizen', icon: PiClipboardText },
      { name: 'Reminders', href: '/app/reminders', icon: PiClipboardText },
    ],
    onNavigate: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Sidebar with many navigation items to test scrolling',
      },
    },
  },
};

export const Mobile: Story = {
  args: {
    navigation: mockNavigation,
    onNavigate: fn(),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};