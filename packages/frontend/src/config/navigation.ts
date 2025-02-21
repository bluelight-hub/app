import { IconType } from 'react-icons';
import {
    PiAmbulance,
    PiBookOpen,
    PiChartPie,
    PiChecks,
    PiClipboardBold,
    PiClipboardText,
    PiClock,
    PiClockClockwise,
    PiCloud,
    PiDrone,
    PiFirstAid,
    PiGauge,
    PiGaugeBold,
    PiInfo,
    PiList,
    PiMapPinLineBold,
    PiMapTrifold,
    PiNavigationArrowBold,
    PiNotebook,
    PiNotePencilBold,
    PiPersonSimpleCircle,
    PiPlus,
    PiSquaresFour,
    PiSunDimBold,
    PiUserFocus,
    PiUsers,
    PiVideoCameraBold,
    PiWarningDiamond,
    PiWrench,
} from 'react-icons/pi';

export type NavigationType = 'item' | 'group' | 'submenu';

export interface BaseNavigationItem {
    type: NavigationType;
    key: string;
    label: string;
    icon?: IconType;
}

export interface NavigationItemWithClick extends BaseNavigationItem {
    type: 'item';
    path: string;
}

export interface NavigationGroup extends BaseNavigationItem {
    type: 'group';
    children: (NavigationItemWithClick | NavigationSubmenu)[];
}

export interface NavigationSubmenu extends BaseNavigationItem {
    type: 'submenu';
    children: NavigationItemWithClick[];
}

export type NavigationItem = NavigationItemWithClick | NavigationGroup | NavigationSubmenu;

export const mainNavigation: NavigationItem[] = [
    {
        type: 'item',
        key: '/app',
        path: '#',
        label: 'Dashboard',
        icon: PiGauge,
    },
    {
        type: 'group',
        key: 'einsatz',
        label: 'Einsatz',
        children: [
            {
                type: 'item',
                key: '/app/einsatztagebuch',
                path: '#',
                label: 'Einsatztagebuch',
                icon: PiNotebook,
            },
            {
                type: 'item',
                key: '/app/checklisten',
                path: '#',
                label: 'Checklisten'
            },
            {
                type: 'item',
                key: '/app/reminders',
                path: '#',
                label: 'Wecker & Erinnerungen'
            },
            {
                type: 'submenu',
                key: 'kräfte',
                label: 'Kräfte',
                icon: PiPersonSimpleCircle,
                children: [
                    {
                        type: 'item',
                        key: '/app/kräfte',
                        path: '#',
                        label: 'Kräfteübersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/fahrzeuge',
                        path: '#',
                        label: 'Fahrzeuge',
                        icon: PiAmbulance,
                    },
                    {
                        type: 'item',
                        key: '/app/einsatzkräfte',
                        path: '#',
                        label: 'Einsatzkräfte',
                        icon: PiUserFocus,
                    },
                    {
                        type: 'item',
                        key: '/app/rollen',
                        path: '#',
                        label: 'Rollen',
                        icon: PiUsers,
                    },
                ],
            },
            {
                type: 'submenu',
                key: 'betroffene',
                label: 'Betroffene & Patienten',
                icon: PiFirstAid,
                children: [
                    {
                        type: 'item',
                        key: '/app/betroffene',
                        path: '#',
                        label: 'Betroffenenübersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/betroffene/aufnehmen',
                        path: '#',
                        label: 'Aufnehmen',
                        icon: PiPlus,
                    },
                    {
                        type: 'item',
                        key: '/app/betroffene/verwalten',
                        path: '#',
                        label: 'Verwalten',
                        icon: PiUsers,
                    },
                    {
                        type: 'item',
                        key: '/app/betroffene/manv',
                        path: '#',
                        label: 'MANV',
                        icon: PiAmbulance,
                    },
                ],
            },
            {
                type: 'submenu',
                key: 'anforderungen',
                label: 'Anforderungen',
                icon: PiClipboardText,
                children: [
                    {
                        type: 'item',
                        key: '/app/anforderungen',
                        path: '#',
                        label: 'Anforderungsübersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/anforderungen/neu',
                        path: '#',
                        label: 'Neue Anforderung',
                        icon: PiPlus,
                    },
                    {
                        type: 'item',
                        key: '/app/anforderungen/verlauf',
                        path: '#',
                        label: 'Anforderungsverlauf',
                        icon: PiClockClockwise,
                    },
                ],
            },
        ],
    },
    {
        type: 'group',
        key: 'lageübersicht',
        label: 'Lageübersicht',
        children: [
            {
                type: 'submenu',
                key: 'lagekarte',
                label: 'Lagekarte',
                icon: PiMapTrifold,
                children: [
                    {
                        type: 'item',
                        key: '/app/lagekarte',
                        path: '#',
                        label: 'Übersicht Lagekarte',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/lagekarte/letzte-eintraege',
                        path: '#',
                        label: 'Letzte Einträge',
                        icon: PiClock,
                    },
                    {
                        type: 'item',
                        key: '/app/lagekarte/dwd-wetterkarte',
                        path: '#',
                        label: 'DWD Wetterkarte',
                        icon: PiCloud,
                    },
                ],
            },
            {
                type: 'submenu',
                key: 'uav',
                label: 'UAV',
                icon: PiDrone,
                children: [
                    {
                        type: 'item',
                        key: '/app/uav',
                        path: '#',
                        label: 'UAV Übersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/flugaufträge',
                        path: '#',
                        label: 'Flugaufträge',
                        icon: PiDrone,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/flugzonen',
                        path: '#',
                        label: 'Flugzonen',
                        icon: PiMapPinLineBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/routen',
                        path: '#',
                        label: 'Flugrouten',
                        icon: PiNavigationArrowBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/wetter',
                        path: '#',
                        label: 'Wetter',
                        icon: PiSunDimBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/stream',
                        path: '#',
                        label: 'Live-Stream',
                        icon: PiVideoCameraBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/telemetrie',
                        path: '#',
                        label: 'Telemetrie',
                        icon: PiGaugeBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/protokoll',
                        path: '#',
                        label: 'Flugprotokoll',
                        icon: PiClipboardBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/bericht',
                        path: '#',
                        label: 'Flugbericht',
                        icon: PiNotePencilBold,
                    },
                ],
            },
        ],
    },
    {
        type: 'group',
        key: 'kommunikation-funk',
        label: 'Kommunikation & Funk',
        children: [
            {
                type: 'item',
                key: '/app/kanalliste',
                path: '#',
                label: 'Kanallisten',
                icon: PiList
            },
            {
                type: 'item',
                key: '/app/kommunikationsverzeichnis',
                path: '#',
                label: 'Kommunikationsverzeichnis',
                icon: PiBookOpen
            },
            {
                type: 'item',
                key: '/app/fms',
                path: '#',
                label: 'FMS',
                icon: PiGaugeBold
            }
        ]
    },
    {
        type: 'group',
        key: 'einsatzinformationen',
        label: 'Einsatzinformationen',
        children: [
            {
                type: 'item',
                key: '/app/einsatzdaten',
                path: '#',
                label: 'Einsatzdaten',
                icon: PiInfo,
            },
            {
                type: 'item',
                key: '/app/einsatzabschnitte',
                path: '#',
                label: 'Einsatzabschnitte',
                icon: PiChartPie,
            },
            {
                type: 'submenu',
                key: 'schaden',
                label: 'Schäden',
                icon: PiWrench,
                children: [
                    {
                        type: 'item',
                        key: '/app/schaden',
                        path: '#',
                        label: 'Schadensübersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/schaden/personenschaden',
                        path: '#',
                        label: 'Personenschaden',
                        icon: PiPlus,
                    },
                    {
                        type: 'item',
                        key: '/app/schaden/sachschaden',
                        path: '#',
                        label: 'Sachschaden',
                        icon: PiUsers,
                    },
                ],
            },
            {
                type: 'item',
                key: '/app/gefahren',
                path: '#',
                label: 'Gefahren',
                icon: PiWarningDiamond,
            },
        ],
    },
    {
        type: 'item',
        key: '/app/notizen',
        path: '#',
        label: 'Notizen',
        icon: PiChecks,
    },
];

export const workspaces: NavigationItem[] = [
    {
        type: 'group',
        key: 'workspaces',
        label: 'Workspaces',
        children: [
            { path: '#', label: 'Dashboard', type: 'item', key: 'dashboard' },
            { path: '#', label: 'Lageplan', type: 'item', key: 'lageplan' },
            { path: '#', label: 'UAV', type: 'item', key: 'uav' },
        ]
    },
];
