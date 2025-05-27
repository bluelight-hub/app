---
description: ENFORCE spezifische Teststandards für Template-Komponenten
globs: packages/frontend/src/components/templates/**/*.test.tsx
alwaysApply: false
---
# Template Component Tests

## Context
- Gilt für alle Template-Komponenten im Frontend
- Templates definieren das Grundlayout und die Struktur einer Seite
- Folgt den Grundsätzen aus der 300-atomic-design-tests.md

## Requirements

1. **Testdateinamenskonvention**
   - Namensschema: `KomponentenName.test.tsx`
   - Platzierung im gleichen Verzeichnis wie die Komponente (`components/templates/`)

2. **Testart und -umfang**
   - **Struktur- und Layout-Tests** (mindestens 3):
     - Überprüfen des grundlegenden Seitenlayouts
     - Validierung der Grid-Struktur und Responsive-Breakpoints
     - Testen der Slot-Implementierungen für Inhalte
     - Prüfen der Anordnung von Sektionen (Header, Footer, Sidebar, etc.)
   
   - **Rendering-Tests** (mindestens 3):
     - Überprüfen, ob alle erforderlichen Slots/Platzhalter vorhanden sind
     - Testen mit verschiedenen Inhaltstypen für Slots
     - Validierung des konditionalen Renderings von Layoutelementen
   
   - **Integrations-Tests** (mindestens 3):
     - Testen mit tatsächlichen Organismen und Molekülen
     - Überprüfen der Responsive-Designs auf verschiedenen Viewport-Größen
     - Validierung der Navigation zwischen verschiedenen Sektionen
   
   - **Snapshot-Tests** (mindestens 2):
     - Grundlayout mit Standardinhalten
     - Varianten des Layouts (z.B. mit/ohne Sidebar, mit unterschiedlichen Header-Typen)

3. **Mocking**
   - Mocken komplexer Organismen mit einfachen Platzhaltern
   - Mocken von Context/Provider, die für das Layout benötigt werden
   - Klare Trennung zwischen Layout-Tests und Funktionalitätstests

4. **Responsive-Tests**
   - Explizites Testen des Templates in verschiedenen Viewport-Größen
   - Überprüfen der korrekten Anwendung von Media Queries
   - Validieren, dass Layout-Wechsel korrekt funktionieren

5. **Navigation und Routing**
   - Testen der Integration mit dem Routing-System
   - Überprüfen der Navigation zwischen verschiedenen Bereichen
   - Validieren, dass URLs korrekt behandelt werden

6. **Test Coverage**
   - Mindestens 85% Testabdeckung für Template-Komponenten anstreben
   - Testen aller Layout-Varianten und Konfigurationen
   - Überprüfen aller Props und Konfigurationsoptionen

## Examples

<example>
// DashboardTemplate.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DashboardTemplate from './DashboardTemplate';
import { ThemeContext } from '../../context/ThemeContext';

// Mock-Komponenten
vi.mock('../../organisms/Sidebar', () => ({
  default: ({ children }) => <div data-testid="sidebar-mock">{children}</div>
}));

vi.mock('../../organisms/Header', () => ({
  default: (props) => <div data-testid="header-mock">{props.title}</div>
}));

vi.mock('../../organisms/Footer', () => ({
  default: () => <div data-testid="footer-mock">Footer Content</div>
}));

describe('DashboardTemplate', () => {
  const renderWithRouter = (ui, options) => {
    return render(ui, { wrapper: BrowserRouter, ...options });
  };

  // Layout-Tests
  it('should render all major layout sections', () => {
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        sidebarContent={<div>Sidebar Content</div>}
        mainContent={<div data-testid="main-content">Main Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('header-mock')).toBeInTheDocument();
    expect(screen.getByTestId('footer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('should render with the correct grid structure', () => {
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    const template = screen.getByTestId('dashboard-template');
    expect(template).toHaveClass('grid');
    expect(template).toHaveClass('grid-template-dashboard');
  });

  it('should allow for a collapsed sidebar', () => {
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        collapsedSidebar
        data-testid="dashboard-template"
      />
    );
    
    const template = screen.getByTestId('dashboard-template');
    expect(template).toHaveClass('sidebar-collapsed');
  });

  // Rendering-Tests
  it('should render main content correctly', () => {
    const TestContent = () => <div data-testid="test-content">Test Content</div>;
    
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<TestContent />}
        data-testid="dashboard-template"
      />
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toHaveTextContent('Test Content');
  });

  it('should render header with correct title', () => {
    renderWithRouter(
      <DashboardTemplate 
        title="My Dashboard" 
        mainContent={<div>Main Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    expect(screen.getByTestId('header-mock')).toHaveTextContent('My Dashboard');
  });

  it('should render optional secondary content when provided', () => {
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        secondaryContent={<div data-testid="secondary-content">Secondary Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    expect(screen.getByTestId('secondary-content')).toBeInTheDocument();
  });

  // Integration-Tests
  it('should integrate with theme context', () => {
    renderWithRouter(
      <ThemeContext.Provider value={{ theme: 'dark' }}>
        <DashboardTemplate 
          title="Dashboard" 
          mainContent={<div>Main Content</div>}
          data-testid="dashboard-template"
        />
      </ThemeContext.Provider>
    );
    
    const template = screen.getByTestId('dashboard-template');
    expect(template).toHaveClass('theme-dark');
  });

  it('should handle sidebar toggle events', () => {
    const handleSidebarToggle = vi.fn();
    
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        onSidebarToggle={handleSidebarToggle}
        data-testid="dashboard-template"
      />
    );
    
    const toggleButton = screen.getByLabelText('Toggle Sidebar');
    fireEvent.click(toggleButton);
    
    expect(handleSidebarToggle).toHaveBeenCalled();
  });

  it('should adapt layout for mobile viewports', () => {
    // Simuliere einen mobilen Viewport
    global.innerWidth = 480;
    global.dispatchEvent(new Event('resize'));
    
    renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    const template = screen.getByTestId('dashboard-template');
    expect(template).toHaveClass('mobile-layout');
    
    // Reset viewport size
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });

  // Snapshot-Tests
  it('should match snapshot with default layout', () => {
    const { container } = renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with secondary content', () => {
    const { container } = renderWithRouter(
      <DashboardTemplate 
        title="Dashboard" 
        mainContent={<div>Main Content</div>}
        secondaryContent={<div>Secondary Content</div>}
        data-testid="dashboard-template"
      />
    );
    
    expect(container).toMatchSnapshot();
  });
});
</example> 