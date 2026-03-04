# ADR-002: Runtime-Konfigurationsmodell und Secret-Management für Self-Hosted

## Status

Akzeptiert, Phase 1 umgesetzt (2026-03-03)

## Kontext

Bluelight Hub wird als Self-Hosted-Produkt betrieben. Aktuell ist ein großer Teil der Runtime-Konfiguration über Environment-Variablen umgesetzt (siehe `packages/backend/.env.example`), darunter auch sensitive Werte wie OAuth- und JWT-Secrets.

Das führt zu typischen Betriebsproblemen:

- **Hohe Einstiegshürde:** Betreiber müssen `.env`/Compose-Dateien bearbeiten.
- **Geringe Produkt-UX:** Viele Einstellungen sind nicht in der App sichtbar oder validierbar.
- **Schwache Auditierbarkeit:** Konfig-Änderungen sind nicht zentral nachvollziehbar.
- **Secret-Sprawl:** Secrets liegen in Deployment-Konfigurationen statt im Produktfluss.

Gleichzeitig gibt es ein reales Bootstrap-Problem:

- Die App benötigt eine DB-Verbindung, bevor Konfiguration aus der DB gelesen werden kann.
- Bestehende Integration-Secrets sind bereits verschlüsselt in der DB gespeichert (`IntegrationCredential`), aber mit einem ENV-basierten Key (`INTEGRATION_ENCRYPTION_KEY`), nicht mit einem zentralen Master-Key-Modell.

Issue: #435 (Enhancement, Architecture)

## Entscheidung

Wir führen ein **hybrides Modell mit DB als Primary Source of Truth** ein:

1. **ENV für Bootstrap/Infra (minimal, stabil):**
   - `DATABASE_URL` (Pflicht)
   - `MASTER_SECRET_KEY` (für Secret-Operationen erforderlich)
2. **DB für App-Runtime-Konfiguration (Primary):**
   - Operative Konfiguration wird über Admin-UI/API gepflegt.
   - Sensitive Werte werden nur verschlüsselt gespeichert.
3. **ENV als kontrollierter Override (Secondary):**
   - Nur für explizit erlaubte Keys (Allowlist).
   - Jeder aktive Override wird beim Start strukturiert geloggt (ohne Secret-Inhalte).
4. **Code-Defaults als letzter Fallback (Tertiary):**
   - Für lokale Entwicklung und robustes Erstverhalten.

### Priorität zur Laufzeit

`ENV Override > DB Config > Code Defaults`

### Startup-Reihenfolge

1. `DATABASE_URL` aus ENV lesen.
2. `MASTER_SECRET_KEY` aus ENV lesen und validieren (fehlende/ungültige Werte führen zu kontrollierter Fallback-Entschlüsselung).
3. DB verbinden.
4. Konfiguration aus DB laden.
5. Secret-Werte mit Master-Key-basierten Schlüsseln entschlüsseln.
6. Konfiguration mergen und gegen Schema validieren.
7. Finales readonly Runtime-Config-Objekt im Prozess bereitstellen.

## Konfigurations-Matrix

### Muss/Erforderlich ENV bleiben (Start-up)

1. `DATABASE_URL`  
   Grund: Ohne DB keine persistierte App-Config.
2. `MASTER_SECRET_KEY` (für Secret-Werte)  
   Grund: Root-of-Trust für Entschlüsselung. Bei fehlender/ungültiger Konfiguration laufen Secret-Operationen im Fallback/Warnmodus.

### Soll ENV bleiben (infra-nah, optional)

- `NODE_ENV`
- `PORT`/`BACKEND_PORT`/`HOST`
- `TRUSTED_PROXIES`
- `HTTPS_ENABLED`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`

### Soll in DB-App-Config liegen (Primary)

- SMTP/Email-Konfiguration
- Integrations-Endpunkte und Credentials
- Feature-Flags
- Retry-/Rate-/Scheduler-Schwellwerte
- CORS-Listen/Patterns, sofern betrieblich sinnvoll
- JWT-Secrets und JWT-Laufzeiten (nach Migration)

### ENV-Override-Allowlist (Beispiele)

- `LOG_LEVEL`
- ausgewählte Feature-Flag-Killswitches
- temporäre Integrations-Endpunkte für Incident-Mitigation

Nicht erlaubt als Override:

- Persistente Business-Secrets (z. B. OAuth Client Secret, SMTP Password), die regulär über UI gepflegt werden.

## Encryption-Strategie für DB-Secrets

Wir verwenden **versionierte Envelope Encryption** mit klarer Key-Separation.

### Kryptografische Bausteine

1. **Root Key Input:** `MASTER_SECRET_KEY` (32 Bytes, Base64 oder Hex).
2. **Optionale Passphrase-Kompatibilität:** Falls kein 32-Byte-Key geliefert wird, Ableitung per `Argon2id` (dokumentierte feste Parameter).
3. **Key Derivation für Scopes:** `HKDF-SHA-256` mit Info-Scopes, z. B.:
    - `bluelight-hub/config-secrets/v1`
    - `bluelight-hub/integration-secrets/v1`
4. **Cipher:** `AES-256-GCM` pro Secret.
5. **Nonce/IV:** zufällig pro Verschlüsselung (96 Bit).
6. **AAD:** Kontextbindung (z. B. `scope`, `config_key`, `version`), um vertauschte Ciphertexte zu erkennen.

### Persistenzformat (konzeptionell)

`{version, alg, keyId, iv, ciphertext, tag, aad}`

Alle Binärdaten Base64-kodiert.

### Kompatibilität zur bestehenden Verschlüsselung

Bestehende `integration_credentials` nutzen aktuell das Legacy-Format (`iv:authTag:ciphertext`) mit `INTEGRATION_ENCRYPTION_KEY`.  
Während der Migration gilt:

- Reads unterstützen **legacy + v1**.
- Neue Writes erfolgen nur noch in **v1** über `MASTER_SECRET_KEY`-abgeleitete Keys.
- Bestehende Daten werden idempotent re-encrypted.

## Datenmodell (Zielbild)

### Nicht-sensitive Config

`app_config`:

- `key` (unique)
- `value_json`
- `source_hint` (`default|imported|ui|migration`)
- `updated_by`, `updated_at`, `version`

### Sensitive Config

`app_config_secret`:

- `key` (unique)
- `ciphertext_payload` (versioniertes JSON-Payload)
- `kek_version`
- `updated_by`, `updated_at`, `version`

Hinweis: Bestehende Tabellen wie `integration_credentials` bleiben erhalten und werden schrittweise auf das neue Crypto-Format migriert.

## Migrationsstrategie (aktuelle ENV-Landschaft -> DB-Primary)

1. **Inventarisierung und Klassifizierung**
   - Alle ENV-Keys in `bootstrap`, `infra`, `runtime`, `secret` einordnen.
2. **Schema + Config-Domain bereitstellen**
   - Tabellen, typed schema, Backend-Validierung, Audit-Felder.
3. **Bootstrap-Importer (idempotent)**
   - Importiert bekannte ENV-Werte in DB.
   - Verschlüsselt Secrets sofort.
   - Läuft automatisch pro Start und migriert nur noch fehlende Keys.
4. **Dual-Read-Phase**
   - Runtime liest DB als Primary, ENV weiterhin als Override.
   - Config-Doctor unterscheidet zwischen offenen Legacy-Fallbacks und bereits migrierten, aber weiterhin gesetzten ENV-Keys (Cleanup-Hinweis).
5. **Konkrete Legacy-Mappings**
   - `INTEGRATION_ENCRYPTION_KEY` -> ersetzt durch `MASTER_SECRET_KEY` + HKDF-Scoped Key.
   - `HIORG_OAUTH_CLIENT_ID/SECRET` -> `app_config(.secret)` Einträge.
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET` -> DB-Secrets.
6. **Cutover**
   - Nicht-infra-nahe ENV-Keys aus Deployments entfernen.
   - `.env.example` auf Bootstrap+Infra reduzieren.
7. **Cleanup**
   - Legacy-Loader entfernen.
   - Deprecation-Hinweise und Runbooks finalisieren.

## Developer Experience

- **Minimaler Pflicht-Setup:** Nur `DATABASE_URL`.
- **Hinweis:** `MASTER_SECRET_KEY` ist für Secret-Schlüssel (z. B. JWT-/OAuth-Secrets) erforderlich.
- **Sinnvolle Dev-Defaults** für nicht-sensitive Parameter.
- **First-Run-Setup-Wizard** im Admin-Bereich für fehlende Pflicht-Konfiguration.
- **Config-Doctor Endpoint/CLI**:
  - fehlende Keys
  - aktive ENV-Overrides
  - Entschlüsselbarkeit/Key-Version
  - Schema-Version und Migrationsstatus
- **Diagnostik ohne Secret-Leaks:** Quellenanzeige je Wert (`default|db|env_override`) ohne Klartext.

## Alternativen

### 1. Alles in ENV belassen

**Vorteile:** simpel, bekannt, 12-factor-kompatibel.  
**Nachteile:** schlechte Self-Hosted-UX, hoher Betriebsaufwand, geringe Auditierbarkeit.  
**Entscheidung:** abgelehnt.

### 2. Alles ausschließlich in DB

**Vorteile:** maximale In-App-Konfigurierbarkeit.  
**Nachteile:** Bootstrap-Problem für DB + Root-Key bleibt bestehen.  
**Entscheidung:** abgelehnt.

### 3. Externer Secret Manager als Pflicht

**Vorteile:** starke Enterprise-Security-Controls.  
**Nachteile:** zu hoher Aufwand für typische Self-Hosted-Installationen.  
**Entscheidung:** vorerst abgelehnt, später optional erweiterbar.

## Konsequenzen

### Positiv

- Deutlich bessere Self-Hosted-Bedienbarkeit durch In-App-Konfiguration.
- Weniger Klartext-Secrets in Deployment-Dateien.
- Klare Trennung von Bootstrap-Infra und App-Runtime-Konfiguration.
- Einheitliches, versioniertes Crypto-Modell für neue und bestehende Secrets.

### Negativ / Trade-offs

- Höhere Implementierungs- und Betriebskomplexität (Crypto, Migration, UI).
- Verlust/Fehlkonfiguration von `MASTER_SECRET_KEY` blockiert Secret-Reads.
- Kurzfristig Dual-Read-Komplexität während Migration.

### Risiken und Mitigation

- **ENV-Overrides dominieren zu stark.**  
  Mitigation: strikte Allowlist + sichtbare Startup-Warnungen.
- **Crypto-Fehlimplementierung.**  
  Mitigation: etablierte Libraries, Testvektoren, Security-Review.
- **Schlüsselrotation wird nicht geübt.**  
  Mitigation: dokumentiertes Rotation-Runbook + regelmäßige Drill-Tests.

## Umsetzungsnotizen (Issue #435)

1. ADR finalisieren und in `docs/adr` aufnehmen.
2. Config-Schema + Migrationspfad im Backend implementieren.
3. AES-GCM/HKDF Utility mit Versionierung + Tests einführen.
4. Admin-UI für Runtime-Konfiguration und Secret-Pflege bereitstellen.
5. Legacy-ENV Importer + Deprecation Logging ausrollen.
6. Rotation/Backup/Restore für `MASTER_SECRET_KEY` dokumentieren.

## Umsetzungsstand Phase 1 (2026-03-03)

Umgesetzt:

- Prisma-Tabellen `app_config` und `app_config_secret` inkl. Migration.
- Bootstrap-Validierung für `DATABASE_URL` + `MASTER_SECRET_KEY`.
- Zentraler Runtime-Resolver (`AppConfigService`) mit Priorität `env_override > db > default`.
- `AesEncryptionAdapter` auf v1-Write mit Legacy-Dual-Read umgestellt.
- JWT- und HiOrg-Konfigurationspfade auf Runtime-Resolver umgestellt.
- Admin-Endpunkte für Runtime-Config und Config-Doctor ergänzt.
- `.env.example` auf Bootstrap/Infra + Override-Allowlist reduziert.
- JWT-Konfigurationsauflösung für Nest `JwtModule`/Passport-Strategien auf Lazy-Runtime-Read umgestellt (kein `getOrThrow('...')` mehr während Modulregistrierung/Konstruktorphase).

Offen für nächste Phase:

- Vollständige Bereinigung aller verbleibenden Legacy-ENV-Lesepfade außerhalb des initialen Scope.
- Optionaler externer Secret-Manager als Erweiterung.

## Betriebs-Runbook (Master Key)

1. Rotation vorbereiten:
   - Neue `MASTER_SECRET_KEY`-Version erzeugen.
   - Geplantes Wartungsfenster für Re-Encryption festlegen.
2. Backup:
   - Vor Rotation DB-Backup von `app_config_secret` und `integration_credentials` erstellen.
3. Rotation durchführen:
   - Services stoppen.
   - Secrets mit neuem Key re-encrypten.
   - Neue `MASTER_SECRET_KEY` deployen.
4. Restore-Strategie:
   - Bei Entschlüsselungsfehlern auf vorherigen Key + DB-Backup zurückrollen.
   - Config-Doctor (`/api/v-alpha/admin/security/doctor`) zur Verifikation nutzen.

## Referenzen

- [NIST SP 800-38D (GCM)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [RFC 5869 (HKDF)](https://www.rfc-editor.org/rfc/rfc5869)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
