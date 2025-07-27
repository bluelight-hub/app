import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SecurityLog Schema', () => {
  const schemaPath = join(__dirname, '../../../prisma/schema.prisma');
  let schemaContent: string;

  beforeAll(() => {
    schemaContent = readFileSync(schemaPath, 'utf8');
  });

  describe('Model structure', () => {
    it('should have SecurityLog model defined', () => {
      expect(schemaContent).toContain('model SecurityLog');
    });

    it('should have all required fields', () => {
      const securityLogSection = schemaContent.match(/model SecurityLog\s*{[\s\S]*?^}/m)?.[0] || '';

      // Required fields
      expect(securityLogSection).toContain('id String @id @default(nanoid())');
      expect(securityLogSection).toContain('eventType String');
      expect(securityLogSection).toContain('sequenceNumber BigInt  @unique');
      expect(securityLogSection).toContain('currentHash    String');
      expect(securityLogSection).toContain('hashAlgorithm  String  @default("SHA256")');
      expect(securityLogSection).toContain('createdAt DateTime @default(now())');

      // Optional fields
      expect(securityLogSection).toContain('userId String?');
      expect(securityLogSection).toContain('ipAddress String?');
      expect(securityLogSection).toContain('userAgent String?');
      expect(securityLogSection).toContain('metadata Json?');
      expect(securityLogSection).toContain('previousHash   String?');
    });

    it('should have proper field types and constraints', () => {
      const securityLogSection = schemaContent.match(/model SecurityLog\s*{[\s\S]*?^}/m)?.[0] || '';

      // Check varchar limits
      expect(securityLogSection).toContain('@db.VarChar(50)'); // eventType
      expect(securityLogSection).toContain('@db.VarChar(45)'); // ipAddress (IPv6 compatible)
      expect(securityLogSection).toContain('@db.VarChar(64)'); // hash fields
      expect(securityLogSection).toContain('@db.Text'); // userAgent
    });
  });

  describe('Indexes', () => {
    it('should have all required indexes defined', () => {
      const securityLogSection = schemaContent.match(/model SecurityLog\s*{[\s\S]*?^}/m)?.[0] || '';

      // Required indexes
      expect(securityLogSection).toContain(
        '@@index([eventType, createdAt], map: "idx_security_log_type_time")',
      );
      expect(securityLogSection).toContain(
        '@@index([userId, createdAt], map: "idx_security_log_user_time")',
      );
      expect(securityLogSection).toContain(
        '@@index([sequenceNumber], map: "idx_security_log_sequence")',
      );
      expect(securityLogSection).toContain('@@index([currentHash], map: "idx_security_log_hash")');
      expect(securityLogSection).toContain(
        '@@index([previousHash], map: "idx_security_log_prev_hash")',
      );

      // Additional indexes
      expect(securityLogSection).toContain(
        '@@index([ipAddress, createdAt], map: "idx_security_log_ip_time")',
      );
      expect(securityLogSection).toContain(
        '@@index([severity, createdAt], map: "idx_security_log_severity_time")',
      );
      expect(securityLogSection).toContain('@@index([sessionId], map: "idx_security_log_session")');
    });
  });

  describe('Hash chain support', () => {
    it('should have hash chain fields', () => {
      const securityLogSection = schemaContent.match(/model SecurityLog\s*{[\s\S]*?^}/m)?.[0] || '';

      expect(securityLogSection).toContain('sequenceNumber BigInt  @unique');
      expect(securityLogSection).toContain('previousHash   String? @db.VarChar(64)');
      expect(securityLogSection).toContain('currentHash    String  @db.VarChar(64)');
      expect(securityLogSection).toContain('hashAlgorithm  String  @default("SHA256")');
    });

    it('should have unique constraint on sequenceNumber', () => {
      const securityLogSection = schemaContent.match(/model SecurityLog\s*{[\s\S]*?^}/m)?.[0] || '';
      expect(securityLogSection).toContain('sequenceNumber BigInt  @unique');
    });
  });

  describe('Migration verification', () => {
    it('should have hash chain migration file', () => {
      try {
        const migrationPath = join(
          __dirname,
          '../../../prisma/migrations/20250723180315_add_hash_chain_to_security_log/migration.sql',
        );
        const migrationContent = readFileSync(migrationPath, 'utf8');

        expect(migrationContent).toContain('ALTER TABLE "SecurityLog"');
        expect(migrationContent).toContain('ADD COLUMN     "currentHash"');
        expect(migrationContent).toContain('ADD COLUMN     "previousHash"');
        expect(migrationContent).toContain('ADD COLUMN     "sequenceNumber"');
        expect(migrationContent).toContain('CREATE UNIQUE INDEX "SecurityLog_sequenceNumber_key"');
        expect(migrationContent).toContain('CREATE INDEX "idx_security_log_sequence"');
        expect(migrationContent).toContain('CREATE INDEX "idx_security_log_hash"');
        expect(migrationContent).toContain('CREATE INDEX "idx_security_log_prev_hash"');
      } catch (_error) {
        throw new Error('Hash chain migration file not found');
      }
    });
  });

  describe('Prisma schema validation', () => {
    it('should have valid Prisma schema syntax', () => {
      // This test validates that the schema can be parsed by Prisma
      try {
        execSync('npx prisma validate', {
          cwd: join(__dirname, '../../..'),
          stdio: 'pipe',
        });
      } catch (error: any) {
        throw new Error(`Prisma schema validation failed: ${error.message}`);
      }
    });
  });
});
