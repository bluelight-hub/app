import { api } from '@/api';
import { CommandTrigger } from '@/components/atoms/command-trigger.atom';
import { Container } from '@/components/atoms/container.atom';
import { EinsatzStatusBadge } from '@/components/molecules/einsatz/einsatz-status-badge.molecule';
import { ModuleButton } from '@/components/molecules/einsatz/ModuleButton';
import { ModuleOverviewCard } from '@/components/molecules/einsatz/ModuleOverviewCard';
import { CommandPalette, type ModuleColor } from '@/components/organisms/command-palette';
import { QUERY_KEYS } from '@/queryKeys';
import { cn } from '@/utils/cn';
import { Button } from '@atoms/button.atom';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useMatchRoute, useParams } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useState } from 'react';
import {
  PiAirplaneTilt,
  PiArrowLeft,
  PiCamera,
  PiChartBar,
  PiClipboard,
  PiClock,
  PiCoffee,
  PiFileText,
  PiFirstAid,
  PiGear,
  PiGridFour,
  PiHouse,
  PiMapTrifold,
  PiMegaphone,
  PiPackage,
  PiPhone,
  PiQuestion,
  PiRadio,
  PiShieldWarning,
  PiSiren,
  PiSprayBottle,
  PiTruck,
  PiUserCheck,
  PiUsers,
  PiWarning,
} from 'react-icons/pi';

interface SingleEinsatzLayoutProps {
  className?: string;
}

interface Module {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  color: ModuleColor;
  subPages: SubPage[];
}

interface SubPage {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

export function SingleEinsatzLayout({ className }: SingleEinsatzLayoutProps) {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId' });
  const matchRoute = useMatchRoute();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Lade Einsatzdaten für Header
  const { data: einsatzResponse } = useQuery({
    queryKey: QUERY_KEYS.einsatz.detail(einsatzId),
    queryFn: () => api.einsatz().einsatzControllerFindOneVAlpha({ id: einsatzId }),
  });

  const einsatz = einsatzResponse?.data;

  // Einsatz-Module mit ihren Unterseiten
  const modules: Module[] = [
    {
      id: 'übersicht',
      name: 'Übersicht',
      icon: PiHouse,
      color: 'blue' as ModuleColor,
      description: 'Einsatzübersicht und Status',
      subPages: [
        {
          name: 'Dashboard',
          href: '/app/einsatz/$einsatzId/übersicht',
          icon: PiHouse,
          description: 'Hauptübersicht',
        },
        {
          name: 'Lagekarte',
          href: '/app/einsatz/$einsatzId/übersicht/karte',
          icon: PiMapTrifold,
          description: 'Interaktive Karte',
        },
        {
          name: 'Statistik',
          href: '/app/einsatz/$einsatzId/übersicht/statistik',
          icon: PiChartBar,
          description: 'Live-Auswertungen',
        },
      ],
    },
    {
      id: 'führung',
      name: 'Führung',
      icon: PiClipboard,
      color: 'purple' as ModuleColor,
      description: 'Einsatzleitung und Dokumentation',
      subPages: [
        {
          name: 'ETB',
          href: '/app/einsatz/$einsatzId/führung/etb',
          icon: PiClipboard,
          description: 'Einsatztagebuch',
          badge: 'NEU',
        },
        {
          name: 'Befehle',
          href: '/app/einsatz/$einsatzId/führung/befehle',
          icon: PiFileText,
          description: 'Einsatzbefehle',
        },
        {
          name: 'Protokoll',
          href: '/app/einsatz/$einsatzId/führung/protokoll',
          icon: PiFileText,
          description: 'Führungsprotokoll',
        },
        {
          name: 'Berichte',
          href: '/app/einsatz/$einsatzId/führung/berichte',
          icon: PiFileText,
          description: 'Einsatzberichte',
        },
      ],
    },
    {
      id: 'kommunikation',
      name: 'Kommunikation',
      icon: PiRadio,
      color: 'green' as ModuleColor,
      description: 'Funk und Alarmierung',
      subPages: [
        {
          name: 'Funkverkehr',
          href: '/app/einsatz/$einsatzId/kommunikation/funk',
          icon: PiRadio,
          description: 'Funkprotokoll',
        },
        {
          name: 'Alarmierung',
          href: '/app/einsatz/$einsatzId/kommunikation/alarmierung',
          icon: PiMegaphone,
          description: 'Nachalarmierung',
        },
        {
          name: 'Meldungen',
          href: '/app/einsatz/$einsatzId/kommunikation/meldungen',
          icon: PiPhone,
          description: 'Statusmeldungen',
        },
      ],
    },
    {
      id: 'kräfte',
      name: 'Kräfte',
      icon: PiUsers,
      color: 'orange' as ModuleColor,
      description: 'Personal und Einheiten',
      subPages: [
        {
          name: 'Einheiten',
          href: '/app/einsatz/$einsatzId/kräfte/einheiten',
          icon: PiUsers,
          description: 'Einheitenübersicht',
        },
        {
          name: 'Personal',
          href: '/app/einsatz/$einsatzId/kräfte/personal',
          icon: PiUserCheck,
          description: 'Personalverwaltung',
        },
        {
          name: 'Fahrzeuge',
          href: '/app/einsatz/$einsatzId/kräfte/fahrzeuge',
          icon: PiTruck,
          description: 'Fahrzeugstatus',
        },
      ],
    },
    {
      id: 'sicherheit',
      name: 'Sicherheit',
      icon: PiWarning,
      color: 'red' as ModuleColor,
      description: 'Gefahren und Schutzmaßnahmen',
      subPages: [
        {
          name: 'Gefahren',
          href: '/app/einsatz/$einsatzId/sicherheit/gefahren',
          icon: PiWarning,
          description: 'Gefahren an EST',
        },
        {
          name: 'Eigenschutz',
          href: '/app/einsatz/$einsatzId/sicherheit/eigenschutz',
          icon: PiShieldWarning,
          description: 'Arbeitsschutz',
        },
        {
          name: 'Hygiene',
          href: '/app/einsatz/$einsatzId/sicherheit/hygiene',
          icon: PiSprayBottle,
          description: 'Infektionsschutz',
        },
      ],
    },
    {
      id: 'patienten',
      name: 'Patienten',
      icon: PiFirstAid,
      color: 'emerald' as ModuleColor,
      description: 'Patientenverwaltung und Triage',
      subPages: [
        {
          name: 'Übersicht',
          href: '/app/einsatz/$einsatzId/patienten',
          icon: PiFirstAid,
          description: 'Patientenübersicht',
        },
        {
          name: 'Triage',
          href: '/app/einsatz/$einsatzId/patienten/triage',
          icon: PiFirstAid,
          description: 'Sichtung',
        },
        {
          name: 'Transport',
          href: '/app/einsatz/$einsatzId/patienten/transport',
          icon: PiTruck,
          description: 'Krankentransporte',
        },
      ],
    },
    {
      id: 'betreuung',
      name: 'Betreuung',
      icon: PiCoffee,
      color: 'cyan' as ModuleColor,
      description: 'Verpflegung und Betreuung',
      subPages: [
        {
          name: 'Verpflegung',
          href: '/app/einsatz/$einsatzId/betreuung/verpflegung',
          icon: PiCoffee,
          description: 'Essen & Trinken',
        },
        {
          name: 'Betroffene',
          href: '/app/einsatz/$einsatzId/betreuung/betroffene',
          icon: PiUsers,
          description: 'Betreuung Betroffene',
        },
        {
          name: 'Unterkunft',
          href: '/app/einsatz/$einsatzId/betreuung/unterkunft',
          icon: PiHouse,
          description: 'Notunterkünfte',
        },
      ],
    },
    {
      id: 'logistik',
      name: 'Logistik',
      icon: PiPackage,
      color: 'violet' as ModuleColor,
      description: 'Material und Versorgung',
      subPages: [
        {
          name: 'Material',
          href: '/app/einsatz/$einsatzId/logistik/material',
          icon: PiPackage,
          description: 'Materialverwaltung',
        },
        {
          name: 'Verbrauch',
          href: '/app/einsatz/$einsatzId/logistik/verbrauch',
          icon: PiClipboard,
          description: 'Verbrauchsmaterial',
        },
        {
          name: 'Nachschub',
          href: '/app/einsatz/$einsatzId/logistik/nachschub',
          icon: PiTruck,
          description: 'Nachforderungen',
        },
      ],
    },
    {
      id: 'drohne',
      name: 'Drohne',
      icon: PiAirplaneTilt,
      color: 'secondary' as ModuleColor,
      description: 'Luftaufklärung',
      subPages: [
        {
          name: 'Steuerung',
          href: '/app/einsatz/$einsatzId/drohne/steuerung',
          icon: PiAirplaneTilt,
          description: 'Drohnensteuerung',
        },
        {
          name: 'Luftbilder',
          href: '/app/einsatz/$einsatzId/drohne/luftbilder',
          icon: PiCamera,
          description: 'Aufnahmen',
        },
        {
          name: 'Live-Feed',
          href: '/app/einsatz/$einsatzId/drohne/live-feed',
          icon: PiRadio,
          description: 'Video-Stream',
        },
      ],
    },
  ];

  // Finde das aktuelle Modul basierend auf der URL
  const currentModule =
    modules.find((module) =>
      module.subPages.some((page) => {
        // Nutze TanStack Router's matchRoute für sauberes Matching
        return matchRoute({ to: page.href, fuzzy: true });
      }),
    ) || modules[0];

  const [showModuleOverview, setShowModuleOverview] = useState(false);

  // Calculate duration if einsatz is loaded
  const startTime = einsatz?.alarmierungszeit ? new Date(einsatz.alarmierungszeit) : einsatz?.createdAt ? new Date(einsatz.createdAt) : null;

  const duration = startTime ? formatDistanceToNow(startTime, { locale: de, addSuffix: false }) : null;

  const getModuleColor = (color: ModuleColor) => {
    const colors: Record<ModuleColor, string> = {
      blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50',
      purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 dark:hover:bg-purple-900/50',
      green: 'text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50',
      orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30 dark:hover:bg-orange-900/50',
      red: 'text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50',
      emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50',
      cyan: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50',
      violet: 'text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30 dark:hover:bg-violet-900/50',
      primary: 'text-primary-600 bg-primary-50 hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/30 dark:hover:bg-primary-900/50',
      secondary: 'text-gray-600 bg-gray-50 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 dark:hover:bg-gray-900/50',
    };
    return colors[color] || colors.blue;
  };

  const getModuleActiveColor = (color: ModuleColor) => {
    const colors: Record<ModuleColor, string> = {
      blue: 'text-white bg-blue-600 dark:bg-blue-600',
      purple: 'text-white bg-purple-600 dark:bg-purple-600',
      green: 'text-white bg-green-600 dark:bg-green-600',
      orange: 'text-white bg-orange-600 dark:bg-orange-600',
      red: 'text-white bg-red-600 dark:bg-red-600',
      emerald: 'text-white bg-emerald-600 dark:bg-emerald-600',
      cyan: 'text-white bg-cyan-600 dark:bg-cyan-600',
      violet: 'text-white bg-violet-600 dark:bg-violet-600',
      primary: 'text-white bg-primary-600 dark:bg-primary-600',
      secondary: 'text-white bg-gray-600 dark:bg-gray-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      {/* Module Overview Modal */}
      <ModuleOverviewCard modules={modules} currentModuleId={currentModule.id} einsatzId={einsatzId} open={showModuleOverview} onClose={() => setShowModuleOverview(false)} />

      <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
        {/* Fixed Header */}
        <header className="sticky top-0 z-30 border-gray-200 border-b bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Container maxWidth="full">
            <div className="flex h-16 items-center justify-between px-4">
              {/* Left: Back and Title */}
              <div className="flex items-center gap-4">
                <Link to="/app/einsaetze">
                  <Button appearance="ghost" size="sm">
                    <PiArrowLeft className="mr-2 h-4 w-4" />
                    Übersicht
                  </Button>
                </Link>

                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

                {einsatz && (
                  <div className="flex items-center gap-3">
                    <PiSiren className="h-5 w-5 text-red-500" />
                    <div>
                      <h1 className="font-semibold text-gray-900 text-lg dark:text-gray-100">{einsatz.name}</h1>
                      {einsatz.alarmstichwort && (
                        <p className="text-gray-500 text-xs dark:text-gray-400">
                          {einsatz.alarmstichwort}
                          {einsatz.einsatzort && ` • ${einsatz.einsatzort}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Status and Timer */}
              {einsatz && (
                <div className="flex items-center gap-4">
                  {duration && (
                    <div className="flex items-center gap-2 text-sm">
                      <PiClock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{duration}</span>
                    </div>
                  )}
                  <EinsatzStatusBadge status={einsatz.status} size="sm" />
                </div>
              )}
            </div>
          </Container>
        </header>

        {/* Module Navigation (Horizontal) */}
        <nav className="sticky top-16 z-20 border-gray-200 border-b bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Container maxWidth="full">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Desktop: Alle Module mit Text */}
                <div className="hidden 2xl:flex gap-3 overflow-x-auto">
                  {modules.map((module, index) => {
                    const isActive = module.id === currentModule.id;
                    const hotkey = index < 9 ? `alt+${index + 1}` : undefined;
                    return (
                      <ModuleButton
                        key={module.id}
                        to={module.subPages[0].href}
                        params={{ einsatzId }}
                        hotkey={hotkey}
                        isActive={isActive}
                        colorClasses={isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color)}
                      >
                        <module.icon className="h-4 w-4" />
                        {module.name}
                      </ModuleButton>
                    );
                  })}
                </div>

                {/* Smaller Desktop: Icons + erste 6 wichtigsten, Rest in Dropdown */}
                <div className="hidden lg:flex 2xl:hidden items-center gap-2">
                  {modules.slice(0, 5).map((module, index) => {
                    const isActive = module.id === currentModule.id;
                    const hotkey = index < 5 ? `alt+${index + 1}` : undefined;
                    return (
                      <ModuleButton
                        key={module.id}
                        to={module.subPages[0].href}
                        params={{ einsatzId }}
                        hotkey={hotkey}
                        isActive={isActive}
                        colorClasses={isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color)}
                        className="px-3"
                      >
                        <module.icon className="h-4 w-4" />
                        <span className="hidden md:inline">{module.name}</span>
                      </ModuleButton>
                    );
                  })}
                  {modules.length > 5 && (
                    <div className="relative">
                      <Button
                        appearance="ghost"
                        size="sm"
                        onClick={() => setShowModuleOverview(true)}
                        className={cn('px-3', modules.slice(3).some((m) => m.id === currentModule.id) && 'ring-2 ring-blue-500')}
                      >
                        <PiGridFour className="h-4 w-4" />
                        <span className="ml-2 hidden md:inline">Mehr</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tablet: Icons + erste 3-4 wichtigsten, Rest in Dropdown */}
                <div className="hidden items-center gap-2 sm:flex lg:hidden">
                  {modules.slice(0, 3).map((module, index) => {
                    const isActive = module.id === currentModule.id;
                    const hotkey = index < 3 ? `alt+${index + 1}` : undefined;
                    return (
                      <ModuleButton
                        key={module.id}
                        to={module.subPages[0].href}
                        params={{ einsatzId }}
                        hotkey={hotkey}
                        isActive={isActive}
                        colorClasses={isActive ? getModuleActiveColor(module.color) : getModuleColor(module.color)}
                        className="px-3"
                      >
                        <module.icon className="h-4 w-4" />
                        <span className="hidden md:inline">{module.name}</span>
                      </ModuleButton>
                    );
                  })}
                  {modules.length > 3 && (
                    <div className="relative">
                      <Button
                        appearance="ghost"
                        size="sm"
                        onClick={() => setShowModuleOverview(true)}
                        className={cn('px-3', modules.slice(3).some((m) => m.id === currentModule.id) && 'ring-2 ring-blue-500')}
                      >
                        <PiGridFour className="h-4 w-4" />
                        <span className="ml-2 hidden md:inline">Mehr</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mobile: Nur Icons oder kompakter Dropdown */}
                <div className="flex sm:hidden items-center gap-2 flex-1">
                  {/* Aktives Modul prominent */}
                  <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm', getModuleActiveColor(currentModule.color))}>
                    <currentModule.icon className="h-4 w-4" />
                    <span>{currentModule.name}</span>
                  </div>

                  {/* Module-Wechsler als Dropdown */}
                  <Button appearance="ghost" size="sm" onClick={() => setShowModuleOverview(true)} className="ml-auto">
                    <PiGridFour className="h-5 w-5" />
                  </Button>
                </div>

                {/* Command Palette Trigger */}
                <div className="ml-4">
                  <CommandTrigger onClick={() => setCommandPaletteOpen(true)} />
                </div>
              </div>
              {/* Module Description with Help - nur auf Desktop */}
              <div className="mt-2 hidden lg:flex items-center justify-between">
                <p className="text-gray-500 text-xs dark:text-gray-400">{currentModule.description}</p>
                <Button appearance="ghost" size="sm" className="h-6 w-6 p-0" title="Modulübersicht anzeigen" onClick={() => setShowModuleOverview(true)}>
                  <PiQuestion className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Container>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <Container maxWidth="full">
            <div className="flex gap-6">
              {/* Sidebar with Sub-Pages */}
              <aside className="hidden w-64 flex-shrink-0 pt-6 lg:block">
                <div className="sticky top-36 space-y-1">
                  <h3 className="mb-2 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">{currentModule.name} Navigation</h3>
                  {currentModule.subPages.map((page) => {
                    const isActive = !!matchRoute({ to: page.href });
                    return (
                      <Link
                        key={page.href}
                        to={page.href}
                        params={{ einsatzId }}
                        className={cn(
                          'group flex items-start gap-3 rounded-lg px-3 py-2 transition-colors',
                          isActive ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                        )}
                      >
                        <page.icon
                          className={cn(
                            'mt-0.5 h-5 w-5 flex-shrink-0 transition-colors',
                            isActive ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{page.name}</span>
                            {page.badge && <span className="rounded bg-blue-500 px-1.5 py-0.5 font-semibold text-white text-xs">{page.badge}</span>}
                          </div>
                          {page.description && <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">{page.description}</p>}
                        </div>
                      </Link>
                    );
                  })}

                  {/* Quick Actions */}
                  <div className="mt-6 border-gray-200 border-t pt-6 dark:border-gray-700">
                    <Button appearance="ghost" size="sm" className="mb-2 w-full">
                      <PiGear className="mr-2 h-4 w-4" />
                      Modul-Einstellungen
                    </Button>
                    <Button intent="danger" size="sm" className="w-full">
                      Einsatz beenden
                    </Button>
                  </div>
                </div>
              </aside>

              {/* Mobile Sub-Navigation */}
              <div className="fixed right-0 bottom-0 left-0 z-20 border-gray-200 border-t bg-white p-4 lg:hidden dark:border-gray-700 dark:bg-gray-800">
                <div className="flex gap-2 overflow-x-auto">
                  {currentModule.subPages.map((page) => {
                    const isActive = !!matchRoute({ to: page.href });
                    return (
                      <Link
                        key={page.href}
                        to={page.href}
                        params={{ einsatzId }}
                        className={cn(
                          'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm',
                          isActive ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400',
                        )}
                      >
                        <page.icon className="h-4 w-4" />
                        {page.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="min-w-0 flex-1 py-6 pb-24 lg:pb-6">
                <Outlet />
              </div>
            </div>
          </Container>
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        modules={modules.map((module) => ({
          ...module,
          subPages: module.subPages.map((page) => ({
            ...page,
            badge: page.badge?.toString(), // Convert number to string if needed
          })),
        }))}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}
