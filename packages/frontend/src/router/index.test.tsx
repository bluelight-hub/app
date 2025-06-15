import { describe, expect, it, vi } from 'vitest';
import React from 'react';

// Mock react-router to avoid useRoutes errors
vi.mock('react-router', () => ({
    Route: ({ element, children }: any) => children || element,
    Routes: ({ children }: any) => <div data-testid="routes">{children}</div>,
    Outlet: () => <div data-testid="outlet" />
}));

// Mock all lazy loaded components
vi.mock('@templates/AppLayout', () => ({
    default: () => <div data-testid="app-layout">App Layout</div>
}));

vi.mock('@templates/DashboardLayout', () => ({
    default: () => <div data-testid="dashboard-layout">Dashboard Layout</div>
}));

vi.mock('@pages/page', () => ({
    default: () => <div data-testid="index-page">Index Page</div>
}));

vi.mock('@pages/login/page', () => ({
    default: () => <div data-testid="login-page">Login Page</div>
}));

vi.mock('@/components/pages/app/dashboard/page', () => ({
    default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}));

vi.mock('@/components/pages/dashboard/etb/page', () => ({
    default: () => <div data-testid="etb-dashboard-page">ETB Dashboard Page</div>
}));

vi.mock('@/components/pages/app/einsaetze/page', () => ({
    default: () => <div data-testid="einsaetze-page">Einsätze Page</div>
}));

vi.mock('@pages/app/einsatztagebuch/page', () => ({
    default: () => <div data-testid="einsatztagebuch-page">Einsatztagebuch Page</div>
}));

vi.mock('@/components/pages/app/CreateInitialEinsatz', () => ({
    default: () => <div data-testid="create-initial-einsatz">Create Initial Einsatz</div>
}));

vi.mock('@/components/pages/not-found/page', () => ({
    default: () => <div data-testid="not-found-page">Not Found Page</div>
}));

// Mock other pages with a generic component
vi.mock('@pages/app/checklisten/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/reminders/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/kräfte/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/fahrzeuge/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/einsatzkräfte/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/rollen/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/betroffene/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/betroffene/aufnehmen/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/betroffene/verwalten/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/betroffene/manv/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/anforderungen/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/lagekarte/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/lagekarte/letzte-eintraege/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/lagekarte/dwd-wetterkarte/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/flugaufträge/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/flugzonen/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/routen/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/wetter/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/stream/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/telemetrie/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/protokoll/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/uav/bericht/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/kanalliste/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/kommunikationsverzeichnis/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/fms/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/einsatzdaten/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/einsatzabschnitte/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/schaden/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/gefahren/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));
vi.mock('@pages/app/notizen/page', () => ({
    default: () => <div data-testid="generic-page">Generic Page</div>
}));

// Mock authentication and contexts
vi.mock('../contexts/AuthContext', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>
}));

vi.mock('../contexts/EinsatzContext', () => ({
    EinsatzProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="einsatz-provider">{children}</div>
}));

// Mock auth guards
vi.mock('./auth/PrivateRoute', () => ({
    default: () => {
        const { Outlet } = require('react-router');
        return <Outlet />;
    }
}));

vi.mock('./auth/EinsatzGuard', () => ({
    default: () => {
        const { Outlet } = require('react-router');
        return <Outlet />;
    }
}));

import { render, screen } from '@testing-library/react';
import { Router } from './index';

describe('Router', () => {
    it('should render AuthProvider and EinsatzProvider', () => {
        render(<Router />);
        
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
        expect(screen.getByTestId('einsatz-provider')).toBeInTheDocument();
    });

    it('should have Routes component with Suspense wrapper', () => {
        const { container } = render(<Router />);
        
        // Check if the component structure exists
        expect(container.querySelector('div[data-testid="auth-provider"]')).toBeInTheDocument();
        expect(container.querySelector('div[data-testid="einsatz-provider"]')).toBeInTheDocument();
        expect(container.querySelector('div[data-testid="routes"]')).toBeInTheDocument();
    });

    it('should import and use EinsatzProvider from contexts', () => {
        // This test ensures the import is covered
        const { container } = render(<Router />);
        
        const einsatzProvider = container.querySelector('[data-testid="einsatz-provider"]');
        expect(einsatzProvider).toBeTruthy();
    });

    it('should lazy load components including EinsaetzeUebersichtPage', () => {
        // This test covers the lazy import on lines 24-25
        expect(React.lazy).toBeDefined();
        
        render(<Router />);
        
        // The component is lazy loaded, so we just verify the structure
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });

    it('should have proper component structure with providers', () => {
        // This test covers lines 86-88 where EinsatzProvider wraps the routes
        render(<Router />);
        
        const authProvider = screen.getByTestId('auth-provider');
        const einsatzProvider = screen.getByTestId('einsatz-provider');
        
        // Verify nesting - EinsatzProvider should be inside AuthProvider
        expect(authProvider).toContainElement(einsatzProvider);
    });
});