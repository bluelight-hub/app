---
description: 
globs: packages/backend/**/*.controller.spec.ts
alwaysApply: false
---
# NestJS Controller Tests

## Context
- Gilt für alle Controller-Tests im Backend (`**/*.controller.spec.ts`)
- Standardisiert die Testpraktiken für NestJS Controller
- Verbessert Konsistenz und Qualität der Tests

## Requirements
1. **Test-Struktur**
   - Alle Controller müssen getestet werden
   - Tests in `__tests__` Verzeichnis des jeweiligen Moduls
   - Dateinamen mit Muster: `*.controller.spec.ts`
   - Hauptbeschreibungsblock nach Controller-Klasse benennen

2. **Test-Setup**
   - `TestingModule` für jeden Controller erstellen
   - Abhängigkeiten mit Jest-Mocks bereitstellen
   - Alle Abhängigkeiten im `beforeEach` initialisieren
   - Grundlegende Tests auf Existenz des Controllers

3. **Mock-Standards**
   - Services, Repositories und andere Abhängigkeiten mocken
   - Datenbank-Zugriffe immer mocken, nie echte DB verwenden
   - Für HTTP-Clients und externe Dienste detaillierte Mocks erstellen
   - TCP-Verbindungen, Sockets und netzwerkbezogene Elemente mocken

4. **Testabdeckung**
   - Jede öffentliche Methode des Controllers testen
   - Erfolgsszenario für jeden Endpunkt testen
   - Fehlerszenarios für kritische Endpunkte testen
   - Edge Cases für komplexe Geschäftslogik testen

5. **Assertions**
   - Explizite Assertions mit klaren Fehlermeldungen
   - Status-Codes überprüfen für HTTP-Endpunkte
   - Datenstruktur und Inhalte der Antworten validieren
   - Sicherstellen, dass Mock-Methoden korrekt aufgerufen werden

6. **Fehlerbehandlung**
   - Tests für erwartete Ausnahmen schreiben
   - Überprüfen, dass Fehler korrekt an den Client weitergegeben werden
   - Validieren, dass Fehler korrekt protokolliert werden

7. **Testdaten**
   - Testdaten-Factories verwenden
   - Konstanten für wiederverwendbare Testdaten anlegen
   - Komplexe Testdaten in separaten Dateien verwalten

8. **Typecast für Mocks**
   - Bei komplexen Mocks explizite Typendeklarationen hinzufügen
   - `as` für TypeScript-Typenzusicherungen nur wenn nötig verwenden

## Examples

```typescript
// Gutes Beispiel: Health Controller Test
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { 
  HealthCheckService, 
  DiskHealthIndicator, 
  MemoryHealthIndicator, 
  HealthIndicatorFunction 
} from '@nestjs/terminus';
import * as net from 'net';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let dataSource: { isInitialized: boolean };

  // Mock der Socket-Verbindung
  const mockSocket = {
    setTimeout: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  };

  // Spion für Socket-Erstellung
  jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket as any);

  beforeEach(async () => {
    // Test-Modul mit gemockten Abhängigkeiten
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              details: { database: { status: 'up' } }
            }),
          },
        },
        {
          provide: DataSource,
          useValue: { isInitialized: true },
        },
        // Weitere Provider...
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    dataSource = module.get(DataSource) as { isInitialized: boolean };
  });

  it('sollte definiert sein', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('sollte den Gesundheitsstatus zurückgeben', async () => {
      // Test-Setup
      const result = await controller.check();
      
      // Assertions
      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });
});
```

```typescript
// Schlechtes Beispiel
import { Test } from '@nestjs/testing';
import { UserController } from './user.controller';

describe('User', () => {
  it('works', async () => {
    const app = await Test.createTestingModule({
      controllers: [UserController],
    }).compile();

    const controller = app.get(UserController);
    const result = await controller.findAll();
    
    expect(result).toBeDefined();
  });
}); 