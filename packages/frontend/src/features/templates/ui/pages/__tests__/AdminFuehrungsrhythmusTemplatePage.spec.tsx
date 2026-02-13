import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { AdminFuehrungsrhythmusTemplatePage } from '../AdminFuehrungsrhythmusTemplatePage';

// Mock TanStack Router
const mockNavigate = vi.fn(() => null);
vi.mock('@tanstack/react-router', () => ({
  Navigate: (props: Record<string, unknown>) => {
    mockNavigate(props);
    return null;
  },
}));

// Mock Auth Hook
const mockUseAdminAuth = vi.fn();
vi.mock('@/features/auth/api/use-current-user', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

// Mock API Hooks
const mockDeleteTemplate = vi.fn();
const mockUseGlobalFuehrungsrhythmusTemplates = vi.fn();
vi.mock('../../../api', () => ({
  useGlobalFuehrungsrhythmusTemplates: () => mockUseGlobalFuehrungsrhythmusTemplates(),
  useDeleteGlobalFuehrungsrhythmusTemplate: () => ({
    mutate: mockDeleteTemplate,
    isPending: false,
  }),
}));

// Mock Unter-Dialoge um Seiteneffekte zu vermeiden
vi.mock('../../organisms/CreateFuehrungsrhythmusTemplateDialog', () => ({
  CreateFuehrungsrhythmusTemplateDialog: () => null,
}));
vi.mock('../../organisms/EditFuehrungsrhythmusTemplateDialog', () => ({
  EditFuehrungsrhythmusTemplateDialog: () => null,
}));

/** Beispiel-Templates fuer Tests */
const mockTemplates = [
  {
    id: 'tmpl-1',
    name: 'Standard 30min',
    beschreibung: 'Alle 30 Minuten',
    scope: 'GLOBAL',
    einsatzId: null,
    eintraege: [{ id: 'e-1', titel: 'Lagebericht', intervallMinuten: 30, offsetMinuten: 0, sortOrder: 0 }],
  },
  {
    id: 'tmpl-2',
    name: 'Intensiv 15min',
    beschreibung: null,
    scope: 'GLOBAL',
    einsatzId: null,
    eintraege: [
      { id: 'e-2', titel: 'Meldung', intervallMinuten: 15, offsetMinuten: 0, sortOrder: 0 },
      { id: 'e-3', titel: 'Check', intervallMinuten: 15, offsetMinuten: 5, sortOrder: 1 },
    ],
  },
];

describe('AdminFuehrungsrhythmusTemplatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuth.mockReturnValue({ isAdmin: true, isLoading: false });
    mockUseGlobalFuehrungsrhythmusTemplates.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
    });
  });

  describe('Rendering', () => {
    it('should display page header with title', () => {
      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('Globale Fuehrungsrhythmus-Templates')).toBeInTheDocument();
    });

    it('should display "Neues globales Template" button', () => {
      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('Neues globales Template')).toBeInTheDocument();
    });

    it('should display template list when data is available', () => {
      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('Standard 30min')).toBeInTheDocument();
      expect(screen.getByText('Intensiv 15min')).toBeInTheDocument();
    });

    it('should display template descriptions', () => {
      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('Alle 30 Minuten')).toBeInTheDocument();
    });

    it('should display Erinnerungen count per template', () => {
      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('1 Erinnerung')).toBeInTheDocument();
      expect(screen.getByText('2 Erinnerungen')).toBeInTheDocument();
    });

    it('should display edit and delete buttons for each template', () => {
      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByLabelText('Standard 30min bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Standard 30min loeschen')).toBeInTheDocument();
      expect(screen.getByLabelText('Intensiv 15min bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Intensiv 15min loeschen')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should display spinner when loading', () => {
      mockUseGlobalFuehrungsrhythmusTemplates.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { container } = renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      // Spinner ist ein div mit animate-spin Klasse
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no templates exist', () => {
      mockUseGlobalFuehrungsrhythmusTemplates.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('Noch keine globalen Templates vorhanden')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message on query failure', () => {
      mockUseGlobalFuehrungsrhythmusTemplates.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(screen.getByText('Fehler beim Laden der Templates')).toBeInTheDocument();
    });
  });

  describe('Auth guard', () => {
    it('should redirect to admin-login when not admin', () => {
      mockUseAdminAuth.mockReturnValue({ isAdmin: false, isLoading: false });

      renderWithProviders(<AdminFuehrungsrhythmusTemplatePage />);

      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/admin-login' }));
    });
  });
});
