import { clearHighlightedEntry, resetHighlightStore, setHighlightedEntry } from '@/features/reminders/stores/highlight.store';
import { resetKategorieFilter } from '@/features/etb/stores/kategorie-filter.store';
import { act, renderWithProviders, screen, fireEvent, waitFor } from '@/test/utils';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('EtbEntryList Performance-Gates', () => {
  const originalResizeObserver = global.ResizeObserver;
  const entries = buildEtbEntries();
  const initialEntryText = 'ETB-Eintrag 200: Lagebild und Maßnahmenstand für Ring-2-Performance.';
  const scrollTargetEntry = entries[159]!;
  const scrollTargetText = scrollTargetEntry.text;
  const resumeTargetEntry = entries[119]!;
  const resumeTargetText = resumeTargetEntry.text;

  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver implements globalThis.ResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}

      disconnect(): void {}

      observe(target: Element): void {
        const height = target instanceof HTMLElement ? target.clientHeight || 600 : 600;
        const width = target instanceof HTMLElement ? target.clientWidth || 1200 : 1200;

        queueMicrotask(() => {
          this.callback(
            [
              {
                target,
                borderBoxSize: [{ blockSize: height, inlineSize: width }],
                contentBoxSize: [{ blockSize: height, inlineSize: width }],
                contentRect: {
                  x: 0,
                  y: 0,
                  top: 0,
                  left: 0,
                  bottom: height,
                  right: width,
                  width,
                  height,
                  toJSON: () => ({}),
                },
                devicePixelContentBoxSize: [{ blockSize: height, inlineSize: width }],
              } as ResizeObserverEntry,
            ],
            this,
          );
        });
      }

      unobserve(_target: Element): void {}
    };
  });

  afterAll(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetKategorieFilter();
    resetHighlightStore();
  });

  function configureTableContainer(tableContainer: HTMLDivElement) {
    Object.defineProperty(tableContainer, 'scrollHeight', {
      configurable: true,
      value: entries.length * 80,
    });
    Object.defineProperty(tableContainer, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(tableContainer, 'clientWidth', {
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(tableContainer, 'offsetHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(tableContainer, 'offsetWidth', {
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(tableContainer, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 600,
        right: 1200,
        width: 1200,
        height: 600,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(tableContainer, 'scrollTo', {
      configurable: true,
      value: ({ top }: ScrollToOptions) => {
        tableContainer.scrollTop = top ?? tableContainer.scrollTop;
        fireEvent.scroll(tableContainer);
      },
    });
  }

  async function waitForUsableEtbState() {
    await waitFor(() => {
      const isEntryVisible = screen.queryByText(initialEntryText) !== null;
      const isFallbackVisible = screen.queryByText('Einträge werden aktualisiert…') !== null;
      expect(isEntryVisible || isFallbackVisible).toBe(true);
    });
  }

  // Die P95-Schwelle bleibt unverändert; der höhere Test-Timeout fängt nur Suite-Last bei 30 Iterationen ab.
  it('liefert einen P95-Gate-Report für den nutzbaren ETB-Zustand mit 200 Einträgen', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: () =>
        measureRenderCycle(
          () => renderWithProviders(<EtbEntryList entries={entries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />),
          waitForUsableEtbState,
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
  }, 15000);

  it('reagiert beim Scrollen innerhalb des 200-ms-Gates', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: async () => {
        const renderResult = renderWithProviders(
          <EtbEntryList entries={entries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />,
        );

        try {
          const tableContainer = screen.getByRole('table').parentElement as HTMLDivElement;
          configureTableContainer(tableContainer);

          fireEvent.scroll(tableContainer);

          await waitFor(() => {
            expect(screen.getByText(initialEntryText)).toBeInTheDocument();
          });

          return await measureInteractionCycle(
            () => {
              tableContainer.scrollTop = 3200;
              fireEvent.scroll(tableContainer);
            },
            async () => {
              await waitFor(() => {
                expect(screen.getByText(scrollTargetText)).toBeInTheDocument();
              });
            },
          );
        } finally {
          renderResult.unmount();
        }
      },
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
  }, 15000);

  it('markiert Wiederaufnahme-Hinweise innerhalb des 200-ms-Gates', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: async () => {
        const renderResult = renderWithProviders(
          <EtbEntryList entries={entries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />,
        );

        try {
          const tableContainer = screen.getByRole('table').parentElement as HTMLDivElement;
          configureTableContainer(tableContainer);

          fireEvent.scroll(tableContainer);

          await waitFor(() => {
            expect(screen.getByText(initialEntryText)).toBeInTheDocument();
          });

          return await measureInteractionCycle(
            async () => {
              await act(async () => {
                setHighlightedEntry(resumeTargetEntry.id);
              });
            },
            async () => {
              await waitFor(() => {
                expect(screen.getByText(resumeTargetText)).toBeInTheDocument();
                expect(document.getElementById(`etb-entry-${resumeTargetEntry.id}`)).toHaveClass('bg-action-secondary');
              });
            },
          );
        } finally {
          await act(async () => {
            clearHighlightedEntry();
          });
          renderResult.unmount();
        }
      },
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
  }, 15000);
});
