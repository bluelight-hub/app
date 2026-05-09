/**
 * CSF3-Fixture für die Eigenschutz-Shortcut-Hilfe.
 *
 * Storybook ist im Repo derzeit nicht installiert; die Datei folgt dem
 * bestehenden Fixture-Pattern der Eigenschutz-Organisms.
 */

import { useState, type ComponentType } from 'react';
import { EigenschutzShortcutHelpPopover } from './EigenschutzShortcutHelpPopover';

type ComponentProps<T> = T extends ComponentType<infer P> ? P : never;
interface Meta<T> {
  title: string;
  component: T;
  parameters?: Record<string, unknown>;
}
interface StoryObj<T> {
  args?: ComponentProps<T>;
  parameters?: Record<string, unknown>;
  render?: (args: ComponentProps<T>) => React.ReactElement;
}

const meta: Meta<typeof EigenschutzShortcutHelpPopover> = {
  title: 'Eigenschutz/Molecules/ShortcutHelpPopover',
  component: EigenschutzShortcutHelpPopover,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof EigenschutzShortcutHelpPopover>;

function ControlledShortcutHelp(args: ComponentProps<typeof EigenschutzShortcutHelpPopover>) {
  const [open, setOpen] = useState(args.open);
  return <EigenschutzShortcutHelpPopover {...args} open={open} onOpenChange={setOpen} />;
}

export const Vorfaelle: Story = {
  args: {
    context: 'vorfaelle',
    open: true,
    onOpenChange: () => undefined,
  },
  render: (args) => <ControlledShortcutHelp {...args} />,
};

export const Gefaehrdungen: Story = {
  args: {
    context: 'gefaehrdungen',
    open: true,
    onOpenChange: () => undefined,
  },
  render: (args) => <ControlledShortcutHelp {...args} />,
};
