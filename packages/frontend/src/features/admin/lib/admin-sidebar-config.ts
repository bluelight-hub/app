import type { SidebarGroup } from '@/shared/ui/organisms/sidebar.organism';
import { PiArrowsLeftRight, PiBell, PiCar, PiCertificate, PiChartBar, PiEnvelope, PiGear, PiKey, PiListChecks, PiMegaphone, PiPlugs, PiShapes, PiShieldCheck, PiTruck, PiUsers } from 'react-icons/pi';

/** Sidebar-Navigationsstruktur für den Admin-Bereich. */
export const adminSidebarItems: SidebarGroup[] = [
  {
    entries: [{ label: 'Dashboard', to: '/admin/dashboard', icon: PiChartBar }],
  },
  {
    group: 'Kräfte',
    entries: [
      { label: 'Qualifikationen', to: '/admin/kraefte/qualifikationen', icon: PiCertificate },
      { label: 'Rollen', to: '/admin/kraefte/rollen-definitionen', icon: PiShieldCheck },
      { label: 'Fahrzeugtypen', to: '/admin/kraefte/fahrzeugtypen', icon: PiTruck },
      { label: 'Default-Zeichen', to: '/admin/kraefte/default-zeichen', icon: PiShapes },
    ],
  },
  {
    group: 'Stammdaten',
    entries: [
      { label: 'Fahrzeuge', to: '/admin/stammdaten/fahrzeuge', icon: PiCar },
      { label: 'Personen', to: '/admin/stammdaten/personen', icon: PiUsers },
    ],
  },
  {
    group: 'Benutzer & Zugang',
    entries: [
      { label: 'Benutzer', to: '/admin/users', icon: PiUsers },
      { label: 'Einladungen', to: '/admin/invites', icon: PiEnvelope },
      { label: 'API-Tokens', to: '/admin/tokens', icon: PiKey },
    ],
  },
  {
    group: 'Konfiguration',
    entries: [
      { label: 'Laufzeit-Konfiguration', to: '/admin/runtime-konfiguration', icon: PiGear },
      { label: 'Erinnerungen', to: '/admin/erinnerungen', icon: PiBell },
      { label: 'Führungsrhythmus', to: '/admin/fuehrungsrhythmus-templates', icon: PiListChecks },
      { label: 'Befehlsgeber-Vorschläge', to: '/admin/befehlsgeber-vorschlaege', icon: PiMegaphone },
    ],
  },
  {
    group: 'Integrationen',
    entries: [
      { label: 'Übersicht', to: '/admin/integrations/', icon: PiPlugs },
      { label: 'HiOrg', to: '/admin/integrations/hiorg', icon: PiArrowsLeftRight },
    ],
  },
];
