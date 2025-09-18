import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { Button } from '@atoms/button.atom';
import { Card } from '@atoms/card.atom';
import { Heading } from '@atoms/heading.atom';
import { Text } from '@atoms/text.atom';
import { useNavigate } from '@tanstack/react-router';
import { isTauri } from '@tauri-apps/api/core';
import { AdminDashboardLayout } from '@templates/AdminDashboardLayout';
import { useCallback } from 'react';
import { PiSignOut, PiUsers } from 'react-icons/pi';

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
    <AdminDashboardLayout maxWidth="lg">
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

          <Button intent="primary" size="md" onClick={handleNavigateToUsers} fullWidth className="max-w-sm">
            <PiUsers className="mr-2" />
            Benutzerverwaltung
          </Button>
        </div>
      </Card>

      {/* Logout Section */}
      <div>
        <Button appearance="ghost" intent="danger" size="sm" onClick={handleLogout}>
          <PiSignOut className="mr-2" />
          Admin-Bereich verlassen
        </Button>
      </div>
    </AdminDashboardLayout>
  );
}
