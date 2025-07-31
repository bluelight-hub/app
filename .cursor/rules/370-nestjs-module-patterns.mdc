---
description: 
globs: **/*.module.ts
alwaysApply: false
---
# NestJS Modul-Patterns

## Context
- Gilt für alle Module-Klassen im Backend (`**/*.module.ts`)
- Standardisiert die Struktur und Organisation von Modulen in NestJS
- Verbessert Modularität, Wiederverwendbarkeit und Wartbarkeit

## Requirements

1. **Struktur und Benennung**
   - Module als Klassenname mit Suffix `Module` benennen
   - Module-Decorator immer verwenden
   - Module in eigenen Dateien mit Namensschema `*.module.ts`
   - Domänenspezifische Modulnamen verwenden (z.B. `UserModule`)

2. **Organisation**
   - Feature-Module für zusammengehörende Funktionalitäten erstellen
   - Core-Module für anwendungsweite Dienste
   - Shared-Module für wiederverwendbare Komponenten
   - Module nach Domänen strukturieren, nicht nach technischen Aspekten

3. **Dependency Management**
   - Benötigte Module explizit importieren
   - Exports für nach außen sichtbare Provider und Module
   - Providers für modulinterne Dienste
   - Controllers für HTTP-Endpunkte definieren

4. **Modulkonfiguration**
   - `forRoot()` für globale Modulkonfiguration
   - `forFeature()` für feature-spezifische Konfiguration
   - `register()` für dynamische Modulkonfiguration
   - Konfigurationswerte über Options-Interfaces definieren

5. **Zirkuläre Abhängigkeiten**
   - Zirkuläre Abhängigkeiten vermeiden
   - Bei Bedarf `forwardRef()` verwenden
   - Shared-Module für gemeinsame Abhängigkeiten nutzen
   - Abstraktion durch Interfaces für lose Kopplung

6. **Lazy Loading**
   - Bei größeren Anwendungen Lazy Loading unterstützen
   - Asynchrone Module-Imports verwenden
   - Module nach Bedarf dynamisch laden

7. **Testing**
   - Module mit TestingModule isoliert testen
   - Für Unit-Tests Abhängigkeiten mocken
   - Für Integrationstests echte Module importieren
   - Testcontainer für komplexe Modulabhängigkeiten

## Examples

```typescript
// Gutes Beispiel
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../logger/logger.module';

/**
 * Modul für alle benutzerrelevanten Funktionalitäten.
 */
@Module({
  imports: [
    // Domain-spezifische Entities
    TypeOrmModule.forFeature([UserEntity]),
    
    // Benötigte Module
    AuthModule,
    LoggerModule,
    
    // Module-spezifische Konfiguration
    ConfigModule.forFeature(() => ({
      USER_FEATURES: {
        emailVerification: true,
        passwordReset: true,
      },
    })),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {
  // Optionale statische Methoden für Modulkonfiguration
  static forRoot(options?: UserModuleOptions) {
    return {
      module: UserModule,
      providers: [
        {
          provide: 'USER_OPTIONS',
          useValue: options || {},
        },
      ],
    };
  }
}

// Interface für Modulkonfiguration
export interface UserModuleOptions {
  enableAudit?: boolean;
  userCacheTimeout?: number;
}
```

```typescript
// Schlechtes Beispiel
@Module({
  // Zu viele Importe ohne klare Struktur
  imports: [
    TypeOrmModule, // Fehlt .forRoot() oder .forFeature()
    AuthModule, EmailModule, LogModule, SharedModule, CoreModule,
  ],
  // Zu viele Controller in einem Modul
  controllers: [
    UserController, ProfileController, UserSettingsController,
    UserPreferencesController, UserNotificationsController,
  ],
  // Zu viele Provider ohne klare Zuständigkeiten
  providers: [
    UserService, ProfileService, UserHelper, UserUtil,
    DatabaseService, CacheManager, FileUploader,
  ],
  // Zu viele Exports, kann zu ungewollten Abhängigkeiten führen
  exports: [UserService, ProfileService, UserHelper, DatabaseService],
})
class Users {} // Falscher Name, sollte UserModule sein
``` 