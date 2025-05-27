# Lessons

- For website image paths, always use the correct relative path (e.g., 'images/filename.png') and ensure the images directory exists
- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
- When using Jest, a test suite can fail even if all individual tests pass, typically due to issues in suite-level setup code or lifecycle hooks

# Scratchpad

# ToDo
[ ] 

# Implementierungsplan: ETB-Filterung

## 1. Backend-Anpassungen

### 1.1 DTO prüfen und erweitern
- Sicherstellen, dass alle Filterfelder (`kategorie`, `autorId`, `beschreibung`, `timestampBereich`, `search`) im `FilterEtbDto` definiert und validiert sind.

### 1.2 Controller anpassen
- API-Endpoint `GET /etb` mit `@Query() FilterEtbDto` erweitern
- Swagger-Annotationen für neue Query-Parameter ergänzen

### 1.3 Service-Query ausbauen
- QueryBuilder um Bedingungen für `kategorie`, `autorId`, Suche (`beschreibung`, `autorName`, `abgeschlossenVon`) und Zeitbereich erweitern
- `includeUeberschrieben`-Logik standardmäßig auf `false` belassen

## 2. API-Client-Generierung

- Nach Backend-Änderungen `pnpm generate-api` ausführen, um Shared-Client-Modelle zu aktualisieren

## 3. Frontend-Anpassungen

### 3.1 API-Aufruf aktualisieren
- OnChange-Handler der Antd Table nutzen, um Filter- und Sorter-Werte zu extrahieren und State zu aktualisieren
- Filter-Parameter an `EtbClient.findAll({ ...filterDto })` übergeben

### 3.2 ETBTable-Component erweitern
- Neue Props `onFilterChange` und `onSorterChange` hinzufügen
- `useEffect` einsetzen, um bei Filter-/Sorter-Änderungen Daten neu zu laden

## 4. Tests

### 4.1 Backend-Tests
- Unit-Tests für `EtbService.findAll` mit verschiedenen Filterkombinationen erstellen

### 4.2 Integration-Tests
- e2e-Test für `GET /etb?search=...&kategorie=...&autorId=...` hinzufügen

### 4.3 Frontend-Tests
- Vitest-Komponententests für ETBTable: Such- und Filter-Interaktionen simulieren 