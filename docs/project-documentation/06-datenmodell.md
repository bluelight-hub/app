# 6 — Datenmodell

> 58 Prisma-Modelle · 98 Migrationen · 7 Aggregate-Roots · 74 Value Objects · 73 Domain Events
> **Schema:** `packages/backend/prisma/schema.prisma` (2.470 Zeilen)
> **Datenbank:** PostgreSQL 18

---

## 6.1 Überblick

Die Datenhaltung erfolgt in **PostgreSQL 18** (Docker). Die **58 Prisma-Modelle** fallen in mehrere thematische Cluster:

| Cluster             | Beispielmodelle                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Einsatz-Kern**    | `Einsatz`, `Kategorie`, `EinsatzTeilnehmer`, `EinsatzBeitrittsanfrage`                                  |
| **ETB**             | `Einsatztagebuch`, `EtbEintrag`, `EtbEintragHistorie`                                                    |
| **Kräfte**          | `StammFahrzeug`, `StammPerson`, `EinsatzFahrzeug`, `EinsatzPerson`, `EinsatzEinheit`, `EinsatzRollenbesetzung`, `Qualifikation`, `Fahrzeugtyp`, `RollenDefinition` |
| **Lagekarte**       | `Lagekarte`, `TaktischesZeichen`, `ZeichenKatalogEintrag`                                                |
| **Befehl**          | `Befehl`, `BefehlEmpfaenger`, `BefehlKommentar`                                                          |
| **Funk**            | `Funkkanal`, `FunkkanalZuordnung`                                                                         |
| **Alarmierung**     | `Alarmierung`, `AlarmierungEmpfaenger`                                                                    |
| **Gefahr**          | `GefahrenmatrixBewertung`                                                                                 |
| **Erinnerung**      | `Erinnerung`, `Erinnerungsvorlage`, `FuehrungsrhythmusTemplate`                                           |
| **Notiz**           | `Notiz`                                                                                                   |
| **Auth / Benutzer** | `User`, `InviteCode`, `ServerAccessToken`                                                                 |
| **Integrationen**   | `IntegrationCredential`, `OAuth2State`, `QualifikationMapping`                                            |
| **Konfiguration**   | `ServerConfig`, `AppConfig`, `AppConfigSecret`, `AufbewahrungsKonfiguration`, `ComplianceReport`          |
| **Infrastruktur**   | `OutboxEvent` (Transactional Outbox)                                                                      |

---

## 6.2 Audit- & Compliance-Konventionen

Alle mutierbaren Entitäten tragen Audit-Felder:

| Feld          | Zweck                                              |
| ------------- | -------------------------------------------------- |
| `createdAt`   | Erstellzeitpunkt                                   |
| `updatedAt`   | Zuletzt geändert                                   |
| `deletedAt`   | Soft-Delete-Zeitstempel                            |
| `isDeleted`   | Boolean-Flag (mit `deletedAt` konsistent gehalten) |
| `version`     | Optimistic-Locking bei kritischen Aggregaten       |

**NO-DELETE-Trigger** (Postgres-Trigger) auf `Einsatz`, `Einsatztagebuch`, `EtbEintrag`, `Befehl` — erzwingt Soft-Delete und schützt die 10-Jahre-Aufbewahrung (GoBD). Admin-CLI (`cli:archive`) archiviert Einsätze regelkonform.

---

## 6.3 Kern-Aggregate im Detail

### 6.3.1 Einsatz

```
Einsatz
├── id: EinsatzId (CUID2)
├── status: EinsatzStatus  (ANGELEGT | IN_BEARBEITUNG | ABGESCHLOSSEN | ARCHIVIERT)
├── titel, beschreibung
├── stichwort, kategorie → Kategorie
├── adresse: Address (Value Object)
├── einsatzleiter → User
├── createdAt, updatedAt, deletedAt (Soft-Delete via Trigger)
├── aufbewahrungsKonfiguration → AufbewahrungsKonfiguration
└── Beziehungen
    ├── Einsatztagebuch (1:1)
    ├── Lagekarte (1:1)
    ├── EinsatzFahrzeug (1:n)
    ├── EinsatzPerson (1:n)
    ├── EinsatzEinheit (1:n)
    ├── EinsatzRollenbesetzung (1:n)
    ├── EinsatzTeilnehmer (1:n)
    ├── EinsatzBeitrittsanfrage (1:n)
    ├── Befehl (1:n, polymorph einsatz-scope)
    ├── Funkkanal (1:n, ADR-007)
    ├── Alarmierung (1:n)
    ├── GefahrenmatrixBewertung (1:n, ADR-010)
    ├── Erinnerung (1:n)
    └── Notiz (1:n)
```

### 6.3.2 Einsatztagebuch & Einträge (ETB)

```
Einsatztagebuch
├── einsatzId → Einsatz (1:1)
├── gesperrt: Boolean (locked, append-only)
└── Einträge: EtbEintrag (1:n)

EtbEintrag
├── id: EtbEntryId (CUID2)
├── einsatztagebuchId → Einsatztagebuch
├── erstelltAm, erstelltVon
├── kategorie: EtbKategorie
├── kontext: Eintrag-Kontext (ADR-005: Discriminated Union)
│     ├── TEXT       { text }
│     ├── FUNKSPRUCH { kanal, absender, empfaenger, inhalt, prioritaet }
│     ├── PATIENT    { patientId, diagnose, transportziel, … }
│     ├── BEFEHL     { befehlId, zusammenfassung }
│     ├── ALARMIERUNG, SITUATION, … (weitere Varianten je Feature)
│     └── Snapshot-Optimierung: EtbSnapshot (Value Object)
└── historie: EtbEintragHistorie (Append-Only)

EtbEintragHistorie
├── eintragId → EtbEintrag
├── alterInhalt, neuerInhalt
└── geaendertAm, geaendertVon
```

### 6.3.3 Kräfte

```
StammFahrzeug               StammPerson
├── id, rufname              ├── id, vorname, nachname
├── typ → Fahrzeugtyp        ├── rolle, qualifikationen
└── standort                 └── kontakt

EinsatzFahrzeug             EinsatzPerson               EinsatzEinheit
├── einsatzId                ├── einsatzId                ├── einsatzId
├── stammFahrzeugId (FK)     ├── stammPersonId (FK)       ├── name, typ (EinheitenTyp)
└── statusverlauf            └── rolle → RollenDefinition └── fahrzeuge, personen

EinsatzRollenbesetzung
├── einsatzId, rolleId, personId
└── gültigVon, gültigBis

Qualifikation / Fahrzeugtyp / RollenDefinition   (Stammdaten, global gepflegt)
```

### 6.3.4 Befehl

```
Befehl
├── id, einsatzId (nested Route /einsatz/:einsatzId/befehl)
├── nummer: BefehlNummer (Value Object)
├── status: BefehlStatus  (ERTEILT | ZUGESTELLT | QUITTIERT)
├── anonymisiert: Boolean
├── erteiltVon → User
├── empfaenger: BefehlEmpfaenger (1:n)
└── kommentare: BefehlKommentar (1:n)

BefehlEmpfaenger
├── befehlId, personId/einheitId (polymorph)
└── zustellungStatus, quittierungStatus

BefehlKommentar
└── befehlId, autorId, text, createdAt
```

### 6.3.5 Funkkanal (ADR-007 + ADR-008)

```
Funkkanal  (eigenes Aggregat, nicht Teil von Einsatz)
├── id, einsatzId, kanalName, prioritaet (FunkPrioritaet)
├── status, offen/geschlossen
└── Zuordnungen: FunkkanalZuordnung (1:n)

FunkkanalZuordnung  (ADR-008: polymorph via 3 nullable FKs)
├── funkkanalId
├── fahrzeugId ?        ┐
├── personId ?          │ genau einer ≠ null (DB-Check-Constraint)
├── einheitId ?         ┘
└── rolle, rufname, gültigVon, gültigBis
```

### 6.3.6 Alarmierung (ADR-009)

```
Alarmierung
├── id, einsatzId, ausgeloestAm
├── ausgeloestManuell: Boolean
├── fmsDaten?: JSON        (nur bei FMS-getriggerter Alarmierung)
└── empfaenger: AlarmierungEmpfaenger (1:n)

AlarmierungEmpfaenger
├── alarmierungId, personId/einheitId
├── zeitpunktManuell?, zeitpunktFMS?        (getrennte Commands, ADR-009)
├── zugestelltAm, quittiertAm
└── statusverlauf
```

### 6.3.7 Gefahrenmatrix (ADR-010)

```
GefahrenmatrixBewertung
├── einsatzId, zeilenId, spaltenId
├── warnstufe (Source-of-Truth, nicht Karte)
├── notiz
└── lastModifiedAt, lastModifiedBy
```

WebSocket-Sync aktualisiert sowohl Matrix- als auch Karten-Clients (ADR-006).

### 6.3.8 Lagekarte

```
Lagekarte
├── einsatzId (1:1 mit Einsatz)
├── state: JSON (Karten-State, Zoom, Center, Layer-Konfiguration)
└── Zeichen: TaktischesZeichen (1:n)

TaktischesZeichen
├── lagekarteId, katalogEintragId → ZeichenKatalogEintrag
├── geometrie: GeoJSON (Point | Polygon | LineString)
├── attribute: JSON
├── erstelltAm, erstelltVon
└── sichtbar, aktiv

ZeichenKatalogEintrag  (Symbolbibliothek)
├── id, name, kategorie, symbolUrl, renderingHints
```

### 6.3.9 Erinnerung

```
Erinnerung
├── id, einsatzId?, assigneeId → User
├── status  (GEPLANT | AUSGELOEST | ACKNOWLEDGED | SNOOZED | ESKALIERT | ERLEDIGT)
├── titel (ErinnerungTitel VO), beschreibung
├── trigger: JSON (Zeit, Event-basiert)
├── eskalationKette: JSON (Multi-Step)
├── serienKonfiguration: JSON (Wiederholung)
└── kategorieId → Kategorie

Erinnerungsvorlage      (Template)
├── name, defaultTrigger, defaultEskalationKette

FuehrungsrhythmusTemplate
├── name, intervall, geplante Aktionen
```

### 6.3.10 User & Auth

```
User
├── id: UserId (CUID2)
├── email, passwordHash (Bcrypt)
├── role: Role (SUPER_ADMIN | ADMIN | USER)
├── operativeRole: OperativeRole? (Führungskraft | Einsatzkraft | Externe)
├── defaultEscalationTargetId → User
├── customPermissions: JSON (Array als String)
├── isLocked, lockReason, lastLoginAt
└── deletedAt (finaler Soft-Delete)

Min-1-SUPER_ADMIN-Constraint auf DB-Ebene.

InviteCode                 ServerAccessToken
├── code: [A-Z0-9]{8}       ├── token, revision
├── expiresAt, revokedAt    ├── scope, revokedAt
└── createdBy → User        └── createdBy → User
```

### 6.3.11 Integrationen

```
IntegrationCredential      OAuth2State
├── integrationTyp          ├── state (random), issuedAt
├── encryptedPayload        ├── integrationTyp
│   (AES-verschlüsselt      └── verbraucht
│    mit MASTER_SECRET)
└── metadata

QualifikationMapping
├── externeId (HiOrg-ID)
├── qualifikationId (lokal)
└── updatedAt
```

### 6.3.12 Infrastruktur / Outbox

```
OutboxEvent
├── id, aggregateType, aggregateId
├── eventName, eventVersion
├── payload: JSON (serialisiert via EventSerializer)
├── createdAt, publishedAt?
└── attempts, lastError?
```

Publisher-Service pollt `publishedAt IS NULL` und delegiert via `EventDeserializer` an `@OnEvent`-Handler.

### 6.3.13 Aufbewahrung & Compliance

```
AufbewahrungsKonfiguration
├── mindestAufbewahrungJahre
├── archivierungAutomatisch
└── stichtagsBerechnung

ComplianceReport
├── generiertAm, zeitraum
└── kennzahlen: JSON
```

---

## 6.4 Prisma-Migrationen

- **98 Migrationen** in `packages/backend/prisma/migrations/`.
- **Namenskonvention:** `YYYYMMDDHHMMSS_<lowercase_snake_case>` (z. B. `20260405120000_add_gefahrenmatrix_bewertung`).
- Jede Migration beinhaltet entweder reine Strukturänderungen oder zusätzlich ein SQL-Seed (für Stammdaten-Initialisierung).
- **Rollback-Strategie:** Prisma unterstützt keine automatischen Rollbacks — Rollbacks werden als neue Migrationen implementiert (z. B. `revert_*`).

---

## 6.5 Value Objects (Übersicht)

Die **74 Value Objects** gliedern sich in:

| Kategorie     | Beispiele (Auswahl)                                                                       |
| ------------- | ----------------------------------------------------------------------------------------- |
| IDs           | `EinsatzId`, `BefehlId`, `ErinnerungId`, `EtbEntryId`, `UserId`, `FunkkanalId`            |
| State-Enums   | `EinsatzStatus`, `BefehlStatus`, `EtbStatus`, `EtbKategorie`, `FunkPrioritaet`, `ErinnerungStatus` |
| Business      | `Address`, `EinheitenTyp`, `EinsatzRolle`, `BefehlNummer`, `ErinnerungTitel`, `AufbewahrungsKonfiguration` |
| Komplex       | `EtbSnapshot`, `Eintrag-Kontext` (Discriminated Union), `InviteCodeValue`                  |

Value Objects sind immutable, gleichheitsbasiert (Value Equality), und implementieren Validierung im Konstruktor — ungültige Werte sind unrepräsentierbar (Motto: *"Make illegal states unrepresentable"*).

---

## 6.6 Domain Events (Übersicht)

73 Domain Events — siehe [02-backend-architektur.md § 2.2.4](./02-backend-architektur.md#224-domain-events-73) für die vollständige Kategorisierung.

Jedes Event erbt von `DomainEvent`, trägt `eventId` (CUID2), `occurredAt` (Date), eine `static eventVersion()` für Schema-Evolution und wird im Outbox-Serializer mit konkretem Case behandelt.

---

## 6.7 Spezialfeatures der Datenbank

- **Trigger:** NO-DELETE-Trigger auf Einsatz / ETB / Befehl (Aufbewahrungsrecht).
- **Check-Constraints:** z. B. polymorphe Zuordnung bei `FunkkanalZuordnung` (genau eine FK ≠ NULL).
- **Indexe:** Composite-Indexe auf `(einsatzId, status)`, `(einsatzId, createdAt)`, zahlreiche auf Stamm-FKs.
- **Soft-Delete-Filter:** Repositorys fügen automatisch `isDeleted = false` an, sofern nicht explizit aufgehoben.
- **JSON-Spalten:** für flexible Strukturen (Eintrag-Kontext, Eskalationsketten, FMS-Daten, Karten-State).

---

## 6.8 Datenschutz & Anonymisierung

- **Befehl:** `anonymisiert=true` ersetzt Personenbezüge bei Archivierung.
- **User-Löschung:** `deletedAt` markiert User als gelöscht, aber alle Foreign-Key-Einträge bleiben (Audit-Trail). Benutzer-spezifische Felder werden auf `"anonymisiert"`-Platzhalter gesetzt.
- **AES-Verschlüsselung:** `IntegrationCredential.encryptedPayload`, Tauri-seitig auch lokaler Storage (Stronghold, siehe `docs/frontend/platform-storage-research.md`).
- **Compliance-Report:** `ComplianceReport` aggregiert Kennzahlen zur GoBD-Nachvollziehbarkeit.

> Eine vollständige **DSGVO-Recht-auf-Vergessen-Dokumentation** fehlt noch (Dokumentations-Lücke).

---

## 6.9 Zugriffsmuster (DB-Level)

| Muster                        | Umsetzung                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Repository-Pattern            | Interfaces in Domain, Prisma-Implementierung in Infrastructure (28 Ports, ≈ 50 Adapter).       |
| Transactional Outbox          | Alle Mutationen + Event-Persistierung in einer Prisma-Transaktion.                             |
| Optimistic Locking            | `version`-Feld bei kritischen Aggregaten (Einsatz, Befehl, Lagekarte).                         |
| Soft-Delete                   | Zentrale Scopes in Repositories.                                                               |
| Event-Sourcing Hybrid (ETB)   | Einträge + Historie + Snapshots (Value Object `EtbSnapshot`).                                  |
| Audit-Trail (BefehlKommentar) | Append-Only Collections mit Autor + Zeitstempel.                                               |

---

## 6.10 Referenzen

- **Schema-Datei:** `packages/backend/prisma/schema.prisma`
- **Migrations:** `packages/backend/prisma/migrations/`
- **Domain-Modelle:** `packages/backend/src/domain/` (Aggregate-Roots, Entities, Value Objects)
- **Outbox:** `packages/backend/src/infrastructure/outbox/`
- **ADR-005 (ETB-Kontext):** `docs/adr/`
- **ADR-007 / ADR-008 (Funkkanal):** `docs/adr/`
- **ADR-010 (Gefahrenmatrix):** `docs/adr/`
- **Deep-Dive Backend:** `docs/deep-dive-backend.md`
