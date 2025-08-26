import { useNavigate } from '@tanstack/react-router';
import { isTauri } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { PiSignOut, PiUsers } from 'react-icons/pi';
import { Button } from '@/components/atoms/button.atom';
import { Card } from '@/components/atoms/card.atom';
import { Heading } from '@/components/atoms/heading.atom';
import { Text } from '@/components/atoms/text.atom';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

/**
 * Admin-Dashboard Seite
 *
 * Zentrale Verwaltungsseite für Administratoren mit Zugriff auf
 * Benutzerverwaltung und andere administrative Funktionen.
 * Nutzt das DashboardLayout für konsistente Darstellung.
 */
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logoutAdmin } = useAuth();

  const handleLogout = useCallback(async () => {
    await logoutAdmin.mutateAsync();

    // In Tauri: Fenster schließen
    if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.close();
      } catch (error) {
        logger.error('Fehler beim Schließen des Admin-Fensters:', error);
        // Fallback: zur Startseite navigieren
        await navigate({ to: '/' });
      }
    } else {
      // Im Browser: zur Startseite navigieren
      await navigate({ to: '/' });
    }
  }, [logoutAdmin, navigate]);

  const handleNavigateToUsers = useCallback(async () => {
    await navigate({ to: '/admin/users' });
  }, [navigate]);

  return (
    <DashboardLayout maxWidth="lg">
      {/* Dashboard Header */}
      <div>
        <Heading size="xl" className="mb-2">
          Admin-Dashboard
        </Heading>
        <Text color="muted">Willkommen im Admin-Bereich, {user?.username}</Text>
      </div>

      {/* Admin Functions Card */}
      <Card padding="md">
        <div className="flex flex-col items-start gap-4">
          <div>
            <Text className="font-semibold text-lg">Admin-Funktionen</Text>
            <Text size="sm" color="muted" className="mt-1">
              Hier können Sie Benutzer verwalten, Einstellungen konfigurieren und mehr.
            </Text>
          </div>

          <Button variant="primary" size="md" onClick={handleNavigateToUsers} fullWidth className="max-w-sm">
            <PiUsers className="mr-2" />
            Benutzerverwaltung
          </Button>
        </div>
      </Card>

      {/* Logout Section */}
      <div>
        <Button variant="danger" size="sm" onClick={handleLogout} className="border border-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20">
          <PiSignOut className="mr-2" />
          Admin-Bereich verlassen
        </Button>
      </div>
    </DashboardLayout>
  );
}
