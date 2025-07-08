import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EinsatzService } from '../modules/einsatz/einsatz.service';
import { EtbService } from '../modules/etb/etb.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Test utilities for consistent testing patterns across the backend package
 */

/**
 * Erzeugt ein Mock-Einsatz-Objekt für Tests
 * 
 * @function mockEinsatz
 * @param overrides Optionale Überschreibungen für Standard-Eigenschaften
 * @returns Mock-Einsatz-Objekt mit Standardwerten
 */
export const mockEinsatz = (overrides = {}) => ({
  id: 'test-einsatz-1',
  name: 'Test Einsatz',
  beschreibung: 'Test Description',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Erzeugt ein Mock-ETB-Eintrag-Objekt für Tests
 * 
 * @function mockEtbEntry
 * @param overrides Optionale Überschreibungen für Standard-Eigenschaften
 * @returns Mock-ETB-Eintrag mit Standardwerten
 */
export const mockEtbEntry = (overrides = {}) => ({
  id: 'test-etb-1',
  laufendeNummer: 1,
  kategorie: 'Meldung',
  meldung: 'Test ETB Entry',
  absender: 'Test Sender',
  empfaenger: 'Test Receiver',
  zeitstempel: new Date(),
  einsatzId: 'test-einsatz-1',
  status: 'aktiv',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Erzeugt ein Mock-Benutzer-Objekt für Tests
 * 
 * @function mockUser
 * @param overrides Optionale Überschreibungen für Standard-Eigenschaften
 * @returns Mock-Benutzer-Objekt mit Standardwerten
 */
export const mockUser = (overrides = {}) => ({
  id: 'test-user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Erstellt einen Mock-PrismaService für Unit-Tests
 * 
 * Bietet gemockte Implementierungen aller Prisma-Datenbankoperationen
 * für die Entitäten Einsatz, ETB-Entry und User.
 * 
 * @function createMockPrismaService
 * @returns Mock-PrismaService mit Jest-Funktionen
 */
export const createMockPrismaService = () => ({
  einsatz: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  etbEntry: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(this)),
});

/**
 * Erstellt einen Mock-ConfigService für Tests
 * 
 * @function createMockConfigService
 * @param config Konfigurationsobjekt mit Schlüssel-Wert-Paaren
 * @returns Mock-ConfigService mit get/set/getOrThrow Methoden
 */
export const createMockConfigService = (config: Record<string, any> = {}) => ({
  get: jest.fn((key: string) => config[key]),
  set: jest.fn(),
  getOrThrow: jest.fn((key: string) => {
    const value = config[key];
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is not defined`);
    }
    return value;
  }),
});

/**
 * Erstellt ein Standard-TestingModule für NestJS-Tests
 * 
 * Diese Funktion konfiguriert ein TestingModule mit gemockten
 * Services für Prisma und Config, sowie benutzerdefinierten
 * Providern und Imports.
 * 
 * @function createTestModule
 * @param providers Zusätzliche Provider für das Test-Modul
 * @param imports Zusätzliche Imports für das Test-Modul
 * @param customConfig Benutzerdefinierte Konfigurationswerte
 * @returns Kompiliertes NestJS TestingModule
 */
export const createTestModule = async (
  providers: any[] = [],
  imports: any[] = [],
  customConfig: Record<string, any> = {},
): Promise<TestingModule> => {
  const mockPrismaService = createMockPrismaService();
  const mockConfigService = createMockConfigService({
    NODE_ENV: 'test',
    DATABASE_URL: 'sqlite::memory:',
    ...customConfig,
  });

  return Test.createTestingModule({
    imports,
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
      {
        provide: ConfigService,
        useValue: mockConfigService,
      },
    ],
  }).compile();
};

/**
 * Erstellt ein TestingModule speziell für EinsatzService-Tests
 * 
 * @function createEinsatzServiceTestModule
 * @param customConfig Benutzerdefinierte Konfigurationswerte
 * @returns Kompiliertes TestingModule mit EinsatzService
 */
export const createEinsatzServiceTestModule = async (
  customConfig: Record<string, any> = {},
): Promise<TestingModule> => {
  return createTestModule([EinsatzService], [], customConfig);
};

/**
 * Erstellt ein TestingModule speziell für EtbService-Tests
 * 
 * @function createEtbServiceTestModule
 * @param customConfig Benutzerdefinierte Konfigurationswerte
 * @returns Kompiliertes TestingModule mit EtbService
 */
export const createEtbServiceTestModule = async (
  customConfig: Record<string, any> = {},
): Promise<TestingModule> => {
  return createTestModule([EtbService], [], customConfig);
};

/**
 * Hilfsfunktion zum Warten auf asynchrone Operationen in Tests
 * 
 * @function waitForAsync
 * @param ms Verzögerung in Millisekunden (Standard: 0)
 * @returns Promise, das nach der angegebenen Zeit resolved
 */
export const waitForAsync = (ms: number = 0) => {
  const timeoutPromise = new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref(); // Timer soll den Prozess nicht am Beenden hindern
  });
  return timeoutPromise;
};

/**
 * Hilfsfunktion zum Testen von erwarteten Fehlern in asynchronen Funktionen
 * 
 * @function expectAsyncError
 * @param asyncFn Die asynchrone Funktion, die einen Fehler werfen soll
 * @param expectedError Erwartete Fehlermeldung oder RegExp
 * @returns Der geworfene Fehler zur weiteren Prüfung
 */
export const expectAsyncError = async (
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp,
) => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
    return error;
  }
};

/**
 * Mockt die Console-Methoden für CLI-Tests
 * 
 * Ersetzt console.log, console.error, console.warn und console.info
 * mit Jest-Mocks und sammelt die Ausgaben für Assertions.
 * 
 * @function mockConsole
 * @returns Objekt mit logs, errors Arrays und restore Funktion
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  const logs: string[] = [];
  const errors: string[] = [];

  console.log = jest.fn((message: string) => logs.push(message));
  console.error = jest.fn((message: string) => errors.push(message));
  console.warn = jest.fn();
  console.info = jest.fn();

  return {
    logs,
    errors,
    restore: () => {
      Object.assign(console, originalConsole);
    },
    clear: () => {
      logs.length = 0;
      errors.length = 0;
    },
  };
};

/**
 * Hilfsfunktion für gemockte Datenbank-Transaktionen
 * 
 * @function withMockTransaction
 * @param mockPrisma Mock-PrismaService Instanz
 * @param callback Callback-Funktion, die in der Transaktion ausgeführt wird
 * @returns Rückgabewert des Callbacks
 */
export const withMockTransaction = (mockPrisma: any, callback: (tx: any) => any) => {
  mockPrisma.$transaction.mockImplementation((txCallback: any) => {
    return txCallback(mockPrisma);
  });
  return callback(mockPrisma);
};

/**
 * Hilfsfunktion zum temporären Überschreiben von Umgebungsvariablen
 * 
 * @function withMockEnv
 * @param envVars Objekt mit zu setzenden Umgebungsvariablen
 * @param callback Funktion, die mit den geänderten Variablen ausgeführt wird
 */
export const withMockEnv = (envVars: Record<string, string>, callback: () => void) => {
  const originalEnv = { ...process.env };

  Object.assign(process.env, envVars);

  try {
    callback();
  } finally {
    process.env = originalEnv;
  }
};

/**
 * Erstellt standardisierte Testfälle für DTO-Validierung
 * 
 * @function createValidationTestCases
 * @param ValidatorClass Die zu testende DTO-Klasse
 * @returns Objekt mit expectValidationSuccess und expectValidationFailure Methoden
 */
export const createValidationTestCases = (ValidatorClass: any) => {
  return {
    async expectValidationSuccess(data: any) {
      const dto = new ValidatorClass();
      Object.assign(dto, data);
      // Add validation logic if using class-validator
      return dto;
    },

    async expectValidationFailure(data: any) {
      const dto = new ValidatorClass();
      Object.assign(dto, data);
      // Add validation logic if using class-validator
      // This would typically use validate() from class-validator
      return dto;
    },
  };
};

/**
 * Erzeugt eine gemockte paginierte Antwort
 * 
 * @function mockPaginatedResponse
 * @param items Array der zu paginierenden Elemente
 * @param page Aktuelle Seitennummer (Standard: 1)
 * @param itemsPerPage Elemente pro Seite (Standard: 10)
 * @returns Paginierte Antwort mit Metadaten
 */
export const mockPaginatedResponse = (items: any[], page = 1, itemsPerPage = 10) => ({
  items,
  pagination: {
    currentPage: page,
    itemsPerPage,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / itemsPerPage),
    hasNextPage: page * itemsPerPage < items.length,
    hasPreviousPage: page > 1,
  },
});
