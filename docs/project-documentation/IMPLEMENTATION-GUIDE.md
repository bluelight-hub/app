# Platform Storage Implementation Guide

> **Verweis:** Detaillierte Decision siehe [ADR-001: Platform Storage Strategy](./ADR-001-platform-storage-strategy.md)

## TL;DR - Was wird wo gespeichert?

```
Browser (Web)    → localStorage (encrypted with Web Crypto API)
Desktop (Tauri)  → Stronghold Plugin (native AES-256-GCM)
```

## Setup Checklist

### Desktop (Tauri) - Higher Priority

- [ ] Stronghold Plugin in `package.json` installieren
- [ ] Rust setup in `src-tauri/src/main.rs` (Argon2id hashing)
- [ ] TypeScript `TauriStorageService` schreiben
- [ ] Tests schreiben
- [ ] Features integrieren

### Browser (Web)

- [ ] Web Crypto Utility Funktionen schreiben
- [ ] Browser `StorageService` schreiben
- [ ] Security Warning UI implementieren
- [ ] Tests schreiben
- [ ] Features integrieren

## Code Templates

### 1. Desktop: Tauri Stronghold Setup

**File: `packages/frontend/src-tauri/src/main.rs`**

```rust
use tauri_plugin_stronghold::StrongholdExt;
use argon2::{hash_raw, Config, Variant, Version};

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
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

**Cargo.toml dependencies:**
```toml
tauri-plugin-stronghold = "2"
argon2 = "0.4"
```

### 2. Desktop: TypeScript Service

**File: `packages/frontend/src/shared/services/tauri-storage.service.ts`**

```typescript
import { Stronghold } from '@tauri-apps/plugin-stronghold';

export interface StorageValue<T> {
  data: T;
  encryptedAt: number;
}

export class TauriStorageService {
  private stronghold: Stronghold | null = null;
  private client: Store | null = null;

  async initialize(masterPassword: string): Promise<void> {
    try {
      const appDataDir = await appDir();
      const vaultPath = `${appDataDir}/.bluelight-vault`;

      this.stronghold = await Stronghold.load(vaultPath, masterPassword);
      this.client = await this.stronghold.createClient('servers').getStore();
    } catch (error) {
      throw new Error(`Stronghold initialization failed: ${error}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Service not initialized');

    try {
      const raw = await this.client.get(key);
      if (!raw) return null;

      const json = new TextDecoder().decode(new Uint8Array(raw));
      const stored: StorageValue<T> = JSON.parse(json);
      return stored.data;
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.client || !this.stronghold) throw new Error('Service not initialized');

    try {
      const storageValue: StorageValue<T> = {
        data: value,
        encryptedAt: Date.now(),
      };

      const json = JSON.stringify(storageValue);
      const bytes = Array.from(new TextEncoder().encode(json));
      await this.client.insert(key, bytes);
      await this.stronghold.save();
    } catch (error) {
      throw new Error(`Failed to store ${key}: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.client || !this.stronghold) throw new Error('Service not initialized');

    try {
      await this.client.remove(key);
      await this.stronghold.save();
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  async close(): Promise<void> {
    if (this.stronghold) {
      await this.stronghold.save();
      await this.stronghold.unload();
    }
  }
}
```

### 3. Browser: Web Crypto Utilities

**File: `packages/frontend/src/shared/services/web-crypto.utils.ts`**

```typescript
const ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
} as const;

const KEY_DERIVATION = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 100_000,
} as const;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Verschlüsselt einen String mit AES-256-GCM.
 *
 * @param plaintext Text zum verschlüsseln
 * @param password Master-password für Key Derivation
 * @returns base64-encoded [salt + iv + encrypted]
 */
export async function encryptData(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Key Derivation
  const pwBytes = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const key = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION.name,
      salt,
      iterations: KEY_DERIVATION.iterations,
      hash: KEY_DERIVATION.hash,
    },
    await crypto.subtle.importKey('raw', pwBytes, 'PBKDF2', false, ['deriveKey']),
    ALGORITHM,
    false,
    ['encrypt']
  );

  // Encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM.name, iv },
    key,
    data
  );

  // Combine: salt + iv + encrypted
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  );
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts AES-256-GCM encrypted data.
 */
export async function decryptData(encrypted: string, password: string): Promise<string> {
  const combined = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));

  // Extract components
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Key Derivation (same as encryption)
  const pwBytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION.name,
      salt,
      iterations: KEY_DERIVATION.iterations,
      hash: KEY_DERIVATION.hash,
    },
    await crypto.subtle.importKey('raw', pwBytes, 'PBKDF2', false, ['deriveKey']),
    ALGORITHM,
    false,
    ['decrypt']
  );

  // Decryption
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM.name, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}
```

### 4. Browser: Storage Service

**File: `packages/frontend/src/shared/services/browser-storage.service.ts`**

```typescript
import { encryptData, decryptData } from './web-crypto.utils';

export class BrowserStorageService {
  constructor(private password: string) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      const decrypted = await decryptData(encrypted, this.password);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      const encrypted = await encryptData(json, this.password);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      throw new Error(`Failed to store ${key}: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }
}
```

### 5. Platform Abstraction Hook

**File: `packages/frontend/src/shared/hooks/use-platform-storage.ts`**

```typescript
import { useEffect, useState } from 'react';
import { useTauriContext } from './use-tauri-context';
import { TauriStorageService } from '@/shared/services/tauri-storage.service';
import { BrowserStorageService } from '@/shared/services/browser-storage.service';

export interface IPlatformStorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export function usePlatformStorage(): {
  service: IPlatformStorageService | null;
  isReady: boolean;
  error: Error | null;
} {
  const { isTauri } = useTauriContext();
  const [service, setService] = useState<IPlatformStorageService | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        if (isTauri) {
          // Desktop: Initialize Stronghold
          const tauriService = new TauriStorageService();
          const masterPassword = await getMasterPassword(); // User Input
          await tauriService.initialize(masterPassword);
          setService(tauriService);
        } else {
          // Browser: Prompt for password
          const password = await getBrowserPassword(); // User Input
          const browserService = new BrowserStorageService(password);
          setService(browserService);
        }
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    };

    initializeStorage();
  }, [isTauri]);

  return { service, isReady, error };
}

async function getMasterPassword(): Promise<string> {
  // TODO: Implement dialog/modal for password input
  return new Promise((resolve) => {
    const password = prompt('Enter master password:');
    if (password) resolve(password);
    else throw new Error('Master password is required');
  });
}

async function getBrowserPassword(): Promise<string> {
  // TODO: Implement dialog/modal for password input
  return new Promise((resolve) => {
    const password = prompt('Enter storage password:');
    if (password) resolve(password);
    else throw new Error('Storage password is required');
  });
}
```

### 6. Feature Integration Example

**File: `packages/frontend/src/features/server/hooks/use-server-storage.ts`**

```typescript
import { usePlatformStorage } from '@/shared/hooks/use-platform-storage';
import { useCallback } from 'react';

export interface ServerConfig {
  id: string;
  url: string;
  accessToken: string;
  name: string;
  addedAt: number;
}

export function useServerStorage() {
  const { service, isReady, error } = usePlatformStorage();

  const loadServers = useCallback(async (): Promise<ServerConfig[]> => {
    if (!service) throw new Error('Storage service not ready');
    return (await service.get('servers:config')) || [];
  }, [service]);

  const addServer = useCallback(async (server: ServerConfig): Promise<void> => {
    if (!service) throw new Error('Storage service not ready');

    const servers = await loadServers();
    servers.push(server);
    await service.set('servers:config', servers);
  }, [service, loadServers]);

  const removeServer = useCallback(async (serverId: string): Promise<void> => {
    if (!service) throw new Error('Storage service not ready');

    const servers = await loadServers();
    const filtered = servers.filter(s => s.id !== serverId);
    await service.set('servers:config', filtered);
  }, [service, loadServers]);

  return {
    isReady,
    error,
    loadServers,
    addServer,
    removeServer,
  };
}
```

## Testing Template

### Browser Storage Test

```typescript
import { encryptData, decryptData } from '@/shared/services/web-crypto.utils';

describe('BrowserStorageService', () => {
  const password = 'test-password-123';
  const testData = { server: 'https://api.example.com', token: 'token123' };

  it('should encrypt and decrypt data', async () => {
    const encrypted = await encryptData(JSON.stringify(testData), password);
    const decrypted = await decryptData(encrypted, password);

    expect(JSON.parse(decrypted)).toEqual(testData);
  });

  it('should fail with wrong password', async () => {
    const encrypted = await encryptData(JSON.stringify(testData), password);

    try {
      await decryptData(encrypted, 'wrong-password');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
```

### Desktop Storage Test

```typescript
import { TauriStorageService } from '@/shared/services/tauri-storage.service';

describe('TauriStorageService', () => {
  let service: TauriStorageService;

  beforeEach(async () => {
    service = new TauriStorageService();
    // Mock Stronghold for testing
  });

  it('should store and retrieve encrypted data', async () => {
    const data = { url: 'https://api.example.com' };
    await service.set('server:test', data);

    const retrieved = await service.get('server:test');
    expect(retrieved).toEqual(data);
  });
});
```

## Security Checklist

- [ ] Passwörter werden NIEMALS geloggt
- [ ] Daten sind IMMER verschlüsselt vor localStorage-Write
- [ ] Web Crypto API nutzt AES-256-GCM (nicht AES-128)
- [ ] Saltlänge ist mindestens 16 bytes
- [ ] PBKDF2 iterations sind >= 100.000
- [ ] Tauri Stronghold nutzt Argon2id für Key Derivation
- [ ] Sensitive Keys werden nicht in localStorage unencrypted gespeichert
- [ ] Browser-User wird vor Speicherungs-Limitation gewarnt

## Links

- [ADR-001: Platform Storage Strategy](./ADR-001-platform-storage-strategy.md)
- [PLATFORM-STORAGE-SUMMARY.md](./PLATFORM-STORAGE-SUMMARY.md)
- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Tauri: Stronghold Documentation](https://v2.tauri.app/plugin/stronghold/)
