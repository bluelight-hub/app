# ADR-004: Platform Storage Strategy - Browser vs. Desktop Encryption

**Status:** Decided
**Date:** 2026-01-08
**Author:** Rubeen
**Context:** Story 2.1 - Multi-Server Configuration (NFR-S4: Encrypted Platform Storage)

## Problem Statement

Bluelight Hub muss Server-Konfigurationen (API URLs, Access Tokens, Invite Codes) speichern mit unterschiedlichen Sicherheitsanforderungen je Plattform:

- **Desktop (Tauri):** Token müssen verschlüsselt gespeichert werden
- **Web (Browser):** localStorage ist unverschlüsselt, aber Web Crypto API ermöglicht client-seitige Verschlüsselung
- **Anforderung:** NFR-S4 verlangt "verschlüsselte Speicherung für Platform Storage"

### Anforderungen

| Anforderung | Priority | Reason |
|-------------|----------|--------|
| Verschlüsselte Speicherung | Critical | NFR-S4 Sicherheitsanforderung |
| Cross-Platform Support | Critical | Desktop + Web Unterstützung |
| Benutzerfreundliche UX | High | Setup < 2 Min |
| Offline-Funktionalität | High | Konfiguration muss verfügbar sein ohne Netz |
| Performance | Medium | Token-Validierung < 100ms |

## Solution Comparison

### 1. Browser Storage Options

#### 1.1 localStorage (Unencrypted)

**Merkmale:**
- **Größe:** 5-10 MB
- **Persistenz:** Unbegrenzt (bis Benutzer löscht)
- **Browser-Support:** Alle modernen Browser (100%)
- **API:** Synchron, einfach
- **Verschlüsselung:** Nativ nicht vorhanden

**Sicherheit:**
- ❌ **XSS-Anfällig:** Jedes JavaScript auf der Seite kann zugreifen
- ❌ **Nicht verschlüsselt:** Text-Klar in Browser-Dev-Tools sichtbar
- ⚠️ **Same-Origin-Policy:** Schutz nur auf Domain-Ebene

**Verschlüsselungs-Option: Web Crypto API**

Wenn verschlüsselt, kann localStorage für Secrets verwendet werden:

```typescript
// Encryption mit Web Crypto API
async function encryptData(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Key derivation mit PBKDF2
  const pwBytes = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    await crypto.subtle.importKey('raw', pwBytes, 'PBKDF2', false, ['deriveKey']),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encryption mit AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Speicherung: salt + iv + encrypted
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decryption analog
async function decryptData(encrypted: string, password: string): Promise<string> {
  // Implementation analog
}
```

**Problem:** Web Crypto API ist komplex und fehleranfällig. Password wird im RAM gehalten.

#### 1.2 IndexedDB (Unencrypted)

**Merkmale:**
- **Größe:** 50% des verfügbaren Disk Space (Hunderte GB möglich)
- **Persistenz:** Unbegrenzt
- **Browser-Support:** Alle modernen Browser (100%)
- **API:** Asynchron, transaktional
- **Verschlüsselung:** Nativ nicht vorhanden

**Sicherheit:**
- ❌ **XSS-Anfällig:** Wie localStorage
- ❌ **Nicht verschlüsselt:** Binärdaten sichtbar im Browser-Storage
- ✅ **Besser für Encryption:** Unterstützt binäre Daten und größere Mengen

**Verschlüsselungs-Option: Web Crypto API**

IndexedDB mit Web Crypto API ist besser als localStorage, da:
- Binäre Daten direkt speicherbar (Crypto-Output)
- Bessere Query-Möglichkeiten (ob wir brauchen)

### 2. Desktop (Tauri) Storage Options

#### 2.1 Tauri Store Plugin (Unencrypted)

**Merkmale:**
- **Speicherort:** Anwendungs-Cache-Ordner
- **Format:** JSON/TOML
- **Verschlüsselung:** Nativ nicht vorhanden
- **Browser-Support:** N/A (nur Desktop)

```typescript
// Tauri Store API
import { Store } from '@tauri-apps/plugin-store';

const store = await Store.load('config.json');
await store.set('servers', servers);
await store.save();
```

**Problem:** Unverschlüsselt, nicht für Secrets geeignet.

#### 2.2 Tauri Stronghold Plugin (Encrypted) ⭐ EMPFOHLEN

**Merkmale:**
- **Engine:** IOTA Stronghold Secret Management
- **Verschlüsselung:** AES-256-GCM
- **Key Derivation:** Argon2id
- **API:** TypeScript Bindings
- **Browser-Support:** macOS, Windows, Linux (native)

**Installation & Setup:**

```bash
npm add @tauri-apps/plugin-stronghold
```

**Rust Side (src-tauri/src/main.rs):**

```rust
use tauri_plugin_stronghold::StrongholdExt;
use argon2::{hash_raw, Config, Variant, Version};

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                // Password-to-Key mit Argon2id
                let config = Config {
                    lanes: 4,
                    mem_cost: 10_000,
                    time_cost: 10,
                    variant: Variant::Argon2id,
                    version: Version::Version13,
                    ..Default::default()
                };

                let salt = b"bluelight-hub";
                let key = hash_raw(password.as_ref(), salt, &config)
                    .expect("failed to hash password");
                key.to_vec()
            })
            .build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**TypeScript/JavaScript Usage:**

```typescript
import { Stronghold } from '@tauri-apps/plugin-stronghold';

// Load/Create Vault
const password = 'user-master-password'; // Abgefragt beim First-Setup
const strongholdPath = 'secure-data/bluelight';
const stronghold = await Stronghold.load(strongholdPath, password);

// Create Client für Server-Storage
const client = await stronghold.createClient('servers').getStore();

// Speichern (Verschlüsselt)
await client.insert('server:prod-url', Array.from(
  new TextEncoder().encode('https://api.example.com')
));
await client.insert('server:token', Array.from(
  new TextEncoder().encode('blh_xxxxxxxxxxxxx')
));

// Abrufen (Automatisch decrypted)
const token = await client.get('server:token');
const decoded = new TextDecoder().decode(new Uint8Array(token ?? []));

// Persist
await stronghold.save();
```

**Sicherheit:**
- ✅ **AES-256-GCM Encryption:** Military-grade
- ✅ **Argon2id Key Derivation:** Moderne, sichere Passwort-Hashing
- ✅ **At-Rest Encrypted:** Datei auf Disk ist verschlüsselt
- ✅ **Memory Protection:** Stronghold schützt Memory gegen Dumps
- ✅ **macOS/Windows/Linux:** Vollständiger Cross-Platform Support

**Nachteile:**
- Erfordert Komplexere Setup-Orchestrierung (Rust + JS)
- Password-Management nötig (User-Experience)

#### 2.3 OS Keyring/Credential Manager

Alternative: Native Credential Stores (macOS Keychain, Windows Credential Manager, Linux Secret Service)

```typescript
// nicht native in Tauri, würde Plugin benötigen
// z.B. tauri-plugin-keyring
```

**Nachteile für unseren Use-Case:**
- Zusätzliches Plugin
- Nur für einzelne Secrets geeignet (nicht Server-Listen)
- OS-spezifische APIs komplex

## Recommendation

### Browser (Web)

**Entscheidung:** localStorage mit Web Crypto API Encryption

**Rationale:**
1. **NFR-S4 erfüllt:** Daten sind verschlüsselt
2. **Einfacher als IndexedDB:** Web Crypto API mit localStorage ausgeprägt
3. **Performance:** Synchrone API schneller
4. **Storage-Größe ausreichend:** Server-Configs << 5 MB

**Implementation Strategy:**

```typescript
// Shared abstraction layer
// packages/frontend/src/shared/services/platform-storage.service.ts

export interface IPlatformStorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

// Browser Implementation
export class BrowserStorageService implements IPlatformStorageService {
  private password: string; // User-entered oder generated

  async get<T>(key: string): Promise<T | null> {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    const decrypted = await decryptData(encrypted, this.password);
    return JSON.parse(decrypted);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    const encrypted = await encryptData(json, this.password);
    localStorage.setItem(key, encrypted);
  }
}
```

**Browser Security Notice:**
- ⚠️ Warnung bei Erststart: "Verschlüsselung wird via Web Crypto API angewendet. Password wird lokal verwaltet. Für höchste Sicherheit nutzen Sie die Desktop-App."
- Password-Eingabe: Modal beim Erststart oder Setup-Dialog

### Desktop (Tauri)

**Entscheidung:** Tauri Stronghold Plugin

**Rationale:**
1. **Native Encryption:** AES-256-GCM mit Argon2id
2. **Cross-Platform:** macOS, Windows, Linux
3. **User-Experience:** Einfache master-password Orchestrierung
4. **Industry-Standard:** IOTA Stronghold ist auditiert

**Implementation Strategy:**

```typescript
// Desktop Implementation (Tauri context)
export class TauriStorageService implements IPlatformStorageService {
  private stronghold: Stronghold | null = null;
  private client: Store | null = null;

  async initialize(masterPassword: string): Promise<void> {
    this.stronghold = await Stronghold.load(
      'secure-data/servers',
      masterPassword
    );
    this.client = await this.stronghold!.createClient('servers').getStore();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client!.get(key);
    if (!value) return null;

    const json = new TextDecoder().decode(new Uint8Array(value));
    return JSON.parse(json);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    const bytes = Array.from(new TextEncoder().encode(json));
    await this.client!.insert(key, bytes);
    await this.stronghold!.save();
  }
}
```

### Plattform-Abstraction (Frontend)

```typescript
// packages/frontend/src/shared/hooks/use-platform-storage.ts

import { useTauriContext } from '@/shared/hooks/use-tauri-context';

export function usePlatformStorageService(): IPlatformStorageService {
  const { isTauri } = useTauriContext();

  if (isTauri) {
    return new TauriStorageService();
  } else {
    return new BrowserStorageService();
  }
}

// Usage in Feature
function useServerConfig() {
  const storage = usePlatformStorageService();

  async function loadServers() {
    return await storage.get('servers');
  }

  async function saveServer(server: ServerConfig) {
    // ...
    await storage.set('servers', servers);
  }
}
```

## Storage Limits & Quotas

| Platform | Speicher | Limit | Eviction Policy |
|----------|----------|-------|-----------------|
| **Browser (localStorage)** | 5-10 MB | JavaScript String-Size | Benutzer-gelöscht |
| **Browser (IndexedDB)** | bis 50% Disk | Browser-abhängig | LRU + Quota API |
| **Desktop (Stronghold)** | File-based | Unbegrenzt | File System |
| **Safari (localStorage)** | 5-10 MB | 7-Tag Cache für Scripts | Automatic nach 7 Tagen |

Für unseren Use-Case ist localStorage ausreichend:
- Server-Config: ~1-2 KB pro Server
- 10 Server = ~20 KB
- Reserve für UI-State: ~100 KB
- **Total: << 5 MB** ✅

## Browser Support

| Browser | localStorage | IndexedDB | Web Crypto API | Support |
|---------|--------------|-----------|---|---------|
| Chrome 90+ | ✅ | ✅ | ✅ | Full |
| Firefox 78+ | ✅ | ✅ | ✅ | Full |
| Safari 14+ | ✅ | ✅ | ✅ | Full |
| Edge 90+ | ✅ | ✅ | ✅ | Full |

**Web Crypto API Verfügbarkeit:**
- Nur unter HTTPS (außer localhost)
- Alle modernen Browser unterstützen AES-GCM, PBKDF2

**Tauri Support:**
- macOS 10.13+
- Windows 7+
- Linux (alle Dist)

## Performance Impact

### Browser (localStorage + Web Crypto)

```
Encryption (per save):    ~50-100ms (PBKDF2 iterations = 100k)
Decryption (per load):    ~50-100ms
Storage Write:            <5ms
Storage Read:             <5ms
Total Round-Trip:         ~100-200ms
```

**Optimierung:**
- Batch-Operations (multiple `set` in einer Transaktion)
- Lazy decryption (nur wenn wirklich benötigt)

### Desktop (Stronghold)

```
Initialize (first load):  ~500ms
Encryption/Decryption:    <10ms (Hardware-beschleunigt)
Storage Write:            ~5-20ms (Disk I/O)
Total Round-Trip:         ~50-100ms
```

**Stronghold ist performanter** aufgrund von nativer Implementierung.

## Security Comparison Summary

| Aspekt | localStorage+Crypto | Tauri Stronghold | IndexedDB+Crypto |
|--------|-------------------|------------------|------------------|
| **Encryption** | AES-256-GCM ✅ | AES-256-GCM ✅ | AES-256-GCM ✅ |
| **XSS Protection** | ⚠️ Code-obfuscated | ✅ OS-isolated | ⚠️ Code-obfuscated |
| **At-Rest Encryption** | Partial | ✅ Full | Partial |
| **Key Derivation** | PBKDF2 (100k iter) | Argon2id ✅ | PBKDF2 (100k iter) |
| **Memory Safety** | JS Runtime | OS-protected | JS Runtime |
| **Cross-Platform** | ✅ | ✅ | ✅ |
| **Ease of Use** | Medium | Medium | Hard |

## Implementation Roadmap

### Phase 1: Desktop (Higher Priority)

1. Stronghold Plugin Integration (Rust + TS)
2. TauriStorageService Implementation
3. Server-Config CRUD Operations
4. Unit Tests + E2E Tests

### Phase 2: Browser

1. Web Crypto API Utilities
2. BrowserStorageService Implementation
3. Security Warning UI
4. Password Setup Flow
5. Unit Tests

### Phase 3: Unification

1. Platform-Abstraction Layer
2. Feature Integration (use-platform-storage Hook)
3. Server Management UI
4. Full E2E Testing

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|-------------|
| **Send all to Backend** | Performance impact, offline-unavailability, kein Multi-Server Support für Config-Selection |
| **IndexedDB nur** | Komplexere API, keine zusätzlichen Benefits für unseren Use-Case |
| **OS Keyring nur** | Nur für einzelne Secrets, keine Server-Liste Support |
| **CryptoJS Library** | Dependencies, Web Crypto API ist nativ und aktueller |
| **Tauri Store (unencrypted)** | NFR-S4 nicht erfüllt |

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Web Crypto API Fehler** | Medium | High | Umfangreiche Unit-Tests, KryptoJS Fallback |
| **Password-Verlust (User)** | Low | High | Recovery-Mechanismus, Master-Recovery-Token |
| **Stronghold Dependency** | Low | Medium | Aktiver Tauri Support, Community-Plugins |
| **Performance bei 100+ Servern** | Very Low | Low | Pagination im Storage, aber << 5 MB |

## Testing Strategy

### Browser (localStorage + Web Crypto)

```typescript
describe('BrowserStorageService', () => {
  it('should encrypt and decrypt data', async () => {
    const service = new BrowserStorageService('test-password');

    const data = { url: 'https://example.com', token: 'abc123' };
    await service.set('server:1', data);

    const retrieved = await service.get('server:1');
    expect(retrieved).toEqual(data);
  });

  it('should handle different passwords', async () => {
    const service1 = new BrowserStorageService('password1');
    const service2 = new BrowserStorageService('password2');

    await service1.set('key', { secret: 'value' });
    const result = await service2.get('key');

    expect(result).toBeNull(); // Wrong password
  });
});
```

### Desktop (Stronghold)

```typescript
describe('TauriStorageService', () => {
  it('should encrypt and decrypt with Stronghold', async () => {
    const service = new TauriStorageService();
    await service.initialize('master-password');

    const data = { url: 'https://example.com' };
    await service.set('server:prod', data);

    const retrieved = await service.get('server:prod');
    expect(retrieved).toEqual(data);
  });
});
```

## Dokumentation & Onboarding

### User Documentation

1. **Setup Guide:** Wie Master-Password wird gesetzt
2. **Security Notes:** Was wird verschlüsselt, was nicht
3. **Recovery:** Was passiert bei Password-Verlust
4. **Browser Warning:** Expliziter Hinweis auf localStorage-Limitationen

### Developer Documentation

1. **API Reference:** `IPlatformStorageService` Interface
2. **Integration Guide:** Wie Features das Storage nutzen
3. **Testing Guide:** Mock-Strategien für Tests
4. **Security Checklist:** Zu vermeide Fehler

## Decision Rationale

Diese Entscheidung **erfüllt NFR-S4** durch plattformgerechte Verschlüsselung:

- **Desktop:** Stronghold bietet militär-grade Sicherheit
- **Browser:** Web Crypto API + localStorage erfüllt die Anforderung
- **Konsistente API:** `IPlatformStorageService` Abstract beide Implementierungen
- **Zukünftssicher:** Falls neue Plattformen (z.B. Mobile) hinzukommen, ist nur eine neue Impl nötig

## References

- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Tauri: Stronghold Plugin](https://v2.tauri.app/plugin/stronghold/)
- [OWASP: Client-Side Storage Security](https://armur.ai/website-security/client/client/client-side-storage-security/)
- [RFC 2104: HMAC](https://tools.ietf.org/html/rfc2104)
- [NIST: AES Specification](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)
