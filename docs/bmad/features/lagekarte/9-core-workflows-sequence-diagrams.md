# 9. Core Workflows (Sequence Diagrams)

## 9.1 POI-Creation mit Auto-Geocoding

**Workflow:** User erstellt POI mit Adresse → Backend geocoded automatisch → POI wird mit Koordinaten gespeichert.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant PoiController
    participant PoiService
    participant GeocodingService
    participant Nominatim
    participant PoiRepository
    participant Database

    User->>Frontend: Klick "Neuer POI"
    Frontend->>Frontend: Zeige POI-Form
    User->>Frontend: Eingabe: Typ + Adresse (ohne Koordinaten)
    Frontend->>PoiController: POST /einsatz/{id}/lagekarte/pois
    PoiController->>PoiService: createPoi(dto)

    alt Adresse vorhanden, aber keine Koordinaten
        PoiService->>GeocodingService: geocodeAddress(adresse)
        GeocodingService->>GeocodingService: Check LRU-Cache

        alt Cache-Miss
            GeocodingService->>GeocodingService: Rate-Limit-Check (1 req/s)
            GeocodingService->>Nominatim: GET /search?q={adresse}
            Nominatim-->>GeocodingService: { lat, lon, displayName }
            GeocodingService->>GeocodingService: Cache Result (7 Tage TTL)
        end

        GeocodingService-->>PoiService: { latitude, longitude }
        PoiService->>PoiService: dto.latitude = latitude
        PoiService->>PoiService: dto.longitude = longitude
    end

    PoiService->>PoiRepository: create(dto)
    PoiRepository->>Database: INSERT INTO lagekarte_poi
    Database-->>PoiRepository: LagekartePoi
    PoiRepository-->>PoiService: LagekartePoi
    PoiService-->>PoiController: LagekartePoi
    PoiController-->>Frontend: 201 Created + POI-Data
    Frontend->>Frontend: Add POI-Marker to Map
    Frontend->>User: Success-Toast "POI erstellt"
```

**Fehlerszenarien:**
- **Adresse nicht gefunden (404):** Frontend zeigt Error-Toast → User kann manuelle Koordinaten eingeben
- **Rate-Limit (429):** Backend wartet automatisch 1s und retried → User sieht Loading-State

---

## 9.2 Offline-Tile-Download-Flow

**Workflow:** User markiert Gebiet für Offline-Download → Frontend lädt Tiles herunter → Tiles werden in IndexedDB gecacht.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant OfflineService
    participant TileServer
    participant IndexedDB

    User->>Frontend: Klick "Offline-Download"
    Frontend->>Frontend: Zeige Rechteck-Auswahlwerkzeug
    User->>Frontend: Markiert Gebiet auf Karte
    Frontend->>Frontend: Berechne benötigte Tiles (Bounds + Zoom-Levels)
    Frontend->>User: "Download ~500 Tiles? (~3 Min)"
    User->>Frontend: Bestätigen

    Frontend->>OfflineService: downloadTilesForBounds(bounds, [13, 14, 15, 16])

    loop Für jeden Tile
        OfflineService->>OfflineService: Rate-Limit-Check (2 req/s)
        OfflineService->>TileServer: GET /{z}/{x}/{y}.png
        TileServer-->>OfflineService: Tile-Blob (PNG)
        OfflineService->>IndexedDB: setItem(url, blob)
        OfflineService->>Frontend: Progress-Update (50/500)
        Frontend->>User: Progress-Bar-Update
    end

    OfflineService-->>Frontend: Download Complete
    Frontend->>User: Success-Toast "500 Kacheln heruntergeladen"
    Frontend->>Frontend: Enable Offline-Mode-Badge
```

**Performance:**
- **Rate-Limiting:** 2 Tiles/Sekunde = 120 Tiles/Minute
- **Geschätzte Download-Zeit:** 500 Tiles ≈ 4 Minuten
- **Speicher:** ~20KB pro Tile → 500 Tiles = ~10MB

---

## 9.3 Screenshot-Export zu ETB

**Workflow:** User exportiert Lagekarte als Screenshot → Frontend nimmt Screenshot → Backend speichert File → ETB-Eintrag wird erstellt.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant LagekarteController
    participant FileUploadService
    participant FileSystem
    participant EtbService
    participant Database

    User->>Frontend: Klick "Screenshot exportieren"
    Frontend->>Frontend: html2canvas(mapContainer)
    Frontend->>Frontend: canvas.toBlob('image/png')
    Frontend->>Frontend: Create FormData + Append Blob

    Frontend->>LagekarteController: POST /einsatz/{id}/lagekarte/screenshot
    LagekarteController->>LagekarteController: Multer Validation (PNG/JPEG, Max 2MB)

    alt File Invalid
        LagekarteController-->>Frontend: 400 Bad Request "Nur PNG/JPEG erlaubt"
        Frontend->>User: Error-Toast
    else File Valid
        LagekarteController->>FileUploadService: uploadScreenshot(einsatzId, file)
        FileUploadService->>FileUploadService: Generate Filename (timestamp-cuid.png)
        FileUploadService->>FileSystem: Save to /uploads/lagekarte/{einsatzId}/
        FileSystem-->>FileUploadService: File Path

        FileUploadService->>EtbService: createEintrag({ kategorie: LAGE, metadata: { screenshotUrl } })
        EtbService->>Database: INSERT INTO etb_eintrag
        Database-->>EtbService: EtbEintrag
        EtbService-->>FileUploadService: etbEintragId

        FileUploadService-->>LagekarteController: { etbEintragId, screenshotUrl }
        LagekarteController-->>Frontend: 201 Created
        Frontend->>User: Success-Toast "Screenshot zu ETB exportiert"
        Frontend->>Frontend: Navigate to ETB-View (optional)
    end
```

**Technische Details:**
- **html2canvas:** Konvertiert DOM-Element (Map) zu Canvas
- **Canvas.toBlob():** Generiert PNG-Blob (ca. 500KB-1MB)
- **FormData:** Multipart-Upload zu Backend
- **ETB-Kategorie:** `LAGE` (für Lagekarte-Screenshots reserviert)

---

## 9.4 Drawing-State-Sync (Frontend ↔ Backend)

**Workflow:** User zeichnet auf Karte → Frontend debounced Backend-Sync (2s) → Backend speichert GeoJSON-State.

```mermaid
sequenceDiagram
    participant User
    participant LeafletMap
    participant LagekarteStore
    participant DebouncedSave
    participant LagekarteController
    participant LagekarteService
    participant Database

    User->>LeafletMap: Zeichnet Polygon auf Karte
    LeafletMap->>LeafletMap: Leaflet.PM pm:create Event
    LeafletMap->>LagekarteStore: setDrawingState(newFeatureCollection)

    LagekarteStore->>LagekarteStore: Update State (GeoJSON)
    LagekarteStore->>DebouncedSave: Trigger Debounced Save (2s Delay)

    Note over User,DebouncedSave: User zeichnet weiter...<br/>Debounce-Timer wird resettet

    User->>LeafletMap: Zeichnet weiteres Polygon
    LeafletMap->>LagekarteStore: setDrawingState(updatedFeatureCollection)
    LagekarteStore->>DebouncedSave: Reset Debounce-Timer

    Note over DebouncedSave: 2 Sekunden Inaktivität...

    DebouncedSave->>LagekarteController: POST /einsatz/{id}/lagekarte { state: GeoJSON }
    LagekarteController->>LagekarteService: saveLagekarteState(einsatzId, state)

    alt GeoJSON-Validation Failed
        LagekarteService-->>LagekarteController: 400 Bad Request "Invalid GeoJSON"
        LagekarteController-->>DebouncedSave: Error
        DebouncedSave->>User: Error-Toast "Synchronisation fehlgeschlagen"
    else GeoJSON Valid
        LagekarteService->>Database: UPDATE lagekarte SET state = ...
        Database-->>LagekarteService: Lagekarte
        LagekarteService-->>LagekarteController: 200 OK
        LagekarteController-->>DebouncedSave: Success
        DebouncedSave->>User: Silent Success (oder Mini-Toast)
    end
```

**Debouncing-Rationale:**
- **Performance:** Verhindert API-Flood bei schnellem Zeichnen
- **User Experience:** User muss nicht auf Backend-Save warten
- **Conflict Resolution:** Last-Write-Wins (für MVP ausreichend)

**Optimierungen für v2:**
- **WebSocket-basierte Real-Time-Sync** für Multi-User-Editing
- **CRDT (Conflict-Free Replicated Data Types)** für automatische Merge-Konflikte

---
