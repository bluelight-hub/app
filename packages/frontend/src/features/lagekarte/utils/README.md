# Lagekarte Utilities

Hilfsfunktionen für die Lagekarte-Komponente.

## MGRS Koordinaten-Konvertierung

Die `mgrs.ts` Utility-Datei bietet vollständige MGRS (Military Grid Reference System) Unterstützung für die Lagekarte.

### Verfügbare Funktionen

#### `latLngToMgrs(lat, lng, precision?)`

Konvertiert Lat/Lng Koordinaten zu MGRS Format.

```typescript
import { latLngToMgrs } from '@/features/lagekarte/utils/mgrs';

// Paris, Frankreich mit hoher Precision (1m)
const mgrs = latLngToMgrs(48.8566, 2.3522, 5);
// => "31U DQ 48251 11932"

// London, UK mit mittlerer Precision (100m)
const mgrs = latLngToMgrs(51.5074, -0.1278, 3);
// => "30U YC 763 992"

// Berlin, Deutschland
const mgrs = latLngToMgrs(52.52, 13.405, 5);
// => "33U UU 41831 83221"
```

**Parameter:**

- `lat`: Breitengrad (-90 bis 90)
- `lng`: Längengrad (-180 bis 180)
- `precision`: MGRS Precision Level (0-5, default: 5)
  - 0 = 100km
  - 1 = 10km
  - 2 = 1km
  - 3 = 100m
  - 4 = 10m
  - 5 = 1m

**Returns:** MGRS String oder `null` bei Fehler

---

#### `mgrsToLatLng(mgrs)`

Konvertiert MGRS Koordinaten zu Lat/Lng.

```typescript
import { mgrsToLatLng } from '@/features/lagekarte/utils/mgrs';

// Mit Leerzeichen (formatiert)
const coords1 = mgrsToLatLng('31U DQ 48251 11932');
// => { lat: 48.8566, lng: 2.3522 }

// Ohne Leerzeichen (unformatiert)
const coords2 = mgrsToLatLng('31UDQ4825111932');
// => { lat: 48.8566, lng: 2.3522 }
```

**Parameter:**

- `mgrs`: MGRS String (mit oder ohne Leerzeichen)

**Returns:** `{ lat: number, lng: number }` oder `null` bei Fehler

---

#### `isValidMgrs(mgrs)`

Validiert MGRS Format.

```typescript
import { isValidMgrs } from '@/features/lagekarte/utils/mgrs';

isValidMgrs('31U DQ 48251 11932'); // true
isValidMgrs('31UDQ4825111932'); // true
isValidMgrs('invalid'); // false
isValidMgrs(''); // false
```

**Parameter:**

- `mgrs`: MGRS String

**Returns:** `boolean`

---

#### `formatMgrs(mgrs)`

Formatiert MGRS String für bessere Lesbarkeit.

```typescript
import { formatMgrs } from '@/features/lagekarte/utils/mgrs';

formatMgrs('33UVU1234567890'); // "33U VU 12345 67890"
formatMgrs('31UDQ4825111932'); // "31U DQ 48251 11932"
formatMgrs('30UYC763992'); // "30U YC 763 992"
formatMgrs('33U VU 12345 67890'); // "33U VU 12345 67890" (bereits formatiert)
```

**Parameter:**

- `mgrs`: MGRS String (mit oder ohne Leerzeichen)

**Returns:** Formatierter MGRS String mit Leerzeichen

**Format:**

- Grid Zone Designator (z.B. "33U")
- 100km Square ID (z.B. "VU")
- Easting (z.B. "12345")
- Northing (z.B. "67890")

---

#### `isMgrsCoordinate(value)`

Type Guard für MGRS Koordinaten (TypeScript).

```typescript
import { isMgrsCoordinate, mgrsToLatLng } from '@/features/lagekarte/utils/mgrs';

const userInput: unknown = getUserInput();

if (isMgrsCoordinate(userInput)) {
  // userInput ist garantiert string mit validem MGRS Format
  const latLng = mgrsToLatLng(userInput);
  console.log(latLng);
}
```

**Parameter:**

- `value`: Zu prüfender Wert

**Returns:** `value is string` (TypeScript Type Guard)

---

#### `getMgrsPrecision(mgrs)`

Berechnet die Precision eines MGRS Strings.

```typescript
import { getMgrsPrecision } from '@/features/lagekarte/utils/mgrs';

getMgrsPrecision('33U VU 12345 67890'); // 5 (1m)
getMgrsPrecision('33U VU 123 678'); // 3 (100m)
getMgrsPrecision('33U VU 12 67'); // 2 (1km)
getMgrsPrecision('33U VU'); // 0 (100km)
```

**Parameter:**

- `mgrs`: MGRS String

**Returns:** Precision Level (0-5) oder `null` bei Fehler

**Precision Levels:**

- 0 = 100km
- 1 = 10km
- 2 = 1km
- 3 = 100m
- 4 = 10m
- 5 = 1m

---

### Verwendungsbeispiele

#### POI mit MGRS Koordinaten erstellen

```typescript
import { latLngToMgrs, formatMgrs } from '@/features/lagekarte/utils/mgrs';

function createPoiWithMgrs(lat: number, lng: number) {
  const mgrs = latLngToMgrs(lat, lng, 5);

  if (!mgrs) {
    console.error('Ungültige Koordinaten');
    return null;
  }

  const formattedMgrs = formatMgrs(mgrs);

  return {
    lat,
    lng,
    mgrs: formattedMgrs,
    label: `POI at ${formattedMgrs}`,
  };
}
```

#### MGRS Input validieren und konvertieren

```typescript
import { isValidMgrs, mgrsToLatLng, formatMgrs } from '@/features/lagekarte/utils/mgrs';

function handleMgrsInput(input: string) {
  // Validiere Input
  if (!isValidMgrs(input)) {
    return { error: 'Ungültiges MGRS Format' };
  }

  // Konvertiere zu Lat/Lng
  const coords = mgrsToLatLng(input);

  if (!coords) {
    return { error: 'Konvertierung fehlgeschlagen' };
  }

  // Formatiere für Display
  const formatted = formatMgrs(input);

  return {
    coordinates: coords,
    display: formatted,
  };
}
```

#### Type-Safe MGRS Handling

```typescript
import { isMgrsCoordinate, mgrsToLatLng } from '@/features/lagekarte/utils/mgrs';

function processMgrsOrLatLng(input: unknown) {
  if (isMgrsCoordinate(input)) {
    // TypeScript weiß hier: input ist string und valid MGRS
    return mgrsToLatLng(input);
  }

  if (typeof input === 'object' && input !== null) {
    // Handle Lat/Lng Object
    const obj = input as { lat: number; lng: number };
    return obj;
  }

  return null;
}
```

---

## Weitere Utilities

### Layer Utils (`layer-utils.ts`)

Hilfsfunktionen für Leaflet Layer Manipulation.

### Shape Helpers (`shape-helpers.ts`)

Funktionen für Shape-Erstellung und -Management.

### Types (`types.ts`)

TypeScript Type Definitions für Lagekarte-Komponenten.
