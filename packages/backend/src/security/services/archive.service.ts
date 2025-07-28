import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { SecurityLog } from '@prisma/generated/prisma';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import * as crypto from 'crypto';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Service zur Archivierung von Security Logs vor der Löschung.
 * Erstellt komprimierte JSON-Archive mit Hash-Verifizierung.
 */
@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly archivePath = 'archives';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Custom replacer function for JSON.stringify to handle BigInt values
   */
  private bigIntReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }

  /**
   * Archiviert alle Security Logs vor einem bestimmten Datum.
   *
   * @param date - Datum vor dem Logs archiviert werden sollen
   * @returns Archivierungsergebnis mit Anzahl und Pfad
   */
  async archiveBeforeDate(date: Date): Promise<{ count: number; path: string }> {
    const startTime = Date.now();
    this.logger.log(`Starting archive of security logs before ${date.toISOString()}`);

    try {
      // Ensure archive directory exists
      await this.ensureArchiveDirectory();

      // Fetch all logs to archive
      const logs = await this.fetchLogsToArchive(date);

      if (logs.length === 0) {
        this.logger.log('No logs to archive');
        return { count: 0, path: null };
      }

      // Create archive metadata
      const archiveMetadata = {
        createdAt: new Date().toISOString(),
        cutoffDate: date.toISOString(),
        totalLogs: logs.length,
        firstLogDate: logs[logs.length - 1]?.createdAt,
        lastLogDate: logs[0]?.createdAt,
        hashChainIntact: await this.verifyHashChainIntegrity(logs),
        archiveVersion: '1.0',
      };

      // Create archive content
      const archiveContent = {
        metadata: archiveMetadata,
        logs: logs,
      };

      // Generate archive filename
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
      const filename = `security-logs-${timestamp}.json`;
      const archivePath = path.join(this.archivePath, filename);

      // Write and compress archive
      const jsonContent = JSON.stringify(archiveContent, this.bigIntReplacer, 2);
      const compressed = await gzip(jsonContent);

      // Add .gz extension
      const compressedPath = `${archivePath}.gz`;
      await fs.writeFile(compressedPath, compressed);

      // Verify archive integrity
      await this.verifyArchiveIntegrity(compressedPath, archiveContent);

      const duration = Date.now() - startTime;
      const fileSize = (await fs.stat(compressedPath)).size;

      this.logger.log(
        `Archive created successfully: ${compressedPath} ` +
          `(${logs.length} logs, ${this.formatBytes(fileSize)}, ${duration}ms)`,
      );

      return { count: logs.length, path: compressedPath };
    } catch (error) {
      this.logger.error(`Archive creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lädt Logs die archiviert werden sollen.
   *
   * @param cutoffDate - Datum vor dem Logs geladen werden
   * @returns Array von Security Logs
   */
  private async fetchLogsToArchive(cutoffDate: Date): Promise<SecurityLog[]> {
    // Fetch in batches to handle large datasets
    const batchSize = 10000;
    const logs: SecurityLog[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.prisma.securityLog.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        orderBy: {
          sequenceNumber: 'asc',
        },
        take: batchSize,
        skip: skip,
      });

      logs.push(...batch);
      hasMore = batch.length === batchSize;
      skip += batchSize;

      if (hasMore) {
        // Small delay to prevent database overload
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return logs;
  }

  /**
   * Verifiziert die Integrität der Hash-Chain in den archivierten Logs.
   *
   * @param logs - Array von Security Logs
   * @returns true wenn Hash-Chain intakt ist
   */
  private async verifyHashChainIntegrity(logs: SecurityLog[]): Promise<boolean> {
    if (logs.length === 0) return true;

    try {
      // Sort by sequence number
      const sortedLogs = [...logs].sort(
        (a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber),
      );

      // Verify each log's hash
      for (let i = 1; i < sortedLogs.length; i++) {
        const currentLog = sortedLogs[i];
        const previousLog = sortedLogs[i - 1];

        if (currentLog.previousHash !== previousLog.currentHash) {
          this.logger.warn(
            `Hash chain broken at sequence ${currentLog.sequenceNumber}: ` +
              `expected ${previousLog.currentHash}, got ${currentLog.previousHash}`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Hash chain verification failed:', error);
      return false;
    }
  }

  /**
   * Verifiziert die Integrität des erstellten Archivs.
   *
   * @param archivePath - Pfad zur Archivdatei
   * @param originalContent - Original-Inhalt zum Vergleich
   */
  private async verifyArchiveIntegrity(archivePath: string, originalContent: any): Promise<void> {
    // Read and decompress archive
    const compressed = await fs.readFile(archivePath);
    const decompressed = await gunzip(compressed);
    const content = JSON.parse(decompressed.toString());

    // Verify content matches
    if (content.metadata.totalLogs !== originalContent.metadata.totalLogs) {
      throw new Error('Archive verification failed: log count mismatch');
    }

    // Calculate and store checksum
    const checksum = crypto.createHash('sha256').update(decompressed).digest('hex');

    // Write checksum file
    await fs.writeFile(`${archivePath}.sha256`, checksum);
  }

  /**
   * Stellt sicher dass das Archiv-Verzeichnis existiert.
   */
  private async ensureArchiveDirectory(): Promise<void> {
    try {
      await fs.access(this.archivePath);
    } catch {
      await fs.mkdir(this.archivePath, { recursive: true });
    }
  }

  /**
   * Formatiert Bytes in lesbare Größe.
   *
   * @param bytes - Anzahl der Bytes
   * @returns Formatierte Größe
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Listet alle verfügbaren Archive auf.
   *
   * @returns Array von Archiv-Informationen
   */
  async listArchives(): Promise<
    Array<{
      filename: string;
      size: number;
      created: Date;
      hasChecksum: boolean;
    }>
  > {
    try {
      await this.ensureArchiveDirectory();
      const files = await fs.readdir(this.archivePath);

      const archives = await Promise.all(
        files
          .filter((file) => file.endsWith('.json.gz'))
          .map(async (file) => {
            const filePath = path.join(this.archivePath, file);
            const stats = await fs.stat(filePath);
            const checksumExists = await this.fileExists(`${filePath}.sha256`);

            return {
              filename: file,
              size: stats.size,
              created: stats.birthtime,
              hasChecksum: checksumExists,
            };
          }),
      );

      return archives.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      this.logger.error('Failed to list archives:', error);
      return [];
    }
  }

  /**
   * Prüft ob eine Datei existiert.
   *
   * @param path - Dateipfad
   * @returns true wenn Datei existiert
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}
