export type EigenschutzShortcutContext = 'dashboard' | 'gefaehrdungen' | 'vorfaelle' | 'risk-matrix' | 'psa-profile' | 'drawer';
export type EigenschutzShortcutGroup = 'global' | 'contextual';

export interface EigenschutzShortcutDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly keys: string;
  readonly displayKeys?: ReadonlyArray<string>;
  readonly group: EigenschutzShortcutGroup;
  readonly contexts: ReadonlyArray<EigenschutzShortcutContext | 'all'>;
  readonly delegatedTo?: string;
}

export const EIGENSCHUTZ_SHORTCUTS = [
  {
    id: 'command-palette',
    label: 'Befehle und Navigation',
    description: 'Bestehende Command Palette öffnen',
    keys: 'mod+k',
    group: 'global',
    contexts: ['all'],
    delegatedTo: 'shared-command-palette',
  },
  {
    id: 'shortcut-help',
    label: 'Tastaturhilfe',
    description: 'Shortcut-Hilfe für den aktuellen Eigenschutz-Kontext öffnen',
    keys: '?',
    group: 'global',
    contexts: ['all'],
  },
  {
    id: 'focus-filter',
    label: 'Filter fokussieren',
    description: 'Primären Filter oder die Suche fokussieren',
    keys: '/',
    group: 'contextual',
    contexts: ['vorfaelle'],
  },
  {
    id: 'new-gefaehrdung',
    label: 'Neue Gefährdungsbeurteilung',
    description: 'Bestehenden Drawer zum Anlegen öffnen',
    keys: 'n',
    group: 'contextual',
    contexts: ['gefaehrdungen'],
  },
  {
    id: 'new-vorfall',
    label: 'Vorfall melden',
    description: 'Bestehenden Melde-Drawer öffnen',
    keys: 'v',
    group: 'contextual',
    contexts: ['vorfaelle'],
  },
  {
    id: 'close-overlay',
    label: 'Schließen',
    description: 'Oberste Hilfe-Fläche, Dialoge oder Drawer schließen',
    keys: 'escape',
    group: 'global',
    contexts: ['all'],
  },
  {
    id: 'matrix-move',
    label: 'Risikomatrix bewegen',
    description: 'Zellen in der 5×5-Matrix wechseln',
    keys: 'arrowup+arrowdown+arrowleft+arrowright',
    displayKeys: ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'],
    group: 'contextual',
    contexts: ['risk-matrix'],
  },
  {
    id: 'matrix-confirm',
    label: 'Matrixwert wählen',
    description: 'Fokussierte Risikomatrix-Zelle bestätigen',
    keys: 'enter',
    group: 'contextual',
    contexts: ['risk-matrix'],
  },
  {
    id: 'psa-toggle',
    label: 'PSA-Profil umschalten',
    description: 'Fokussierten PSA-Chip aktivieren oder deaktivieren',
    keys: 'space',
    group: 'contextual',
    contexts: ['psa-profile'],
  },
] as const satisfies ReadonlyArray<EigenschutzShortcutDefinition>;

export const EIGENSCHUTZ_SHORTCUT_CONFLICT_MATRIX = [
  {
    owner: 'CommandPalette',
    decision: 'mod+k bleibt im bestehenden Shell-Hook useCommandPaletteKeyboard und wird im Eigenschutz nur angezeigt.',
  },
  {
    owner: 'SingleEinsatzLayout',
    decision: 'Workspace-Modul-Hotkeys und Overlay-Blocking bleiben in der Shell.',
  },
  {
    owner: 'VorfaellePage',
    decision: 'Der lokale /-Listener wird durch useEigenschutzShortcuts ersetzt.',
  },
  {
    owner: 'RiskMatrix5x5 und PSAProfileChip',
    decision: 'Roving-Tabindex, Enter und Space bleiben komponentennah.',
  },
] as const;

export function getEigenschutzShortcutsForContext(context: EigenschutzShortcutContext): ReadonlyArray<EigenschutzShortcutDefinition> {
  return EIGENSCHUTZ_SHORTCUTS.filter((shortcut) => shortcut.contexts.includes('all') || shortcut.contexts.includes(context));
}
