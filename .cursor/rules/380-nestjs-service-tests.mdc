---
description: 
globs: **/*.service.spec.ts
alwaysApply: false
---
# NestJS Service Tests

## Context
- Gilt für alle Service-Tests im Backend (`**/*.service.spec.ts`)
- Standardisiert die Testpraktiken für NestJS Services
- Verbessert Konsistenz und Qualität der Service-Tests

## Requirements
1. **Test-Struktur**
   - Alle Services müssen getestet werden
   - Tests in `__tests__` Verzeichnis des jeweiligen Moduls
   - Dateinamen mit Muster: `*.service.spec.ts`
   - Hauptbeschreibungsblock nach Service-Klasse benennen

2. **Test-Setup**
   - Für jeden Service ein eigenes `describe`-Block
   - Mocks für Abhängigkeiten erstellen
   - Repositories und externe Services mocken
   - Dependency Injection wie in NestJS üblich verwenden

3. **Mock-Standards**
   - Repositories immer mit funktionierenden CRUD-Methoden mocken
   - Externe Dienste mit klaren Rückgabewerten mocken
   - Spy-Funktionen für Methodenaufrufe verwenden
   - Komplexe Mock-Objekte als Konstanten definieren

4. **Testabdeckung**
   - Jede öffentliche Methode testen
   - Glückspfade (Happy Paths) testen
   - Fehlerpfade testen (Exceptions)
   - Edge Cases berücksichtigen

5. **Assertions**
   - Explizite Assertions mit klaren Fehlermeldungen
   - Return-Werte prüfen
   - Bei Promise-Rückgaben immer await verwenden
   - Bei Observable-Rückgaben subscribe oder toPromise verwenden

6. **Mocking**
   - Jest-Mocks für externe Abhängigkeiten verwenden
   - Prisma Service-Methoden mocken
   - Externe API-Aufrufe mocken
   - Mock-Factory-Funktionen für wiederverwendbare Mocks erstellen

7. **Isolation**
   - Keine Abhängigkeiten zu externen Systemen (DB, API, etc.)
   - Keine Seiteneffekte zwischen Tests
   - beforeEach zum Zurücksetzen von Mocks verwenden
   - Tests sollten unabhängig voneinander ausführbar sein

8. **Datenbank-Testing**
   - Prisma-Methoden mocken, keine echte Datenbank für Unit-Tests
   - Für Integrationstests Test-Container oder separate Test-Datenbank verwenden
   - Testdaten vor jedem Test konsistent aufsetzen
   - Nach Tests Datenbank-Zustand zurücksetzen

## Examples

```typescript
// Gutes Beispiel: UserService Test
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception';

// Testdaten als Konstanten
const mockUsers = [
  { id: '1', email: 'test@example.com', name: 'Test User' },
  { id: '2', email: 'other@example.com', name: 'Other User' },
];

describe('UserService', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Prisma Service Mock erstellen
    const prismaServiceMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaServiceMock)),
    };

    // Config Service Mock
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  it('sollte definiert sein', () => {
    expect(service).toBeDefined();
  });

  describe('findUserById', () => {
    it('sollte einen Benutzer bei gültiger ID zurückgeben', async () => {
      // Arrange
      const userId = '1';
      const expectedUser = mockUsers[0];
      prismaService.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });

    it('sollte UserNotFoundException werfen, wenn kein Benutzer gefunden wird', async () => {
      // Arrange
      const userId = '999';
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findUserById(userId)).rejects.toThrow(UserNotFoundException);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });
  });

  describe('createUser', () => {
    it('sollte einen neuen Benutzer erstellen', async () => {
      // Arrange
      const createUserDto = { email: 'new@example.com', name: 'New User' };
      const newUser = { id: '3', ...createUserDto };
      
      prismaService.user.create.mockResolvedValue(newUser);

      // Act
      const result = await service.createUser(createUserDto);

      // Assert
      expect(result).toEqual(newUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto
      });
    });
  });
});
```

```typescript
// Schlechtes Beispiel
import { UserService } from './user.service';

describe('User Service', () => {
  let service;
  let repo;

  beforeEach(() => {
    repo = { findOne: jest.fn(), save: jest.fn() };
    service = new UserService(repo);
  });

  it('works', () => {
    repo.findOne.mockReturnValue({ id: 1 });
    const user = service.getUser(1);
    expect(user).toBeDefined();
  });
});
``` 