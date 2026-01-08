# Platform Storage Strategy - Executive Summary

**Kurzzusammenfassung für Story 2.1 Implementation**

## Quick Decision

```
Browser (Web):     localStorage + Web Crypto API (AES-256-GCM)
Desktop (Tauri):   Tauri Stronghold Plugin (AES-256-GCM + Argon2id)
```

## Key Findings

### Browser Storage Comparison

| Aspekt | localStorage | IndexedDB |
|--------|--------------|-----------|
| **Größe** | 5-10 MB | bis 50% Disk |
| **Encryption** | Web Crypto API nötig | Web Crypto API nötig |
| **API** | Synchron, einfach | Asynchron, komplex |
| **Sicherheit (mit Encryption)** | ✅ AES-256-GCM | ✅ AES-256-GCM |
| **Für unseren Use-Case** | ✅ AUSREICHEND | Overkill |

**Empfehlung:** localStorage mit Web Crypto API

**Begründung:** Ausreichend für ~1-2 KB pro Server × 10 Server = 20 KB Storage. Web Crypto API verschlüsselt Daten vor Speicherung.

### Desktop Storage Options

| Option | Encryption | Support | Komplexität |
|--------|-----------|---------|-------------|
| **Tauri Store** | ❌ Nein | Alle Betriebssysteme | Niedrig |
| **Stronghold Plugin** | ✅ AES-256-GCM | macOS/Windows/Linux | Medium |
| **OS Keyring** | ✅ OS-native | Platform-spezifisch | Medium-Hoch |

**Empfehlung:** Tauri Stronghold Plugin

**Begründung:**
- Standardlösung für Tauri-Apps
- Military-grade Encryption (AES-256-GCM)
- Cross-Platform (macOS/Windows/Linux)
- Moderne Key Derivation (Argon2id)
- Große Community + Support

## Implementation Blueprint

### Service-Abstraction

```typescript
// Common Interface (Browser + Desktop)
export interface IPlatformStorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

// Browser Implementation
export class BrowserStorageService implements IPlatformStorageService {
  // localStorage + Web Crypto API
}

// Desktop Implementation (Tauri)
export class TauriStorageService implements IPlatformStorageService {
  // Stronghold Plugin
}

// Hook für Auto-Dispatch
export function usePlatformStorage(): IPlatformStorageService {
  const { isTauri } = useTauriContext();
  return isTauri ? new TauriStorageService() : new BrowserStorageService();
}
```

## Web Crypto API Essentials

```typescript
// Encryption
const encrypted = await encryptData(
  plaintext: string,
  password: string
): Promise<string>

// Decryption
const plaintext = await decryptData(
  encrypted: string,
  password: string
): Promise<string>

// Algorithm: AES-256-GCM
// Key Derivation: PBKDF2 (100.000 iterations, SHA-256)
// Authentication: GCM (built-in)
// Nonce/IV: 96-bit random
```

## Tauri Stronghold Essentials

```typescript
// Setup in Rust (src-tauri/src/main.rs)
.plugin(
  tauri_plugin_stronghold::Builder::new(|password| {
    // Argon2id hashing
  })
)

// Usage in TypeScript
const stronghold = await Stronghold.load(path, password);
const client = await stronghold.createClient('servers').getStore();

await client.insert('key', bytes);
const value = await client.get('key');
```

## Development Workflow

### Phase 1: Desktop (Higher Priority)
1. Stronghold Plugin Integration (Rust Setup)
2. TauriStorageService Implementation (TS)
3. Unit Tests
4. E2E Tests

### Phase 2: Browser
1. Web Crypto Utilities
2. BrowserStorageService Implementation
3. Security Warning UI
4. Unit Tests

### Phase 3: Integration
1. Feature Hook
2. Server Management UI
3. Full E2E Testing

## Security Guarantees

✅ **NFR-S4 erfüllt:** Beide Plattformen verschlüsseln Daten

| Platform | Encryption | Key Length | Key Derivation | At-Rest | Auth |
|----------|-----------|-----------|-----------------|---------|------|
| Browser | AES-256-GCM | 256-bit | PBKDF2 (100k iter) | ✅ | GCM |
| Desktop | AES-256-GCM | 256-bit | Argon2id | ✅ | GCM |

## Browser Security Warning

⚠️ **Wichtig:** Explizite Warnung für Web-Nutzer:

> "Diese Web-Version speichert Konfigurationen mit Web Crypto API Encryption.
> Das Passwort ist lokal im Browser gespeichert. Für höchste Sicherheit nutzen Sie
> die Desktop-App, die native Betriebssystem-Integration nutzt."

## Storage Limits

Für unseren Use-Case:
- 10 Server × 1-2 KB pro Server = 20 KB
- UI-State Reserve = 100 KB
- **Total: << 5 MB localStorage limit** ✅

## Testing Checklist

```typescript
// Browser Tests
[ ] Web Crypto API Encryption funktioniert
[ ] Password-falsch erkennt wird
[ ] localStorage korrekt befüllt wird
[ ] Decryption funktioniert

// Desktop Tests
[ ] Stronghold Init funktioniert
[ ] Encrypt/Decrypt mit Stronghold
[ ] Master-Password Protection
[ ] File Persistence auf Disk
```

## References

**Web Crypto API:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- OWASP: https://armur.ai/website-security/client/client/client-side-storage-security/

**Tauri Stronghold:**
- Docs: https://v2.tauri.app/plugin/stronghold/
- GitHub: https://github.com/tauri-apps/tauri-plugin-stronghold
- Reference: https://v2.tauri.app/reference/javascript/stronghold/

**Storage Quotas:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- web.dev: https://web.dev/articles/storage-for-the-web

## Next Steps

1. **Review ADR-001** für detaillierte Analyse
2. **Setup Stronghold Plugin** im Backend
3. **Implement Abstractions** in Frontend
4. **Create Test Suite** für beide Plattformen
5. **Add Security Warning** UI in Browser

---

**Detailed Decision:** siehe `/docs/project-documentation/ADR-001-platform-storage-strategy.md`
