import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SecurityDashboard from './page';
import { securityApi } from '@/api/security';

// Mock security API
vi.mock('@/api/security', () => ({
  securityApi: {
    getDashboardMetrics: vi.fn(),
    getRecentAlerts: vi.fn(),
    getSecurityLogs: vi.fn(),
  },
}));

const mockMetrics = {
  totalLoginAttempts: 1250,
  failedLoginAttempts: 45,
  activeSessions: 87,
  suspiciousActivities: 12,
  blockedIPs: 5,
  alertsCount: 8,
  avgSessionDuration: 25,
  securityScore: 85,
  summary: {
    accountLockouts: {
      last24Hours: 0,
      trend: 0,
    },
    suspiciousActivities: {
      trend: 15,
    },
  },
  details: {
    topFailedLoginIps: [
      { ip: '192.168.1.100', count: 15 },
      { ip: '10.0.0.50', count: 10 },
    ],
    suspiciousActivityTypes: [
      { type: 'BRUTE_FORCE', count: 8 },
      { type: 'UNUSUAL_LOCATION', count: 4 },
    ],
  },
  loginAttemptsChart: [
    { time: '2024-01-01T10:00:00', successful: 100, failed: 5 },
    { time: '2024-01-01T11:00:00', successful: 120, failed: 8 },
    { time: '2024-01-01T12:00:00', successful: 95, failed: 3 },
  ],
  threatDistribution: [
    { name: 'Brute Force', value: 30 },
    { name: 'SQL Injection', value: 20 },
    { name: 'XSS', value: 15 },
    { name: 'Other', value: 35 },
  ],
  sessionsByLocation: [
    { location: 'Germany', count: 45 },
    { location: 'USA', count: 30 },
    { location: 'UK', count: 12 },
  ],
};

const mockAlerts = [
  {
    id: '1',
    type: 'LOGIN_FAILURE' as const,
    severity: 'high' as const,
    message: 'Multiple failed login attempts detected',
    ipAddress: '192.168.1.100',
    timestamp: new Date(),
    resolved: false,
  },
  {
    id: '2',
    type: 'SUSPICIOUS_ACTIVITY' as const,
    severity: 'medium' as const,
    message: 'Unusual access pattern detected',
    ipAddress: '10.0.0.50',
    timestamp: new Date(),
    resolved: false,
  },
];

const mockSecurityLogs = [
  {
    id: '1',
    eventType: 'LOGIN_FAILED',
    severity: 'ERROR',
    message: 'Multiple failed login attempts detected',
    ipAddress: '192.168.1.100',
    createdAt: new Date().toISOString(),
    sequenceNumber: 100,
  },
  {
    id: '2',
    eventType: 'SUSPICIOUS_ACTIVITY',
    severity: 'CRITICAL',
    message: 'Unusual access pattern detected',
    ipAddress: '10.0.0.50',
    createdAt: new Date().toISOString(),
    sequenceNumber: 101,
  },
];

describe('SecurityDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          gcTime: 0,
        },
      },
    });

    vi.clearAllMocks();
    vi.mocked(securityApi.getDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(securityApi.getRecentAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(securityApi.getSecurityLogs).mockResolvedValue(mockSecurityLogs);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SecurityDashboard />
      </QueryClientProvider>,
    );
  };

  it('sollte die Überschrift und Beschreibung anzeigen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Echtzeit-Sicherheitsmetriken')).toBeInTheDocument();
  });

  it('sollte die Zeitbereich-Tags anzeigen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Heute')).toBeInTheDocument();
    });

    expect(screen.getByText('Woche')).toBeInTheDocument();
    expect(screen.getByText('Monat')).toBeInTheDocument();
  });

  it('sollte die Hauptmetriken anzeigen', async () => {
    renderComponent();

    // Warte darauf, dass die Komponente nicht mehr lädt
    await waitFor(() => {
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    // Dann prüfe die Metriken
    await waitFor(() => {
      expect(screen.getByText('Login-Versuche')).toBeInTheDocument();
    });

    // Suche nach dem Wert in der Statistic-Komponente (Ant Design formatiert Zahlen mit Komma)
    const loginValue = screen.getByText('1,250');
    expect(loginValue).toBeInTheDocument();

    expect(screen.getByText('Verdächtige Aktivitäten')).toBeInTheDocument();
    expect(screen.getByText('Account-Sperrungen')).toBeInTheDocument();
  });

  it('sollte kritische Ereignisse anzeigen, wenn vorhanden', async () => {
    renderComponent();

    // Warte darauf, dass die Komponente nicht mehr lädt
    await waitFor(() => {
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // Es gibt zwei Elemente mit diesem Text, verwende getAllByText
      const elements = screen.getAllByText(/Kritische Sicherheitsereignisse/);
      expect(elements.length).toBeGreaterThan(0);
    });

    // Die kritischen Events werden als Alert angezeigt (mehrfach vorhanden)
    const events = screen.getAllByText(/Multiple failed login attempts detected/);
    expect(events.length).toBeGreaterThan(0);
  });

  it('sollte die Erfolgsrate korrekt berechnen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Erfolgsrate:')).toBeInTheDocument();
      // (1250-45)/1250 = 96.4%, gerundet auf 96%
      expect(screen.getByText('96%')).toBeInTheDocument();
    });
  });

  it('sollte den Hash-Chain Status anzeigen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Security Log Integrity')).toBeInTheDocument();
      expect(screen.getByText('Hash-Chain Status')).toBeInTheDocument();
      expect(screen.getByText('Verifiziert')).toBeInTheDocument();
    });
  });

  it('sollte die API mit dem richtigen Zeitbereich aufrufen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(securityApi.getDashboardMetrics).toHaveBeenCalledWith('today');
    });
  });

  it('sollte Security Events Card anzeigen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Kritische Sicherheitsereignisse')).toBeInTheDocument();
      expect(screen.getByText('System Security Status')).toBeInTheDocument();
    });
  });
});
