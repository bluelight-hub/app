/**
 * Spec für `useVorfallAuditTimeline` (Story 5.6).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTimeline = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzVorfallControllerGetVorfallAuditTimelineVAlpha: mockGetTimeline,
    }),
  },
}));

import { useVorfallAuditTimeline, vorfallAuditTimelineQueryKey } from '../use-vorfall-audit-timeline';

const TIMELINE = [
  {
    id: 'audit-1',
    type: 'exported' as const,
    occurredAt: '2026-05-07T08:30:00.000Z',
    userId: 'user-1',
    userName: 'Rubeen',
    format: 'pdf' as const,
    label: 'Export durch Rubeen als PDF',
  },
];

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => {
  mockGetTimeline.mockReset();
});

describe('useVorfallAuditTimeline (Story 5.6)', () => {
  it('lädt die Audit-Timeline via generiertem Client und entpackt data', async () => {
    mockGetTimeline.mockResolvedValueOnce({ data: { eintraege: TIMELINE } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useVorfallAuditTimeline('einsatz-1', 'vorfall-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(TIMELINE));
    expect(mockGetTimeline).toHaveBeenCalledWith({ einsatzId: 'einsatz-1', vorfallId: 'vorfall-1' });
  });

  it('ist deaktiviert, wenn vorfallId fehlt', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useVorfallAuditTimeline('einsatz-1', undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetTimeline).not.toHaveBeenCalled();
  });

  it('liefert hierarchischen Audit-Timeline-Query-Key', () => {
    expect(vorfallAuditTimelineQueryKey('einsatz-1', 'vorfall-1')).toEqual(['eigenschutz-vorfaelle', 'einsatz-1', 'detail', 'vorfall-1', 'auditTimeline']);
  });
});
