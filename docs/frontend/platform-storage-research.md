# Platform Storage Research: Browser-Variante

**Datum:** 2026-01-08
**Kontext:** Story 2.1 - Verschlüsselte Speicherung für Browser-Variante
**Status:** ✅ Abgeschlossen

---

## Executive Summary

**Empfehlung:** **IndexedDB mit Web Crypto API (AES-GCM)**

Für die verschlüsselte Speicherung in der Browser-Variante wird IndexedDB mit manueller Verschlüsselung über die Web Crypto API empfohlen. Diese Kombination bietet die beste Balance aus Sicherheit, Performance und Skalierbarkeit für sensible Einsatzdaten.

---

## 1. Web Crypto API - Verschlüsselung im Browser

### 1.1 Überblick

Die [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) ist seit 2021 in allen modernen Browsern verfügbar und bietet native Kryptografie-Funktionen ohne externe Dependencies.

### 1.2 Empfohlener Algorithmus: AES-GCM

**AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)** ist der empfohlene Standard für 2026:

- ✅ **Authenticated Encryption:** Integrierte Authentifizierung schützt vor Chosen-Ciphertext-Angriffen
- ✅ **Performance:** Hardware-beschleunigt in modernen Prozessoren
- ✅ **Sicherheit:** Gilt als "Gold Standard" der modernen Verschlüsselung
- ✅ **Browser-Support:** Native Unterstützung in allen modernen Browsern

**Quellen:**
- [TrustedSec: Application Layer Encryption with Web Crypto API](https://trustedsec.com/blog/application-layer-encryption-with-web-crypto-api)
- [A Practical Guide to the Web Cryptography API](https://davidmyers.dev/blog/a-practical-guide-to-the-web-cryptography-api)

### 1.3 Best Practices für Schlüsselverwaltung

#### Schlüsselgenerierung

```typescript
// ✅ RICHTIG: Password-Based Key Derivation (PBKDF2)
const deriveKey = async (password: string, salt: Uint8Array) => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // Minimum 100k Iterationen (2026)
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};
```

**Quellen:**
- [How to secure encrypt and decrypt data within the browser with AES-GCM and PBKDF2](https://medium.com/@thomas_40553/how-to-secure-encrypt-and-decrypt-data-within-the-browser-with-aes-gcm-and-pbkdf2-057b839c96b6)
- [The Ultimate Developer's Guide to AES-GCM Encryption](https://www.sharesecure.link/articles/the-ultimate-developers-guide-to-aes-gcm-encryption-with-web-cryptography-api)

#### Nonce/IV Management (KRITISCH!)

**⚠️ WICHTIG:** IVs (Initialization Vectors) NIEMALS wiederverwenden!

```typescript
// ✅ RICHTIG: Unique IV pro Verschlüsselung
const encrypt = async (data: ArrayBuffer, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit für AES-GCM

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // IV MUSS mit Ciphertext gespeichert werden (kann plain text sein)
  return { encrypted, iv };
};
```

**Sicherheitswarnung:** Wenn IVs für denselben Schlüssel wiederholt werden, kann ein Angreifer den Hash-Subkey ermitteln und gefälschte Ciphertexts erstellen - **kompletter Verlust der Authentifizierung**!

**Quellen:**
- [Cryptographic Best Practices · GitHub](https://gist.github.com/atoponce/07d8d4c833873be2f68c34f9afc5a78a)
- [AES-256-GCM: The Gold Standard of Modern Encryption](https://petadot.com/aes-256-gcm/)

#### Schlüsselspeicherung

**Kritische Regeln:**

- ❌ NIEMALS Schlüssel in localStorage/IndexedDB speichern
- ❌ NIEMALS Schlüssel im Source Code hartcodieren
- ✅ Schlüssel nur im Memory halten (Session-basiert)
- ✅ Password-basierte Ableitung bei jedem Session-Start
- ✅ Schlüssel-Rotation planen (mit Versionierung)

**Quellen:**
- [Best Practices for Key Wrapping, Storage, and Management](https://dev.ubiqsecurity.com/docs/key-mgmt-best-practices)
- [Implementing AES-GCM Encryption in JavaScript](https://www.haikel-fazzani.eu.org/blog/post/javascript-cryptography-aes-gcm)

### 1.4 Sicherheitskontext

**⚠️ HTTPS erforderlich:** Web Crypto API funktioniert nur in Secure Contexts (HTTPS)!

---

## 2. localStorage vs. IndexedDB

### 2.1 Vergleichstabelle

| Kriterium | localStorage | IndexedDB | Gewinner |
|-----------|-------------|-----------|----------|
| **Storage Limit** | 5-10 MB | ~50% verfügbarer Disk Space (~1GB typisch) | **IndexedDB** |
| **Performance (klein)** | ⚡ Sehr schnell (synchron) | Gut (async) | localStorage |
| **Performance (groß)** | ❌ Blockiert UI | ⚡ Nicht-blockierend | **IndexedDB** |
| **Datentypen** | Nur Strings (JSON stringify) | Objects, Blobs, ArrayBuffers | **IndexedDB** |
| **Verschlüsselung** | ❌ Keine native Unterstützung | ❌ Keine native Unterstützung | Tie (beide manuell) |
| **Querying/Indexing** | ❌ Kein Support | ✅ Transactions, Indizes | **IndexedDB** |
| **Web Workers** | ❌ Nicht verfügbar | ✅ Volle Unterstützung | **IndexedDB** |
| **Browser-Support** | ✅ Universal | ✅ Universal (seit 2021) | Tie |
| **Komplexität** | Einfach | Komplex | localStorage |

**Quellen:**
- [LocalStorage vs IndexedDB: JavaScript Guide](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5)
- [9 differences between IndexedDB and LocalStorage](https://dev.to/armstrong2035/9-differences-between-indexeddb-and-localstorage-30ai)
- [LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)

### 2.2 Storage Limits im Detail

#### localStorage
- **Maximum:** 5-10 MB (browser-abhängig)
- **Quota:** Fest pro Origin
- **Overflow:** Wirft `QuotaExceededError`

#### IndexedDB
- **Maximum:** Bis zu 50% verfügbarer Disk Space
- **Typisch:** ~1GB oder 60% verbleibender Disk Space
- **Quota:** Dynamisch, prüfbar via Storage API

```typescript
// Storage Quota prüfen
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const { usage, quota } = await navigator.storage.estimate();
  console.log(`Using ${usage} out of ${quota} bytes.`);

  const percentUsed = (usage / quota) * 100;
  console.log(`Percentage used: ${percentUsed.toFixed(2)}%`);
}
```

**Hinweis:** Die Werte sind **absichtlich ungenau** (Browser obscure die exakten Werte zur Fingerprinting-Prevention).

**Quellen:**
- [Storage quotas and eviction criteria - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [StorageManager: estimate() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)

### 2.3 Performance-Charakteristika

#### localStorage
- **Synchron:** Blockiert Main Thread
- **Schnell:** Für kleine Key-Value-Paare (< 100 KB) performanter als IndexedDB
- **JSON Overhead:** Stringify/Parse kann Performance um **10x verlangsamen**

#### IndexedDB
- **Asynchron:** Nicht-blockierend (Promise-based)
- **Web Workers:** Verschlüsselung kann in separatem Thread laufen
- **Transactions:** ACID-Garantien für atomare Operationen
- **Indizes:** Schnelle Queries auf großen Datasets

**Use Case für bluelight-hub:**
- Einsatzdaten können groß werden (Lagekarten, Bilder, PDFs)
- Verschlüsselung ist CPU-intensiv → Web Workers ideal
- Multi-User-Sync erfordert Transactions

**Gewinner:** **IndexedDB**

**Quellen:**
- [Browser Storage: A Comparative Analysis](https://browsee.io/blog/unleashing-the-power-a-comparative-analysis-of-indexdb-local-storage-and-session-storage/)
- [Using localStorage in Modern Applications](https://rxdb.info/articles/localstorage.html)

---

## 3. Verschlüsselung in localStorage vs. IndexedDB

### 3.1 Gemeinsame Ausgangslage

**⚠️ Wichtig:** Weder localStorage noch IndexedDB bieten **native Verschlüsselung**!

> "IndexedDB does not offer encryption by default, and stored data is accessible via browser developer tools and is not encrypted at rest—it's stored in plain text."
>
> — [Can IndexedDB be encrypted for sensitive data?](https://www.mindstick.com/interview/34335/can-indexeddb-be-encrypted-for-sensitive-data-how-would-you-do-that)

**Beide erfordern manuelle Verschlüsselung via Web Crypto API.**

### 3.2 Implementierungsansätze

#### Manuelle Verschlüsselung (Empfohlen)

```typescript
// ✅ Best Practice: Encrypt before store, Decrypt after retrieve
class EncryptedStorage {
  private key: CryptoKey;

  async encrypt(data: unknown): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoded
    );

    return { encrypted, iv };
  }

  async decrypt(encrypted: ArrayBuffer, iv: Uint8Array): Promise<unknown> {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encrypted
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  }
}
```

#### Library-basierte Ansätze

**Dexie-encrypted:** Transparente Verschlüsselung für IndexedDB
- ✅ Verwendet TweetNaCl.js (battle-tested)
- ✅ Transparente Encrypt/Decrypt-Layer
- ⚠️ Zusätzliche Dependency (~40 KB)

**Secure-webstore:** Passphrase-basierte Verschlüsselung
- ✅ Schlüssel nur im Memory
- ✅ Symmetrische Verschlüsselung
- ⚠️ Zusätzliche Dependency

**Quellen:**
- [GitHub: dexie-encrypted](https://github.com/dfahlander/dexie-encrypted)
- [GitHub: secure-webstore](https://github.com/AKASHAorg/secure-webstore)
- [Zero-Knowledge AES-256 Encryption with IndexedDB](https://zerocrat.com/advanced-encryption-zero-knowledge-aes-256-encryption-for-unrivaled-data-protection/)

### 3.3 Herausforderung: Schlüsselspeicherung im Browser

**Problem:** Wo speichert man den Verschlüsselungsschlüssel sicher?

**Optionen:**

1. **Session-basiert (Empfohlen für bluelight-hub)**
   - Schlüssel wird aus User-Passwort abgeleitet (PBKDF2)
   - Nur im Memory während der Session
   - ✅ Höchste Sicherheit
   - ❌ Erfordert Login bei jedem Neustart

2. **Cookie-basiert mit App-Bound Encryption** (Experimental)
   - Schlüssel in Cookie (base64-encoded)
   - Browsers mit App-Bound Encryption verschlüsseln Cookie on-disk
   - ⚠️ "Best-effort" Security, kein harter Schutz
   - Quelle: [Browsertech Digest: Encrypting offline storage](https://digest.browsertech.com/archive/browsertech-digest-encrypting-offline-storage-for/)

3. **Unverschlüsselt in localStorage** (NICHT empfohlen!)
   - ❌ Komplett unsicher
   - ❌ Schlüssel in DevTools sichtbar

**Empfehlung für Story 2.1:** Session-basierte Schlüsselableitung

---

## 4. Browser-Kompatibilität (2026)

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| **Web Crypto API** | ✅ Seit 2017 | ✅ Seit 2017 | ✅ Seit 2017 | ✅ Seit 2017 |
| **IndexedDB** | ✅ Seit 2011 | ✅ Seit 2012 | ✅ Seit 2014 | ✅ Seit 2015 |
| **localStorage** | ✅ Universal | ✅ Universal | ✅ Universal | ✅ Universal |
| **Storage API** | ✅ Seit 2021 | ✅ Seit 2021 | ✅ Seit 2021 | ✅ Seit 2021 |
| **AES-GCM** | ✅ Native | ✅ Native | ✅ Native | ✅ Native |

**Fazit:** Alle benötigten Features sind **universal verfügbar** in modernen Browsern.

**Quellen:**
- [Storage for the web | web.dev](https://web.dev/articles/storage-for-the-web)
- [Storage Quotas API Demo](https://whatwebcando.today/storage-quota.html)

---

## 5. Empfehlung für Story 2.1

### 5.1 Tech Stack

**Primär-Lösung: IndexedDB + Web Crypto API (AES-GCM)**

```typescript
// Architektur-Skizze
┌─────────────────────────────────────────┐
│ Application Layer                       │
│ (EinsatzService, LagekarteService)      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Encryption Layer                        │
│ - AES-GCM (256-bit)                     │
│ - PBKDF2 Key Derivation                 │
│ - IV Management                         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Storage Layer (IndexedDB)               │
│ - Encrypted Blobs                       │
│ - Transactions                          │
│ - Indexing (auf unverschlüsselte Meta)  │
└─────────────────────────────────────────┘
```

### 5.2 Implementierungs-Strategie

#### Phase 1: Basis-Verschlüsselung (Story 2.1)
1. **Key Derivation Service**
   - PBKDF2 mit User-Passwort
   - Salt pro User (aus Backend)
   - 100.000+ Iterationen

2. **Encryption Service**
   - `encrypt(data: unknown): Promise<EncryptedBlob>`
   - `decrypt(blob: EncryptedBlob): Promise<unknown>`
   - IV-Management (unique pro Operation)

3. **IndexedDB Wrapper**
   - Transparente Verschlüsselung
   - Transaction-Support
   - Error Handling (QuotaExceededError)

#### Phase 2: Optimierungen (Optional)
1. **Web Worker für Verschlüsselung**
   - CPU-intensive Ops off Main Thread
   - Parallel Encrypt/Decrypt

2. **Selective Encryption**
   - Nur sensible Felder verschlüsseln
   - Metadata plain (für Indizes/Queries)

3. **Compression vor Encryption**
   - Storage-Effizienz
   - Attention: Kompression DANN Verschlüsselung (nicht umgekehrt!)

### 5.3 Code-Beispiel (Minimal Implementation)

```typescript
// src/shared/services/encryption.service.ts
import { Injectable } from '@nestjs/common';

export interface EncryptedData {
  encrypted: ArrayBuffer;
  iv: Uint8Array;
  version: number; // Für Key-Rotation
}

@Injectable()
export class EncryptionService {
  private key: CryptoKey | null = null;

  /**
   * Leitet Verschlüsselungsschlüssel aus Benutzerpasswort ab.
   *
   * Nutzt PBKDF2 mit 100.000 Iterationen um Brute-Force-Angriffe
   * zu erschweren. Schlüssel wird nur im Memory gehalten.
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<void> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Verschlüsselt Daten mit AES-GCM.
   *
   * Generiert unique IV pro Verschlüsselung um Replay-Angriffe
   * zu verhindern. IV wird mit Ciphertext zurückgegeben.
   */
  async encrypt(data: unknown): Promise<EncryptedData> {
    if (!this.key) throw new Error('Key not initialized');

    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit für GCM

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoded
    );

    return { encrypted, iv, version: 1 };
  }

  /**
   * Entschlüsselt AES-GCM verschlüsselte Daten.
   *
   * Wirft Error bei falscher IV oder tampered Ciphertext
   * (dank integrierter Authentifizierung von GCM).
   */
  async decrypt(data: EncryptedData): Promise<unknown> {
    if (!this.key) throw new Error('Key not initialized');

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: data.iv },
      this.key,
      data.encrypted
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  }

  /**
   * Löscht Schlüssel aus Memory (bei Logout).
   */
  clearKey(): void {
    this.key = null;
  }
}
```

```typescript
// src/shared/services/indexed-db.service.ts
import { Injectable } from '@nestjs/common';
import type { EncryptedData } from './encryption.service';

@Injectable()
export class IndexedDBService {
  private db: IDBDatabase | null = null;

  /**
   * Initialisiert IndexedDB mit Schema.
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('bluelight-hub', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store für Einsätze
        if (!db.objectStoreNames.contains('einsaetze')) {
          const store = db.createObjectStore('einsaetze', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Speichert verschlüsselte Daten in IndexedDB.
   */
  async put(storeName: string, id: string, data: EncryptedData): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const request = store.put({
        id,
        encrypted: data.encrypted,
        iv: data.iv,
        version: data.version,
        timestamp: Date.now()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Lädt verschlüsselte Daten aus IndexedDB.
   */
  async get(storeName: string, id: string): Promise<EncryptedData | null> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        resolve({
          encrypted: result.encrypted,
          iv: result.iv,
          version: result.version
        });
      };
    });
  }

  /**
   * Prüft verfügbaren Storage Space.
   */
  async checkQuota(): Promise<{ usage: number; quota: number; percent: number }> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      throw new Error('Storage API not supported');
    }

    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usage,
      quota,
      percent: quota > 0 ? (usage / quota) * 100 : 0
    };
  }
}
```

### 5.4 Vorteile dieser Lösung

| Vorteil | Beschreibung |
|---------|--------------|
| **Skalierbarkeit** | Bis zu 1GB+ Speicher für Offline-Einsätze, Bilder, Lagekarten |
| **Sicherheit** | AES-GCM mit 256-bit Key, PBKDF2 Key Derivation, unique IVs |
| **Performance** | Asynchron, nicht-blockierend, Web Worker-fähig |
| **Querying** | Indizes auf unverschlüsselten Metadata (Timestamps, Status) |
| **Atomicity** | Transactions für konsistente Multi-Ops |
| **Browser-Support** | Universal verfügbar (2026) |
| **Zero Dependencies** | Native Browser APIs, kein Bundler-Overhead |

### 5.5 Trade-offs & Limitations

| Limitation | Mitigation |
|------------|------------|
| **Komplexität** | Abstraktion-Layer (Services) versteckt Details |
| **Key Management** | Session-basiert, kein Offline-Zugriff ohne Login |
| **Debugging** | DevTools zeigen verschlüsselte Blobs (absichtlich!) |
| **Migration** | Versionierung in EncryptedData für Key-Rotation |
| **Quota** | `navigator.storage.estimate()` für Warnings |

### 5.6 Fallback: localStorage für Nicht-Sensible Daten

localStorage kann **ergänzend** für nicht-sensible Daten genutzt werden:
- UI-Preferences (Theme, Language)
- Feature-Flags
- Session-Tokens (mit HttpOnly Cookie als Primary)

**Regel:** Wenn Daten **nicht verschlüsselt** werden müssen, ist localStorage einfacher.

---

## 6. Alternative: OPFS (Origin Private File System)

**Neu in 2023:** OPFS bietet File System Access API für performante File-basierte Storage.

**Vorteile:**
- ⚡ Höhere Performance als IndexedDB für große Blobs
- ✅ Synchrone API in Web Workers
- ✅ Streaming-Support

**Nachteile:**
- ❌ Noch experimentell (Browser-Support variiert)
- ❌ Keine Transaktions-Garantien wie IndexedDB
- ❌ Komplexere API

**Empfehlung:** Für bluelight-hub (2026) **nicht** nutzen. IndexedDB ist ausgereifter und ausreichend.

**Quelle:** [LocalStorage vs. IndexedDB vs. OPFS](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)

---

## 7. Security Checklist

- [x] **HTTPS enforced** (Web Crypto API Requirement)
- [x] **AES-GCM** statt AES-CBC (Authenticated Encryption)
- [x] **PBKDF2** mit min. 100k Iterationen
- [x] **Unique IV** pro Verschlüsselung (KRITISCH!)
- [x] **Key nur im Memory** (Session-basiert)
- [x] **Keine Keys in localStorage/IndexedDB**
- [x] **Keine Keys im Source Code**
- [x] **Salt pro User** (vom Backend)
- [x] **Key-Rotation Strategie** (Versionierung)
- [ ] **Audit Logging** (optional, Phase 2)
- [ ] **Web Worker Encryption** (optional, Performance-Opt)

---

## 8. Implementierungs-Roadmap

### Story 2.1: Basis-Implementation (Prio 1)
1. **EncryptionService** implementieren
   - Key Derivation (PBKDF2)
   - Encrypt/Decrypt (AES-GCM)
   - IV Management

2. **IndexedDBService** implementieren
   - DB Initialization
   - Put/Get Operations
   - Quota Checking

3. **Integration in EinsatzService**
   - Verschlüsseltes Speichern von Einsätzen
   - Entschlüsseln beim Laden
   - Error Handling

4. **Tests**
   - Unit Tests für Encryption Service
   - Integration Tests für IndexedDB
   - E2E Tests für Offline-Szenario

### Phase 2: Optimierungen (Optional)
1. **Web Worker Encryption**
   - Offload zu Background Thread
   - Performance-Messung

2. **Selective Encryption**
   - Nur sensible Felder verschlüsseln
   - Metadata plain für Queries

3. **Compression**
   - LZ4/Gzip vor Verschlüsselung
   - Storage-Effizienz messen

4. **Migration Tools**
   - Key-Rotation Helper
   - Version-Upgrade Logic

---

## 9. Fazit

**Empfehlung: IndexedDB + Web Crypto API (AES-GCM)**

Diese Kombination bietet die beste Balance aus:
- ✅ **Sicherheit:** AES-GCM (256-bit) mit PBKDF2 Key Derivation
- ✅ **Skalierbarkeit:** Bis zu 1GB+ Storage (vs. 5-10MB localStorage)
- ✅ **Performance:** Asynchron, nicht-blockierend, Web Worker-fähig
- ✅ **Funktionalität:** Transactions, Indizes, Querying
- ✅ **Browser-Support:** Universal verfügbar (2026)
- ✅ **Zero Dependencies:** Native Browser APIs

**localStorage** ist für bluelight-hub **ungeeignet** aufgrund:
- ❌ Storage-Limits (5-10MB) zu klein für Einsatzdaten
- ❌ Synchrone Ops blockieren UI bei Verschlüsselung
- ❌ Keine Querying/Indexing-Unterstützung
- ❌ String-only (JSON Overhead)

**OPFS** ist **zu experimentell** für Production-Use (2026).

---

## 10. Quellen & Referenzen

### Web Crypto API
- [Web Crypto API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [TrustedSec: Application Layer Encryption with Web Crypto API](https://trustedsec.com/blog/application-layer-encryption-with-web-crypto-api)
- [A Practical Guide to the Web Cryptography API](https://davidmyers.dev/blog/a-practical-guide-to-the-web-cryptography-api)
- [The Ultimate Developer's Guide to AES-GCM Encryption](https://www.sharesecure.link/articles/the-ultimate-developers-guide-to-aes-gcm-encryption-with-web-cryptography-api)

### Storage Comparison
- [LocalStorage vs IndexedDB: JavaScript Guide](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5)
- [9 differences between IndexedDB and LocalStorage](https://dev.to/armstrong2035/9-differences-between-indexeddb-and-localstorage-30ai)
- [LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)
- [Browser Storage: A Comparative Analysis](https://browsee.io/blog/unleashing-the-power-a-comparative-analysis-of-indexdb-local-storage-and-session-storage/)

### IndexedDB Encryption
- [Can IndexedDB be encrypted for sensitive data?](https://www.mindstick.com/interview/34335/can-indexeddb-be-encrypted-for-sensitive-data-how-would-you-do-that)
- [GitHub: dexie-encrypted](https://github.com/dfahlander/dexie-encrypted)
- [GitHub: secure-webstore](https://github.com/AKASHAorg/secure-webstore)
- [Browsertech Digest: Encrypting offline storage](https://digest.browsertech.com/archive/browsertech-digest-encrypting-offline-storage-for/)

### Key Management
- [How to secure encrypt and decrypt data with AES-GCM and PBKDF2](https://medium.com/@thomas_40553/how-to-secure-encrypt-and-decrypt-data-within-the-browser-with-aes-gcm-and-pbkdf2-057b839c96b6)
- [Cryptographic Best Practices · GitHub](https://gist.github.com/atoponce/07d8d4c833873be2f68c34f9afc5a78a)
- [Best Practices for Key Wrapping, Storage, and Management](https://dev.ubiqsecurity.com/docs/key-mgmt-best-practices)
- [AES-256-GCM: The Gold Standard of Modern Encryption](https://petadot.com/aes-256-gcm/)

### Storage API
- [Storage quotas and eviction criteria - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [StorageManager: estimate() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)
- [Storage for the web | web.dev](https://web.dev/articles/storage-for-the-web)

---

**Nächste Schritte:**
1. ✅ Research abgeschlossen
2. ⏭️ Tech Spec für Story 2.1 erstellen (basierend auf Empfehlungen)
3. ⏭️ Implementierung starten (EncryptionService + IndexedDBService)

**Erstellt von:** Claude Code (BMad v6)
**Letzte Aktualisierung:** 2026-01-08
