/**
 * Storybook State-Matrix für `ConflictResolutionList` (Story 3.10 AC8).
 *
 * Pflichtige States gemäß UX-Spec:
 * - idle (0 / 5 / 50 Konflikte)
 * - hover, focus (visual states — werden durch Tailwind-Hover/Focus abgedeckt)
 * - disabled (Read-Only-Modus)
 * - error (Backend-Fehler)
 * - loading (Initial-Fetch)
 * - empty (0 Konflikte)
 *
 * Storybook ist im Repo derzeit nicht installiert; CSF3 ist hier als
 * fixture-Scaffold abgelegt. Sobald Storybook initialisiert wird, lassen
 * sich die Stories direkt benutzen — die lokalen Typ-Aliase entfallen dann.
 */

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import type { SyncConflictListItemDto } from '@bluelight-hub/shared/client';
import { ConflictResolutionList } from './ConflictResolutionList';
import { EIGENSCHUTZ_QUERY_KEYS } from '../../api/queries';

// Lokale Storybook-Typ-Stubs, weil Storybook derzeit nicht installiert ist.
// Wenn Storybook später hinzugefügt wird, sollten diese gegen Imports aus
// `@storybook/react` ausgetauscht werden.
type ComponentProps<T> = T extends ComponentType<infer P> ? P : never;
interface Meta<T> {
  title: string;
  component: T;
  parameters?: Record<string, unknown>;
  decorators?: Array<(Story: ComponentType) => React.ReactElement>;
}
interface StoryObj<T> {
  args?: ComponentProps<T>;
  parameters?: Record<string, unknown>;
  decorators?: Array<(Story: ComponentType) => React.ReactElement>;
  render?: (args: ComponentProps<T>) => React.ReactElement;
}

const EINSATZ_ID = 'einsatz-storybook';

function makeConflict(i: number, overrides: Partial<SyncConflictListItemDto> = {}): SyncConflictListItemDto {
  return {
    id: `conflict-${i}`,
    einheitId: `einheit-${(i % 3) + 1}`,
    entityType: i % 2 === 0 ? 'PSA_PROFIL_ZUWEISUNG' : 'GEFAEHRDUNGSBEURTEILUNG_ITEM',
    entityId: `entity-${i}`,
    fieldPath: i % 2 === 0 ? 'profil' : 'schutzmassnahme',
    localPayload: {
      toggles: [
        { code: 'BASIS', active: true },
        { code: 'CBRN', active: false },
      ],
      begruendung: `Konflikt #${i}`,
    } as unknown as object,
    serverVersion: 6 + (i % 4),
    localExpectedVersion: 5 + (i % 4),
    reportedAt: new Date(Date.now() - i * 60_000),
    reportedByUserId: `user-${(i % 4) + 1}`,
    ...overrides,
  };
}

function withSeededClient(seed: (queryClient: QueryClient) => void) {
  return function Decorator(Story: ComponentType) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seed(client);
    return (
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    );
  };
}

function Seed({ children, seed }: { children: React.ReactNode; seed: (qc: QueryClient) => void }) {
  const qc = useQueryClient();
  useEffect(() => {
    seed(qc);
  }, [qc, seed]);
  return <>{children}</>;
}

const meta: Meta<typeof ConflictResolutionList> = {
  title: 'Eigenschutz/Organisms/ConflictResolutionList',
  component: ConflictResolutionList,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof ConflictResolutionList>;

export const Empty: Story = {
  args: { einsatzId: EINSATZ_ID, canResolve: true },
  decorators: [
    withSeededClient((qc) => {
      qc.setQueryData(EIGENSCHUTZ_QUERY_KEYS.syncConflicts(EINSATZ_ID), []);
    }),
  ],
};

export const FiveConflicts: Story = {
  args: { einsatzId: EINSATZ_ID, canResolve: true },
  decorators: [
    withSeededClient((qc) => {
      qc.setQueryData(
        EIGENSCHUTZ_QUERY_KEYS.syncConflicts(EINSATZ_ID),
        Array.from({ length: 5 }, (_, i) => makeConflict(i)),
      );
    }),
  ],
};

export const FiftyConflicts: Story = {
  args: { einsatzId: EINSATZ_ID, canResolve: true },
  decorators: [
    withSeededClient((qc) => {
      qc.setQueryData(
        EIGENSCHUTZ_QUERY_KEYS.syncConflicts(EINSATZ_ID),
        Array.from({ length: 50 }, (_, i) => makeConflict(i)),
      );
    }),
  ],
};

export const ReadOnlyDisabled: Story = {
  args: { einsatzId: EINSATZ_ID, canResolve: false },
  decorators: [
    withSeededClient((qc) => {
      qc.setQueryData(
        EIGENSCHUTZ_QUERY_KEYS.syncConflicts(EINSATZ_ID),
        Array.from({ length: 3 }, (_, i) => makeConflict(i)),
      );
    }),
  ],
};

export const Loading: Story = {
  args: { einsatzId: EINSATZ_ID, canResolve: true },
  // Kein vorgelagertes setQueryData → Initial-Fetch läuft (Skeleton).
};

export const ErrorState: Story = {
  args: { einsatzId: EINSATZ_ID, canResolve: true },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Seed
          seed={(qc) => {
            qc.setQueryData(EIGENSCHUTZ_QUERY_KEYS.syncConflicts(EINSATZ_ID), () => {
              throw new Error('Network error');
            });
          }}
        >
          <Story />
        </Seed>
      </QueryClientProvider>
    ),
  ],
};

// Hover- und Focus-States werden durch CSS-Klassen abgedeckt; in Storybook
// reicht eine sichtbare Story mit Daten + Maus-/Tastatur-Interaktion.
export const HoverFocus: Story = FiveConflicts;
