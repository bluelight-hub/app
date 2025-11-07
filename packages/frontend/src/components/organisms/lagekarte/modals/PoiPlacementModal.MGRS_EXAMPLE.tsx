/**
 * BEISPIEL: MGRS-Integration in PoiPlacementModal
 *
 * Dieses File zeigt wie der erweiterte usePoiForm Hook
 * im Modal genutzt werden kann.
 *
 * WICHTIG: Dies ist ein BEISPIEL, NICHT die finale Implementierung!
 */

import { usePoiForm } from './usePoiForm';
import type { PoiType } from '@/utils/poi-icons';

interface PoiPlacementModalProps {
  einsatzId: string;
  lagekarteId: string;
  initialType: PoiType;
  initialCoordinates: { lat: number; lon: number };
  onClose: () => void;
}

export function PoiPlacementModalExample({ einsatzId, lagekarteId, initialType, initialCoordinates, onClose }: PoiPlacementModalProps) {
  // Hook mit MGRS-Support
  const {
    form,
    isLoading,
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
    initialType,
    initialCoordinates,
    onSuccess: onClose,
  });

  return (
    <div className="p-6">
      <h2 className="mb-4 font-bold text-xl">POI platzieren</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {/* POI Name */}
        <form.Field name="name">
          {(field) => (
            <div className="mb-4">
              <label className="mb-2 block font-medium text-sm">Name</label>
              <input type="text" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="z.B. Einsatzstelle" />
              {field.state.meta.errors && <p className="mt-1 text-red-500 text-sm">{field.state.meta.errors.join(', ')}</p>}
            </div>
          )}
        </form.Field>

        {/* Adresse (Optional) */}
        <form.Field name="adresse">
          {(field) => (
            <div className="mb-4">
              <label className="mb-2 block font-medium text-sm">
                Adresse (Optional)
                {isGeocoding && <span className="ml-2 text-gray-500">Geocoding...</span>}
              </label>
              <input
                type="text"
                value={field.state.value || ''}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  debouncedGeocode(e.target.value);
                }}
                className="w-full rounded border px-3 py-2"
                placeholder="z.B. Hauptstraße 1, Berlin"
              />
            </div>
          )}
        </form.Field>

        {/* Koordinaten-Modus Toggle */}
        <div className="mb-4">
          <label className="mb-2 block font-medium text-sm">Koordinatenformat</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCoordMode('latLng')}
              className={`rounded px-4 py-2 transition-colors ${coordMode === 'latLng' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Lat/Lng (Dezimal)
            </button>
            <button
              type="button"
              onClick={() => setCoordMode('mgrs')}
              className={`rounded px-4 py-2 transition-colors ${coordMode === 'mgrs' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              MGRS (Militär)
            </button>
          </div>
        </div>

        {/* Koordinaten-Inputs (Konditional) */}
        {coordMode === 'latLng' ? (
          <div className="mb-4 grid grid-cols-2 gap-4">
            {/* Latitude */}
            <form.Field name="latitude">
              {(field) => (
                <div>
                  <label className="mb-2 block font-medium text-sm">Breitengrad (Lat)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                    className="w-full rounded border px-3 py-2"
                    placeholder="z.B. 52.520008"
                  />
                  {field.state.meta.errors && <p className="mt-1 text-red-500 text-sm">{field.state.meta.errors.join(', ')}</p>}
                </div>
              )}
            </form.Field>

            {/* Longitude */}
            <form.Field name="longitude">
              {(field) => (
                <div>
                  <label className="mb-2 block font-medium text-sm">Längengrad (Lng)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                    className="w-full rounded border px-3 py-2"
                    placeholder="z.B. 13.404954"
                  />
                  {field.state.meta.errors && <p className="mt-1 text-red-500 text-sm">{field.state.meta.errors.join(', ')}</p>}
                </div>
              )}
            </form.Field>
          </div>
        ) : (
          <div className="mb-4">
            {/* MGRS Input */}
            <label className="mb-2 block font-medium text-sm">MGRS Koordinaten</label>
            <input
              type="text"
              value={mgrsInput}
              onChange={(e) => handleMgrsChange(e.target.value)}
              className={`w-full rounded border px-3 py-2 transition-colors ${
                mgrsInput && !isMgrsValid ? 'border-red-500 focus:ring-red-500' : mgrsInput && isMgrsValid ? 'border-green-500 focus:ring-green-500' : 'border-gray-300'
              }`}
              placeholder="z.B. 33U UU 41831 83221"
            />

            {/* Validierungs-Feedback */}
            <div className="mt-2">
              {mgrsInput && isMgrsValid ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-label="Erfolg">
                    <title>Erfolg-Symbol</title>
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Gültige MGRS-Koordinaten</span>
                </div>
              ) : mgrsInput && !isMgrsValid ? (
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-label="Fehler">
                    <title>Fehler-Symbol</title>
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Ungültiges MGRS-Format</span>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Format: 33U UU 41831 83221 (Grid Zone + 100km Square + Easting + Northing)</p>
              )}
            </div>

            {/* Info-Box */}
            <div className="mt-3 rounded-md bg-blue-50 p-3">
              <p className="text-blue-800 text-sm">
                <strong>MGRS-Koordinaten</strong> werden im Militär und Katastrophenschutz verwendet. Die Eingabe wird automatisch in Lat/Lng konvertiert.
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isLoading || (coordMode === 'mgrs' && !isMgrsValid)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Erstelle POI...' : 'POI erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * VERWENDUNG:
 *
 * 1. Importiere den Hook mit MGRS-Support:
 *    import { usePoiForm } from './usePoiForm';
 *
 * 2. Destrukturiere alle benötigten Values:
 *    const { form, coordMode, setCoordMode, mgrsInput, handleMgrsChange, isMgrsValid } = usePoiForm({...});
 *
 * 3. Erstelle Toggle-Buttons für Koordinaten-Modus:
 *    - 'latLng' → Zeigt Latitude/Longitude Inputs
 *    - 'mgrs' → Zeigt MGRS Input mit Validierung
 *
 * 4. Nutze handleMgrsChange für MGRS-Input:
 *    onChange={(e) => handleMgrsChange(e.target.value)}
 *
 * 5. Validiere MGRS mit isMgrsValid:
 *    - Zeige visuelles Feedback (grün/rot Border)
 *    - Disable Submit-Button bei ungültigem MGRS
 *
 * 6. Bi-direktionale Sync ist automatisch:
 *    - User gibt MGRS ein → Lat/Lng werden aktualisiert
 *    - User gibt Lat/Lng ein → MGRS wird aktualisiert
 *    - User ändert Adresse (Geocoding) → Beide werden aktualisiert
 */
