# API-Versionierung

> Verbindliche Dokumentation zur API-Versionierungsstrategie im Bluelight Hub Projekt.
> Siehe auch: [ADR-001: API-Versionierungsstrategie](./adr/adr-001-api-versioning-strategy.md)

---

## 1. Uebersicht

Bluelight Hub nutzt **URI-basierte API-Versionierung** mit NestJS. Jeder API-Endpoint traegt seine Version direkt im URL-Pfad. Das ermoeglicht:

- **Parallelen Betrieb** mehrerer API-Versionen (Alpha + Stabil)
- **Schrittweise Migration** von Clients ohne Zwangs-Upgrades
- **Klare Trennung** zwischen instabilen (Entwicklung) und stabilen (Produktion) Endpoints
- **Transparente Deprecation** mit definierten Uebergangsfristen

Die Versionierung ist in `packages/backend/src/main.ts` konfiguriert:

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'v-',
  defaultVersion: 'alpha',
});

app.setGlobalPrefix('api');
```

---

## 2. Versionen

### v-alpha (Instabil)

- **URL-Prefix:** `/api/v-alpha/`
- **Status:** Standard-Version fuer alle neuen Endpoints
- **Stabilitaet:** Keine Garantien. Breaking Changes jederzeit moeglich.
- **Zielgruppe:** Interne Entwicklung, Feature-Branches, Staging-Umgebungen
- **Controller-Deklaration:**

```typescript
@Controller({ path: 'einsaetze', version: 'alpha' })
```

### v-1 (Stabil)

- **URL-Prefix:** `/api/v-1/`
- **Status:** Produktionsreife Endpoints mit Stabilitaetsgarantie
- **Stabilitaet:** Breaking Changes nur mit 6 Monaten Vorlauf (siehe Deprecation-Timeline)
- **Zielgruppe:** Produktions-Deployments, externe Integrationen
- **Controller-Deklaration:**

```typescript
@Controller({ path: 'einsaetze', version: '1' })
```

### Dual-Version (Alpha + v1)

Endpoints die sowohl in Alpha als auch v1 verfuegbar sind:

```typescript
@Controller({ path: 'einsaetze', version: ['alpha', '1'] })
```

Aktuell betrifft das:

- `EinsatzController` (`/api/v-alpha/einsaetze` und `/api/v-1/einsaetze`)
- `BefehlController` (`/api/v-alpha/befehle` und `/api/v-1/befehle`)
- `ProfileController` (nur `/api/v-1/profile`)

**Wichtig:** Die `version: ['alpha', '1']` Deklaration auf Controller-Ebene bedeutet, dass **alle Endpoints** des Controllers in v-1 verfuegbar sind. Es gibt kein Endpoint-Level-Versioning. Neue Endpoints an einen Dual-Version-Controller unterliegen automatisch dem v-1 Stabilitaetsvertrag.

### VERSION_NEUTRAL

Einige Endpoints sind versionsunabhaengig (z.B. Auth, OAuth-Callbacks):

```typescript
@Controller({ path: 'auth', version: VERSION_NEUTRAL })
```

Diese sind unter `/api/auth/` erreichbar (ohne Versions-Prefix).

---

## 3. URL-Schema

Das URL-Schema folgt dem Muster:

```
/api/v-{version}/{resource}
```

### Beispiele

| Endpoint                   | URL                                          |
|---------------------------|-----------------------------------------------|
| Einsaetze (Alpha)         | `GET /api/v-alpha/einsaetze`                  |
| Einsaetze (v1)            | `GET /api/v-1/einsaetze`                      |
| Befehle (Alpha)           | `POST /api/v-alpha/befehle`                   |
| Befehle (v1)              | `POST /api/v-1/befehle`                       |
| Profil (nur v1)           | `GET /api/v-1/profile`                        |
| Auth (versionsneutral)    | `POST /api/auth/login`                        |
| Health (versionsneutral)  | `GET /api/health`                             |
| Befehle (WebSocket)       | `WS /ws/v-alpha/befehl`                       |
| Monitoring (WebSocket)    | `WS /ws/v-alpha/monitoring`                   |

### Prefix-Konvention

Der Versions-Prefix ist `v-` (mit Bindestrich). Das unterscheidet sich von gaengigen Konventionen (`v1`, `/v1/`), ist aber konsistent mit der NestJS-Konfiguration:

- `v-alpha` (nicht `valpha` oder `v_alpha`)
- `v-1` (nicht `v1` oder `v-v1`)

---

## 4. Swagger UI

Die interaktive API-Dokumentation (Swagger UI) ist erreichbar unter:

```
http://localhost:3091/api
```

Swagger zeigt alle versionierten Endpoints in einem einzigen Dokument. Die Versions-Prefixe sind in den Endpoint-Pfaden sichtbar.

**Authentifizierung in Swagger:**

1. Server-Access-Token via "Authorize" Button (`X-Server-Access-Token`)
2. Admin JWT via "Authorize" Button (`admin-jwt` Bearer Token)

---

## 5. Client-SDK

Der generierte API-Client liegt in `packages/shared/client/` und wird automatisch aus der OpenAPI-Spezifikation generiert.

### Generierung

```bash
pnpm run generate-api
```

### Nutzung

```typescript
// Im Frontend: Immer ueber TanStack Query Hooks
import { BefehleApi } from '@bluelight-hub/shared-client';

// NIEMALS manuelles fetch() - IMMER generierten Client verwenden!
```

**Wichtig:**

- `packages/shared/client/` wird **NIEMALS manuell bearbeitet**
- Nach jeder Backend-API-Aenderung: `pnpm run generate-api` ausfuehren
- Der Client spiegelt aktuell die `v-alpha` Endpoints wider (Default-Export)

---

## 5b. WebSocket-Versionierung

WebSocket-Namespaces folgen dem gleichen Versionierungsschema wie REST-Endpoints:

```
/ws/v-{version}/{feature}
```

### Aktive Namespaces

| Namespace                    | Feature                                   | Events                                                      |
|------------------------------|-------------------------------------------|-------------------------------------------------------------|
| `/ws/v-alpha/befehl`        | Echtzeit-Befehl-Updates                   | `befehl.erstellt`, `befehl.quittiert`, `befehl.kommentarHinzugefuegt`, `rolle.geaendert`, `integration.status_changed` |
| `/ws/v-alpha/monitoring`    | System-Health und Metriken                | `system.health`, `system.warnung`                           |

### Hinweis: Kein v-1 WebSocket-Namespace

Da Bluelight Hub als Monorepo deployed wird (Frontend und Backend immer gemeinsam aktualisiert), ist ein paralleler `/ws/v-1/` Namespace aktuell nicht erforderlich. Bei Bedarf fuer externe WebSocket-Clients kann dieser spaeter ergaenzt werden.

### Event-Deprecation

WebSocket-Events koennen nicht via HTTP Deprecation Headers deprecated werden. Bei Schema-Aenderungen werden neue Event-Namen parallel emittiert (6 Monate Parallelbetrieb).

---

## 6. Breaking vs Non-Breaking Changes

### Breaking Changes

Breaking Changes aendern den bestehenden API-Vertrag auf eine Weise, die existierende Clients zum Absturz bringt. Sie erfordern in stabilen Versionen (v-1) eine Deprecation-Timeline.

| Typ                          | Beispiel                                              |
|------------------------------|-------------------------------------------------------|
| **Feld entfernen**           | `BefehlDto.prioritaet` wird aus der Response entfernt |
| **Typ aendern**              | `status: string` wird zu `status: number`             |
| **Pflichtfeld hinzufuegen**  | Neues Pflichtfeld `dringlichkeit` in `CreateBefehlDto`|
| **Endpoint-Pfad aendern**    | `/api/v-1/befehle` wird zu `/api/v-1/commands`        |
| **HTTP-Methode aendern**     | `PUT /befehle/:id` wird zu `PATCH /befehle/:id`       |
| **Status-Code aendern**      | `201 Created` wird zu `200 OK` bei Erstellung         |
| **Enum-Wert entfernen**      | `BefehlStatus.ENTWURF` wird entfernt                  |
| **Validierung verschaerfen** | `name` Max-Laenge von 255 auf 100 reduziert           |

### Non-Breaking Changes

Non-Breaking Changes erweitern die API ohne bestehende Clients zu beeintraechtigen. Sie koennen jederzeit eingefuehrt werden.

| Typ                            | Beispiel                                                  |
|--------------------------------|-----------------------------------------------------------|
| **Optionales Feld hinzufuegen**| Neues optionales Feld `kommentar` in `CreateBefehlDto`    |
| **Neuen Endpoint hinzufuegen** | `GET /api/v-1/befehle/:id/historie` (neuer Endpoint)      |
| **Enum-Wert hinzufuegen**      | `BefehlStatus.ARCHIVIERT` wird hinzugefuegt               |
| **Beschreibung aendern**       | OpenAPI-Beschreibung eines Feldes aktualisieren           |
| **Neuen optionalen Header**    | Neuer Header `X-Request-Correlation-Id` (optional)        |
| **Response-Feld hinzufuegen**  | Neues Feld `erstelltVon` in `BefehlDto` Response          |
| **Performance-Verbesserung**   | Schnellere Response-Zeiten ohne Vertragsaenderung         |

### Grauzone: Vorsicht geboten

| Aenderung                      | Bewertung                                                   |
|--------------------------------|-------------------------------------------------------------|
| **Default-Wert aendern**       | Kann Breaking sein wenn Clients sich darauf verlassen       |
| **Sortier-Reihenfolge aendern**| Non-Breaking laut Spec, aber Clients koennten erwarten      |
| **Pagination-Limits aendern**  | Technisch Non-Breaking, aber kann Client-UX beeinflussen    |

---

## 7. Deprecation-Timeline

Fuer stabile API-Versionen (v-1 und hoeher) gilt ein strikter Deprecation-Prozess mit **6 Monaten Vorlauf**.

### Phasen

```
Phase 1: Announcement          Phase 2: Deprecation Active     Phase 3: Sunset
(T+0)                          (T+0 bis T+6 Monate)           (T+6 Monate)

Ankuendigung via:              HTTP Headers aktiv:             Endpoint wird entfernt.
- Release Notes                - Deprecation: true             Response: 410 Gone
- Changelog                    - Sunset: <ISO-Datum>
- Swagger-Annotation           - Link: <successor-URL>
                               Endpoint funktioniert noch!
```

### HTTP Deprecation Headers

Sobald ein Endpoint als deprecated markiert ist, werden folgende HTTP-Header in jeder Response mitgesendet:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: 2026-08-24T00:00:00Z
Link: </api/v-1/befehle>; rel="successor-version"
Content-Type: application/json
```

| Header          | Beschreibung                                               | Spezifikation                  |
|----------------|------------------------------------------------------------|--------------------------------|
| `Deprecation`  | Signalisiert dass der Endpoint veraltet ist                 | [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594) |
| `Sunset`       | ISO-8601 Datum wann der Endpoint entfernt wird             | [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594) |
| `Link`         | URL des Nachfolger-Endpoints mit `rel="successor-version"` | [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) |

### Beispiel-Timeline

```
2026-02-24  Announcement: GET /api/v-alpha/einsaetze wird deprecated
            -> Nachfolger: GET /api/v-1/einsaetze
            -> Sunset-Datum: 2026-08-24

2026-02-24  Deprecation Headers aktiv auf /api/v-alpha/einsaetze
  bis       Endpoint funktioniert weiterhin normal
2026-08-24  Clients erhalten Header-Warnung bei jeder Response

2026-08-24  Sunset: /api/v-alpha/einsaetze wird entfernt
            Response: 410 Gone mit Verweis auf /api/v-1/einsaetze
```

### Fuer v-alpha Endpoints

Alpha-Endpoints haben **keine Deprecation-Garantie**. Sie koennen jederzeit geaendert oder entfernt werden. Trotzdem empfehlen wir:

- Ankuendigung im Changelog
- Mindestens 1 Sprint Vorlauf bei groesseren Aenderungen
- Sunset-Header wenn technisch sinnvoll

---

## 8. Migration-Checkliste (v-alpha zu v-1 Promotion)

Wenn ein Endpoint von Alpha zu v-1 promoviert wird, folge dieser Checkliste:

### Vorbereitung

- [ ] Endpoint ist mindestens 2 Sprints in Alpha stabil
- [ ] Keine bekannten Breaking-Change-Plaene fuer den Endpoint
- [ ] API-Vertrag ist mit dem Team abgestimmt

### Controller anpassen

- [ ] `version: 'alpha'` zu `version: ['alpha', '1']` aendern (Dual-Betrieb)

```typescript
// Vorher
@Controller({ path: 'einsaetze', version: 'alpha' })

// Nachher
@Controller({ path: 'einsaetze', version: ['alpha', '1'] })
```

### Verifikation

- [ ] OpenAPI-Dokumentation pruefen: Beide Versionen sichtbar in Swagger UI (`/api`)
- [ ] `pnpm run generate-api` ausfuehren und Client-Aenderungen pruefen
- [ ] Contract-Snapshot-Test hinzufuegen oder aktualisieren (Response-Schema fixieren)

### Breaking Change Analysis

- [ ] Alle Response-Felder pruefen: Sind sie stabil und vollstaendig?
- [ ] Alle Request-DTOs pruefen: Keine uebermaessigen Pflichtfelder?
- [ ] Error-Responses pruefen: Konsistentes Format?
- [ ] Status-Codes pruefen: Korrekt und stabil?

### Dokumentation

- [ ] Changelog aktualisieren (neuer v-1 Endpoint)
- [ ] Diese Datei aktualisieren (Endpoint-Tabelle in Abschnitt 3)
- [ ] Ggf. ADR schreiben fuer wichtige Design-Entscheidungen

### Nach Promotion

- [ ] Alpha-Version bleibt bestehen (Dual-Betrieb) bis naechster Major-Release-Zyklus
- [ ] Monitoring: Nutzung beider Versionen tracken
- [ ] Alpha-Only-Entfernung erst nach erfolgreicher v-1 Adoption

---

## Referenzen

- [NestJS Versioning Dokumentation](https://docs.nestjs.com/techniques/versioning)
- [RFC 8594 - The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594)
- [RFC 8288 - Web Linking](https://www.rfc-editor.org/rfc/rfc8288)
- [ADR-001: API-Versionierungsstrategie](./adr/adr-001-api-versioning-strategy.md)
- `packages/backend/src/main.ts` -- Versionierungs-Konfiguration
- `packages/shared/client/` -- Generierter API-Client
