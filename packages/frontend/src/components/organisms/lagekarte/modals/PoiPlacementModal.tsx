import { Button } from '@/components/atoms/button.atom';
import { Input } from '@/components/atoms/input.atom';
import { Spinner } from '@/components/atoms/spinner.atom';
import { formatPoiTypeLabel } from '@/utils/formatPoiTypeLabel';
import { POI_ICON_MAP, type PoiType } from '@/utils/poi-icons';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type React from 'react';
import { PiX } from 'react-icons/pi';
import { usePoiForm } from './usePoiForm';

/**
 * Props für PoiPlacementModal
 */
export interface PoiPlacementModalProps {
  /**
   * Ob Modal geöffnet ist
   */
  isOpen: boolean;

  /**
   * Callback zum Schließen des Modals
   */
  onClose: () => void;

  /**
   * POI-Typ der platziert werden soll (aus Toolbar)
   */
  poiType: PoiType;

  /**
   * Koordinaten vom Karten-Klick
   */
  coordinates: {
    lat: number;
    lon: number;
  };

  /**
   * EinsatzId für POI-Erstellung
   */
  einsatzId: string;

  /**
   * LagekarteId für POI-Erstellung
   */
  lagekarteId: string;
}

/**
 * POI-Platzierungs-Modal-Komponente
 *
 * Headless UI Dialog für POI-Erstellung mit TanStack Form.
 * - Zeigt Formular für POI-Details (Name, Adresse, Koordinaten)
 * - Unterstützt zwei Koordinaten-Modi: Lat/Lng (Dezimal) und MGRS (Militär-Grid)
 * - Bi-direktionale Sync zwischen Koordinaten-Formaten
 * - Geocoding-Support für Adress-Eingabe
 * - Unterstützt Dark-Mode
 * - Mobile-responsive (max-w-md auf Desktop, max-w-full auf Mobile)
 *
 * @param isOpen - Ob Modal geöffnet ist
 * @param onClose - Callback zum Schließen
 * @param poiType - POI-Typ (vorausgewählt)
 * @param coordinates - Koordinaten vom Karten-Klick
 * @param einsatzId - EinsatzId
 * @param lagekarteId - LagekarteId
 *
 * @example
 * ```tsx
 * <PoiPlacementModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   poiType="FAHRZEUG"
 *   coordinates={{ lat: 51.1, lon: 10.1 }}
 *   einsatzId="einsatz-123"
 *   lagekarteId="lagekarte-456"
 * />
 * ```
 */
export const PoiPlacementModal: React.FC<PoiPlacementModalProps> = ({ isOpen, onClose, poiType, coordinates, einsatzId, lagekarteId }) => {
  const {
    form,
    isLoading,
    isError,
    error,
    isGeocoding,
    debouncedGeocode,
    // MGRS Support
    coordMode,
    setCoordMode,
    mgrsInput,
    handleMgrsChange,
    isMgrsValid,
  } = usePoiForm({
    einsatzId,
    lagekarteId,
    initialType: poiType,
    initialCoordinates: coordinates,
    onSuccess: () => {
      // Close modal after successful POI creation
      onClose();
    },
    onError: (err) => {
      console.error('POI-Erstellung fehlgeschlagen:', err);
      // Modal bleibt offen, damit User Fehler sieht und korrigieren kann
    },
  });

  const iconConfig = POI_ICON_MAP[poiType];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      {/* Backdrop */}
      <DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg border border-gray-300 bg-white p-6 shadow-xl transition-all sm:max-w-md dark:border-gray-600 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <iconConfig.Icon size={24} color={iconConfig.color} aria-hidden="true" />
              <DialogTitle as="h3" className="font-semibold text-gray-900 text-lg dark:text-gray-100">
                {formatPoiTypeLabel(poiType)} platzieren
              </DialogTitle>
            </div>

            {/* Close Button */}
            <Button type="button" onClick={onClose} intent="secondary" appearance="ghost" size="icon" aria-label="Modal schließen">
              <PiX size={20} />
            </Button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="mt-6 space-y-4"
          >
            {/* Name Field */}
            <form.Field name="name" validators={{ onChange: ({ value }) => (value.length < 3 ? 'Mindestens 3 Zeichen erforderlich' : undefined) }}>
              {(field) => (
                <div>
                  <label htmlFor={field.name} className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Fahrzeug 1"
                    className="w-full"
                  />
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && <p className="mt-1 text-red-500 text-sm">{field.state.meta.errors[0]}</p>}
                </div>
              )}
            </form.Field>

            {/* Adresse Field mit Geocoding */}
            <form.Field name="adresse">
              {(field) => (
                <div>
                  <label htmlFor={field.name} className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                    Adresse (optional)
                  </label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        field.handleChange(newValue);
                        // Trigger debounced geocoding
                        debouncedGeocode(newValue);
                      }}
                      placeholder="z.B. Hauptstraße 15, Berlin"
                      className="w-full"
                      aria-describedby="geocoding-status"
                    />
                    {isGeocoding && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <Spinner size="sm" type="ring" aria-label="Adresse wird geocoded" />
                      </div>
                    )}
                  </div>
                  <p id="geocoding-status" className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                    {isGeocoding ? 'Koordinaten werden ermittelt...' : 'Koordinaten werden automatisch aktualisiert'}
                  </p>
                </div>
              )}
            </form.Field>

            {/* Koordinaten-Modus Toggle */}
            <div className="flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => setCoordMode('latLng')}
                aria-label="Koordinaten-Modus: Lat/Lng"
                aria-pressed={coordMode === 'latLng'}
                className={`flex-1 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                  coordMode === 'latLng' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                Lat/Lng
              </button>
              <button
                type="button"
                onClick={() => setCoordMode('mgrs')}
                aria-label="Koordinaten-Modus: MGRS"
                aria-pressed={coordMode === 'mgrs'}
                className={`flex-1 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                  coordMode === 'mgrs' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                MGRS
              </button>
            </div>

            {/* Koordinaten-Inputs (Konditional) */}
            {coordMode === 'latLng' ? (
              <div className="grid grid-cols-2 gap-3">
                <form.Field
                  name="latitude"
                  validators={{
                    onChange: ({ value }) => {
                      if (value < -90 || value > 90) {
                        return 'Breitengrad muss zwischen -90 und 90 liegen';
                      }
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <label htmlFor={field.name} className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                        Breitengrad
                      </label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        step="any"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && <p className="mt-1 text-red-500 text-sm">{field.state.meta.errors[0]}</p>}
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="longitude"
                  validators={{
                    onChange: ({ value }) => {
                      if (value < -180 || value > 180) {
                        return 'Längengrad muss zwischen -180 und 180 liegen';
                      }
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <label htmlFor={field.name} className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                        Längengrad
                      </label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        step="any"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && <p className="mt-1 text-red-500 text-sm">{field.state.meta.errors[0]}</p>}
                    </div>
                  )}
                </form.Field>
              </div>
            ) : (
              <div>
                <label htmlFor="mgrs" className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  MGRS-Koordinaten
                </label>
                <Input
                  id="mgrs"
                  name="mgrs"
                  value={mgrsInput}
                  onChange={(e) => handleMgrsChange(e.target.value)}
                  placeholder="z.B. 33U VU 12345 67890"
                  className="w-full font-mono"
                  aria-describedby="mgrs-format-hint"
                  aria-invalid={!isMgrsValid && mgrsInput !== ''}
                />
                {!isMgrsValid && mgrsInput && <p className="mt-1 text-red-500 text-sm">Ungültiges MGRS-Format</p>}
                {isMgrsValid && mgrsInput && <p className="mt-1 text-green-600 text-sm dark:text-green-400">✓ Gültiges MGRS-Format</p>}
                <p id="mgrs-format-hint" className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                  Format: GridZone SquareId Easting Northing (z.B. 33U VU 12345 67890)
                </p>
              </div>
            )}

            {/* Error Message */}
            {isError && error && (
              <div className="rounded-lg border-2 border-red-500 bg-red-50 p-3 text-red-700 text-sm dark:border-red-400 dark:bg-red-900/50 dark:text-red-300">
                Fehler beim Erstellen: {error.message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button intent="secondary" appearance="outline" size="md" onClick={onClose} disabled={isLoading}>
                Abbrechen
              </Button>

              <Button type="submit" intent="primary" appearance="filled" size="md" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner size="sm" type="ring" />
                    <span className="ml-2">Speichern...</span>
                  </>
                ) : (
                  'Speichern'
                )}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
