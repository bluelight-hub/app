/**
 * Unit Tests fuer IntegrationStatusCard Molecule
 *
 * Verifiziert:
 * - AC1: Alle 6 Status-Varianten korrekt dargestellt (Icon + Text)
 * - AC3: aria-label korrekt gesetzt
 * - suggestedAction Button sichtbar und klickbar
 * - Fehlerrate und Fehleranzahl angezeigt wenn > 0
 * - Letzte Aktivitaet korrekt angezeigt
 * - onAction Callback mit serviceKey gefeuert
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntegrationOverviewItemResponseDto } from '@bluelight-hub/shared/client';
import { IntegrationStatusCard } from '../IntegrationStatusCard';

/** Factory fuer Mock-Integration mit sinnvollen Defaults */
function createMockIntegration(overrides: Partial<IntegrationOverviewItemResponseDto> = {}): IntegrationOverviewItemResponseDto {
  return {
    serviceKey: 'hiorg-server',
    displayName: 'HiOrg-Server',
    status: 'verbunden',
    statusLabel: 'Verbunden',
    circuitBreakerState: 'CLOSED',
    failureCount: 0,
    errorRate: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastTestedAt: null,
    hasCredentials: true,
    isActive: true,
    suggestedAction: null,
    ...overrides,
  };
}

describe('IntegrationStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status-Varianten (AC1: Icon + Text, nicht nur Farbe)', () => {
    it('rendert Status "verbunden" mit korrektem Label', () => {
      // Given: Integration mit Status "verbunden"
      const integration = createMockIntegration({
        status: 'verbunden',
        statusLabel: 'Verbunden',
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Status-Label sichtbar
      expect(screen.getByText('Verbunden')).toBeInTheDocument();
      expect(screen.getByText('HiOrg-Server')).toBeInTheDocument();
    });

    it('rendert Status "unterbrochen" mit korrektem Label', () => {
      // Given: Integration mit Status "unterbrochen"
      const integration = createMockIntegration({
        status: 'unterbrochen',
        statusLabel: 'Unterbrochen',
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Status-Label sichtbar
      expect(screen.getByText('Unterbrochen')).toBeInTheDocument();
    });

    it('rendert Status "erneute_anmeldung_erforderlich" mit korrektem Label', () => {
      // Given: Integration mit Status "erneute_anmeldung_erforderlich"
      const integration = createMockIntegration({
        status: 'erneute_anmeldung_erforderlich',
        statusLabel: 'Erneute Anmeldung erforderlich',
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Status-Label sichtbar
      expect(screen.getByText('Erneute Anmeldung erforderlich')).toBeInTheDocument();
    });

    it('rendert Status "wird_ueberprueft" mit korrektem Label', () => {
      // Given: Integration mit Status "wird_ueberprueft"
      const integration = createMockIntegration({
        status: 'wird_ueberprueft',
        statusLabel: 'Wird überprüft',
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Status-Label sichtbar
      expect(screen.getByText('Wird überprüft')).toBeInTheDocument();
    });

    it('rendert Status "deaktiviert" mit korrektem Label', () => {
      // Given: Integration mit Status "deaktiviert"
      const integration = createMockIntegration({
        status: 'deaktiviert',
        statusLabel: 'Deaktiviert',
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Status-Label sichtbar
      expect(screen.getByText('Deaktiviert')).toBeInTheDocument();
    });

    it('rendert Status "nicht_konfiguriert" mit korrektem Label', () => {
      // Given: Integration mit Status "nicht_konfiguriert"
      const integration = createMockIntegration({
        status: 'nicht_konfiguriert',
        statusLabel: 'Nicht konfiguriert',
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Status-Label sichtbar
      expect(screen.getByText('Nicht konfiguriert')).toBeInTheDocument();
    });
  });

  describe('aria-label (AC3)', () => {
    it('setzt aria-label mit displayName und statusLabel', () => {
      // Given: Basis-Integration
      const integration = createMockIntegration({
        displayName: 'HiOrg-Server',
        statusLabel: 'Verbunden',
        errorRate: 0,
        suggestedAction: null,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: aria-label enthaelt Name und Status
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'HiOrg-Server: Verbunden');
    });

    it('setzt aria-label mit Fehlerrate wenn > 0', () => {
      // Given: Integration mit Fehlerrate
      const integration = createMockIntegration({
        displayName: 'HiOrg-Server',
        statusLabel: 'Unterbrochen',
        errorRate: 15,
        suggestedAction: null,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: aria-label enthaelt Fehlerrate
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'HiOrg-Server: Unterbrochen, Fehlerrate 15%');
    });

    it('setzt aria-label mit empfohlener Aktion wenn vorhanden', () => {
      // Given: Integration mit suggestedAction
      const integration = createMockIntegration({
        displayName: 'HiOrg-Server',
        statusLabel: 'Unterbrochen',
        errorRate: 0,
        suggestedAction: 'Verbindung prüfen' as unknown as object,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: aria-label enthaelt empfohlene Aktion
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'HiOrg-Server: Unterbrochen, Empfohlene Aktion: Verbindung prüfen');
    });

    it('setzt aria-label mit Fehlerrate UND empfohlener Aktion', () => {
      // Given: Integration mit Fehlerrate und suggestedAction
      const integration = createMockIntegration({
        displayName: 'HiOrg-Server',
        statusLabel: 'Unterbrochen',
        errorRate: 25,
        suggestedAction: 'Erneut verbinden' as unknown as object,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: aria-label enthaelt beides
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'HiOrg-Server: Unterbrochen, Fehlerrate 25%, Empfohlene Aktion: Erneut verbinden');
    });
  });

  describe('suggestedAction Button', () => {
    it('zeigt keinen Button wenn suggestedAction null ist', () => {
      // Given: Integration ohne suggestedAction
      const integration = createMockIntegration({ suggestedAction: null });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Kein Button sichtbar
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('zeigt Button wenn suggestedAction vorhanden ist', () => {
      // Given: Integration mit suggestedAction
      const integration = createMockIntegration({
        suggestedAction: 'Verbindung prüfen' as unknown as object,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Button mit Action-Text sichtbar
      expect(screen.getByRole('button', { name: /Verbindung prüfen/i })).toBeInTheDocument();
    });

    it('feuert onAction mit serviceKey bei Klick', async () => {
      // Given: Integration mit suggestedAction und onAction-Handler
      const user = userEvent.setup();
      const onAction = vi.fn();
      const integration = createMockIntegration({
        serviceKey: 'hiorg-server',
        suggestedAction: 'Verbindung prüfen' as unknown as object,
      });

      // When: Button geklickt
      render(<IntegrationStatusCard integration={integration} onAction={onAction} />);
      await user.click(screen.getByRole('button', { name: /Verbindung prüfen/i }));

      // Then: onAction mit serviceKey aufgerufen
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith('hiorg-server');
    });

    it('wirft keinen Fehler wenn onAction nicht definiert ist', async () => {
      // Given: Integration mit suggestedAction aber ohne onAction-Handler
      const user = userEvent.setup();
      const integration = createMockIntegration({
        suggestedAction: 'Verbindung prüfen' as unknown as object,
      });

      // When: Button geklickt (kein onAction prop)
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Kein Fehler
      await expect(user.click(screen.getByRole('button', { name: /Verbindung prüfen/i }))).resolves.not.toThrow();
    });
  });

  describe('Fehlerrate und Fehleranzahl', () => {
    it('zeigt Fehlerrate wenn > 0', () => {
      // Given: Integration mit Fehlerrate
      const integration = createMockIntegration({ errorRate: 12 });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Fehlerrate sichtbar
      expect(screen.getByText('Fehlerrate')).toBeInTheDocument();
      expect(screen.getByText('12%')).toBeInTheDocument();
    });

    it('zeigt keine Fehlerrate wenn 0', () => {
      // Given: Integration ohne Fehlerrate
      const integration = createMockIntegration({ errorRate: 0 });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Fehlerrate nicht sichtbar
      expect(screen.queryByText('Fehlerrate')).not.toBeInTheDocument();
    });

    it('zeigt Fehleranzahl wenn > 0', () => {
      // Given: Integration mit Fehleranzahl
      const integration = createMockIntegration({ failureCount: 5 });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Fehleranzahl sichtbar
      expect(screen.getByText('Fehler')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('zeigt keine Fehleranzahl wenn 0', () => {
      // Given: Integration ohne Fehler
      const integration = createMockIntegration({ failureCount: 0 });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Fehleranzahl nicht sichtbar
      expect(screen.queryByText('Fehler')).not.toBeInTheDocument();
    });
  });

  describe('Letzte Aktivitaet', () => {
    it('zeigt letzte Aktivitaet basierend auf lastSuccessAt', () => {
      // Given: Integration mit kuerzlichem Erfolg
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const integration = createMockIntegration({
        lastSuccessAt: fiveMinutesAgo as unknown as object,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Letzte Aktivitaet sichtbar
      expect(screen.getByText('Letzte Aktivität')).toBeInTheDocument();
      expect(screen.getByText('vor 5 Min.')).toBeInTheDocument();
    });

    it('zeigt letzte Aktivitaet basierend auf lastFailureAt wenn lastSuccessAt null', () => {
      // Given: Integration mit kuerzlichem Fehler, aber ohne Erfolg
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const integration = createMockIntegration({
        lastSuccessAt: null,
        lastFailureAt: tenMinutesAgo as unknown as object,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Letzte Aktivitaet basierend auf Fehler sichtbar
      expect(screen.getByText('Letzte Aktivität')).toBeInTheDocument();
      expect(screen.getByText('vor 10 Min.')).toBeInTheDocument();
    });

    it('zeigt keine letzte Aktivitaet wenn beide Timestamps null', () => {
      // Given: Integration ohne Aktivitaet
      const integration = createMockIntegration({
        lastSuccessAt: null,
        lastFailureAt: null,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: Letzte Aktivitaet nicht sichtbar
      expect(screen.queryByText('Letzte Aktivität')).not.toBeInTheDocument();
    });

    it('zeigt "gerade eben" fuer sehr kuerzliche Aktivitaet', () => {
      // Given: Integration mit Aktivitaet vor wenigen Sekunden
      const justNow = new Date(Date.now() - 5 * 1000).toISOString();
      const integration = createMockIntegration({
        lastSuccessAt: justNow as unknown as object,
      });

      // When: Karte gerendert
      render(<IntegrationStatusCard integration={integration} />);

      // Then: "gerade eben" angezeigt
      expect(screen.getByText('gerade eben')).toBeInTheDocument();
    });
  });
});
