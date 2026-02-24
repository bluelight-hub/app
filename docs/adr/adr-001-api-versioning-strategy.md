# ADR-001: API-Versionierungsstrategie

## Status

Akzeptiert (2026-02-24)

## Kontext

Bluelight Hub ist eine Web- und Desktop-Applikation (Tauri) fuer Blaulicht-Organisationen im Katastrophenschutz. Die API wird von mehreren Client-Typen konsumiert:

- **Desktop-App (Tauri):** Wird lokal installiert und kann nicht sofort aktualisiert werden
- **Web-Frontend:** Wird ueber Cloudflare Pages deployed und ist immer aktuell
- **Potenzielle externe Integrationen:** Drittanbieter-Systeme (z.B. Leitstellen-Software)

Da die Desktop-App nicht zentral aktualisiert werden kann, muessen wir API-Aenderungen so handhaben, dass aeltere Client-Versionen weiterhin funktionieren. Gleichzeitig brauchen wir die Freiheit, die API waehrend der aktiven Entwicklung schnell weiterzuentwickeln.

### Anforderungen

1. **Schnelle Iteration** waehrend der Alpha-Phase ohne Client-Kompatiblitaets-Zwang
2. **Stabilitaetsgarantie** fuer Produktions-Endpoints mit definierter Uebergangsfrist
3. **Paralleler Betrieb** von instabiler und stabiler API-Version
4. **Transparenz** ueber den Lebenszyklus von Endpoints (Deprecation, Sunset)
5. **Minimaler Overhead** fuer das Entwicklerteam (kein Versions-Routing-Framework noetig)

## Entscheidung

Wir verwenden **URI-basierte API-Versionierung** mit dem NestJS-eigenen Versioning-Feature.

### Konfiguration

```typescript
// packages/backend/src/main.ts
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'v-',
  defaultVersion: 'alpha',
});

app.setGlobalPrefix('api');
```

### Versions-Strategie

| Version     | URL-Prefix       | Stabilitaet                                     |
|-------------|------------------|-------------------------------------------------|
| `alpha`     | `/api/v-alpha/`  | Instabil. Breaking Changes jederzeit moeglich.  |
| `1`         | `/api/v-1/`      | Stabil. Breaking Changes nur mit 6 Monaten Vorlauf. |

### Promotion-Prozess

Endpoints starten in `v-alpha`. Nach Stabilisierung werden sie zu `v-1` promoviert:

```typescript
// Phase 1: Nur Alpha
@Controller({ path: 'befehle', version: 'alpha' })

// Phase 2: Dual-Betrieb (Alpha + v1)
@Controller({ path: 'befehle', version: ['alpha', '1'] })

// Phase 3 (optional, spaeter): Nur v1
@Controller({ path: 'befehle', version: '1' })
```

### Deprecation-Prozess (fuer stabile Versionen)

1. **Announcement** (T+0): Ankuendigung in Release Notes und Swagger-Annotation
2. **Deprecation Headers aktiv** (T+0 bis T+6 Monate): `Deprecation: true`, `Sunset: <ISO-Datum>`, `Link: <successor>; rel="successor-version"`
3. **Sunset** (T+6 Monate): Endpoint wird entfernt, gibt `410 Gone` zurueck

## Alternativen

### 1. Header-basierte Versionierung

```http
GET /api/einsaetze
Accept: application/vnd.bluelight.v1+json
```

**Vorteile:**

- Saubere URLs ohne Versions-Prefix
- Flexibler fuer Content Negotiation

**Nachteile:**

- Schwerer zu debuggen (Version nicht in URL sichtbar)
- Komplexere Client-Konfiguration (Custom Accept-Header)
- Nicht nativ von NestJS unterstuetzt (Custom Extractor noetig)
- Swagger UI stellt Header-basierte Versionen schlechter dar
- Caching wird komplizierter (Vary-Header noetig)

**Entscheidung:** Abgelehnt wegen Debugging-Komplexitaet und fehlendem nativen NestJS-Support.

### 2. Query-Parameter Versionierung

```http
GET /api/einsaetze?version=1
```

**Vorteile:**

- Einfach zu implementieren
- Abwaertskompatibel (Default-Version ohne Parameter)

**Nachteile:**

- Wird von NestJS nicht nativ unterstuetzt
- Vermischt API-Vertrag mit Query-Parametern
- Caching-Probleme (Query-Parameter werden oft ignoriert)
- Nicht RESTful (Version ist kein Filter/Pagination-Parameter)
- Schwerer automatisch zu testen

**Entscheidung:** Abgelehnt wegen fehlender REST-Konformitaet und Caching-Problemen.

### 3. Content-Type Versionierung (Media Type)

```http
GET /api/einsaetze
Content-Type: application/vnd.bluelight-hub.v1+json
```

**Vorteile:**

- Sauberste REST-Semantik
- Erlaubt unterschiedliche Repraesentationen (JSON, XML, etc.)

**Nachteile:**

- Hohe Komplexitaet fuer unser kleines Team
- Tooling-Support (Swagger, OpenAPI-Generator) eingeschraenkt
- Kein nativer NestJS-Support
- Ueberengineered fuer unseren Anwendungsfall (nur JSON, 1-2 Versionen)

**Entscheidung:** Abgelehnt wegen Ueberengineering fuer unseren Anwendungsfall.

### 4. Keine Versionierung (URL-Stabilitaet durch Non-Breaking Changes)

**Vorteile:**

- Kein Versions-Overhead
- Einfachste Implementierung

**Nachteile:**

- Erfordert perfekte Disziplin bei API-Aenderungen
- Kein Weg zurueck bei Fehlentscheidungen im API-Design
- Desktop-App kann nicht sofort aktualisiert werden -> Breaking Changes sind unvermeidlich

**Entscheidung:** Abgelehnt wegen der Desktop-App-Problematik (kein zentrales Update moeglich).

## Konsequenzen

### Positiv

- **NestJS-nativer Support:** `enableVersioning()` + `@Controller({ version })` -- kein Custom-Code noetig
- **Sichtbarkeit:** Version ist direkt in der URL erkennbar, erleichtert Debugging und Logging
- **Paralleler Betrieb:** Alpha und v1 koennen gleichzeitig auf demselben Server laufen
- **Inkrementelle Promotion:** Einzelne Endpoints koennen unabhaengig voneinander promoviert werden
- **Tooling-Kompatibilitaet:** OpenAPI-Generator und Swagger UI unterstuetzen URI-Versioning nativ
- **Caching:** URLs sind eindeutig pro Version, keine Vary-Header-Probleme

### Negativ

- **URL-Aesthetik:** `/api/v-alpha/` ist laenger und "haesslicher" als `/api/einsaetze`
- **Duplizierung:** Dual-Version-Controller (`version: ['alpha', '1']`) dienen denselben Code unter zwei URLs aus -- bei Divergenz muss der Controller aufgeteilt werden
- **Prefix-Konvention:** `v-` mit Bindestrich ist ungewoehnlich (NestJS Default), weicht von gaengigem `/v1/` ab
- **Client-SDK:** Aktuell wird nur ein Client generiert (fuer Alpha). Bei v1-Stabilisierung muss die Client-Generierung erweitert oder ein separater Client erstellt werden

### Risiken

- **Version Sprawl:** Zu viele Versionen parallel koennten Wartungsaufwand erhoehen. Mitigation: Maximal 2 aktive Versionen (Alpha + eine stabile).
- **Inkonsistente Promotion:** Wenn manche Endpoints in v1 sind und andere nicht, kann das Clients verwirren. Mitigation: Feature-weise Promotion, nicht Endpoint-weise.

## WebSocket-Versionierung

WebSocket Gateways nutzen versionierte Namespaces analog zum REST-URL-Schema:

```
/ws/v-{version}/{feature}
```

### Aktueller Stand

- `/ws/v-alpha/befehl` — Echtzeit-Befehl-Updates (Events: `befehl.erstellt`, `befehl.quittiert`, etc.)
- `/ws/v-alpha/monitoring` — System-Health und Metriken

### Design-Entscheidung: Kein v-1 WebSocket-Namespace

Da Bluelight Hub als **Monorepo** deployed wird (Frontend und Backend immer gemeinsam), gibt es keinen Bedarf fuer parallele WebSocket-Versionen. Im Gegensatz zur REST-API (die von externen Clients konsumiert werden kann) sind WebSocket-Verbindungen ausschliesslich intern.

Bei Bedarf fuer **externe WebSocket-Konsumenten** kann ein `/ws/v-1/` Namespace ergaenzt werden. Der Promotion-Prozess waere analog zur REST-API.

### WebSocket Event-Deprecation

WebSocket-Events koennen nicht via HTTP Deprecation Headers markiert werden. Stattdessen:

1. **Neue Events parallel emittieren** bei Schema-Aenderungen (z.B. `befehl.erstellt` alt + `befehl.erstellt_v2` neu)
2. **6 Monate Parallelbetrieb** beider Event-Versionen
3. **Altes Event entfernen** nach Uebergangsfrist

## Referenzen

- [NestJS Versioning](https://docs.nestjs.com/techniques/versioning)
- [RFC 8594 - The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594)
- [API Versioning Best Practices (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design#versioning-a-restful-web-api)
- [API-Versionierung Dokumentation](../api-versioning.md)
