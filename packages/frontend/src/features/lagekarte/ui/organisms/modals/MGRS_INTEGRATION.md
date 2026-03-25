# MGRS Integration für POI-Formular

## Übersicht

Der `usePoiForm` Hook wurde erweitert, um MGRS-Koordinaten zu unterstützen. Dies ermöglicht es Benutzern, zwischen MGRS-
und Lat/Lng-Koordinaten zu wechseln.

## Hook API

### Neue Return Values

```typescript
const {
  // Existing...
  form,
  isLoading,
  isError,
  error,
  isGeocoding,
  debouncedGeocode,

  // NEW: MGRS Support
  coordMode,          // 'latLng' | 'mgrs'
  setCoordMode,       // (mode: 'latLng' | 'mgrs') => void
  mgrsInput,          // string - Aktueller MGRS Input
  handleMgrsChange,   // (mgrsValue: string) => void
  isMgrsValid,        // boolean - Ist aktueller MGRS-Input gültig?
} = usePoiForm({...});
```

## Bi-direktionale Synchronisation

### Lat/Lng → MGRS (Automatisch)

Wenn `latitude` oder `longitude` sich ändern:

1. Hook konvertiert automatisch zu MGRS
2. `mgrsInput` State wird aktualisiert
3. Form-Field `mgrs` wird gesetzt
4. MGRS wird formatiert (mit Leerzeichen für Lesbarkeit)

**Beispiel:**

```typescript
form.setFieldValue('latitude', 52.52);
form.setFieldValue('longitude', 13.405);
// → mgrsInput = "33U UU 41831 83221"
```

### MGRS → Lat/Lng (Manual via handleMgrsChange)

Wenn User MGRS-Koordinaten eingibt:

1. Modal ruft `handleMgrsChange(mgrsValue)` auf
2. Hook validiert MGRS-Format
3. Bei gültigem MGRS: Konvertierung zu Lat/Lng
4. `latitude` und `longitude` Form-Fields werden aktualisiert

**Beispiel:**

```typescript
handleMgrsChange('33U UU 41831 83221');
// → latitude = 52.52, longitude = 13.405
```

## Modal-Implementierung

### 1. Koordinaten-Modus Toggle

```tsx
// In PoiPlacementModal.tsx
<div className="flex gap-2 mb-4">
  <button
    type="button"
    onClick={() => setCoordMode('latLng')}
    className={cn('px-3 py-2 rounded', coordMode === 'latLng' ? 'bg-action-primary text-text-inverse' : 'bg-surface-raised text-text-secondary')}
  >
    Lat/Lng
  </button>
  <button
    type="button"
    onClick={() => setCoordMode('mgrs')}
    className={cn('px-3 py-2 rounded', coordMode === 'mgrs' ? 'bg-action-primary text-text-inverse' : 'bg-surface-raised text-text-secondary')}
  >
    MGRS
  </button>
</div>
```

### 2. Konditionale Input-Anzeige

```tsx
{
  coordMode === 'latLng' ? (
    <>
      {/* Bestehende Latitude/Longitude Inputs */}
      <form.Field name="latitude">{(field) => <Input type="number" value={field.state.value} onChange={(e) => field.handleChange(parseFloat(e.target.value))} />}</form.Field>

      <form.Field name="longitude">{(field) => <Input type="number" value={field.state.value} onChange={(e) => field.handleChange(parseFloat(e.target.value))} />}</form.Field>
    </>
  ) : (
    <>
      {/* Neuer MGRS Input */}
      <div>
        <label>MGRS Koordinaten</label>
        <Input
          type="text"
          value={mgrsInput}
          onChange={(e) => handleMgrsChange(e.target.value)}
          placeholder="z.B. 33U UU 41831 83221"
          className={cn(isMgrsValid ? 'border-status-success-border' : 'border-status-danger-border')}
        />
        {!isMgrsValid && mgrsInput && <p className="mt-1 text-status-danger-text text-sm">Ungültiges MGRS-Format</p>}
      </div>
    </>
  );
}
```

### 3. Validierungs-Indikator

```tsx
{
  /* Zeige MGRS-Validierung nur wenn MGRS-Modus aktiv */
}
{
  coordMode === 'mgrs' && (
    <div className="flex items-center gap-2 text-sm">
      {isMgrsValid ? (
        <>
          <CheckIcon className="h-4 w-4 text-status-success-text" />
          <span className="text-status-success-text">Gültige MGRS-Koordinaten</span>
        </>
      ) : mgrsInput ? (
        <>
          <XIcon className="h-4 w-4 text-status-danger-text" />
          <span className="text-status-danger-text">Ungültige MGRS-Koordinaten</span>
        </>
      ) : null}
    </div>
  );
}
```

## State Management Strategie

### Verhindert Endlos-Loops

Die Implementierung verhindert Endlos-Loops durch:

1. **TanStack Form Subscription**: Nutzt `form.store.subscribe()` für reaktive Updates
2. **Gezielte State-Updates**: Nur relevante Fields werden aktualisiert
3. **Validierungs-Guard**: MGRS → Lat/Lng nur bei gültigem MGRS

### State-Fluss Diagramm

```
User Input (MGRS)
    ↓
handleMgrsChange()
    ↓
setMgrsInput(mgrsValue)  ← Lokaler State
    ↓
isValidMgrs() ?
    ↓ (ja)
mgrsToLatLng()
    ↓
form.setFieldValue('latitude')
form.setFieldValue('longitude')
form.setFieldValue('mgrs')
    ↓
form.store.subscribe() triggert
    ↓
latLngToMgrs()  ← Aber MGRS ist bereits korrekt!
    ↓
setMgrsInput(formatted)  ← Nur Formatierung
```

## Backend-Integration

### Aktueller Status

**WICHTIG**: Backend unterstützt noch NICHT das `mgrs` Property im `CreatePoiDto`!

Aktuell wird nur `latitude` und `longitude` gesendet:

```typescript
await createPoiMutation.mutateAsync({
  lagekarteId,
  type: validated.type,
  name: validated.name,
  adresse: validated.adresse,
  latitude: validated.latitude, // ← Sendet Lat/Lng
  longitude: validated.longitude, // ← (auch wenn MGRS eingegeben wurde)
  icon: validated.icon,
});
```

### Zukünftige Backend-Integration

Wenn Backend `mgrs` unterstützt:

```typescript
await createPoiMutation.mutateAsync({
  lagekarteId,
  type: validated.type,
  name: validated.name,
  adresse: validated.adresse,
  // MGRS hat Priorität
  mgrs: coordMode === 'mgrs' ? validated.mgrs : undefined,
  // Lat/Lng als Fallback
  latitude: coordMode === 'latLng' ? validated.latitude : undefined,
  longitude: coordMode === 'latLng' ? validated.longitude : undefined,
  icon: validated.icon,
});
```

### Backend TODO

1. **DTO erweitern** (`create-poi.dto.ts`):

   ```typescript
   @ApiPropertyOptional({
     description: 'MGRS-Koordinaten (z.B. "33U UU 41831 83221")',
     example: '33U UU 41831 83221',
     maxLength: 20,
   })
   @IsOptional()
   @IsString()
   @MaxLength(20)
   mgrs?: string;
   ```

2. **Validator anpassen** (`coordinates-or-address.validator.ts`):

   ```typescript
   interface CoordinatesOrAddressObject {
     adresse?: string | null;
     latitude?: number | null;
     longitude?: number | null;
     mgrs?: string | null;  // NEU
   }

   validate(_value: unknown, args: ValidationArguments): boolean {
     const object = args.object as CoordinatesOrAddressObject;
     const hasAddress = ...;
     const hasCoordinates = ...;
     const hasMgrs = object.mgrs !== undefined && object.mgrs !== null; // NEU

     return hasAddress || hasCoordinates || hasMgrs; // NEU
   }
   ```

3. **Service erweitern** (`poi.service.ts`):
   - MGRS zu Lat/Lng Konvertierung (mit `mgrs` NPM package)
   - MGRS-Speicherung in DB

## Testing

### Manueller Test-Workflow

1. **Öffne POI-Modal**
2. **Klicke auf "MGRS" Toggle**
3. **Gebe MGRS ein**: `33U UU 41831 83221`
4. **Erwarte**: Lat/Lng werden automatisch aktualisiert
5. **Wechsle zu "Lat/Lng" Toggle**
6. **Erwarte**: Lat/Lng Inputs zeigen konvertierte Werte
7. **Ändere Latitude**: z.B. `52.5`
8. **Wechsle zurück zu "MGRS"**
9. **Erwarte**: MGRS wurde automatisch aktualisiert

### Unit Tests (TODO)

```typescript
describe('usePoiForm MGRS Integration', () => {
  it('should convert Lat/Lng to MGRS automatically', () => {
    // Test Lat/Lng → MGRS
  });

  it('should convert MGRS to Lat/Lng on handleMgrsChange', () => {
    // Test MGRS → Lat/Lng
  });

  it('should validate MGRS format', () => {
    // Test isMgrsValid
  });

  it('should prevent infinite loops', () => {
    // Test State-Update-Zyklus
  });
});
```

## Browser DevTools Testing

```typescript
// In Browser Console (wenn Modal offen):
// 1. Test MGRS-Validierung
isValidMgrs('33U UU 41831 83221'); // true
isValidMgrs('invalid'); // false

// 2. Test Konvertierung
latLngToMgrs(52.52, 13.405, 5); // "33UUU4183183221"
formatMgrs('33UUU4183183221'); // "33U UU 41831 83221"
mgrsToLatLng('33U UU 41831 83221'); // { lat: 52.52, lng: 13.405 }
```

## Known Issues & Limitations

### 1. Backend Unterstützung fehlt

- **Problem**: Backend akzeptiert noch kein `mgrs` Property
- **Workaround**: Frontend sendet aktuell nur Lat/Lng (konvertiert aus MGRS)
- **TODO**: Backend DTO und Service erweitern

### 2. Precision Loss

- **Problem**: MGRS → Lat/Lng → MGRS kann zu minimal unterschiedlichen Werten führen
- **Grund**: Floating-Point-Präzision und MGRS-Rundung
- **Akzeptabel**: Unterschied < 1 Meter bei Precision Level 5

### 3. Polar Regions

- **Problem**: MGRS unterstützt keine Koordinaten außerhalb 80°S - 84°N
- **Workaround**: Hook zeigt Error/Warning bei ungültigem MGRS
- **Fallback**: User kann zu Lat/Lng-Modus wechseln

## Weiterführende Dokumentation

- [MGRS Utils](/packages/frontend/src/utils/lagekarte/mgrs.ts) - MGRS Konvertierungs-Utilities
- [TanStack Form Docs](https://tanstack.com/form/latest) - Form API Referenz
- [MGRS Wikipedia](https://en.wikipedia.org/wiki/Military_Grid_Reference_System) - MGRS Standard
