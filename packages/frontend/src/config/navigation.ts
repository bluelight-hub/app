import { IconType } from 'react-icons';
import {
    PiAmbulance,
    PiBell,
    PiBookOpen,
    PiChartPie,
    PiChecks,
    PiCheckSquareBold,
    PiClipboardBold,
    PiClipboardText,
    PiClock,
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
    PiWrench
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
        path: '/app',
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
                path: '/app/einsatztagebuch',
                label: 'Einsatztagebuch',
                icon: PiNotebook,
            },
            {
                type: 'item',
                key: '/app/checklisten',
                path: '/app/checklisten',
                label: 'Checklisten',
                icon: PiCheckSquareBold,
            },
            {
                type: 'item',
                key: '/app/reminders',
                path: '/app/reminders',
                label: 'Wecker & Erinnerungen',
                icon: PiBell,
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
                        path: '/app/kräfte',
                        label: 'Kräfteübersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/fahrzeuge',
                        path: '/app/fahrzeuge',
                        label: 'Fahrzeuge',
                        icon: PiAmbulance,
                    },
                    {
                        type: 'item',
                        key: '/app/einsatzkräfte',
                        path: '/app/einsatzkräfte',
                        label: 'Einsatzkräfte',
                        icon: PiUserFocus,
                    },
                    {
                        type: 'item',
                        key: '/app/rollen',
                        path: '/app/rollen',
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
                        path: '/app/betroffene',
                        label: 'Betroffenenübersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/betroffene/aufnehmen',
                        path: '/app/betroffene/aufnehmen',
                        label: 'Aufnehmen',
                        icon: PiPlus,
                    },
                    {
                        type: 'item',
                        key: '/app/betroffene/verwalten',
                        path: '/app/betroffene/verwalten',
                        label: 'Verwalten',
                        icon: PiUsers,
                    },
                    {
                        type: 'item',
                        key: '/app/betroffene/manv',
                        path: '/app/betroffene/manv',
                        label: 'MANV',
                        icon: PiAmbulance,
                    },
                ],
            },
            {
                type: 'item',
                key: '/app/anforderungen',
                label: 'Anforderungen',
                icon: PiClipboardText,
                path: '/app/anforderungen',
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
                        path: '/app/lagekarte',
                        label: 'Übersicht Lagekarte',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/lagekarte/letzte-eintraege',
                        path: '/app/lagekarte/letzte-eintraege',
                        label: 'Letzte Einträge',
                        icon: PiClock,
                    },
                    {
                        type: 'item',
                        key: '/app/lagekarte/dwd-wetterkarte',
                        path: '/app/lagekarte/dwd-wetterkarte',
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
                        path: '/app/uav',
                        label: 'UAV Übersicht',
                        icon: PiSquaresFour,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/flugaufträge',
                        path: '/app/uav/flugaufträge',
                        label: 'Flugaufträge',
                        icon: PiDrone,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/flugzonen',
                        path: '/app/uav/flugzonen',
                        label: 'Flugzonen',
                        icon: PiMapPinLineBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/routen',
                        path: '/app/uav/routen',
                        label: 'Flugrouten',
                        icon: PiNavigationArrowBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/wetter',
                        path: '/app/uav/wetter',
                        label: 'Wetter',
                        icon: PiSunDimBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/stream',
                        path: '/app/uav/stream',
                        label: 'Live-Stream',
                        icon: PiVideoCameraBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/telemetrie',
                        path: '/app/uav/telemetrie',
                        label: 'Telemetrie',
                        icon: PiGaugeBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/protokoll',
                        path: '/app/uav/protokoll',
                        label: 'Flugprotokoll',
                        icon: PiClipboardBold,
                    },
                    {
                        type: 'item',
                        key: '/app/uav/bericht',
                        path: '/app/uav/bericht',
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
                path: '/app/kanalliste',
                label: 'Kanallisten',
                icon: PiList
            },
            {
                type: 'item',
                key: '/app/kommunikationsverzeichnis',
                path: '/app/kommunikationsverzeichnis',
                label: 'Kommunikationsverzeichnis',
                icon: PiBookOpen
            },
            {
                type: 'item',
                key: '/app/fms',
                path: '/app/fms',
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
                path: '/app/einsatzdaten',
                label: 'Einsatzdaten',
                icon: PiInfo,
            },
            {
                type: 'item',
                key: '/app/einsatzabschnitte',
                path: '/app/einsatzabschnitte',
                label: 'Einsatzabschnitte',
                icon: PiChartPie,
            },
            {
                type: 'item',
                key: '/app/schaden',
                label: 'Schäden',
                icon: PiWrench,
                path: '/app/schaden',
            },
            {
                type: 'item',
                key: '/app/gefahren',
                path: '/app/gefahren',
                label: 'Gefahren',
                icon: PiWarningDiamond,
            },
        ],
    },
    {
        type: 'item',
        key: '/app/notizen',
        path: '/app/notizen',
        label: 'Notizen',
        icon: PiChecks,
    },
];

// TODO: [FEATURE] Workspaces - vielleicht unnötig?
export const workspaces: NavigationItem[] = [
    {
        type: 'group',
        key: 'workspaces',
        label: 'Workspaces',
        children: [
        ]
    },
];

/**
 * Findet den Titel für die aktuelle Route in der Navigation
 * @param pathname Der aktuelle Pfad aus dem Router
 * @returns Den gefundenen Titel oder 'Dashboard' als Fallback
 */
export const findRouteTitle = (pathname: string): string => {
    const findInItems = (items: NavigationItem[]): string => {
        for (const item of items) {
            if (item.key === pathname) {
                return item.label;
            }
            if ('children' in item && item.children) {
                const found = findInItems(item.children);
                if (found) return found;
            }
        }
        return '';
    };

    return findInItems(mainNavigation) || 'Dashboard';
};
