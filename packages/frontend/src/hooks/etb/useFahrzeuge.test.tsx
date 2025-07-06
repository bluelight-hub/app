import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { expect, vi } from 'vitest';
import { useFahrzeuge } from './useFahrzeuge';

// Mock für den Logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFahrzeuge Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte initial mit leeren Fahrzeug-Daten starten', async () => {
    const { result } = renderHook(() => useFahrzeuge(), {
      wrapper: createWrapper(),
    });

    // Initial sollten leere Daten vorhanden sein
    expect(result.current.fahrzeuge.data.fahrzeugeImEinsatz).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('sollte nach dem Laden Fahrzeug-Daten zurückgeben', async () => {
    const { result } = renderHook(() => useFahrzeuge(), {
      wrapper: createWrapper(),
    });

    // Warten auf das Laden der Daten
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Prüfen, ob Daten geladen wurden
    const fahrzeuge = result.current.fahrzeuge.data.fahrzeugeImEinsatz;
    expect(fahrzeuge.length).toBeGreaterThan(0);

    // Prüfen, ob die Daten das richtige Format haben
    expect(fahrzeuge[0]).toHaveProperty('optaFunktion');
    expect(fahrzeuge[0]).toHaveProperty('fullOpta');
    expect(fahrzeuge[0]).toHaveProperty('id');
  });

  it('sollte refreshFahrzeuge zum Aktualisieren der Daten bereitstellen', async () => {
    // Mock für invalidateQueries erstellen
    const invalidateQueriesMock = vi.fn();

    // Mock für QueryClient
    vi.spyOn(QueryClient.prototype, 'invalidateQueries').mockImplementation(invalidateQueriesMock);

    const { result } = renderHook(() => useFahrzeuge(), {
      wrapper: createWrapper(),
    });

    // Warten auf das Laden der Daten
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Daten aktualisieren
    result.current.refreshFahrzeuge();

    // Prüfen, ob invalidateQueries aufgerufen wurde
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['fahrzeuge', 'list']),
      }),
    );

    // Mock wiederherstellen
    vi.restoreAllMocks();
  });

  it('sollte die Fahrzeuge nach Rettungsmitteln gruppieren', async () => {
    const { result } = renderHook(() => useFahrzeuge(), {
      wrapper: createWrapper(),
    });

    // Warten auf das Laden der Daten
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Zugriff auf die Daten
    const fahrzeuge = result.current.fahrzeuge.data.fahrzeugeImEinsatz;

    // Prüfen, ob alle erwarteten Fahrzeugtypen vorhanden sind
    const fahrzeugTypen = new Set(fahrzeuge.map((f) => f.optaFunktion));
    expect(fahrzeugTypen.has('RTW')).toBe(true);
    expect(fahrzeugTypen.has('NEF')).toBe(true);
    expect(fahrzeugTypen.has('KTW')).toBe(true);

    // Prüfen, ob mehrere RTWs vorhanden sind
    const rtws = fahrzeuge.filter((f) => f.optaFunktion === 'RTW');
    expect(rtws.length).toBeGreaterThan(1);
  });
});
