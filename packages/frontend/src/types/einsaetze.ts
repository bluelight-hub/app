// TypeScript Interfaces für Einsätze-Übersicht

/**
 * Filter-Optionen für die Einsätze-Liste
 */
export interface EinsaetzeFilterOptions {
  /** Suchtext für Name und Beschreibung */
  searchText?: string;
  /** Zeitraum-Filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Archivierte Einsätze anzeigen */
  showArchived?: boolean;
}

/**
 * Sortierung für die Einsätze-Liste
 */
export interface EinsaetzeSortOptions {
  /** Sortier-Feld */
  field: 'name' | 'createdAt' | 'updatedAt';
  /** Sortier-Richtung */
  direction: 'asc' | 'desc';
}

/**
 * Props für die Einsätze-Table Komponente
 */
export interface EinsaetzeTableProps {
  /** Loading-State */
  loading?: boolean;
  /** Filter-Optionen */
  filters?: EinsaetzeFilterOptions;
  /** Sortier-Optionen */
  sort?: EinsaetzeSortOptions;
  /** Callback für Einsatz-Auswahl */
  onEinsatzSelect?: (einsatzId: string) => void;
}

/**
 * Props für das Neue-Einsatz Modal
 */
export interface CreateEinsatzModalProps {
  /** Modal sichtbar */
  visible: boolean;
  /** Modal schließen Callback */
  onClose: () => void;
  /** Loading-State */
  loading?: boolean;
}
