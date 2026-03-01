/**
 * Filter-Preset Store fuer Erinnerungen
 *
 * Verwaltet gespeicherte Filter-Kombinationen (Presets) mit TanStack Store.
 * Presets werden in localStorage persistiert (rein client-side).
 *
 * **Story 8.9 Task 1:**
 * - FilterPresetType: id, name, teamFilter, kategorieFilter, statusFilter, sortierung
 * - filterPresetStore mit TanStack Store
 * - Actions: addPreset(), removePreset(), applyPreset()
 * - localStorage Persistierung (load on init, save on change)
 * - Hooks: useFilterPresets(), useActivePresetId()
 * - Selektor: isPresetActive()
 */

import { createStore, useStore } from '@tanstack/react-store';

import type { KategorieFilterType } from './kategorie-filter.store';
import { setKategorieFilter, getKategorieFilter } from './kategorie-filter.store';
import type { StatusFilterType } from './status-filter.store';
import { setStatusFilter, getStatusFilter } from './status-filter.store';
import type { TeamFilterType, TeamSortType } from './team-filter.store';
import { setTeamFilter, setTeamSort, getTeamFilter, getTeamSort } from './team-filter.store';

// ============================================
// Types
// ============================================

/**
 * Filter-Preset Type (AC1, AC2, AC4)
 *
 * Speichert eine Kombination aus Team-, Kategorie-, Status-Filter und Sortierung.
 */
export interface FilterPresetType {
  /** Eindeutige Preset-ID */
  id: string;
  /** Benutzerdefinierter Name (z.B. "Meine ueberfaelligen") */
  name: string;
  /** Team-Filter-Einstellung */
  teamFilter: TeamFilterType;
  /** Kategorie-Filter-Einstellung */
  kategorieFilter: KategorieFilterType;
  /** Status-Filter-Einstellung */
  statusFilter: StatusFilterType;
  /** Sortier-Einstellung */
  sortierung: TeamSortType;
}

/**
 * Filter-Preset Store State Interface
 */
export interface FilterPresetStoreState {
  /** Gespeicherte Presets */
  presets: FilterPresetType[];
  /** ID des aktuell aktiven Presets (oder null) */
  activePresetId: string | null;
}

// ============================================
// localStorage Persistierung (AC4)
// ============================================

const STORAGE_KEY = 'bluelight-hub:filter-presets';

/** Validiert TeamFilterType aus localStorage */
function isValidTeamFilter(obj: unknown): obj is TeamFilterType {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as { type?: string; userId?: string };
  if (o.type === 'all' || o.type === 'mine' || o.type === 'unassigned') return true;
  if (o.type === 'user' && typeof o.userId === 'string') return true;
  return false;
}

/** Validiert KategorieFilterType aus localStorage */
function isValidKategorieFilter(obj: unknown): obj is KategorieFilterType {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as { type?: string; kategorieId?: string };
  if (o.type === 'all' || o.type === 'untagged') return true;
  if (o.type === 'kategorie' && typeof o.kategorieId === 'string') return true;
  return false;
}

/** Validiert StatusFilterType aus localStorage */
function isValidStatusFilter(obj: unknown): obj is StatusFilterType {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as { type?: string; status?: string };
  if (o.type === 'all') return true;
  if (o.type === 'status' && typeof o.status === 'string') return true;
  return false;
}

/** Validiert TeamSortType aus localStorage */
function isValidTeamSort(value: unknown): value is TeamSortType {
  return typeof value === 'string' && ['faelligkeit', 'faelligkeit_desc', 'erstellt', 'status', 'titel'].includes(value);
}

function persistToLocalStorage(presets: FilterPresetType[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* Quota-Fehler ignorieren */
  }
}

function loadFromLocalStorage(): FilterPresetType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Validierung: Nur Presets mit allen Pflichtfeldern und gueltigem Tagged-Union-Aufbau uebernehmen
    return parsed.filter(
      (p: unknown): p is FilterPresetType =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as FilterPresetType).id === 'string' &&
        typeof (p as FilterPresetType).name === 'string' &&
        isValidTeamFilter((p as FilterPresetType).teamFilter) &&
        isValidKategorieFilter((p as FilterPresetType).kategorieFilter) &&
        isValidStatusFilter((p as FilterPresetType).statusFilter) &&
        isValidTeamSort((p as FilterPresetType).sortierung),
    );
  } catch {
    return [];
  }
}

// ============================================
// Store Instance
// ============================================

const initialState: FilterPresetStoreState = {
  presets: loadFromLocalStorage(),
  activePresetId: null,
};

/**
 * Filter-Preset Store Instance
 */
export const filterPresetStore = createStore<FilterPresetStoreState>(initialState);

// ============================================
// Store Actions
// ============================================

/**
 * Fuegt ein neues Preset hinzu (AC1)
 *
 * Erstellt ein Preset mit den uebergebenen Filter-Einstellungen und speichert es in localStorage.
 *
 * @param preset - Preset-Daten ohne ID (wird automatisch generiert)
 */
export function addPreset(preset: Omit<FilterPresetType, 'id'>): void {
  const newPreset: FilterPresetType = {
    ...preset,
    id: crypto.randomUUID(),
  };
  filterPresetStore.setState((prev) => {
    const newPresets = [...prev.presets, newPreset];
    persistToLocalStorage(newPresets);
    return {
      ...prev,
      presets: newPresets,
    };
  });
}

/**
 * Entfernt ein Preset (AC3)
 *
 * Loescht das Preset dauerhaft und aktualisiert localStorage.
 * Wenn das entfernte Preset aktiv war, wird activePresetId zurueckgesetzt.
 *
 * @param presetId - ID des zu loeschenden Presets
 */
export function removePreset(presetId: string): void {
  filterPresetStore.setState((prev) => {
    const newPresets = prev.presets.filter((p) => p.id !== presetId);
    persistToLocalStorage(newPresets);
    return {
      ...prev,
      presets: newPresets,
      activePresetId: prev.activePresetId === presetId ? null : prev.activePresetId,
    };
  });
}

/**
 * Aktiviert ein Preset (AC2)
 *
 * Setzt alle Filter-Stores (Team, Kategorie, Status, Sort) auf die Werte des Presets.
 *
 * @param preset - Das zu aktivierende Preset
 */
export function applyPreset(preset: FilterPresetType): void {
  setTeamFilter(preset.teamFilter);
  setKategorieFilter(preset.kategorieFilter);
  setStatusFilter(preset.statusFilter);
  setTeamSort(preset.sortierung);

  filterPresetStore.setState((prev) => ({
    ...prev,
    activePresetId: preset.id,
  }));
}

/**
 * Setzt den kompletten Store zurueck auf Initial-State (leere Presets, kein aktives Preset)
 *
 * **Achtung:** Loescht NICHT die localStorage-Daten, da dies nur fuer Test-Cleanup gedacht ist.
 */
export function resetFilterPresetStore(): void {
  filterPresetStore.setState({
    presets: [],
    activePresetId: null,
  });
}

/**
 * Laedt Presets erneut aus localStorage
 *
 * Nützlich nach App-Neustart oder fuer Re-Initialisierung.
 */
export function reloadPresetsFromStorage(): void {
  const presets = loadFromLocalStorage();
  filterPresetStore.setState((prev) => ({
    ...prev,
    presets,
  }));
}

// ============================================
// Selector Functions (Non-React)
// ============================================

/**
 * Holt alle gespeicherten Presets
 *
 * @returns Array von FilterPresetType
 */
export function getFilterPresets(): FilterPresetType[] {
  return filterPresetStore.state.presets;
}

/**
 * Holt die aktive Preset-ID
 *
 * @returns Aktive Preset-ID oder null
 */
export function getActivePresetId(): string | null {
  return filterPresetStore.state.activePresetId;
}

/**
 * Prueft ob ein Preset den aktuellen Filtern entspricht (AC5)
 *
 * Vergleicht die Filter-Werte des Presets mit den aktuellen Store-Werten.
 *
 * @param preset - Das zu pruefende Preset
 * @returns true wenn alle Filter exakt uebereinstimmen
 */
export function isPresetActive(preset: FilterPresetType): boolean {
  const currentTeam = getTeamFilter();
  const currentKategorie = getKategorieFilter();
  const currentStatus = getStatusFilter();
  const currentSort = getTeamSort();

  // Team-Filter vergleichen
  if (currentTeam.type !== preset.teamFilter.type) return false;
  if (currentTeam.type === 'user' && preset.teamFilter.type === 'user') {
    if (currentTeam.userId !== preset.teamFilter.userId) return false;
  }

  // Kategorie-Filter vergleichen
  if (currentKategorie.type !== preset.kategorieFilter.type) return false;
  if (currentKategorie.type === 'kategorie' && preset.kategorieFilter.type === 'kategorie') {
    if (currentKategorie.kategorieId !== preset.kategorieFilter.kategorieId) return false;
  }

  // Status-Filter vergleichen
  if (currentStatus.type !== preset.statusFilter.type) return false;
  if (currentStatus.type === 'status' && preset.statusFilter.type === 'status') {
    if (currentStatus.status !== preset.statusFilter.status) return false;
  }

  // Sortierung vergleichen
  return currentSort === preset.sortierung;
}

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer alle gespeicherten Presets
 *
 * @returns Array von FilterPresetType
 */
export function useFilterPresets(): FilterPresetType[] {
  return useStore(filterPresetStore, (s) => s.presets);
}

/**
 * Hook fuer die aktive Preset-ID
 *
 * @returns Aktive Preset-ID oder null
 */
export function useActivePresetId(): string | null {
  return useStore(filterPresetStore, (s) => s.activePresetId);
}

/**
 * Hook fuer den kompletten Store State
 *
 * @returns Kompletter Store State
 */
export function useFilterPresetStoreState(): FilterPresetStoreState {
  return useStore(filterPresetStore, (s) => s);
}
