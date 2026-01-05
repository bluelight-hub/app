# API-Referenz

> **Basis-URL:** `http://localhost:3091/api`
> **Swagger UI:** `http://localhost:3091/api`
> **OpenAPI Spec:** `http://localhost:3091/api-json`

---

## 1. Authentifizierung

### 1.1 Auth Strategien

| Strategie | Guard | Verwendung |
|-----------|-------|------------|
| `jwt` | `JwtAuthGuard` | Standard-Benutzer |
| `admin-jwt` | `AdminJwtAuthGuard` | Admin-Operationen |

### 1.2 Token Format

```
Authorization: Bearer <jwt_token>
```

---

## 2. Response Format

Alle Responses folgen dem `WrappedResponse<T>` Schema:

```typescript
interface WrappedResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
```

---

## 3. Endpoints

### 3.1 Health

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/health` | Health Check | - |

---

### 3.2 Auth

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| POST | `/auth/login` | Benutzer-Login | - |
| POST | `/auth/logout` | Logout | JWT |
| GET | `/auth/me` | Aktueller Benutzer | JWT |
| POST | `/auth/refresh` | Token erneuern | Refresh |

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "abc123",
      "email": "user@example.com",
      "name": "Max Mustermann"
    }
  }
}
```

---

### 3.3 Einsatz

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/einsaetze` | Alle Einsätze | JWT |
| POST | `/einsaetze` | Einsatz erstellen | JWT |
| GET | `/einsaetze/:id` | Einsatz Details | JWT |
| PATCH | `/einsaetze/:id` | Einsatz aktualisieren | JWT |
| POST | `/einsaetze/:id/archive` | Einsatz archivieren | JWT |

**CreateEinsatzDto:**
```json
{
  "nummer": "E-2026-001",
  "stichwort": "Brand",
  "beschreibung": "Wohnungsbrand",
  "einsatzort": {
    "strasse": "Hauptstraße",
    "hausnummer": "1",
    "plz": "12345",
    "ort": "Musterstadt"
  }
}
```

**EinsatzDto (Response):**
```json
{
  "data": {
    "id": "clx...",
    "nummer": "E-2026-001",
    "stichwort": "Brand",
    "status": "AKTIV",
    "alarmiertAm": "2026-01-04T10:00:00Z",
    "createdAt": "2026-01-04T10:00:00Z",
    "updatedAt": "2026-01-04T10:00:00Z"
  }
}
```

---

### 3.4 ETB (Einsatztagebuch)

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/einsaetze/:einsatzId/etb` | ETB-Einträge abrufen | JWT |
| POST | `/einsaetze/:einsatzId/etb` | ETB-Eintrag erstellen | JWT |

**CreateEtbEintragDto:**
```json
{
  "inhalt": "Erste Kräfte vor Ort",
  "kategorie": "LAGE",
  "absender": "EL",
  "empfaenger": "Leitstelle"
}
```

**Kategorien:**
- `EREIGNIS`
- `KOMMUNIKATION`
- `MASSNAHME`
- `LAGE`
- `DOKUMENTATION`
- `SONSTIGES`

---

### 3.5 Lagekarte

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/einsaetze/:einsatzId/lagekarte/pois` | POIs abrufen | JWT |
| POST | `/einsaetze/:einsatzId/lagekarte/pois` | POI erstellen | JWT |
| PATCH | `/einsaetze/:einsatzId/lagekarte/pois/:id` | POI aktualisieren | JWT |
| DELETE | `/einsaetze/:einsatzId/lagekarte/pois/:id` | POI löschen | JWT |

**CreatePoiDto:**
```json
{
  "typ": "EINSATZLEITUNG",
  "bezeichnung": "EL",
  "koordinaten": {
    "lat": 52.520008,
    "lng": 13.404954
  },
  "beschreibung": "Einsatzleitung vor Ort"
}
```

**POI Typen:**
- `GEFAHRENSTELLE`
- `ABSPERRUNG`
- `SAMMELSTELLE`
- `RETTUNGSPUNKT`
- `EINSATZLEITUNG`
- `FAHRZEUG`
- `PATIENT`
- `BRANDSTELLE`
- `WASSERSTELLE`
- `SONSTIGES`

---

### 3.6 Kräfte

#### Fahrzeuge

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/einsaetze/:einsatzId/kraefte/fahrzeuge` | Fahrzeuge abrufen | JWT |
| POST | `/einsaetze/:einsatzId/kraefte/fahrzeuge` | Fahrzeug zuweisen | JWT |
| PATCH | `/einsaetze/:einsatzId/kraefte/fahrzeuge/:id/status` | Status ändern | JWT |
| DELETE | `/einsaetze/:einsatzId/kraefte/fahrzeuge/:id` | Fahrzeug entfernen | JWT |

#### Personen

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/einsaetze/:einsatzId/kraefte/personen` | Personen abrufen | JWT |
| POST | `/einsaetze/:einsatzId/kraefte/personen` | Person hinzufügen | JWT |
| DELETE | `/einsaetze/:einsatzId/kraefte/personen/:id` | Person entfernen | JWT |

**Fahrzeug-Status:**
- `ALARMIERT`
- `AUSGERUECKT`
- `AN_EINSATZSTELLE`
- `VERFUEGBAR`
- `EINGERUECKT`

---

### 3.7 User Management

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/users` | Alle Benutzer | Admin |
| POST | `/users` | Benutzer erstellen | Admin |
| PATCH | `/users/:id` | Benutzer aktualisieren | Admin |
| DELETE | `/users/:id` | Benutzer löschen | Admin |

---

### 3.8 Integrations

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|--------------|------|
| GET | `/integrations/credentials` | Credentials abrufen | JWT |
| POST | `/integrations/credentials` | Credentials speichern | JWT |
| POST | `/integrations/hiorg/sync` | HiOrg-Server Sync | JWT |

---

## 4. Error Responses

### 4.1 Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "nummer",
      "message": "Nummer ist erforderlich"
    }
  ]
}
```

### 4.2 HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| 200 | Erfolg |
| 201 | Erstellt |
| 400 | Validierungsfehler |
| 401 | Nicht authentifiziert |
| 403 | Nicht autorisiert |
| 404 | Nicht gefunden |
| 409 | Konflikt |
| 500 | Server-Fehler |

---

## 5. WebSocket Events

**Endpoint:** `ws://localhost:3091`

### Events

| Event | Beschreibung | Payload |
|-------|--------------|---------|
| `einsatz:created` | Neuer Einsatz | `EinsatzDto` |
| `einsatz:updated` | Einsatz aktualisiert | `EinsatzDto` |
| `etb:created` | Neuer ETB-Eintrag | `EtbEintragDto` |
| `lagekarte:poi:created` | Neuer POI | `PoiDto` |
| `kraefte:fahrzeug:status` | Fahrzeug-Status geändert | `FahrzeugStatusDto` |

---

## 6. API Client Generierung

```bash
# API Client aus OpenAPI generieren
pnpm run generate-api

# Nutzung im Frontend
import { api } from '@bluelight-hub/shared/client';

const einsaetze = await api.einsatz.findAll();
```

---

*Dokumentation generiert durch BMad Document-Project Workflow v1.2.0*
