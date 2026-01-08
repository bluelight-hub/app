# Tauri Plugin Store Setup

## Übersicht

Das `@tauri-apps/plugin-store` Plugin bietet eine sichere, persistente Key-Value-Datenbank für die Tauri Desktop-Anwendung. Es wird für lokale Konfigurationen, Benutzereinstellungen und möglicherweise sensible Daten mit optionaler Verschlüsselung verwendet.

**Status:** ✅ Installiert und konfiguriert (v2.4.1)

## Installation

Das Plugin ist bereits als Abhängigkeit installiert:

```bash
# Frontend (JavaScript/TypeScript)
pnpm add @tauri-apps/plugin-store

# Rust-Backend (Cargo.toml)
tauri-plugin-store = "2.4.0"
```

### Vollständige Dependencies

**Frontend (package.json):**
```json
{
  "dependencies": {
    "@tauri-apps/plugin-store": "^2.4.1"
  }
}
```

**Rust-Backend (src-tauri/Cargo.toml):**
```toml
[dependencies]
tauri-plugin-store = "2.4.0"
```

## Konfiguration

### Tauri Config (tauri.conf.json)

Das Plugin erfordert keine zusätzliche Konfiguration in `tauri.conf.json`. Die Standardkonfiguration funktioniert:

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "bluelight-hub",
  "version": "1.0.0",
  "identifier": "dev.rubeen.bluelight-hub",
  "build": {
    "beforeDevCommand": "pnpm dev:vite",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:3090",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "[DEV] Bluelight Hub"
      }
    ]
  }
}
```

### Rust-Initialisierung

Das Plugin wird automatisch initialisiert, wenn es in `Cargo.toml` deklariert ist. Keine manuelle Initialisierung erforderlich.

## Basic Usage

### 1. Store erstellen und nutzen (Frontend)

```typescript
import { Store } from '@tauri-apps/plugin-store';

// Store mit Namen erstellen/öffnen
const store = await Store.load('app-config.json');

// Wert speichern
await store.set('user-preference', 'dark-mode');

// Wert abrufen
const preference = await store.get('user-preference');
console.log(preference); // 'dark-mode'

// Prüfen ob Key existiert
const hasKey = await store.has('user-preference');

// Alle Keys auflisten
const allKeys = await store.keys();

// Wert löschen
await store.delete('user-preference');

// Store speichern (Änderungen persistieren)
await store.save();
```

### 2. Feature-Beispiel: User Settings Store

```typescript
// features/settings/stores/user-settings.store.ts
import { Store } from '@tauri-apps/plugin-store';
import { create } from '@tanstack/react-store';

interface UserSettings {
  theme: 'light' | 'dark';
  language: 'de' | 'en';
  mapZoom: number;
}

export class UserSettingsStore {
  private store: Store | null = null;
  private defaultSettings: UserSettings = {
    theme: 'light',
    language: 'de',
    mapZoom: 10,
  };

  async initialize(): Promise<void> {
    this.store = await Store.load('user-settings.json');
  }

  async getSetting<K extends keyof UserSettings>(
    key: K
  ): Promise<UserSettings[K]> {
    if (!this.store) {
      await this.initialize();
    }
    const value = await this.store!.get<UserSettings[K]>(key);
    return value ?? this.defaultSettings[key];
  }

  async setSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): Promise<void> {
    if (!this.store) {
      await this.initialize();
    }
    await this.store!.set(key, value);
    await this.store!.save();
  }

  async getAllSettings(): Promise<UserSettings> {
    if (!this.store) {
      await this.initialize();
    }
    const keys = await this.store!.keys();
    const settings: Partial<UserSettings> = { ...this.defaultSettings };

    for (const key of keys) {
      const value = await this.store!.get(key);
      if (value !== null) {
        settings[key as keyof UserSettings] = value;
      }
    }

    return settings as UserSettings;
  }

  async reset(): Promise<void> {
    if (!this.store) {
      await this.initialize();
    }
    const keys = await this.store!.keys();
    for (const key of keys) {
      await this.store!.delete(key);
    }
    await this.store!.save();
  }
}

// Hook für React
import { useEffect, useState } from 'react';

export function useUserSetting<K extends keyof UserSettings>(
  key: K
): [UserSettings[K] | null, (value: UserSettings[K]) => Promise<void>] {
  const [value, setValue] = useState<UserSettings[K] | null>(null);
  const store = new UserSettingsStore();

  useEffect(() => {
    store.initialize().then(() => {
      store.getSetting(key).then(setValue);
    });
  }, [key]);

  const updateValue = async (newValue: UserSettings[K]): Promise<void> => {
    await store.setSetting(key, newValue);
    setValue(newValue);
  };

  return [value, updateValue];
}
```

### 3. Mit Verschlüsselung (Optional)

Tauri Plugin Store v2.4+ unterstützt **optionale Verschlüsselung** mit dem Cipher-Feature:

```typescript
import { Store } from '@tauri-apps/plugin-store';

// Store mit Verschlüsselung erstellen (Cipher-Feature erforderlich)
const encryptedStore = await Store.load('secure-data.json');

// Sensible Daten speichern
await encryptedStore.set('api-token', 'secret-token-xyz');
await encryptedStore.set('encryption-key', 'my-secure-key');

// Speichern mit optionaler Verschlüsselung in Rust
// (siehe unten)
await encryptedStore.save();
```

### 4. Rust-Seite (Cipher Feature)

Für verschlüsselte Stores in der Rust-Seite:

```rust
// src-tauri/Cargo.toml
[dependencies]
tauri-plugin-store = { version = "2.4.0", features = ["encryption"] }
```

```rust
// src-tauri/src/lib.rs
use tauri::Manager;
use tauri_plugin_store::{StoreExt, StoreCollection};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Optional: Configure encryption
            let stores = app.state::<StoreCollection>();
            let _store = stores.load(
                app.app_handle().clone(),
                "secure-data.json".parse().unwrap(),
            );
            Ok(())
        })
        .plugin(tauri_plugin_store::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Speicherorte

Die Store-Dateien werden in plattformspezifischen Verzeichnissen gespeichert:

- **macOS:** `~/Library/Application Support/dev.rubeen.bluelight-hub/`
- **Windows:** `C:\Users\<User>\AppData\Roaming\dev.rubeen.bluelight-hub\`
- **Linux:** `~/.config/dev.rubeen.bluelight-hub/`

Die Store-Datei selbst (z.B. `app-config.json`) wird in diesem Verzeichnis abgelegt.

## Sicherheitsüberlegungen

### Verschlüsselung

- **Ohne Cipher-Feature:** Daten werden im **Klartext** gespeichert (JSON-Datei)
- **Mit Cipher-Feature:** Daten können verschlüsselt werden
- **Empfehlungen:**
  - Verwende Verschlüsselung nur für sensible Daten (API-Token, Passwörter)
  - Nutze **system keychain** für höchste Sicherheit (z.B. macOS Keychain)
  - Lagere komplexe Secrets über Backend-API

### Best Practices

```typescript
// ✅ RICHTIG: Nur unkritische Daten lokal speichern
await store.set('theme-preference', 'dark-mode');
await store.set('sidebar-collapsed', true);
await store.set('last-search-query', 'Einsatz 2025');

// ❌ FALSCH: Sensible Daten im Store speichern
await store.set('jwt-token', 'eyJhbGciOiJIUzI1NiIs...');
await store.set('api-secret', 'secret-key-xyz');
await store.set('password-hash', 'hashed-password');

// ✅ RICHTIG: Sensible Daten über Backend
// Frontend: Fordern Token vom Backend an
const token = await api.auth.getAccessToken();
// Backend: Speichert in sicherer Session
```

## Epic 2 Integration

Für Epic 2 (Multi-Server-Konfiguration) wird der Store zur Speicherung von:

- **Server-Konfigurationen** (URL, Name, Status)
- **Verbindungsprofile** (Credentials, Zertifikate)
- **Benutzervorlieben** (Default-Server, Theme)

Geplante Struktur:

```typescript
interface ServerConfig {
  id: string; // UUID
  name: string;
  url: string;
  isDefault: boolean;
  createdAt: number;
  lastUsed?: number;
}

// Store mit verschlüsselter Credentials-Option
const serverStore = await Store.load('servers.json');
await serverStore.set('servers', [
  {
    id: 'server-1',
    name: 'Production',
    url: 'https://api.bluelight.com',
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'server-2',
    name: 'Staging',
    url: 'https://staging-api.bluelight.com',
    isDefault: false,
    createdAt: Date.now(),
  },
]);
```

## Debugging

### Store-Dateien prüfen

```bash
# macOS
cat ~/Library/Application\ Support/dev.rubeen.bluelight-hub/app-config.json

# Linux
cat ~/.config/dev.rubeen.bluelight-hub/app-config.json

# Windows PowerShell
Get-Content $env:APPDATA\dev.rubeen.bluelight-hub\app-config.json
```

### Logging

```typescript
const store = await Store.load('app-config.json');
const allData = await store.keys();
console.log('Store Keys:', allData);

for (const key of allData) {
  const value = await store.get(key);
  console.log(`${key}:`, value);
}
```

## Weitere Ressourcen

- [Tauri Plugin Store Dokumentation](https://v2.tauri.app/plugin/store)
- [Tauri Security Best Practices](https://v2.tauri.app/security/)
- [GitHub: tauri-apps/plugins-workspace](https://github.com/tauri-apps/plugins-workspace)

## Changelog

| Version | Datum      | Anmerkungen |
|---------|------------|------------|
| 1.0     | 2026-01-08 | Initial Setup für Epic 2 |
