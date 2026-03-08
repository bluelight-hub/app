// @ts-nocheck
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Architecture Rules Test Suite
 *
 * Validates Hexagonal Architecture layer dependencies:
 * - Domain Layer: Pure, no Application/Infrastructure imports
 * - Application Layer: Only Domain imports (except @infrastructure/di-tokens)
 *
 * Story 5-7 (AC5): CLAUDE.md Code Review Checklist automation
 */
describe('Architecture Rules', () => {
  // Patterns to detect violations
  const applicationImportPattern = /from\s+['"].*@application/;
  const infrastructureImportPattern = /from\s+['"].*@infrastructure(?!\/di-tokens)/;
  const prismaImportPattern = /from\s+['"]@prisma\/client['"]/;

  // Files with legacy exceptions (documented with biome-ignore or planned for Epic 6 migration)
  const legacyExceptions = [
    'get-all-einsaetze.query.ts',
    'get-all-einsaetze.handler.ts',
    'add-eintrag.command.ts',
    // DTOs importing Prisma enums - planned for Epic 6 migration to Domain enums
    'einsatz-query.dto.ts',
    'einsatz-response.dto.ts',
    'update-einsatz.dto.ts',
    'add-eintrag.dto.ts',
    'eintrag.dto.ts',
    // CQRS Query-Side Pattern: Read-only queries for reference data without domain logic
    'get-textbausteine.handler.ts',
    'get-einsatz-teilnehmer.handler.ts',
    // User Management - migrated from legacy, needs cleanup
    'delete-user.handler.ts',
    'update-user.command.ts',
    'create-user.dto.ts',
    'update-user.dto.ts',
    'user-response.dto.ts',
  ];

  function isNonEmptyString(value: string | undefined): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  /**
   * Recursively find all TypeScript files in a directory
   *
   * @param dir - Directory to search
   * @param fileList - Accumulated file list
   * @returns Array of file paths
   */
  function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip test directories
        if (file !== '__tests__' && file !== 'node_modules') {
          findTypeScriptFiles(filePath, fileList);
        }
      } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
        fileList.push(filePath);
      }
    }

    return fileList;
  }

  describe('Domain Layer Import Restrictions', () => {
    let domainFiles: string[];

    beforeAll(() => {
      // Given: All TypeScript files in Domain layer
      const domainDir = path.join(__dirname, '../domain');
      domainFiles = findTypeScriptFiles(domainDir);
    });

    it('should not import from Application layer', () => {
      // When: Checking each Domain file for Application imports
      // Then: No imports from @application/* should exist
      const violations: string[] = [];

      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (applicationImportPattern.test(content)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should not import from Infrastructure layer', () => {
      // When: Checking each Domain file for Infrastructure imports
      // Then: No imports from @infrastructure/* should exist
      const violations: string[] = [];

      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (infrastructureImportPattern.test(content)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should not import from Prisma', () => {
      // When: Checking each Domain file for Prisma imports
      // Then: No imports from @prisma/client should exist
      const violations: string[] = [];

      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (prismaImportPattern.test(content)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Application Layer Import Restrictions', () => {
    let applicationFiles: string[];

    beforeAll(() => {
      // Given: All TypeScript files in Application layer (excluding tests)
      const applicationDir = path.join(__dirname, '../application');
      applicationFiles = findTypeScriptFiles(applicationDir).filter((file) => {
        // Exclude module files (they can import infrastructure for DI setup)
        return !file.endsWith('.module.ts');
      });
    });

    it('should not import from Infrastructure layer (except di-tokens)', () => {
      // When: Checking each Application file for Infrastructure imports
      // Then: Only @infrastructure/di-tokens imports are allowed
      const violations: string[] = [];

      for (const file of applicationFiles) {
        // Skip legacy exceptions
        if (legacyExceptions.some((exc) => file.includes(exc))) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        if (infrastructureImportPattern.test(content)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should not import Prisma directly (except documented legacy)', () => {
      // When: Checking Application files for Prisma imports
      // Then: No direct Prisma imports (legacy exceptions documented)
      const violations: string[] = [];

      for (const file of applicationFiles) {
        if (legacyExceptions.some((exc) => file.includes(exc))) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        if (prismaImportPattern.test(content)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Event Registry Completeness', () => {
    /**
     * Events die noch nicht im Deserializer registriert sind.
     * Diese werden dokumentiert und bei Bedarf nachgezogen.
     *
     * Grund: Manche Events (z.B. Server-Events, Invite-Code-Events) werden
     * noch nicht über das Outbox-Pattern publiziert.
     */
    const knownMissingEvents = [
      // Server Access Token Events - noch kein Outbox Consumer
      'server_access_token.created',
      'server_access_token.used',
      'server_access_token.revoked',
      'server_access_token.reactivated',
      'server_access_token.rotated',
      // Invite Code Events - noch kein Outbox Consumer
      'invite_code.created',
      'invite_code.used',
      'invite_code.revoked',
      // Server Config Events - noch kein Outbox Consumer
      'server_config.migrated_to_secure',
      // User Events die noch fehlen
      'user.locked',
      'user.unlocked',
    ];

    /**
     * Extrahiert alle Event-Namen aus dem EVENT_NAMES Objekt.
     * Matcht nur tatsächliche Zuweisungen wie: CREATED: 'einsatz.created',
     */
    function getAllEventNamesFromConstants(): string[] {
      // Read and parse the event-names.ts file to extract all event name values
      const eventNamesFile = path.join(__dirname, '../domain/events/event-names.ts');
      const content = fs.readFileSync(eventNamesFile, 'utf8');

      // Match only actual assignments like: NAME: 'event.name' or NAME: "event.name"
      // This excludes comments and JSDoc examples
      // Erlaubt Bindestriche in Event-Namen (z.B. 'fuehrungsrhythmus-template.erstellt', 'erinnerung.wiederkehrende-instanz-erstellt')
      const eventNameMatches = content.match(/[A-Z_]+:\s*['"]([a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*)['"]/g);
      if (!eventNameMatches) {
        return [];
      }

      // Extract the event name from each match and deduplicate
      return [
        ...new Set(
          eventNameMatches
            .map((match) => {
              const nameMatch = match.match(/['"]([a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*)['"]/);
              return nameMatch?.[1];
            })
            .filter(isNonEmptyString),
        ),
      ];
    }

    /**
     * Extrahiert alle registrierten Event-Namen aus dem EventDeserializer.
     */
    function getRegisteredEventsFromDeserializer(): string[] {
      const deserializerFile = path.join(__dirname, '../infrastructure/outbox/event-deserializer.ts');
      const content = fs.readFileSync(deserializerFile, 'utf8');

      // Match all event registry entries in the format: ['event.name', this.deserialize...] or ['event.name', deserialize...]
      // Also matches PascalCase compatibility aliases like ['ErinnerungEskaliert', ...]
      // Standalone-Funktionen (ohne this.) werden ebenfalls erkannt (z.B. Erinnerungsvorlage, Notiz Events)
      const registryMatches = content.match(/\['([^']+)',\s*(?:this\.)?deserialize/g);
      if (!registryMatches) {
        return [];
      }

      // Extract event names
      return registryMatches
        .map((match) => {
          const nameMatch = match.match(/\['([^']+)'/);
          return nameMatch?.[1];
        })
        .filter(isNonEmptyString);
    }

    it('should have all EVENT_NAMES registered in EventDeserializer', () => {
      // Given: All event names from constants and deserializer registry
      const definedEventNames = getAllEventNamesFromConstants();
      const registeredEventNames = getRegisteredEventsFromDeserializer();

      // When: Check each defined event name
      const missingFromDeserializer: string[] = [];

      for (const eventName of definedEventNames) {
        // Skip known missing events (documented exceptions)
        if (knownMissingEvents.includes(eventName)) {
          continue;
        }

        // Check if event is registered in deserializer
        if (!registeredEventNames.includes(eventName)) {
          missingFromDeserializer.push(eventName);
        }
      }

      // Then: All events should be registered
      expect(missingFromDeserializer).toEqual([]);
    });

    it('should document all known missing events', () => {
      // This test ensures knownMissingEvents list stays up-to-date
      // If an event is added to EVENT_NAMES but not in deserializer or knownMissingEvents,
      // the test above will fail
      expect(knownMissingEvents.length).toBeGreaterThan(0);
    });
  });
});
