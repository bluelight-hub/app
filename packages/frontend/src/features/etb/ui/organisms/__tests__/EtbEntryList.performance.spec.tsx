import { clearHighlightedEntry, resetHighlightStore, setHighlightedEntry } from '@/features/reminders/stores/highlight.store';
import { resetKategorieFilter } from '@/features/etb/stores/kategorie-filter.store';
import { act } from '@testing-library/react';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EtbEntryList } from '../EtbEntryList';
import { RING_2_PERFORMANCE_SCENARIOS, RING_2_PERFORMANCE_THRESHOLDS, buildEtbEntries } from '@/test/performance/ring-2-performance-fixtures';
import { createStructuredPerformanceReport, formatStructuredPerformanceReport, measureInteractionCycle, measureRenderCycle, runIterations } from '@/test/performance/ring-2-performance-metrics';

vi.mock('@/shared/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn(async () => true),
}));

vi.mock('@/features/etb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/etb')>();

  return {
    ...actual,
    useDeleteEtbEntry: () => ({
      mutate: vi.fn(),
    }),
  };
});

vi.mock('@/features/auth', () => ({
  useUserNames: () => ({
    getUserName: () => 'Test User',
  }),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, index) => ({
        key: index,
        index,
        start: index * 80,
        end: (index + 1) * 80,
        size: 80,
      })),
    getTotalSize: () => count * 80,
    scrollToIndex: vi.fn(),
  }),
}));

describe('EtbEntryList Performance-Gates', () => {
  const entries = buildEtbEntries();

  beforeEach(() => {
    vi.clearAllMocks();
    resetKategorieFilter();
    resetHighlightStore();
  });

  it('liefert einen P95-Gate-Report für den nutzbaren ETB-Zustand mit 200 Einträgen', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: () =>
        measureRenderCycle(
          () => renderWithProviders(<EtbEntryList entries={entries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />),
          async () => {
            expect(screen.getByText('ETB-Eintrag 200: Lagebild und Maßnahmenstand für Ring-2-Performance.')).toBeInTheDocument();
          },
        ),
    });

    const report = createStructuredPerformanceReport({
      scenario: RING_2_PERFORMANCE_SCENARIOS.etb.id,
      metric: 'usable-state',
      thresholdMs: RING_2_PERFORMANCE_THRESHOLDS.usableStateP95Ms,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: RING_2_PERFORMANCE_THRESHOLDS.requiredPassRate,
    });

    console.info(formatStructuredPerformanceReport(report));

    expect(report.pass).toBe(true);
  });

  it('reagiert beim Scrollen innerhalb des 200-ms-Gates', async () => {
    const renderResult = renderWithProviders(
      <EtbEntryList entries={entries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />,
    );

    const tableContainer = screen.getByRole('table').parentElement as HTMLDivElement;

    Object.defineProperty(tableContainer, 'scrollHeight', {
      configurable: true,
      value: 4000,
    });
    Object.defineProperty(tableContainer, 'clientHeight', {
      configurable: true,
      value: 600,
    });

    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: async () => {
        tableContainer.scrollTop = 200;

        return measureInteractionCycle(() => {
          fireEvent.wheel(tableContainer, { deltaY: 120 });
        });
      },
    });

    renderResult.unmount();

    const report = createStructuredPerformanceReport({
      scenario: RING_2_PERFORMANCE_SCENARIOS.etb.id,
      metric: 'interaction-feedback',
      thresholdMs: RING_2_PERFORMANCE_THRESHOLDS.interactionFeedbackMs,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: RING_2_PERFORMANCE_THRESHOLDS.requiredPassRate,
    });

    console.info(formatStructuredPerformanceReport(report));

    expect(tableContainer.scrollTop).toBeGreaterThan(200);
    expect(report.pass).toBe(true);
  });

  it('markiert Wiederaufnahme-Hinweise innerhalb des 200-ms-Gates', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: () =>
        measureRenderCycle(
          () => renderWithProviders(<EtbEntryList entries={entries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />),
          async () => {
            await measureInteractionCycle(async () => {
              await act(async () => {
                setHighlightedEntry(entries[199]?.id ?? 'etb-entry-200');
              });
            });

            await waitFor(() => {
              expect(document.getElementById(`etb-entry-${entries[199]?.id ?? 'etb-entry-200'}`)).toHaveClass('bg-primary-50');
            });

            await act(async () => {
              clearHighlightedEntry();
            });
          },
        ),
    });

    const report = createStructuredPerformanceReport({
      scenario: RING_2_PERFORMANCE_SCENARIOS.etb.id,
      metric: 'interaction-feedback',
      thresholdMs: RING_2_PERFORMANCE_THRESHOLDS.interactionFeedbackMs,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: RING_2_PERFORMANCE_THRESHOLDS.requiredPassRate,
    });

    console.info(formatStructuredPerformanceReport(report));

    expect(report.pass).toBe(true);
  });
});
