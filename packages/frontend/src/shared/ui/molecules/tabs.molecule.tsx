import { cn } from '@/shared/ui/cn';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import type { ReactNode } from 'react';

interface TabItem {
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: Array<TabItem>;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

/**
 * Tabs-Komponente mit Headless UI
 *
 * Bietet eine zugängliche Tab-Navigation mit Inhalten.
 */
export function Tabs({ items, defaultIndex = 0, onChange, className }: TabsProps) {
  return (
    <TabGroup defaultIndex={defaultIndex} onChange={onChange}>
      <TabList className={cn('flex space-x-1 rounded-panel bg-action-secondary p-1', className)}>
        {items.map((item) => (
          <Tab
            key={item.label}
            className={({ selected }) =>
              cn(
                'w-full rounded-control py-1.5 text-sm leading-5 font-medium',
                'focus-visible:shadow-focus-ring focus-visible:outline-none',
                selected ? 'bg-surface-panel text-text-primary shadow' : 'text-text-secondary hover:bg-action-secondary-hover hover:text-text-primary',
              )
            }
          >
            {item.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="mt-1.5">
        {items.map((item) => (
          <TabPanel key={item.label} className={cn('rounded-panel p-2', 'focus-visible:shadow-focus-ring focus-visible:outline-none')}>
            {item.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
