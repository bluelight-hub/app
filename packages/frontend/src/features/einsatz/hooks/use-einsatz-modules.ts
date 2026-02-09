import type { ModuleColor } from '@/shared/ui/organisms/command-palette';
import {
  PiAirplaneTilt,
  PiCamera,
  PiChartBar,
  PiClipboard,
  PiCoffee,
  PiFileText,
  PiFirstAid,
  PiHouse,
  PiMapTrifold,
  PiMegaphone,
  PiMetronome,
  PiNotepad,
  PiPackage,
  PiPhone,
  PiRadio,
  PiShieldWarning,
  PiSprayBottle,
  PiSquaresFour,
  PiTruck,
  PiUserCheck,
  PiUsers,
  PiWarning,
} from 'react-icons/pi';

interface SubPage {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

export interface Module {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  color: ModuleColor;
  subPages: SubPage[];
}

export function useEinsatzModules(): Module[] {
  // todo Diese Konfiguration könnte später aus einer API oder Config-File kommen
  return [
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
          name: 'Cockpit',
          href: '/app/einsatz/$einsatzId/führung/cockpit',
          icon: PiSquaresFour,
          description: 'Erinnerungen & Notizen',
        },
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
        {
          name: 'Führungsrhythmus',
          href: '/app/einsatz/$einsatzId/führung/rhythmus',
          icon: PiMetronome,
          description: 'Wiederkehrende Erinnerungen',
        },
        {
          name: 'Notizen',
          href: '/app/einsatz/$einsatzId/führung/notizen',
          icon: PiNotepad,
          description: 'Einsatznotizen',
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
          name: 'Dashboard',
          href: '/app/einsatz/$einsatzId/kräfte/dashboard',
          icon: PiChartBar,
          description: 'Kräfte-Übersicht',
        },
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
}
