import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionContextCard } from '../SessionContextCard';

describe('SessionContextCard', () => {
  it('zeigt Benutzername, Rollenbezug und aktiven Server kompakt an', () => {
    render(<SessionContextCard username="leitstelle-west" role="USER" activeServerName="Leitstelle West" />);

    expect(screen.getByText('Sitzung')).toBeInTheDocument();
    expect(screen.getByText('leitstelle-west')).toBeInTheDocument();
    expect(screen.getByText('Standardzugang')).toBeInTheDocument();
    expect(screen.getByText('Leitstelle West')).toBeInTheDocument();
  });

  it('trennt Admin-Rollenfähigkeit von einer nicht aktiven Admin-Sitzung', () => {
    const onAdminAction = vi.fn();

    render(<SessionContextCard username="einsatzleitung" role="ADMIN" activeServerName="Leitstelle Nord" adminSessionStatus="unauthenticated" onAdminAction={onAdminAction} />);

    expect(screen.getByText(/Admin-Rolle vorhanden:/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin-Sitzung ist aktuell nicht aktiv/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Admin-Bereich anzeigen/i }));

    expect(onAdminAction).toHaveBeenCalledTimes(1);
  });

  it('zeigt für Admin-Setup eine CTA direkt im Hinweis an', () => {
    render(<SessionContextCard username="einsatzleitung" role="ADMIN" activeServerName="Leitstelle Nord" adminSessionStatus="unauthenticated" adminSetupAvailable onAdminAction={vi.fn()} />);

    expect(screen.getByText(/Admin-Setup verfügbar:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin-Setup öffnen/i })).toBeInTheDocument();
  });

  it('kennzeichnet eine aktive Admin-Sitzung explizit und bietet dieselbe CTA an', () => {
    const onAdminAction = vi.fn();

    render(<SessionContextCard username="einsatzleitung" role="SUPER_ADMIN" activeServerName="Leitstelle Süd" adminSessionStatus="authenticated" onAdminAction={onAdminAction} />);

    expect(screen.getByText(/Admin-Sitzung aktiv:/i)).toBeInTheDocument();
    expect(screen.getByText(/verwaltungsfunktionen stehen in dieser Sitzung erweitert zur Verfügung/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Admin-Bereich anzeigen/i }));

    expect(onAdminAction).toHaveBeenCalledTimes(1);
  });
});
