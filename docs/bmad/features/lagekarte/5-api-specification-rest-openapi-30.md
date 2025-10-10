# 5. API Specification (REST OpenAPI 3.0)

## 5.1 REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Bluelight Hub - Lagekarte API
  version: 1.0.0
  description: |
    REST API für Lagekarte-Feature (Einsatzkoordination mit interaktiven Karten).
    Alle Endpoints erfordern JWT-Authentifizierung via Bearer Token.

servers:
  - url: http://localhost:3000/api/v1
    description: Development Server (Local)
  - url: http://bluelight-hub.local/api/v1
    description: Production Server (LAN)

security:
  - bearerAuth: []

paths:
  /einsatz/{einsatzId}/lagekarte:
    get:
      tags:
        - Lagekarte
      summary: Get Lagekarte by Einsatz ID
      description: |
        Lädt die Lagekarte für einen Einsatz. Erstellt automatisch eine leere
        Lagekarte wenn noch keine existiert (Lazy Creation).
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '200':
          description: Lagekarte erfolgreich geladen
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Lagekarte'
        '401':
          description: Unauthorized
        '404':
          description: Einsatz nicht gefunden

    post:
      tags:
        - Lagekarte
      summary: Save Lagekarte State
      description: |
        Speichert den Lagekarten-State (GeoJSON FeatureCollection).
        Frontend sendet debounced Updates (2s Debouncing).
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
            format: cuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                state:
                  $ref: '#/components/schemas/GeoJSON'
      responses:
        '200':
          description: State erfolgreich gespeichert
        '413':
          description: Payload too large (GeoJSON >5MB)

  /einsatz/{einsatzId}/lagekarte/pois:
    get:
      tags:
        - POI
      summary: Get all POIs for Lagekarte
      description: Lädt alle POIs einer Lagekarte (Max. 1000 POIs, keine Pagination).
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
            format: cuid
        - name: type
          in: query
          required: false
          schema:
            $ref: '#/components/schemas/PoiType'
      responses:
        '200':
          description: POIs erfolgreich geladen
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/LagekartePoi'

    post:
      tags:
        - POI
      summary: Create new POI
      description: |
        Erstellt einen neuen POI. Wenn `adresse` angegeben aber keine Koordinaten,
        wird automatisch via Nominatim geocoded.
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
            format: cuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePoiDto'
      responses:
        '201':
          description: POI erfolgreich erstellt
        '429':
          description: Rate Limit exceeded (Geocoding)

  /einsatz/{einsatzId}/lagekarte/pois/{poiId}:
    put:
      tags:
        - POI
      summary: Update POI
      description: Aktualisiert einen POI (z.B. nach Drag & Drop auf Karte).
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
        - name: poiId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePoiDto'
      responses:
        '200':
          description: POI erfolgreich aktualisiert

    delete:
      tags:
        - POI
      summary: Delete POI
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
        - name: poiId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: POI erfolgreich gelöscht

  /einsatz/{einsatzId}/lagekarte/screenshot:
    post:
      tags:
        - Lagekarte
      summary: Upload Screenshot for ETB Export
      description: |
        Lädt einen Screenshot der Lagekarte hoch und erstellt automatisch
        einen ETB-Eintrag (Kategorie: LAGE).
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: PNG/JPEG Screenshot (Max. 2MB)
      responses:
        '201':
          description: Screenshot erfolgreich hochgeladen, ETB-Eintrag erstellt
          content:
            application/json:
              schema:
                type: object
                properties:
                  etbEintragId:
                    type: string
                  screenshotUrl:
                    type: string
                    example: "/uploads/lagekarte/ckl1x2y3z0000.png"

  /einsatz/{einsatzId}/geocode:
    post:
      tags:
        - Geocoding
      summary: Geocode Address via Nominatim
      description: |
        Konvertiert eine Adresse in Koordinaten via Nominatim API.
        Rate-Limit: 1 Request/Sekunde.
      parameters:
        - name: einsatzId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                adresse:
                  type: string
                  example: "Musterstraße 1, 12345 Berlin"
      responses:
        '200':
          description: Geocoding erfolgreich
          content:
            application/json:
              schema:
                type: object
                properties:
                  latitude:
                    type: number
                  longitude:
                    type: number
                  displayName:
                    type: string
        '429':
          description: Rate Limit exceeded (Max. 1 req/s)

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Lagekarte:
      type: object
      properties:
        id:
          type: string
        einsatzId:
          type: string
        state:
          $ref: '#/components/schemas/GeoJSON'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    GeoJSON:
      type: object
      description: GeoJSON FeatureCollection für Zeichnungen
      properties:
        type:
          type: string
          enum: [FeatureCollection]
        features:
          type: array
          items:
            type: object

    LagekartePoi:
      type: object
      properties:
        id:
          type: string
        lagekarteId:
          type: string
        type:
          $ref: '#/components/schemas/PoiType'
        name:
          type: string
          nullable: true
        adresse:
          type: string
          nullable: true
        latitude:
          type: number
        longitude:
          type: number
        icon:
          type: string
          nullable: true
        metadata:
          type: object
          nullable: true

    PoiType:
      type: string
      enum:
        - EINSATZORT
        - EINSATZABSCHNITT
        - EINSATZLEITUNG
        - FAHRZEUG
        - EINHEIT
        - GEFAHRENQUELLE
        - SPERRBEREICH
        - VERSORGUNGSPUNKT
        - BEREITSTELLUNGSRAUM
        - BEHANDLUNGSPLATZ
        - SAMMELSTELLE
        - UNTERKUNFT
        - SONSTIGES

    CreatePoiDto:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/PoiType'
        name:
          type: string
        adresse:
          type: string
        latitude:
          type: number
        longitude:
          type: number
        icon:
          type: string
        metadata:
          type: object
      required:
        - type

    UpdatePoiDto:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/PoiType'
        name:
          type: string
        adresse:
          type: string
        latitude:
          type: number
        longitude:
          type: number
        icon:
          type: string
        metadata:
          type: object
```

**Rationale für `/einsatz/{id}/lagekarte` Route-Struktur:**
- ✅ **RESTful Resource Nesting** - Lagekarte ist Sub-Resource von Einsatz
- ✅ **Konsistent mit bestehendem API-Pattern** - `/einsatz/{id}/etb` bereits vorhanden
- ✅ **Intuitiver für Frontend** - User navigiert von Einsatz → Lagekarte
- ✅ **Authorization vereinfacht** - Einsatz-ID für Permission-Check ausreichend

---
