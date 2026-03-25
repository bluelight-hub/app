import { useCurrentUser, useAdminLogout } from '@/features/auth';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { cn } from '@/shared/ui/cn';
import { AdminDashboardLayout } from '@/shared/ui/templates/AdminDashboardLayout';
import { useNavigate } from '@tanstack/react-router';
import { isTauri } from '@tauri-apps/api/core';
import { useCallback, type ReactNode } from 'react';
import {
  PiBell,
  PiCaretRight,
  PiCertificate,
  PiIdentificationBadge,
  PiKey,
  PiMegaphone,
  PiMetronome,
  PiPlugsConnected,
  PiSignOut,
  PiSliders,
  PiTicket,
  PiTruck,
  PiUserList,
  PiUsers,
} from 'react-icons/pi';

/** Navigation-Card für das Admin-Dashboard */
function NavCard({
  icon,
  title,
  description,
  onClick,
  accentColor = 'blue',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accentColor?: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const accentStyles = {
    blue: 'group-hover:bg-status-info-surface group-hover:text-status-info-text',
    emerald: 'group-hover:bg-status-success-surface group-hover:text-status-success-text',
    violet: 'group-hover:bg-action-secondary group-hover:text-text-primary',
    amber: 'group-hover:bg-status-warning-surface group-hover:text-status-warning-text',
  };

  const iconBgStyles = {
    blue: 'bg-status-info-surface text-status-info-text',
    emerald: 'bg-status-success-surface text-status-success-text',
    violet: 'bg-action-secondary text-text-primary',
    amber: 'bg-status-warning-surface text-status-warning-text',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border-subtle bg-surface-panel p-4 text-left transition-all duration-200',
        'hover:border-border-strong hover:bg-action-secondary focus:outline-none focus-visible:shadow-focus-ring',
      )}
    >
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors duration-200', iconBgStyles[accentColor], accentStyles[accentColor])}>{icon}</div>
      <div className="min-w-0 flex-1">
        <Text as="span" className="block font-medium text-text-primary">
          {title}
        </Text>
        <Text as="span" size="sm" color="muted" className="mt-0.5 block truncate">
          {description}
        </Text>
      </div>
      <PiCaretRight className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-text-secondary" />
    </button>
  );
}

/** Sektion-Header für das Admin-Dashboard */
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <Text className="text-lg font-semibold text-text-primary">{title}</Text>
      <Text size="sm" color="muted" className="mt-1">
        {description}
      </Text>
    </div>
  );
}

/** Admin-Dashboard Seite */
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const logoutAdmin = useAdminLogout();

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
        await navigate({ to: '/' });
      }
    } else {
      await navigate({ to: '/' });
    }
  }, [logoutAdmin, navigate]);

  return (
    <AdminDashboardLayout maxWidth="full">
      <div className="mb-2">
        <Heading size="xl" className="mb-1">
          Admin-Dashboard
        </Heading>
        <Text color="muted">
          Willkommen im Admin-Bereich, <span className="font-medium text-text-secondary">{user?.username}</span>
        </Text>
      </div>

      <section>
        <SectionHeader title="Admin-Funktionen" description="Benutzer verwalten, Einstellungen konfigurieren und mehr" />
        <div className="grid gap-4 sm:grid-cols-2">
          <NavCard icon={<PiUsers className="h-6 w-6" />} title="Benutzerverwaltung" description="Benutzerkonten verwalten" onClick={() => navigate({ to: '/admin/users' })} accentColor="blue" />
          <NavCard
            icon={<PiSliders className="h-6 w-6" />}
            title="Secret-Verwaltung"
            description="Interne und externe App-Secrets verwalten"
            onClick={() => navigate({ to: '/admin/runtime-konfiguration' })}
            accentColor="violet"
          />
          <NavCard
            icon={<PiCertificate className="h-6 w-6" />}
            title="Qualifikationen"
            description="Qualifikationen definieren"
            onClick={() => navigate({ to: '/admin/kraefte/qualifikationen' })}
            accentColor="blue"
          />
          <NavCard
            icon={<PiIdentificationBadge className="h-6 w-6" />}
            title="Rollen-Definitionen"
            description="Einsatzrollen konfigurieren"
            onClick={() => navigate({ to: '/admin/kraefte/rollen-definitionen' })}
            accentColor="blue"
          />
          <NavCard
            icon={<PiTruck className="h-6 w-6" />}
            title="Fahrzeugtypen"
            description="Fahrzeugtypen verwalten"
            onClick={() => navigate({ to: '/admin/kraefte/fahrzeugtypen' })}
            accentColor="blue"
          />
          <NavCard icon={<PiTicket className="h-6 w-6" />} title="Invite-Codes" description="Einladungen verwalten" onClick={() => navigate({ to: '/admin/invites' })} accentColor="blue" />
          <NavCard icon={<PiKey className="h-6 w-6" />} title="Access-Tokens" description="API-Zugriff verwalten" onClick={() => navigate({ to: '/admin/tokens' })} accentColor="blue" />
          <NavCard
            icon={<PiBell className="h-6 w-6" />}
            title="Erinnerungen"
            description="Timeouts & globale Einstellungen"
            onClick={() => navigate({ to: '/admin/erinnerungen' })}
            accentColor="blue"
          />
          <NavCard
            icon={<PiMetronome className="h-6 w-6" />}
            title="Führungsrhythmus-Templates"
            description="Globale Templates verwalten"
            onClick={() => navigate({ to: '/admin/fuehrungsrhythmus-templates' })}
            accentColor="blue"
          />
          <NavCard
            icon={<PiMegaphone className="h-6 w-6" />}
            title="Befehlsgeber-Vorschläge"
            description="Vorschläge für Befehlsgeber verwalten"
            onClick={() => navigate({ to: '/admin/befehlsgeber-vorschlaege' })}
            accentColor="amber"
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Stammdaten" description="Fahrzeuge und Personal Ihrer Organisation verwalten" />
        <div className="grid gap-4 sm:grid-cols-2">
          <NavCard
            icon={<PiTruck className="h-6 w-6" />}
            title="Stamm-Fahrzeuge"
            description="Fahrzeugflotte verwalten"
            onClick={() => navigate({ to: '/admin/stammdaten/fahrzeuge' })}
            accentColor="emerald"
          />
          <NavCard
            icon={<PiUserList className="h-6 w-6" />}
            title="Stamm-Personen"
            description="Personal verwalten"
            onClick={() => navigate({ to: '/admin/stammdaten/personen' })}
            accentColor="emerald"
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Integrationen" description="Externe Systeme für den Datenimport verbinden" />
        <div className="grid gap-4 sm:grid-cols-2">
          <NavCard
            icon={<PiPlugsConnected className="h-6 w-6" />}
            title="Integrationsübersicht"
            description="Status aller externen Integrationen"
            onClick={() => navigate({ to: '/admin/integrations/' })}
            accentColor="violet"
          />
          <NavCard
            icon={<PiPlugsConnected className="h-6 w-6" />}
            title="HiOrg-Server"
            description="HiOrg-Server Anbindung"
            onClick={() => navigate({ to: '/admin/integrations/hiorg' })}
            accentColor="violet"
          />
        </div>
      </section>

      <div className="border-t border-border-subtle pt-4">
        <Button appearance="ghost" intent="danger" size="sm" onClick={handleLogout}>
          <PiSignOut className="mr-2" />
          Admin-Bereich verlassen
        </Button>
      </div>
    </AdminDashboardLayout>
  );
}
