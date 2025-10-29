# Epic 48 - Lagekarte: Manual Test Plan

**Test Date:** [Leer lassen für Tester]
**Tester:** [Leer lassen für Tester]
**Branch:** bluelight-hub-48-lagekarte
**Test Environment:** [Leer lassen für Tester]
**Application URL:** http://localhost:3001

---

## 🎯 Test Scope

**Features to test:**
- ✅ Story 48.1: Basic Map Ansicht (OSM Tiles, Zoom, Pan, Dark Mode)
- ✅ Story 48.2: POI Management System (Backend CRUD, Geocoding)
- ✅ Story 48.3: Multi-POI Marker (Icons, Clustering, Popups)
- ✅ Story 48.4: POI-Platzierung (Manual Placement, Drag & Drop, Delete)
- ✅ Story 48.5: Drawing Tools (Polygon, Linie, Rechteck, Labels)
- ✅ Story 48.6: Marker Clustering (Performance, Scalability)
- ✅ Story 48.7: Offline-Tile-Download (Region Selection, Progress, Storage)
- ✅ Story 48.8: Backend-State-Persistierung (Auto-Save, Offline-First)
- ✅ Story 48.9: ETB-Screenshot-Export (Capture, Upload, Lightbox)
- ✅ Story 48.10: Layout-Modi (Standard, Fullscreen, Presentation)

**Test Coverage:**
- ✅ Functional Testing
- ✅ UI/UX Testing
- ✅ Accessibility Testing
- ✅ Cross-Browser Testing
- ✅ Mobile Testing
- ✅ Offline Testing
- ✅ Integration Testing
- ✅ Performance Testing
- ✅ Security Testing

---

## 📋 Pre-Test Setup

**Required:**
1. [x] Application läuft auf http://localhost:3001
2. [x] Browser DevTools geöffnet (Console + Network Tab)
3. [x] Test-Account angelegt und eingeloggt
4. [x] Mindestens ein Test-Einsatz vorhanden
5. [x] Offline-Modus testbar (DevTools Network → Offline)
6. [x] Dark Mode Toggle verfügbar im System/Browser

**Test-Daten vorbereiten:**
- Test-Account: `test@bluelight-hub.local` (oder eigener Account)
- Test-Einsatz: Mindestens ein Einsatz mit Adresse (für Geocoding)
- Test-Browser: Chrome, Firefox, Safari, Edge

**Tools:**
- Browser DevTools (Performance, Network, Console)
- Lighthouse (für Performance-Tests)
- Screen Reader (für Accessibility-Tests)

---

## Test Cases

---

## 📍 Story 48.1: Basic Map Ansicht

### TC-48.1.1: Map Initialization ✅
**Priority:** HIGH
**Test Type:** Functional
**Prerequisites:** Eingeloggt, Einsatz vorhanden

**Steps:**
1. Navigiere zu `/app/einsatz/<einsatzId>/übersicht/karte`
2. Warte auf Map-Load (max 5 Sekunden)
3. Prüfe Map-Center und Zoom-Level

**Expected Result:**
- [x] Route ist erreichbar (kein 404-Error)
- [x] Map wird angezeigt mit OSM-Tiles
- [x] Default-Center ist Deutschland-Mitte (51.1657, 10.4515)
- [x] Default-Zoom ist 6
- [x] Loading-Spinner erscheint während Tile-Loading
- [x] Keine Console-Errors

**Actual Result:** PASS
**Status:** PASS
**Notes:**

---

### TC-48.1.2: Map Navigation (Zoom & Pan)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte
2. Klicke Zoom-In-Button (+) zweimal
3. Klicke Zoom-Out-Button (-) einmal
4. Verwende Mouse-Wheel zum Zoomen (Scroll hoch/runter)
5. Drag die Map mit der Maus (Pan)

**Expected Result:**
- [x] Zoom-In funktioniert (Map wird näher)
- [x] Zoom-Out funktioniert (Map wird weiter weg)
- [x] Mouse-Wheel-Zoom funktioniert
- [x] Drag funktioniert smooth ohne Ruckeln
- [x] Keine Performance-Issues (<60 FPS)

**Actual Result:** PASS
**Status:** PASS
**Notes:**

---

### TC-48.1.3: Dark Mode Toggle
**Priority:** MEDIUM
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte im Light-Mode
2. Toggle Dark-Mode im System/Browser
3. Prüfe Tile-URL-Wechsel (DevTools Network Tab)
4. Toggle zurück zu Light-Mode

**Expected Result:**
- [x] Light-Mode zeigt OSM-Tiles (tile.openstreetmap.org)
- [x] Dark-Mode zeigt CartoDB Dark Matter Tiles (basemaps.cartocdn.com/dark_all)
- [x] Wechsel erfolgt ohne Page-Reload
- [x] UI-Elemente (Toolbar, Buttons) passen sich an Dark-Mode an
- [x] Keine visuellen Inkonsistenzen

**Actual Result:** PASS
**Status:** PASS
**Notes:**

---

### TC-48.1.4: Tile Loading Error Handling
**Priority:** MEDIUM
**Test Type:** Error Handling

**Steps:**
1. Öffne DevTools → Network Tab
2. Throttle Network zu "Offline"
3. Navigiere zu Lagekarte (oder reload Page)
4. Prüfe Error-State

**Expected Result:**
- [x] Error-Badge erscheint mit Message "Kartenbilder konnten nicht geladen werden"
- [x] Retry-Button ist vorhanden
- [x] Klick auf Retry lädt Tiles erneut
- [x] Keine Console-Exceptions (nur Tile-404-Errors)

**Actual Result:** PASS
**Status:** PASS
**Notes:**

---

### TC-48.1.5: Mobile Responsiveness (Map Height)
**Priority:** HIGH
**Test Type:** Responsive Design

**Steps:**
1. Öffne Lagekarte auf Desktop (>768px Breite)
2. Messe Map-Height (DevTools)
3. Resize Fenster auf Mobile (<768px Breite)
4. Messe Map-Height erneut

**Expected Result:**
- [x] Desktop: Map-Height ist `calc(100vh - 120px)` (volle Höhe minus Header)
- [x] Mobile: Map-Height ist `600px` (fixed Height)
- [!] Map ist vollständig sichtbar ohne Overflow
- [x] Touch-Zoom funktioniert auf Mobile (Pinch-to-Zoom)
- [x] Touch-Pan funktioniert (Swipe)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🗄️ Story 48.2: POI-Management-System (Backend)

### TC-48.2.1: Initial POI Creation (EINSATZORT)
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Erstelle neuen Einsatz mit Adresse (z.B. "Berliner Str. 123, 10115 Berlin")
2. Navigiere zu `/app/einsatz/<einsatzId>/übersicht/karte`
3. Prüfe ob initial POI erstellt wurde
4. Klicke auf EINSATZORT-Marker

**Expected Result:**
- [ ] EINSATZORT-Marker ist sichtbar (rotes Icon, größer als andere)
- [ ] Marker ist an korrekter Position (Geocoding funktioniert)
- [ ] Popup zeigt Name="EINSATZORT", Type="EINSATZORT", Adresse
- [ ] Backend: GET /einsatz/{id}/lagekarte/poi liefert EINSATZORT

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.2.2: Geocoding Service (Nominatim API)
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Öffne DevTools → Network Tab
2. Erstelle neuen POI mit Adresse (ohne Koordinaten)
3. Prüfe Network-Request zu Nominatim

**Expected Result:**
- [ ] POST /einsatz/{id}/lagekarte/poi mit `address` Field
- [ ] Backend macht Request zu `nominatim.openstreetmap.org/search`
- [ ] Geocoding liefert `lat` und `lon`
- [ ] POI wird mit Koordinaten gespeichert
- [ ] Rate-Limiting: 1 Request/Sekunde (prüfe bei mehreren POIs)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.2.3: POI CRUD Operations (Backend API)
**Priority:** HIGH
**Test Type:** API Integration

**Steps:**
1. Erstelle POI via API: POST /einsatz/{id}/lagekarte/poi
2. Lese POI: GET /einsatz/{id}/lagekarte/poi
3. Update POI: PATCH /einsatz/{id}/lagekarte/poi/{poiId}
4. Lösche POI: DELETE /einsatz/{id}/lagekarte/poi/{poiId}

**Expected Result:**
- [ ] POST: 201 Created, POI in Response mit `id`, `type`, `latitude`, `longitude`
- [ ] GET: 200 OK, Array mit allen POIs
- [ ] PATCH: 200 OK, Updated POI in Response
- [ ] DELETE: 204 No Content
- [ ] Gelöschter POI erscheint nicht mehr in GET

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.2.4: POI Type Enum Validation
**Priority:** MEDIUM
**Test Type:** Validation

**Steps:**
1. Versuche POI mit ungültigem Type zu erstellen: POST mit `type: "INVALID_TYPE"`
2. Prüfe Backend-Response

**Expected Result:**
- [ ] Backend liefert 400 Bad Request
- [ ] Error-Message: "type must be a valid enum value"
- [ ] Valide Types: EINSATZORT, FAHRZEUG, PERSON, GEBAUDE, GEFAHRENSTELLE, VERSORGUNG, SANITAET, FEUERWEHR, POLIZEI, RW, THW, BEREITSTELLUNG, SONSTIGES

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 📌 Story 48.3: Multi-POI Marker

### TC-48.3.1: Multi-POI Rendering
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Erstelle 5 POIs mit verschiedenen Types (FAHRZEUG, PERSON, GEBAUDE, GEFAHRENSTELLE, VERSORGUNG)
2. Navigiere zu Lagekarte
3. Prüfe ob alle POIs als Marker angezeigt werden

**Expected Result:**
- [ ] Alle 5 POIs sind sichtbar als Marker
- [ ] Jeder POI-Type hat korrektes Icon (siehe poi-icons.ts)
- [ ] EINSATZORT ist größer (32px) als andere (24px)
- [ ] Icons haben korrekte Farben (Rot, Blau, Grün, etc.)
- [ ] Keine fehlenden Marker

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.3.2: POI Popup Details
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Klicke auf verschiedene POI-Marker (mindestens 3 verschiedene Types)
2. Prüfe Popup-Content

**Expected Result:**
- [ ] Popup öffnet sich bei Klick
- [ ] Popup zeigt POI-Name
- [ ] Popup zeigt POI-Type
- [ ] Popup zeigt Adresse (falls vorhanden)
- [ ] Popup hat korrekte Farbe basierend auf Type
- [ ] Klick auf anderen Marker schließt vorheriges Popup

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.3.3: Map Auto-Zoom zu POI-Bounding-Box
**Priority:** MEDIUM
**Test Type:** Functional

**Steps:**
1. Erstelle 3 POIs an verschiedenen Positionen (z.B. Berlin, München, Hamburg)
2. Reload Lagekarte
3. Prüfe initial Map-Zoom

**Expected Result:**
- [ ] Map zoomt automatisch zu Bounding-Box aller POIs
- [ ] Alle POIs sind sichtbar ohne Scrollen
- [ ] Zoom-Level ist angemessen (nicht zu nah, nicht zu weit)
- [ ] Fallback: Wenn keine POIs → Deutschland-Zentrum (Zoom 6)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.3.4: Invalid POI Handling (Koordinaten)
**Priority:** MEDIUM
**Test Type:** Error Handling

**Steps:**
1. Erstelle POI mit ungültigen Koordinaten via API: `latitude: NaN, longitude: null`
2. Prüfe Frontend-Rendering

**Expected Result:**
- [ ] POI wird übersprungen (nicht gerendert)
- [ ] Warning-Badge erscheint: "X POIs konnten nicht angezeigt werden"
- [ ] Console-Log mit Details (welche POIs übersprungen)
- [ ] Keine Console-Exceptions
- [ ] Map bleibt funktionsfähig

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.3.5: POI Loading State
**Priority:** MEDIUM
**Test Type:** UI/UX

**Steps:**
1. Öffne DevTools → Network Tab → Throttle zu "Slow 3G"
2. Reload Lagekarte
3. Beobachte Loading-State

**Expected Result:**
- [ ] Loading-Spinner erscheint in oberer rechter Ecke
- [ ] Spinner verschwindet wenn POIs geladen
- [ ] POIs erscheinen smooth (keine visuellen Glitches)
- [ ] Keine duplicate POIs

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## ✏️ Story 48.4: POI-Platzierung (Manual Placement)

### TC-48.4.1: POI-Toolbar Visibility
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte
2. Prüfe POI-Toolbar (oben links auf Desktop, unten auf Mobile)

**Expected Result:**
- [ ] POI-Toolbar ist sichtbar
- [ ] Desktop: Vertical Sidebar (left-4 top-20)
- [ ] Mobile: Horizontal Bottom-Bar (bottom-16)
- [ ] "POI platzieren" Button ist sichtbar
- [ ] Glassmorphism-Design (backdrop-blur)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.2: POI-Type Selection (Häufige Typen)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Klicke "POI platzieren" Button
2. Prüfe expanded Toolbar mit POI-Types
3. Klicke auf einen häufigen Type (z.B. FAHRZEUG)

**Expected Result:**
- [ ] Toolbar expandiert (Smooth Animation)
- [ ] 6 häufige Types sind sichtbar (FAHRZEUG, PERSON, GEFAHRENSTELLE, VERSORGUNG, SANITAET, FEUERWEHR)
- [ ] Icons sind klar erkennbar (Phosphor Icons)
- [ ] Klick auf Type aktiviert Placement-Mode (blauer Glow-Effekt)
- [ ] Cursor ändert sich zu Crosshair (CSS `cursor: crosshair`)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.3: POI-Type Selection (Erweiterte Typen)
**Priority:** MEDIUM
**Test Type:** Functional

**Steps:**
1. Klicke "POI platzieren" Button
2. Klicke "Erweitert" Dropdown
3. Wähle einen erweiterten Type (z.B. POLIZEI)

**Expected Result:**
- [ ] Dropdown öffnet sich (Headless UI Menu)
- [ ] 7 erweiterte Types sind sichtbar (POLIZEI, RW, THW, BEREITSTELLUNG, GEBAUDE, EINSATZORT, SONSTIGES)
- [ ] Klick auf Type aktiviert Placement-Mode
- [ ] Dropdown schließt sich automatisch

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.4: POI Manual Placement
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Aktiviere Placement-Mode (z.B. FAHRZEUG-Type)
2. Klicke auf Map an beliebiger Stelle
3. Prüfe ob Modal öffnet

**Expected Result:**
- [ ] Modal öffnet sich sofort nach Klick
- [ ] Modal-Header zeigt ausgewählten POI-Type mit Icon
- [ ] Modal-Content zeigt Form mit Feldern: Name, Adresse, Koordinaten
- [ ] Name-Field ist required (*)
- [ ] Koordinaten sind pre-filled mit Klick-Koordinaten
- [ ] Adresse-Field zeigt Hinweis "Geocoding derzeit nicht verfügbar" (bekanntes Issue)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.5: POI Creation via Modal (Valid Input)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne POI-Placement-Modal (via Map-Klick)
2. Gib validen Namen ein (min 3 chars): "Test Fahrzeug"
3. Optional: Ändere Koordinaten
4. Klicke "Speichern"

**Expected Result:**
- [ ] Loading-Spinner im Submit-Button während API-Call
- [ ] Modal schließt sich nach erfolgreicher Erstellung
- [ ] Neuer POI erscheint sofort auf Karte
- [ ] POI hat korrekte Position (Koordinaten aus Form)
- [ ] POI hat korrektes Icon (ausgewählter Type)
- [ ] Console: Keine Errors

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.6: POI Creation Validation (Invalid Input)
**Priority:** MEDIUM
**Test Type:** Validation

**Steps:**
1. Öffne POI-Placement-Modal
2. Lasse Name-Field leer
3. Klicke "Speichern"
4. Gib zu kurzen Namen ein (z.B. "ab")
5. Klicke "Speichern"

**Expected Result:**
- [ ] Error-Message erscheint bei leerem Name: "Name ist erforderlich"
- [ ] Error-Message bei <3 chars: "Mindestens 3 Zeichen erforderlich"
- [ ] Error-Message ist rot und unterhalb des Feldes
- [ ] Submit-Button ist disabled wenn Validation fehlschlägt
- [ ] Modal schließt sich nicht bei Validation-Fehler

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.7: POI Drag & Drop
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Erstelle POI auf Karte
2. Hover über POI-Marker
3. Drag Marker zu anderer Position
4. Release Mouse-Button
5. Reload Page und prüfe Position

**Expected Result:**
- [ ] POI-Marker ist draggable (Cursor ändert sich zu Grab)
- [ ] Drag funktioniert smooth ohne Ruckeln
- [ ] POI-Position wird während Drag aktualisiert
- [ ] Nach Release: Backend-Update via PATCH API
- [ ] Nach Reload: POI ist an neuer Position
- [ ] Console-Log: "POI verschoben" (Note: Toast fehlt laut UX-Review)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.8: POI Delete (Rechtsklick)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Erstelle POI auf Karte
2. Rechtsklick auf POI-Marker
3. Prüfe Delete-Confirmation-Dialog
4. Klicke "Löschen"

**Expected Result:**
- [ ] Rechtsklick öffnet Context-Menu mit "Löschen"-Option
- [ ] Klick auf "Löschen" öffnet Confirmation-Dialog (Headless UI)
- [ ] Dialog zeigt POI-Name und Type
- [ ] Dialog hat "Abbrechen" und "Löschen" Buttons
- [ ] Klick "Löschen" → POI verschwindet von Karte
- [ ] Backend: DELETE API-Call
- [ ] Console-Log: "POI gelöscht" (Note: Toast fehlt laut UX-Review)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.4.9: POI Placement Abbrechen
**Priority:** MEDIUM
**Test Type:** Functional

**Steps:**
1. Aktiviere Placement-Mode (z.B. PERSON-Type)
2. Klicke "Abbrechen" Button in Toolbar
3. Prüfe ob Placement-Mode deaktiviert wird

**Expected Result:**
- [ ] "Abbrechen" Button ist prominent sichtbar (rot)
- [ ] Klick deaktiviert Placement-Mode
- [ ] Cursor wechselt zurück von Crosshair zu normal
- [ ] Toolbar collapsed zurück zu "POI platzieren" Button
- [ ] Keine Map-Interaction (Klick macht nichts)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🖍️ Story 48.5: Drawing Tools

### TC-48.5.1: Drawing-Toolbar Visibility
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte
2. Prüfe Drawing-Toolbar Position

**Expected Result:**
- [ ] Drawing-Toolbar ist sichtbar
- [ ] Desktop: Position ist oben links, unterhalb POI-Toolbar (left-4 top-40)
- [ ] Mobile: Position ist horizontal unten (bottom-16)
- [ ] 5 Tool-Buttons sind sichtbar: Polygon, Linie, Rechteck, Bearbeiten, Löschen
- [ ] Icons sind klar erkennbar (Phosphor Icons)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]
**Known Issue:** Story 48.5 Zeile 617-640 dokumentiert Toolbar-Position-Bug (top-[28rem] statt top-40). Falls Toolbar unten links ist: KNOWN BUG!

---

### TC-48.5.2: Polygon Drawing
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Klicke "Polygon" Button in Drawing-Toolbar
2. Klicke mehrere Punkte auf Map (mindestens 3)
3. Doppelklick oder Klick auf ersten Punkt zum Schließen

**Expected Result:**
- [ ] Polygon-Mode aktiviert (Button hat blauen Glow)
- [ ] Jeder Klick setzt Eckpunkt (visibles Feedback)
- [ ] Polygon wird live während Zeichnen angezeigt
- [ ] Doppelklick schließt Polygon
- [ ] Geschlossenes Polygon hat Füllung (Farbe basierend auf Type)
- [ ] Shape-Label-Modal öffnet sich automatisch nach Fertigstellung

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.3: Polyline Drawing (Linie)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Klicke "Linie" Button in Drawing-Toolbar
2. Klicke mehrere Punkte auf Map
3. Doppelklick zum Abschließen

**Expected Result:**
- [ ] Polyline-Mode aktiviert
- [ ] Linie wird live während Zeichnen angezeigt
- [ ] Doppelklick beendet Linie
- [ ] Linie hat korrekte Farbe und Breite (z.B. grün für Rettungsweg)
- [ ] Shape-Label-Modal öffnet sich

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.4: Rectangle Drawing
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Klicke "Rechteck" Button in Drawing-Toolbar
2. Klicke ersten Punkt (Ecke)
3. Drag zu zweiter Ecke (diagonal)
4. Release Mouse-Button

**Expected Result:**
- [ ] Rectangle-Mode aktiviert
- [ ] Rechteck wird live während Drag angezeigt
- [ ] Release erzeugt finales Rechteck
- [ ] Rechteck hat Füllung und Border
- [ ] Shape-Label-Modal öffnet sich

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.5: Shape Labeling
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Zeichne beliebiges Shape (Polygon, Linie, Rechteck)
2. Prüfe Shape-Label-Modal
3. Gib Label ein: "Evakuierungszone Nord"
4. Wähle Type: "Gefahrenbereich"
5. Klicke "Speichern"

**Expected Result:**
- [ ] Modal öffnet sich automatisch nach Shape-Creation
- [ ] Modal zeigt Form mit Label-Input und Type-Dropdown
- [ ] Label-Input erlaubt max 255 Zeichen
- [ ] Type-Dropdown zeigt Optionen: Gefahrenbereich, Sperrbereich, Rettungsweg, Absperrung, Sonstiges
- [ ] Klick "Speichern" schließt Modal
- [ ] Shape-Properties werden aktualisiert (`shape.properties.label`, `shape.properties.type`)
- [ ] Shape-Farbe passt sich Type an (z.B. rot für Gefahrenbereich)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.6: Shape Editing (Eckpunkte verschieben)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Zeichne Polygon auf Karte
2. Klicke "Bearbeiten" Button in Drawing-Toolbar
3. Klicke auf Shape zum Aktivieren
4. Drag Eckpunkte zu neuen Positionen
5. Klicke "Bearbeiten" erneut zum Deaktivieren

**Expected Result:**
- [ ] Edit-Mode aktiviert (Button hat blauen Glow)
- [ ] Klick auf Shape zeigt Eckpunkte als Handles (kleine Kreise)
- [ ] Drag von Eckpunkten funktioniert smooth
- [ ] Shape-Form wird während Edit aktualisiert
- [ ] Deaktivieren des Edit-Modes speichert Änderungen
- [ ] Backend-Save wird ausgelöst (Auto-Save nach 2s)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.7: Shape Deletion
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Zeichne Shape auf Karte
2. Klicke "Löschen" Button in Drawing-Toolbar
3. Klicke auf Shape
4. Prüfe Confirmation-Dialog
5. Klicke "Löschen"

**Expected Result:**
- [ ] Delete-Mode aktiviert
- [ ] Klick auf Shape öffnet Confirmation-Dialog (Headless UI)
- [ ] Dialog zeigt Shape-Label (falls vorhanden)
- [ ] Dialog hat "Abbrechen" und "Löschen" Buttons
- [ ] Klick "Löschen" entfernt Shape von Karte
- [ ] Backend-Save wird ausgelöst

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.8: Shape Styling (Farben basierend auf Type)
**Priority:** MEDIUM
**Test Type:** Visual

**Steps:**
1. Zeichne 5 Shapes mit verschiedenen Types:
   - Polygon: Gefahrenbereich
   - Polygon: Sperrbereich
   - Linie: Rettungsweg
   - Linie: Absperrung
   - Rechteck: Sonstiges

**Expected Result:**
- [ ] Gefahrenbereich: Rot (#ef4444), Opacity 0.3
- [ ] Sperrbereich: Orange (#f97316), Opacity 0.3
- [ ] Rettungsweg: Grün (#10b981), gestrichelt (dashed)
- [ ] Absperrung: Gelb (#eab308), durchgezogen
- [ ] Sonstiges: Blau (#3b82f6), Opacity 0.2
- [ ] Alle Farben sind klar unterscheidbar

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.9: Shape Limit (Max 100 Shapes)
**Priority:** MEDIUM
**Test Type:** Edge Case

**Steps:**
1. Zeichne 100 Shapes auf Karte (oder erstelle via API)
2. Versuche 101. Shape zu zeichnen

**Expected Result:**
- [ ] 100. Shape wird erfolgreich erstellt
- [ ] 101. Shape: Toast-Warning erscheint "Maximum von 100 Shapes erreicht"
- [ ] 101. Shape wird NICHT zur Karte hinzugefügt
- [ ] Keine Console-Errors

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.5.10: Layer-Toggle (Drawing-Layer ein-/ausblenden)
**Priority:** MEDIUM
**Test Type:** Functional

**Steps:**
1. Zeichne mindestens 3 Shapes auf Karte
2. Klicke Layer-Toggle (obere rechte Ecke)
3. Deaktiviere "Drawing-Layer"
4. Aktiviere "Drawing-Layer" erneut

**Expected Result:**
- [ ] Layer-Toggle ist sichtbar (right-4 top-20)
- [ ] Toggle zeigt "POI-Layer" und "Drawing-Layer" Switches
- [ ] Deaktivieren: Alle Shapes verschwinden von Karte
- [ ] Aktivieren: Alle Shapes erscheinen wieder
- [ ] Switches sind animiert (Smooth Transition)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🔀 Story 48.6: Marker Clustering

### TC-48.6.1: Automatic Clustering (3+ POIs)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Erstelle 5 POIs in enger Nähe (z.B. innerhalb 100m Radius)
2. Zoome Map zu Zoom-Level 12
3. Prüfe ob POIs geclustert werden

**Expected Result:**
- [ ] Bei Zoom-Level ≤12: POIs werden zu Cluster kombiniert
- [ ] Cluster-Icon zeigt Anzahl der POIs (z.B. "5")
- [ ] Cluster-Icon hat blaue Farbe (bg-blue-600)
- [ ] Einzelne POI-Icons sind nicht sichtbar (nur Cluster)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.6.2: Cluster Zoom-In (Aufteilen)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Erstelle Cluster mit 5 POIs (siehe TC-48.6.1)
2. Klicke auf Cluster-Icon
3. Beobachte Zoom-Verhalten

**Expected Result:**
- [ ] Klick auf Cluster → Map zoomt automatisch näher
- [ ] Cluster wird aufgeteilt in kleinere Cluster oder einzelne POIs
- [ ] Zoom-Animation ist smooth (keine Ruckler)
- [ ] Bei Max-Zoom (18): Alle POIs werden einzeln angezeigt (Spiderfy-Mode bei Overlap)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.6.3: Cluster Re-Clustering (Zoom-Out)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Zoome Map sehr nah (Zoom 18) mit 10 POIs
2. Zoome Map langsam raus (Zoom-Out bis Zoom 10)
3. Beobachte Clustering-Verhalten

**Expected Result:**
- [ ] Zoom 18: Alle POIs einzeln sichtbar
- [ ] Zoom 15: POIs beginnen zu clustern (2-3 kleine Cluster)
- [ ] Zoom 12: Wenige große Cluster (1-2 Cluster)
- [ ] Zoom 10: Ein großer Cluster (alle POIs)
- [ ] Re-Clustering ist automatisch und smooth

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.6.4: Cluster Icon Sizing (Dynamic)
**Priority:** MEDIUM
**Test Type:** Visual

**Steps:**
1. Erstelle 3 Cluster mit unterschiedlicher POI-Anzahl:
   - Cluster A: 3 POIs
   - Cluster B: 20 POIs
   - Cluster C: 100 POIs

**Expected Result:**
- [ ] Cluster A: Klein (w-8 h-8, ca. 32px)
- [ ] Cluster B: Mittel (w-10 h-10, ca. 40px)
- [ ] Cluster C: Groß (w-12 h-12, ca. 48px)
- [ ] Größe korreliert mit POI-Anzahl (visuelle Hierarchie)
- [ ] Zahlen sind lesbar (min 12px Schriftgröße)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.6.5: Performance Test (1000 POIs)
**Priority:** HIGH
**Test Type:** Performance

**Steps:**
1. Generiere 1000 POIs via API (random Koordinaten in Deutschland)
2. Navigiere zu Lagekarte
3. Messe Initial Load Time (Chrome DevTools Performance Tab)
4. Zoom und Pan durch Map

**Expected Result:**
- [ ] Initial Load: <3 Sekunden bis Map interaktiv (IV1 Acceptance Criteria)
- [ ] Clustering reduziert DOM-Nodes: ~20-50 Cluster statt 1000 Marker
- [ ] Zoom/Pan ist smooth (>30 FPS)
- [ ] Keine Browser-Freezes oder Hangs
- [ ] Memory Footprint: <50 MB

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 📡 Story 48.7: Offline-Tile-Download

### TC-48.7.1: Offline-Download-Button Visibility
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte
2. Prüfe Lagekarte-Toolbar (oben rechts oder oben links)

**Expected Result:**
- [ ] "Offline-Download" Button ist sichtbar
- [ ] Button hat Cloud-Download-Icon
- [ ] Button ist aktivierbar (nicht disabled)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.2: Offline-Region-Modal (Bounding-Box-Auswahl)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Klicke "Offline-Download" Button
2. Prüfe Modal-Content
3. Drag Rectangle auf Region-Selection-Map

**Expected Result:**
- [ ] Modal öffnet sich (Headless UI Dialog)
- [ ] Modal zeigt Region-Selection-Map (separate Map-Instance)
- [ ] User kann Rectangle auf Map drawen (Bounding-Box)
- [ ] Rechteck ist visuell sichtbar (blaue Border)
- [ ] Koordinaten werden in Modal-Form angezeigt (North, South, East, West)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.3: Zoom-Level-Slider (8-18)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Offline-Region-Modal
2. Prüfe Zoom-Level-Slider
3. Bewege Slider von 8 zu 18 und zurück

**Expected Result:**
- [ ] Slider ist sichtbar mit Range 8-18
- [ ] Default-Wert ist 15
- [ ] Slider zeigt aktuellen Wert (z.B. "Zoom: 15")
- [ ] Tile-Count und Size-Estimation aktualisieren sich live
- [ ] Warning bei >1000 Tiles: "Großer Download!"

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.4: Tile-Count & Size Estimation
**Priority:** MEDIUM
**Test Type:** Calculation

**Steps:**
1. Öffne Offline-Region-Modal
2. Wähle kleine Region (z.B. 5km x 5km)
3. Setze Zoom-Level 12
4. Prüfe Tile-Count und Size-Estimation

**Expected Result:**
- [ ] Tile-Count wird angezeigt (z.B. "~250 Tiles")
- [ ] Size-Estimation wird angezeigt (z.B. "~7.5 MB")
- [ ] Bei >1000 Tiles: Warning-Banner erscheint
- [ ] Calculation ist korrekt (1 Tile ≈ 30 KB)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.5: Storage-Quota-Check (<10% Warning)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Offline-Region-Modal
2. Prüfe Storage-Quota-Anzeige
3. Wähle sehr große Region (>50% Quota)

**Expected Result:**
- [ ] Storage-Quota wird angezeigt (z.B. "Speicher: 20 MB / 100 MB verfügbar")
- [ ] Bei <10% Free Space: Warning-Banner erscheint (orange)
- [ ] Bei <10%: Download-Button ist disabled mit Tooltip "Nicht genug Speicher"
- [ ] User kann Modal schließen ohne Download

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.6: Tile Download mit Progress-Bar
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Offline-Region-Modal
2. Wähle kleine Region (~100 Tiles)
3. Klicke "Download starten"
4. Beobachte Progress

**Expected Result:**
- [ ] Download startet sofort
- [ ] Progress-Bar erscheint (0% → 100%)
- [ ] Prozent-Anzeige aktualisiert sich live (z.B. "25% - 25/100 Tiles")
- [ ] Download dauert <30 Sekunden für 100 Tiles (4G)
- [ ] Success-Toast erscheint: "Tiles erfolgreich heruntergeladen"
- [ ] Modal schließt sich automatisch

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.7: Offline-Tile-Fallback (DevTools Offline-Mode)
**Priority:** HIGH
**Test Type:** Offline Testing

**Steps:**
1. Downloade Tiles für kleine Region (siehe TC-48.7.6)
2. Öffne DevTools → Network Tab → Toggle "Offline"
3. Pan/Zoom Map innerhalb downloaded Region
4. Pan/Zoom Map außerhalb downloaded Region

**Expected Result:**
- [ ] Innerhalb Region: Tiles werden aus IndexedDB geladen (Offline-Fallback)
- [ ] Keine Network-Requests zu OSM
- [ ] Tiles erscheinen normal (keine Broken-Image-Icons)
- [ ] Außerhalb Region: Tiles fehlen (graue Flächen), aber Map bleibt funktionsfähig
- [ ] Error-Badge erscheint: "Kartenbilder konnten nicht geladen werden"

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.7.8: 30-Tage-TTL Auto-Cleanup
**Priority:** MEDIUM
**Test Type:** Cleanup Logic

**Steps:**
1. Prüfe IndexedDB-Storage (DevTools → Application → IndexedDB)
2. Ändere System-Time zu +31 Tage in Zukunft (oder manipuliere Tile-Timestamp)
3. Reload App
4. Prüfe IndexedDB erneut

**Expected Result:**
- [ ] Initial: Tiles sind in IndexedDB (`leaflet.offline` Database)
- [ ] Nach TTL: Tiles werden automatisch gelöscht (Cleanup on App startup)
- [ ] Storage-Quota wird freigegeben
- [ ] Cleanup dauert <200ms (async, non-blocking)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 💾 Story 48.8: Backend-State-Persistierung

### TC-48.8.1: Auto-Save (Debounced 2s)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte
2. Zeichne Polygon auf Karte
3. Warte 2 Sekunden ohne weitere Änderungen
4. Prüfe DevTools Network Tab

**Expected Result:**
- [ ] Nach 2s Inaktivität: POST /einsatz/{id}/lagekarte Request
- [ ] Request-Body enthält GeoJSON FeatureCollection mit gezeichnetem Shape
- [ ] Response: 200 OK oder 201 Created
- [ ] Keine Saves vor 2s Ablauf (Debouncing funktioniert)
- [ ] Bei weiteren Änderungen innerhalb 2s: Debounce-Timer resettet

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.8.2: State Persistierung (Shapes + POIs)
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Zeichne 2 Shapes (Polygon, Linie)
2. Erstelle 2 POIs
3. Warte 2s (Auto-Save)
4. Reload Page
5. Prüfe ob Shapes und POIs wiederhergestellt werden

**Expected Result:**
- [ ] Nach Reload: Alle 2 Shapes sind sichtbar
- [ ] Nach Reload: Alle 2 POIs sind sichtbar
- [ ] Shapes haben korrekte Position, Farbe, Label
- [ ] POIs haben korrekte Position, Icon, Name
- [ ] Backend: GET /einsatz/{id}/lagekarte liefert gespeicherten State

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.8.3: Loading-State (TanStack Query)
**Priority:** MEDIUM
**Test Type:** UI/UX

**Steps:**
1. Öffne DevTools → Network Tab → Throttle zu "Slow 3G"
2. Navigiere zu Lagekarte
3. Beobachte Loading-State

**Expected Result:**
- [ ] Loading-Spinner erscheint während Initial Load
- [ ] Map ist grau/disabled während Loading
- [ ] Spinner verschwindet wenn State geladen
- [ ] Shapes und POIs erscheinen smooth nach Load

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.8.4: Offline-First (TanStack Query networkMode)
**Priority:** HIGH
**Test Type:** Offline Testing

**Steps:**
1. Öffne Lagekarte (Online)
2. Zeichne Shape
3. Warte 2s (Auto-Save)
4. Öffne DevTools → Network Tab → Toggle "Offline"
5. Zeichne weiteres Shape
6. Toggle "Online" zurück
7. Warte 2s

**Expected Result:**
- [ ] Online: Shape wird sofort gespeichert (POST Request)
- [ ] Offline: Shape wird lokal gespeichert (kein Network-Request)
- [ ] Offline: Keine Error-Messages (TanStack Query queued Mutation)
- [ ] Online zurück: Queued Mutation wird automatisch ausgeführt
- [ ] Backend: Beide Shapes sind gespeichert

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.8.5: Conflict-Handling Warning (Last-Write-Wins)
**Priority:** MEDIUM
**Test Type:** Multi-User

**Steps:**
1. Öffne Lagekarte in zwei Browser-Tabs (User A, User B)
2. User A: Zeichne Shape, warte 2s (Auto-Save)
3. User B: Zeichne anderes Shape, warte 2s (Auto-Save)
4. User A: Reload Page

**Expected Result:**
- [ ] Warning-Banner erscheint in Lagekarte: "Automatische Speicherung aktiv. Bei gleichzeitiger Bearbeitung durch mehrere Nutzer kann es zu Datenverlust kommen."
- [ ] User B's Shape überschreibt User A's Shape (Last-Write-Wins)
- [ ] User A nach Reload: Nur User B's Shape ist sichtbar
- [ ] Keine Console-Errors oder 409-Conflicts

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 📸 Story 48.9: ETB-Screenshot-Export

### TC-48.9.1: ETB-Export-Button Visibility
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Öffne Lagekarte
2. Prüfe Toolbar (oben links oder oben rechts)

**Expected Result:**
- [ ] "ETB-Export" Button ist sichtbar
- [ ] Button hat Camera-Icon
- [ ] Button ist aktivierbar (nicht disabled)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.2: Screenshot Capture (modern-screenshot)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Zeichne 2 Shapes und erstelle 2 POIs auf Karte
2. Klicke "ETB-Export" Button
3. Beobachte Capture-Process

**Expected Result:**
- [ ] Loading-Indicator erscheint während Capture
- [ ] Screenshot wird generiert (modern-screenshot library)
- [ ] Screenshot-Resolution: min 1024x768, Scale: 2x für High-DPI
- [ ] Screenshot enthält Map, POIs, Shapes (alle visuellen Elemente)
- [ ] Screenshot-Format: JPEG (85% Quality)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.3: Screenshot Upload (Backend)
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Klicke "ETB-Export" Button
2. Prüfe DevTools Network Tab
3. Warte bis Upload abgeschlossen

**Expected Result:**
- [ ] POST Request zu /einsatz/{id}/lagekarte/screenshot
- [ ] Request-Content-Type: multipart/form-data
- [ ] Request-Body enthält Blob mit JPEG-Image
- [ ] Response: 200 OK oder 201 Created
- [ ] Response-Body: { filename: "...", path: "/uploads/lagekarte/..." }
- [ ] Success-Toast erscheint: "Screenshot erfolgreich erstellt"

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.4: ETB-Eintrag mit Metadata (Screenshot-Link)
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Klicke "ETB-Export" Button
2. Warte bis Success-Toast erscheint
3. Navigiere zu Einsatz-Übersicht → ETB (Elektronisches Tagebuch)
4. Prüfe neuesten ETB-Eintrag

**Expected Result:**
- [ ] ETB-Eintrag existiert mit Kategorie "DOKUMENTATION"
- [ ] Titel: "Lagekarten-Screenshot"
- [ ] Text: "Screenshot der Lagekarte exportiert am [Timestamp]"
- [ ] Metadata: `{ screenshot: "/uploads/lagekarte/..." }`
- [ ] Screenshot-Thumbnail ist in ETB sichtbar

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.5: Screenshot Lightbox-Preview (ETB View)
**Priority:** MEDIUM
**Test Type:** UI/UX

**Steps:**
1. Erstelle ETB-Screenshot (siehe TC-48.9.4)
2. Navigiere zu ETB-View
3. Klicke auf Screenshot-Thumbnail

**Expected Result:**
- [ ] Lightbox öffnet sich (Headless UI Dialog)
- [ ] Fullscreen-Screenshot wird angezeigt (hohe Qualität)
- [ ] Lightbox hat Close-Button (X)
- [ ] ESC-Key schließt Lightbox
- [ ] Click außerhalb Lightbox schließt Lightbox

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.6: Error Handling (Upload Failure)
**Priority:** HIGH
**Test Type:** Error Handling

**Steps:**
1. Simuliere Backend-Fehler (z.B. 500 Internal Server Error via DevTools)
2. Klicke "ETB-Export" Button
3. Prüfe Error-State

**Expected Result:**
- [ ] Error-Toast erscheint: "Screenshot-Upload fehlgeschlagen"
- [ ] Retry-Button ist im Toast vorhanden
- [ ] Klick auf Retry wiederholt Upload
- [ ] Nach 3 Failed Retries: Error-Dialog mit Kontakt-Info
- [ ] Keine Console-Exceptions

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.7: Cleanup bei ETB-Fehler (DELETE Endpoint)
**Priority:** MEDIUM
**Test Type:** Error Handling

**Steps:**
1. Mock ETB-Creation Failure (Backend liefert 500 nach Screenshot-Upload)
2. Klicke "ETB-Export" Button
3. Prüfe DevTools Network Tab

**Expected Result:**
- [ ] Screenshot wird hochgeladen (POST /lagekarte/screenshot) → Success
- [ ] ETB-Creation schlägt fehl (POST /etb) → 500 Error
- [ ] Frontend ruft DELETE /lagekarte/screenshot/{filename} auf (Cleanup)
- [ ] Screenshot wird vom Server gelöscht (kein orphaned File)
- [ ] Error-Toast: "ETB-Eintrag konnte nicht erstellt werden"

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.9.8: Security (Path Traversal Prevention)
**Priority:** HIGH
**Test Type:** Security

**Steps:**
1. Versuche malicious Filename via API: `DELETE /lagekarte/screenshot/../../etc/passwd`
2. Prüfe Backend-Response

**Expected Result:**
- [ ] Backend liefert 400 Bad Request
- [ ] Error-Message: "Invalid filename"
- [ ] File wird NICHT gelöscht (Path Traversal verhindert)
- [ ] Backend-Log: Security-Warning

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🖥️ Story 48.10: Layout-Modi

### TC-48.10.1: Standard-Mode (Default)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Navigiere zu Lagekarte (ohne `?mode` Query-Parameter)
2. Prüfe UI-Elemente

**Expected Result:**
- [ ] Mode ist "standard" (default)
- [ ] Toolbar (POI-Platzierung, Drawing, Offline, ETB) ist sichtbar
- [ ] Layer-Toggle ist sichtbar
- [ ] Warning-Banner (Auto-Save) ist sichtbar
- [ ] Map-Height: `600px` auf Mobile, `calc(100vh - 120px)` auf Desktop

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.10.2: Fullscreen-Mode
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Navigiere zu Lagekarte mit `?mode=fullscreen`
2. Prüfe UI-Elemente

**Expected Result:**
- [ ] Mode ist "fullscreen"
- [ ] Map nimmt volle Viewport-Height (`h-screen`)
- [ ] Toolbar ist NICHT sichtbar (versteckt)
- [ ] Layer-Toggle ist NICHT sichtbar
- [ ] Warning-Banner ist NICHT sichtbar
- [ ] Fullscreen-Close-Button ist sichtbar (oben rechts, fixed)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.10.3: Presentation-Mode
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Navigiere zu Lagekarte mit `?mode=presentation`
2. Prüfe UI-Elemente

**Expected Result:**
- [ ] Mode ist "presentation"
- [ ] Map nimmt volle Viewport-Height (`h-screen`)
- [ ] Toolbar ist NICHT sichtbar
- [ ] Layer-Toggle ist NICHT sichtbar
- [ ] Warning-Banner ist NICHT sichtbar
- [ ] Fullscreen-Close-Button ist NICHT sichtbar (kein Exit-Mechanismus)
- [ ] Nur Karte, POIs, Shapes sichtbar (maximaler Content)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.10.4: Fullscreen-Close-Button (ESC-Key)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Navigiere zu Fullscreen-Mode (`?mode=fullscreen`)
2. Drücke ESC-Key
3. Prüfe Navigation

**Expected Result:**
- [ ] ESC-Key triggert Navigation zurück zu Standard-Mode
- [ ] URL wechselt zu `?mode=standard` (oder ohne Query-Parameter)
- [ ] Toolbar und UI-Elemente erscheinen wieder
- [ ] Close-Button verschwindet

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.10.5: Fullscreen-Close-Button (Click)
**Priority:** HIGH
**Test Type:** Functional

**Steps:**
1. Navigiere zu Fullscreen-Mode (`?mode=fullscreen`)
2. Klicke Fullscreen-Close-Button (X, oben rechts)
3. Prüfe Navigation

**Expected Result:**
- [ ] Click triggert Navigation zurück zu Standard-Mode
- [ ] URL wechselt zu `?mode=standard`
- [ ] Toolbar und UI-Elemente erscheinen wieder

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-48.10.6: Mode Transitions (Standard ↔ Fullscreen)
**Priority:** MEDIUM
**Test Type:** UI/UX

**Steps:**
1. Start in Standard-Mode
2. Wechsle zu Fullscreen-Mode (via URL-Change)
3. Wechsle zurück zu Standard-Mode
4. Beobachte Transitions

**Expected Result:**
- [ ] Transition ist smooth (keine Sprünge)
- [ ] Map-State bleibt erhalten (Zoom, Center, POIs, Shapes)
- [ ] CSS-Transition für Height-Änderung (duration-300)
- [ ] Keine Console-Errors

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🔗 Cross-Feature Integration Tests

### TC-INT-001: POI + Drawing Layer Toggle
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Erstelle 3 POIs und 2 Shapes
2. Toggle POI-Layer OFF
3. Toggle Drawing-Layer OFF
4. Toggle beide ON

**Expected Result:**
- [ ] POI-Layer OFF: Nur Shapes sichtbar
- [ ] Drawing-Layer OFF: Nur POIs sichtbar
- [ ] Beide OFF: Leere Karte (nur Tiles)
- [ ] Beide ON: POIs und Shapes sichtbar
- [ ] Toggle ist unabhängig (keine gegenseitige Beeinflussung)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-INT-002: POI Drag während Drawing-Mode
**Priority:** MEDIUM
**Test Type:** Integration

**Steps:**
1. Aktiviere Drawing-Mode (z.B. Polygon)
2. Versuche POI zu draggen

**Expected Result:**
- [ ] Drawing-Mode verhindert POI-Drag (oder vice versa)
- [ ] Nur ein Mode ist aktiv gleichzeitig
- [ ] User bekommt Feedback (Cursor bleibt Crosshair)
- [ ] Keine Console-Errors

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-INT-003: Offline-Mode + Auto-Save
**Priority:** HIGH
**Test Type:** Integration

**Steps:**
1. Toggle DevTools Network → Offline
2. Zeichne Shape
3. Erstelle POI
4. Toggle Online
5. Warte 5 Sekunden

**Expected Result:**
- [ ] Offline: Shapes und POIs werden lokal erstellt (kein Network-Request)
- [ ] TanStack Query queued Mutations
- [ ] Online: Queued Mutations werden automatisch ausgeführt
- [ ] Backend: Alle Änderungen sind gespeichert
- [ ] Success-Toast: "Offline-Änderungen synchronisiert"

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-INT-004: Screenshot mit 50 POIs + 10 Shapes
**Priority:** MEDIUM
**Test Type:** Integration

**Steps:**
1. Erstelle 50 POIs (verschiedene Typen)
2. Zeichne 10 Shapes (Polygone, Linien)
3. Klicke ETB-Export
4. Prüfe Screenshot-Qualität

**Expected Result:**
- [ ] Screenshot wird erfolgreich generiert (kein Timeout)
- [ ] Alle 50 POIs sind im Screenshot sichtbar
- [ ] Alle 10 Shapes sind im Screenshot sichtbar
- [ ] Screenshot-Resolution: ≥1024x768
- [ ] Upload erfolgreich (<10 Sekunden)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-INT-005: Fullscreen-Mode + Offline-Tiles
**Priority:** MEDIUM
**Test Type:** Integration

**Steps:**
1. Downloade Offline-Tiles für kleine Region
2. Wechsle zu Fullscreen-Mode (`?mode=fullscreen`)
3. Toggle DevTools Network → Offline
4. Pan/Zoom in downloaded Region

**Expected Result:**
- [ ] Fullscreen-Mode funktioniert offline
- [ ] Tiles werden aus IndexedDB geladen
- [ ] Map bleibt interaktiv (Zoom, Pan)
- [ ] Fullscreen-Close-Button funktioniert

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 📱 Mobile Tests

### TC-MOB-001: Mobile Responsiveness (< 768px)
**Priority:** HIGH
**Test Type:** Responsive Design

**Steps:**
1. Öffne Lagekarte auf Mobile-Viewport (375x667px, iPhone SE)
2. Prüfe Layout-Elemente

**Expected Result:**
- [ ] POI-Toolbar: Horizontal Bottom-Bar (bottom-16, nicht top-20)
- [ ] Drawing-Toolbar: Horizontal Bottom-Bar (neben POI-Toolbar)
- [ ] Layer-Toggle: Oben rechts (bleibt gleich)
- [ ] Map-Height: 600px (fixed, nicht calc(100vh - 120px))
- [ ] Touch-Targets: min 44x44px (iOS-Guideline)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-MOB-002: Touch Gestures (Zoom, Pan)
**Priority:** HIGH
**Test Type:** Mobile Interaction

**Steps:**
1. Öffne Lagekarte auf Touch-Device oder DevTools Touch-Emulation
2. Pinch-to-Zoom (zwei Finger spread)
3. Touch-Pan (Swipe)

**Expected Result:**
- [ ] Pinch-to-Zoom funktioniert smooth
- [ ] Zoom-Level ändert sich korrekt
- [ ] Touch-Pan funktioniert (Swipe bewegt Map)
- [ ] Keine Scroll-Konflikte mit Page-Scroll

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-MOB-003: Touch Drawing
**Priority:** HIGH
**Test Type:** Mobile Interaction

**Steps:**
1. Öffne Lagekarte auf Touch-Device
2. Aktiviere Drawing-Mode (z.B. Polygon)
3. Zeichne Shape mit Touch (Finger-Taps)

**Expected Result:**
- [ ] Touch-Taps funktionieren statt Maus-Clicks
- [ ] Jeder Tap setzt Eckpunkt
- [ ] Double-Tap schließt Polygon
- [ ] Shape erscheint korrekt

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-MOB-004: POI Drag on Touch
**Priority:** HIGH
**Test Type:** Mobile Interaction

**Steps:**
1. Erstelle POI auf Karte
2. Verwende Touch-Drag (Finger halten + bewegen)
3. Release

**Expected Result:**
- [ ] Long-Press aktiviert Drag (ca. 500ms)
- [ ] Touch-Drag funktioniert smooth
- [ ] POI-Position wird aktualisiert
- [ ] Backend-Save nach Release

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-MOB-005: Mobile Performance (3G Network)
**Priority:** MEDIUM
**Test Type:** Performance

**Steps:**
1. Öffne DevTools → Network → Throttle zu "Slow 3G"
2. Öffne Lagekarte auf Mobile-Viewport
3. Messe Load Time

**Expected Result:**
- [ ] Initial Load: <5 Sekunden (Slow 3G)
- [ ] Map erscheint progressiv (Tiles laden nach und nach)
- [ ] Loading-Spinner ist sichtbar
- [ ] UI bleibt interaktiv (kein Freeze)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## ♿ Accessibility Tests

### TC-A11Y-001: Keyboard Navigation (Tab-Order)
**Priority:** HIGH
**Test Type:** Accessibility

**Steps:**
1. Öffne Lagekarte
2. Drücke Tab-Key mehrfach
3. Prüfe Focus-Order

**Expected Result:**
- [ ] Tab-Key fokusiert Elemente in logischer Reihenfolge:
  1. POI-Toolbar-Button
  2. Drawing-Toolbar-Button
  3. Layer-Toggle
  4. Map (Zoom-Controls)
- [ ] Focus-Ring ist sichtbar (keine `outline: none` ohne Alternative)
- [ ] Fokussierte Elemente haben klar erkennbare visuelle Indication

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-A11Y-002: ARIA-Labels (Screen Reader)
**Priority:** HIGH
**Test Type:** Accessibility

**Steps:**
1. Aktiviere Screen Reader (VoiceOver auf macOS, NVDA auf Windows)
2. Navigiere durch Lagekarte mit Tab-Key
3. Prüfe Screen Reader Output

**Expected Result:**
- [ ] POI-Marker: ARIA-Label kombiniert Type, Name, Adresse
- [ ] Toolbar-Buttons: ARIA-Label beschreibt Funktion (z.B. "POI platzieren")
- [ ] Layer-Toggle: ARIA-Label + aria-pressed State
- [ ] Fullscreen-Close-Button: "Vollbildmodus schließen"
- [ ] Keine unlabeled interactive Elemente

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-A11Y-003: Keyboard Shortcuts (ESC-Key)
**Priority:** MEDIUM
**Test Type:** Accessibility

**Steps:**
1. Öffne POI-Placement-Modal
2. Drücke ESC-Key
3. Öffne Fullscreen-Mode
4. Drücke ESC-Key

**Expected Result:**
- [ ] ESC schließt POI-Modal
- [ ] ESC schließt Shape-Label-Modal
- [ ] ESC schließt Screenshot-Lightbox
- [ ] ESC schließt Fullscreen-Mode
- [ ] ESC schließt Delete-Confirmation-Dialog

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-A11Y-004: Color Contrast (WCAG AA)
**Priority:** MEDIUM
**Test Type:** Accessibility

**Steps:**
1. Öffne Lagekarte
2. Verwende Browser-Extension (z.B. axe DevTools)
3. Prüfe Color-Contrast-Ratio

**Expected Result:**
- [ ] Alle Texte: Contrast ≥ 4.5:1 (WCAG AA)
- [ ] Buttons: Contrast ≥ 3:1 (WCAG AA)
- [ ] Icons: Contrast ≥ 3:1
- [ ] Error-Messages: Contrast ≥ 4.5:1
- [ ] Dark-Mode: Kontraste bleiben WCAG-konform

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-A11Y-005: Focus Management (Modal Trap)
**Priority:** HIGH
**Test Type:** Accessibility

**Steps:**
1. Öffne POI-Placement-Modal
2. Drücke Tab-Key mehrfach
3. Prüfe Focus bleibt im Modal

**Expected Result:**
- [ ] Focus wird im Modal gefangen (Focus Trap)
- [ ] Tab-Key cyclet nur durch Modal-Elemente
- [ ] Shift+Tab cyclet rückwärts
- [ ] Close-Button ist erreichbar via Tab
- [ ] ESC-Key schließt Modal und returniert Focus

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🌐 Cross-Browser Tests

### TC-BROWSER-001: Chrome (Latest)
**Priority:** HIGH
**Test Type:** Cross-Browser

**Steps:**
1. Öffne Lagekarte in Chrome (latest stable)
2. Führe Smoke-Tests aus:
   - Map laden
   - POI erstellen
   - Shape zeichnen
   - Screenshot exportieren

**Expected Result:**
- [ ] Alle Features funktionieren
- [ ] Keine Console-Errors
- [ ] Performance: >30 FPS
- [ ] Dark-Mode funktioniert

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-BROWSER-002: Firefox (Latest)
**Priority:** HIGH
**Test Type:** Cross-Browser

**Steps:**
1. Öffne Lagekarte in Firefox (latest stable)
2. Führe Smoke-Tests aus (siehe TC-BROWSER-001)

**Expected Result:**
- [ ] Alle Features funktionieren
- [ ] Keine Console-Errors
- [ ] IndexedDB Offline-Tiles funktionieren
- [ ] Dark-Mode funktioniert

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-BROWSER-003: Safari (Latest)
**Priority:** MEDIUM
**Test Type:** Cross-Browser

**Steps:**
1. Öffne Lagekarte in Safari (latest stable, macOS)
2. Führe Smoke-Tests aus (siehe TC-BROWSER-001)

**Expected Result:**
- [ ] Alle Features funktionieren
- [ ] Keine Console-Errors
- [ ] Webkit-spezifische Bugs: Keine
- [ ] Touch-Events auf iPad funktionieren

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-BROWSER-004: Edge (Latest)
**Priority:** LOW
**Test Type:** Cross-Browser

**Steps:**
1. Öffne Lagekarte in Edge (latest stable)
2. Führe Smoke-Tests aus (siehe TC-BROWSER-001)

**Expected Result:**
- [ ] Alle Features funktionieren (Edge = Chromium-basiert, ähnlich Chrome)
- [ ] Keine Console-Errors

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🔌 Offline Tests

### TC-OFF-001: Complete Offline Workflow
**Priority:** HIGH
**Test Type:** End-to-End Offline

**Steps:**
1. Online: Downloade Offline-Tiles für Region
2. Online: Erstelle 2 POIs und 2 Shapes
3. Toggle DevTools Network → Offline
4. Offline: Erstelle 1 weiteren POI
5. Offline: Zeichne 1 weiteres Shape
6. Offline: Pan/Zoom Map
7. Toggle Online
8. Warte 5 Sekunden

**Expected Result:**
- [ ] Offline: Map funktioniert (Tiles aus IndexedDB)
- [ ] Offline: POI- und Shape-Creation funktioniert lokal
- [ ] Offline: Keine Error-Messages (TanStack Query queued)
- [ ] Online: Queued Mutations werden automatisch ausgeführt
- [ ] Backend: Alle 3 POIs und 3 Shapes sind gespeichert

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-OFF-002: Offline without Downloaded Tiles
**Priority:** MEDIUM
**Test Type:** Error Handling

**Steps:**
1. Toggle DevTools Network → Offline (OHNE vorher Tiles zu downloaden)
2. Navigiere zu Lagekarte
3. Prüfe Error-State

**Expected Result:**
- [ ] Error-Badge erscheint: "Kartenbilder konnten nicht geladen werden"
- [ ] Retry-Button ist vorhanden
- [ ] Map bleibt interaktiv (Zoom, Pan funktionieren)
- [ ] POI- und Shape-Layer funktionieren (nur Tiles fehlen)
- [ ] Keine Console-Exceptions

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 📊 Performance Tests

### TC-PERF-001: Initial Load Time (Lighthouse)
**Priority:** HIGH
**Test Type:** Performance

**Steps:**
1. Öffne Chrome DevTools → Lighthouse Tab
2. Run Lighthouse Audit (Performance Category)
3. Navigiere zu Lagekarte

**Expected Result:**
- [ ] Performance Score: ≥80/100 (Good)
- [ ] First Contentful Paint (FCP): <2s
- [ ] Time to Interactive (TTI): <5s
- [ ] Total Blocking Time (TBT): <300ms
- [ ] Largest Contentful Paint (LCP): <3s

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-PERF-002: 1000 POIs Load Time
**Priority:** HIGH
**Test Type:** Performance

**Steps:**
1. Generiere 1000 POIs via API (random Koordinaten)
2. Navigiere zu Lagekarte
3. Messe Time-to-Interactive mit Chrome DevTools Performance Tab

**Expected Result:**
- [ ] Initial Load: <3 Sekunden (Story 48.6 IV1)
- [ ] Clustering aktiviert (ca. 20-50 Cluster statt 1000 Marker)
- [ ] Memory Footprint: <50 MB
- [ ] Frame Rate: >30 FPS während Zoom/Pan

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-PERF-003: 20 Shapes + 50 POIs Rendering
**Priority:** MEDIUM
**Test Type:** Performance

**Steps:**
1. Zeichne 20 Shapes (Polygone, Linien)
2. Erstelle 50 POIs
3. Messe Frame Rate mit Chrome DevTools Performance Tab

**Expected Result:**
- [ ] Frame Rate: >60 FPS (smooth rendering)
- [ ] Keine Lags oder Freezes
- [ ] Zoom/Pan bleibt smooth
- [ ] Memory Footprint: <100 MB

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-PERF-004: Bundle Size Analysis
**Priority:** LOW
**Test Type:** Performance

**Steps:**
1. Build Production-Bundle: `pnpm run build`
2. Analysiere Bundle mit `pnpm run analyze` (Webpack Bundle Analyzer)
3. Prüfe Lagekarte-Chunk-Size

**Expected Result:**
- [ ] Lagekarte-Chunk: <500 KB (gzipped)
- [ ] Leaflet.PM Library: ~15 KB
- [ ] modern-screenshot Library: ~20 KB
- [ ] Keine duplicate Dependencies

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

## 🔒 Security Tests

### TC-SEC-001: XSS Prevention (POI Name/Label)
**Priority:** HIGH
**Test Type:** Security

**Steps:**
1. Erstelle POI mit XSS-Payload als Name: `<script>alert('XSS')</script>`
2. Prüfe Rendering

**Expected Result:**
- [ ] POI-Name wird escaped (als Text gerendert, nicht als HTML)
- [ ] Kein Alert-Dialog erscheint
- [ ] Console: Keine XSS-Warnings
- [ ] Backend: Input wird sanitized (HTML tags stripped)

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-SEC-002: XSS Prevention (Shape Label)
**Priority:** HIGH
**Test Type:** Security

**Steps:**
1. Zeichne Shape
2. Gib XSS-Payload als Label ein: `<img src=x onerror=alert('XSS')>`
3. Prüfe Rendering

**Expected Result:**
- [ ] Label wird escaped (kein XSS)
- [ ] Kein Alert-Dialog erscheint
- [ ] Backend: Input wird sanitized

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-SEC-003: Path Traversal (Screenshot DELETE)
**Priority:** HIGH
**Test Type:** Security

**Steps:**
1. Versuche malicious DELETE-Request: `DELETE /lagekarte/screenshot/../../etc/passwd`
2. Prüfe Backend-Response

**Expected Result:**
- [ ] Backend liefert 400 Bad Request
- [ ] Error-Message: "Invalid filename"
- [ ] File wird NICHT gelöscht
- [ ] Backend-Log: Security-Warning

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-SEC-004: SQL Injection (POI API)
**Priority:** HIGH
**Test Type:** Security

**Steps:**
1. Versuche SQL-Injection via POI-Name: `'; DROP TABLE LagekartePoi; --`
2. Prüfe Backend-Response

**Expected Result:**
- [ ] POI wird erstellt (Name wird escaped via Prisma)
- [ ] Keine SQL-Injection
- [ ] Database-Tabelle bleibt intakt
- [ ] Backend: Prepared Statements verhindern Injection

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]

---

### TC-SEC-005: Authorization (POI Access)
**Priority:** MEDIUM
**Test Type:** Security

**Steps:**
1. User A erstellt Einsatz A mit POI
2. User B versucht POI von Einsatz A zu lesen/ändern/löschen

**Expected Result:**
- [ ] User B: GET /einsatz/A/lagekarte/poi → 403 Forbidden (oder 404)
- [ ] User B: PATCH POI → 403 Forbidden
- [ ] User B: DELETE POI → 403 Forbidden
- [ ] Backend: Authorization-Check im Service

**Actual Result:** [Leer lassen]
**Status:** [ ] PASS [ ] FAIL
**Notes:** [Leer lassen]
**Known Issue:** Dev-Review erwähnt fehlende Authorization (nur Authentication via JWT)

---

## 📝 Test Summary

**Total Test Cases:** 88
**Executed:** [Leer lassen für Tester]
**Passed:** [Leer lassen]
**Failed:** [Leer lassen]
**Blocked:** [Leer lassen]
**Skipped:** [Leer lassen]

**Pass Rate:** [Leer lassen] %

---

## 🐛 Defects Found

| ID | Severity | Story | Description | Status |
|----|----------|-------|-------------|--------|
| [Leer lassen] | [HIGH/MEDIUM/LOW] | [48.X] | [Beschreibung] | [OPEN/IN_PROGRESS/RESOLVED] |

**Example:**
| ID | Severity | Story | Description | Status |
|----|----------|-------|-------------|--------|
| DEF-001 | HIGH | 48.5 | Drawing-Toolbar Position falsch (unten statt oben) | KNOWN BUG |
| DEF-002 | HIGH | 48.4 | Geocoding fehlt komplett (nur Platzhalter) | KNOWN BUG |

---

## 📝 Test Notes

**Generelle Beobachtungen:**
- [Leer lassen für Tester-Notes]

**Performance-Beobachtungen:**
- [Leer lassen]

**Browser-spezifische Issues:**
- [Leer lassen]

**Mobile-spezifische Issues:**
- [Leer lassen]

---

## ⚠️ Known Issues (aus Reviews)

**Aus Story 48.5 (Drawing Tools):**
1. **KRITISCH:** Drawing-Toolbar Position falsch (top-[28rem] statt top-40)
2. **HIGH:** POI-Persistierung nach Reload nicht vollständig getestet
3. **HIGH:** Drawing-Persistierung nach Reload nicht vollständig getestet

**Aus UX-Review:**
1. **HIGH:** Geocoding fehlt komplett (Story 48.4) - nur Platzhalter-Hinweis
2. **HIGH:** Toast-Notifications fehlen (Story 48.3, 48.4) - nur console.log
3. **HIGH:** Tests wurden gelöscht (Story 48.10) - Zero test coverage

**Aus Dev-Review:**
1. **MEDIUM:** Authorization fehlt (Story 48.2) - nur Authentication, keine Ownership-Checks
2. **LOW:** Initial POI Fallback zu (0,0) statt Skip bei Geocoding-Failure

---

## ✅ Sign-Off

**QA Engineer:** [Leer lassen für Tester-Signatur]
**Date:** [Leer lassen]
**Test Duration:** [Leer lassen] hours

**Recommendation:**
- [ ] **APPROVE** - Alle kritischen Tests bestanden, bereit für Production
- [ ] **APPROVE mit Einschränkungen** - Minor Issues vorhanden, aber nicht blockierend
- [ ] **REJECT** - Kritische Bugs gefunden, Fixes erforderlich
- [ ] **RETEST** - Nach Bug-Fixes erneut testen

**Kommentare:**
[Leer lassen für abschließende Bewertung]

---

**Review Completed By:** QA Agent (BMad-Bundle)
**Review Date:** 2025-10-29
**Branch:** bluelight-hub-48-lagekarte
**Test Plan Version:** 1.0

---

## 📚 Anhang

### Test-Daten-Templates

**POI-Test-Daten (API):**
```json
{
  "name": "Test Fahrzeug 1",
  "type": "FAHRZEUG",
  "latitude": 52.5200,
  "longitude": 13.4050,
  "metadata": {
    "description": "Test POI für manuelle Tests"
  }
}
```

**Shape-Test-Daten (GeoJSON):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[10.1, 51.1], [10.2, 51.1], [10.2, 51.2], [10.1, 51.2], [10.1, 51.1]]]
      },
      "properties": {
        "label": "Test Gefahrenbereich",
        "type": "Gefahrenbereich",
        "color": "#ef4444"
      }
    }
  ]
}
```

### Browser DevTools Cheat-Sheet

**Network Tab:**
- Offline-Mode: DevTools → Network → Toggle "Offline" (oben)
- Throttling: DevTools → Network → Dropdown "No throttling" → "Slow 3G"

**Performance Tab:**
- Recording: DevTools → Performance → Record-Button (Kreis)
- FPS-Meter: DevTools → Performance → Enable "Show FPS meter"

**Application Tab:**
- IndexedDB: DevTools → Application → Storage → IndexedDB → `leaflet.offline`
- Storage-Quota: DevTools → Application → Storage → Quota

### Lighthouse Audit Command
```bash
# CLI (für automatisierte Tests)
lighthouse http://localhost:3001/app/einsatz/<einsatzId>/übersicht/karte \
  --only-categories=performance \
  --output=html \
  --output-path=./lighthouse-report.html
```

---

**Ende des Test Plans**
