import type { WorkspaceModuleDefinition, WorkspaceSubPage, WorkspaceVisibilityRule } from '../types';
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
  PiTruck,
  PiUserCheck,
  PiUsers,
  PiWarning,
} from 'react-icons/pi';

const visible: WorkspaceVisibilityRule = {
  default: 'visible',
};

function createSubPage(index: number, page: Omit<WorkspaceSubPage, 'id' | 'visibility'> & { id?: string }): WorkspaceSubPage {
  return {
    id: page.id ?? `page-${index + 1}`,
    visibility: visible,
    ...page,
  };
}

function createModule(index: number, module: Omit<WorkspaceModuleDefinition, 'priority' | 'visibility' | 'shortcut'>): WorkspaceModuleDefinition {
  const priority = (index + 1) * 10;

  return {
    ...module,
    priority,
    visibility: visible,
    shortcut: {
      modifiers: ['alt'],
      key: String(index + 1),
    },
  };
}

export const EINSATZ_WORKSPACE_MODULES: WorkspaceModuleDefinition[] = [
  createModule(0, {
    id: 'übersicht',
    label: 'Übersicht',
    routeTarget: '/app/einsatz/$einsatzId/übersicht',
    icon: PiHouse,
    color: 'blue',
    description: 'Einsatzübersicht und Status',
    subPages: [
      createSubPage(0, { id: 'dashboard', label: 'Dashboard', href: '/app/einsatz/$einsatzId/übersicht', icon: PiHouse, description: 'Hauptübersicht' }),
      createSubPage(1, { id: 'karte', label: 'Lagekarte', href: '/app/einsatz/$einsatzId/übersicht/karte', icon: PiMapTrifold, description: 'Interaktive Karte' }),
      createSubPage(2, { id: 'statistik', label: 'Statistik', href: '/app/einsatz/$einsatzId/übersicht/statistik', icon: PiChartBar, description: 'Live-Auswertungen' }),
    ],
  }),
  createModule(1, {
    id: 'führung',
    label: 'Führung',
    routeTarget: '/app/einsatz/$einsatzId/führung/etb',
    icon: PiClipboard,
    color: 'purple',
    description: 'Einsatzleitung und Dokumentation',
    badgeHint: {
      kind: 'status',
      label: 'Unquittierte Befehle',
    },
    subPages: [
      createSubPage(0, { id: 'etb', label: 'ETB', href: '/app/einsatz/$einsatzId/führung/etb', icon: PiClipboard, description: 'Einsatztagebuch', badge: 'NEU' }),
      createSubPage(1, { id: 'pinnwand', label: 'Pinnwand', href: '/app/einsatz/$einsatzId/führung/pinnwand', icon: PiNotepad, description: 'Erinnerungen & Notizen' }),
      createSubPage(2, { id: 'befehle', label: 'Befehle', href: '/app/einsatz/$einsatzId/führung/befehle', icon: PiFileText, description: 'Einsatzbefehle' }),
      createSubPage(3, { id: 'rollen', label: 'Rollen', href: '/app/einsatz/$einsatzId/führung/rollen', icon: PiUserCheck, description: 'Rollen im Einsatz' }),
      createSubPage(4, { id: 'protokoll', label: 'Protokoll', href: '/app/einsatz/$einsatzId/führung/protokoll', icon: PiFileText, description: 'Führungsprotokoll' }),
      createSubPage(5, { id: 'berichte', label: 'Berichte', href: '/app/einsatz/$einsatzId/führung/berichte', icon: PiFileText, description: 'Einsatzberichte' }),
      createSubPage(6, { id: 'rhythmus', label: 'Führungsrhythmus', href: '/app/einsatz/$einsatzId/führung/rhythmus', icon: PiMetronome, description: 'Wiederkehrende Erinnerungen' }),
    ],
  }),
  createModule(2, {
    id: 'kommunikation',
    label: 'Kommunikation',
    routeTarget: '/app/einsatz/$einsatzId/kommunikation/funk',
    icon: PiRadio,
    color: 'green',
    description: 'Funk und Alarmierung',
    subPages: [
      createSubPage(0, { id: 'funk', label: 'Funkverkehr', href: '/app/einsatz/$einsatzId/kommunikation/funk', icon: PiRadio, description: 'Funkprotokoll' }),
      createSubPage(1, { id: 'alarmierung', label: 'Alarmierung', href: '/app/einsatz/$einsatzId/kommunikation/alarmierung', icon: PiMegaphone, description: 'Nachalarmierung' }),
      createSubPage(2, { id: 'meldungen', label: 'Meldungen', href: '/app/einsatz/$einsatzId/kommunikation/meldungen', icon: PiPhone, description: 'Statusmeldungen' }),
    ],
  }),
  createModule(3, {
    id: 'kräfte',
    label: 'Kräfte',
    routeTarget: '/app/einsatz/$einsatzId/kräfte/dashboard',
    icon: PiUsers,
    color: 'orange',
    description: 'Personal und Einheiten',
    subPages: [
      createSubPage(0, { id: 'dashboard', label: 'Dashboard', href: '/app/einsatz/$einsatzId/kräfte/dashboard', icon: PiChartBar, description: 'Kräfte-Übersicht' }),
      createSubPage(1, { id: 'einheiten', label: 'Einheiten', href: '/app/einsatz/$einsatzId/kräfte/einheiten', icon: PiUsers, description: 'Einheitenübersicht' }),
      createSubPage(2, { id: 'personal', label: 'Personal', href: '/app/einsatz/$einsatzId/kräfte/personal', icon: PiUserCheck, description: 'Personalverwaltung' }),
      createSubPage(3, { id: 'fahrzeuge', label: 'Fahrzeuge', href: '/app/einsatz/$einsatzId/kräfte/fahrzeuge', icon: PiTruck, description: 'Fahrzeugstatus' }),
    ],
  }),
  createModule(4, {
    id: 'sicherheit',
    label: 'Sicherheit',
    routeTarget: '/app/einsatz/$einsatzId/sicherheit/gefahren',
    icon: PiWarning,
    color: 'red',
    description: 'Gefahren und Schutzmaßnahmen',
    subPages: [
      createSubPage(0, { id: 'gefahren', label: 'Gefahren', href: '/app/einsatz/$einsatzId/sicherheit/gefahren', icon: PiWarning, description: 'Gefahren an EST' }),
      createSubPage(1, { id: 'eigenschutz', label: 'Eigenschutz', href: '/app/einsatz/$einsatzId/sicherheit/eigenschutz', icon: PiShieldWarning, description: 'Arbeitsschutz' }),
      createSubPage(2, { id: 'hygiene', label: 'Hygiene', href: '/app/einsatz/$einsatzId/sicherheit/hygiene', icon: PiSprayBottle, description: 'Infektionsschutz' }),
    ],
  }),
  createModule(5, {
    id: 'patienten',
    label: 'Patienten',
    routeTarget: '/app/einsatz/$einsatzId/patienten',
    icon: PiFirstAid,
    color: 'emerald',
    description: 'Patientenverwaltung und Triage',
    subPages: [
      createSubPage(0, { id: 'übersicht', label: 'Übersicht', href: '/app/einsatz/$einsatzId/patienten', icon: PiFirstAid, description: 'Patientenübersicht' }),
      createSubPage(1, { id: 'triage', label: 'Triage', href: '/app/einsatz/$einsatzId/patienten/triage', icon: PiFirstAid, description: 'Sichtung' }),
      createSubPage(2, { id: 'transport', label: 'Transport', href: '/app/einsatz/$einsatzId/patienten/transport', icon: PiTruck, description: 'Krankentransporte' }),
    ],
  }),
  createModule(6, {
    id: 'betreuung',
    label: 'Betreuung',
    routeTarget: '/app/einsatz/$einsatzId/betreuung/verpflegung',
    icon: PiCoffee,
    color: 'cyan',
    description: 'Verpflegung und Betreuung',
    subPages: [
      createSubPage(0, { id: 'verpflegung', label: 'Verpflegung', href: '/app/einsatz/$einsatzId/betreuung/verpflegung', icon: PiCoffee, description: 'Essen & Trinken' }),
      createSubPage(1, { id: 'betroffene', label: 'Betroffene', href: '/app/einsatz/$einsatzId/betreuung/betroffene', icon: PiUsers, description: 'Betreuung Betroffene' }),
      createSubPage(2, { id: 'unterkunft', label: 'Unterkunft', href: '/app/einsatz/$einsatzId/betreuung/unterkunft', icon: PiHouse, description: 'Notunterkünfte' }),
    ],
  }),
  createModule(7, {
    id: 'logistik',
    label: 'Logistik',
    routeTarget: '/app/einsatz/$einsatzId/logistik/material',
    icon: PiPackage,
    color: 'violet',
    description: 'Material und Versorgung',
    subPages: [
      createSubPage(0, { id: 'material', label: 'Material', href: '/app/einsatz/$einsatzId/logistik/material', icon: PiPackage, description: 'Materialverwaltung' }),
      createSubPage(1, { id: 'verbrauch', label: 'Verbrauch', href: '/app/einsatz/$einsatzId/logistik/verbrauch', icon: PiClipboard, description: 'Verbrauchsmaterial' }),
      createSubPage(2, { id: 'nachschub', label: 'Nachschub', href: '/app/einsatz/$einsatzId/logistik/nachschub', icon: PiTruck, description: 'Nachforderungen' }),
    ],
  }),
  createModule(8, {
    id: 'drohne',
    label: 'Drohne',
    routeTarget: '/app/einsatz/$einsatzId/drohne/steuerung',
    icon: PiAirplaneTilt,
    color: 'secondary',
    description: 'Luftaufklärung',
    subPages: [
      createSubPage(0, { id: 'steuerung', label: 'Steuerung', href: '/app/einsatz/$einsatzId/drohne/steuerung', icon: PiAirplaneTilt, description: 'Drohnensteuerung' }),
      createSubPage(1, { id: 'luftbilder', label: 'Luftbilder', href: '/app/einsatz/$einsatzId/drohne/luftbilder', icon: PiCamera, description: 'Aufnahmen' }),
      createSubPage(2, { id: 'live-feed', label: 'Live-Feed', href: '/app/einsatz/$einsatzId/drohne/live-feed', icon: PiRadio, description: 'Video-Stream' }),
    ],
  }),
];

export function getWorkspacePrimaryRoute(module?: Pick<WorkspaceModuleDefinition, 'routeTarget' | 'subPages'>): string | undefined {
  return module?.routeTarget ?? module?.subPages[0]?.href;
}
