---
description: ENFORCE Zustand-based store for global or domain-specific states
globs: 
alwaysApply: false
---

# Frontend State Management

## Context
- Nutzt Zustand für globalen oder domänenspezifischen State
- Gilt für Dateien in `packages/frontend/src/stores/`

## Requirements
1. **Store-Struktur**
```
src/stores/
    ├── index.ts
    ├── useAuthStore.ts
    ├── useSettingsStore.ts
    └── ...
```

2. **Ein Store pro Domänenkonzept**
- Klein und fokussiert
- Typisierung via Interfaces
- Devtools nur in Entwicklung
3. **Selektive State-Abos**
- Nur benötigte Teilzustände im jeweiligen Komponentenscope
4. **Middleware**
- Persistenz (optional)
- Fehlerbehandlung
5. **Tests**
- Einheitstests für kritische Store-Methoden

## Examples

<example>
# Beispiel: useAuthStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
</example>
