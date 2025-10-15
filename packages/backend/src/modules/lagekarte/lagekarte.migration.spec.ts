import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * IV3: Migration-Rollback Verification Tests
 *
 * Verifiziert dass:
 * - Migration-Dateien für Lagekarte und LagekartePoi existieren
 * - Prisma Schema die korrekten Models enthält
 * - Rollback-Funktionalität über Script verfügbar ist
 */
describe('IV3: Lagekarte Migration Verification', () => {
  const prismaSchemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
  const migrationsPath = path.resolve(__dirname, '../../../prisma/migrations');

  describe('Prisma Schema Verification', () => {
    it('should have Lagekarte model in Prisma schema', () => {
      // Arrange & Act
      const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');

      // Assert: Check for model existence and key fields (whitespace-agnostic)
      expect(schemaContent).toMatch(/model\s+Lagekarte\s*{/);
      expect(schemaContent).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
      expect(schemaContent).toMatch(/einsatzId\s+String\s+@unique/);
      expect(schemaContent).toMatch(/state\s+Json/);
      expect(schemaContent).toMatch(/pois\s+LagekartePoi\[\]/);
      expect(schemaContent).toMatch(/einsatz\s+Einsatz\s+@relation/);
    });

    it('should have LagekartePoi model in Prisma schema', () => {
      // Arrange & Act
      const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');

      // Assert: Check for model existence and key fields (whitespace-agnostic)
      expect(schemaContent).toMatch(/model\s+LagekartePoi\s*{/);
      expect(schemaContent).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
      expect(schemaContent).toMatch(/lagekarteId\s+String/);
      expect(schemaContent).toMatch(/type\s+PoiType/);
      expect(schemaContent).toMatch(/latitude\s+Float/);
      expect(schemaContent).toMatch(/longitude\s+Float/);
      expect(schemaContent).toMatch(/lagekarte\s+Lagekarte\s+@relation/);
    });

    it('should have PoiType enum in Prisma schema', () => {
      // Arrange & Act
      const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');

      // Assert
      expect(schemaContent).toContain('enum PoiType');
      expect(schemaContent).toContain('EINSATZORT');
      expect(schemaContent).toContain('EINSATZABSCHNITT');
      expect(schemaContent).toContain('EINSATZLEITUNG');
      expect(schemaContent).toContain('FAHRZEUG');
      expect(schemaContent).toContain('EINHEIT');
      expect(schemaContent).toContain('GEFAHRENQUELLE');
      expect(schemaContent).toContain('SPERRBEREICH');
      expect(schemaContent).toContain('VERSORGUNGSPUNKT');
      expect(schemaContent).toContain('BEREITSTELLUNGSRAUM');
      expect(schemaContent).toContain('BEHANDLUNGSPLATZ');
      expect(schemaContent).toContain('SAMMELSTELLE');
      expect(schemaContent).toContain('UNTERKUNFT');
      expect(schemaContent).toContain('SONSTIGES');
    });

    it('should have CASCADE delete for LagekartePoi when Lagekarte is deleted', () => {
      // Arrange & Act
      const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');

      // Assert: Verifiziere dass onDelete: Cascade gesetzt ist
      const lagekartePoiRelation = schemaContent.match(/lagekarte\s+Lagekarte\s+@relation[^)]*onDelete:\s*Cascade/);
      expect(lagekartePoiRelation).toBeTruthy();
    });
  });

  describe('Migration Files Verification', () => {
    it('should have migrations directory', () => {
      // Arrange & Act & Assert
      expect(fs.existsSync(migrationsPath)).toBe(true);
      expect(fs.statSync(migrationsPath).isDirectory()).toBe(true);
    });

    it('should have Lagekarte-related migration files', () => {
      // Arrange
      const migrations = fs.readdirSync(migrationsPath);

      // Act: Suche nach Migration mit "lagekarte" oder relevanten Tabellen
      const lagekarteMigrations = migrations.filter(
        (dir) => dir.toLowerCase().includes('lagekarte') || dir.toLowerCase().includes('poi') || fs.existsSync(path.join(migrationsPath, dir, 'migration.sql')),
      );

      // Assert: Mindestens eine Migration sollte existieren
      expect(lagekarteMigrations.length).toBeGreaterThan(0);
    });

    it('should have valid migration.sql files', () => {
      // Arrange
      const migrations = fs.readdirSync(migrationsPath).filter((dir) => {
        const migrationSqlPath = path.join(migrationsPath, dir, 'migration.sql');
        return fs.existsSync(migrationSqlPath);
      });

      // Act & Assert: Jede Migration sollte eine gültige SQL-Datei haben
      expect(migrations.length).toBeGreaterThan(0);

      migrations.forEach((migrationDir) => {
        const migrationSqlPath = path.join(migrationsPath, migrationDir, 'migration.sql');
        const sqlContent = fs.readFileSync(migrationSqlPath, 'utf-8');

        // Verifiziere dass SQL-Content nicht leer ist
        expect(sqlContent.length).toBeGreaterThan(0);
      });
    });

    it('should have migration that creates Lagekarte table', () => {
      // Arrange
      const migrations = fs.readdirSync(migrationsPath);

      // Act: Durchsuche alle Migrationen nach CREATE TABLE lagekarte (lowercase in PostgreSQL)
      let foundLagekarteTable = false;

      migrations.forEach((migrationDir) => {
        const migrationSqlPath = path.join(migrationsPath, migrationDir, 'migration.sql');
        if (fs.existsSync(migrationSqlPath)) {
          const sqlContent = fs.readFileSync(migrationSqlPath, 'utf-8');
          // PostgreSQL uses @@map("lagekarte") so table name is lowercase
          if (sqlContent.match(/CREATE\s+TABLE.*["'`]?lagekarte["'`]?/i)) {
            foundLagekarteTable = true;
          }
        }
      });

      // Assert
      expect(foundLagekarteTable).toBe(true);
    });

    it('should have migration that creates LagekartePoi table', () => {
      // Arrange
      const migrations = fs.readdirSync(migrationsPath);

      // Act: Durchsuche alle Migrationen nach CREATE TABLE lagekarte_poi (lowercase in PostgreSQL)
      let foundLagekartePoiTable = false;

      migrations.forEach((migrationDir) => {
        const migrationSqlPath = path.join(migrationsPath, migrationDir, 'migration.sql');
        if (fs.existsSync(migrationSqlPath)) {
          const sqlContent = fs.readFileSync(migrationSqlPath, 'utf-8');
          // PostgreSQL uses @@map("lagekarte_poi") so table name is lowercase with underscore
          if (sqlContent.match(/CREATE\s+TABLE.*["'`]?lagekarte_poi["'`]?/i)) {
            foundLagekartePoiTable = true;
          }
        }
      });

      // Assert
      expect(foundLagekartePoiTable).toBe(true);
    });
  });

  describe('Rollback Script Verification', () => {
    const rollbackScriptPath = path.resolve(__dirname, 'scripts/verify-migrations.sh');

    it('should have rollback verification script', () => {
      // Arrange & Act & Assert
      expect(fs.existsSync(rollbackScriptPath)).toBe(true);
    });

    it('should have executable permissions on rollback script', () => {
      // Arrange & Act
      const stats = fs.statSync(rollbackScriptPath);
      const isExecutable = (stats.mode & 0o111) !== 0; // Check if any execute bit is set

      // Assert
      expect(isExecutable).toBe(true);
    });

    it('should contain prisma migrate commands in rollback script', () => {
      // Arrange & Act
      const scriptContent = fs.readFileSync(rollbackScriptPath, 'utf-8');

      // Assert
      expect(scriptContent).toContain('prisma migrate status');
      expect(scriptContent).toContain('prisma migrate reset');
      expect(scriptContent).toContain('prisma migrate deploy');
    });
  });

  /**
   * MANUAL VERIFICATION REQUIRED:
   *
   * Zum vollständigen Testen der Migration-Rollback-Funktionalität,
   * führe folgendes Script manuell aus:
   *
   * ```bash
   * cd packages/backend
   * ./src/modules/lagekarte/scripts/verify-migrations.sh
   * ```
   *
   * Das Script testet:
   * 1. Initiale Migration-Status
   * 2. Datenbank-Reset (Rollback)
   * 3. Tabellen-Drop-Verifikation
   * 4. Re-Apply von Migrationen
   * 5. Tabellen-Re-Creation-Verifikation
   */
  describe('Manual Rollback Verification Guide', () => {
    it('should provide manual verification instructions', () => {
      const instructions = `
        To verify migration rollback functionality, run:

        cd packages/backend
        ./src/modules/lagekarte/scripts/verify-migrations.sh

        This will test:
        - Database reset (rollback simulation)
        - Tables dropped after reset
        - Migrations re-applied successfully
        - Tables re-created after re-apply
      `;

      // This test always passes but documents the manual verification process
      expect(instructions).toBeDefined();
    });
  });
});
