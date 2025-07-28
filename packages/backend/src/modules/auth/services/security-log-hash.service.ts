import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { SecurityLog } from '@prisma/generated/prisma';

/**
 * Service für die Verwaltung der Hash-Chain-Funktionalität für Security Logs.
 *
 * Diese Klasse implementiert eine kryptografische Hash-Kette für Sicherheitslogs,
 * um Manipulationssicherheit und Nachvollziehbarkeit zu gewährleisten.
 * Jeder Log-Eintrag enthält einen Hash des vorherigen Eintrags, wodurch eine
 * unveränderliche Kette entsteht.
 */
@Injectable()
export class SecurityLogHashService {
  private readonly logger = new Logger(SecurityLogHashService.name);
  private readonly HASH_ALGORITHM = 'SHA256';

  /**
   * Berechnet den Hash für einen Security Log Eintrag.
   *
   * Der Hash wird aus allen relevanten Feldern des Log-Eintrags berechnet,
   * einschließlich des Hashes des vorherigen Eintrags.
   *
   * @param logData - Die Daten des Log-Eintrags (ohne currentHash)
   * @param previousHash - Der Hash des vorherigen Log-Eintrags
   * @returns Der berechnete SHA-256 Hash als Hex-String
   */
  calculateHash(
    logData: {
      sequenceNumber: bigint;
      eventType: string;
      severity: string;
      userId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      sessionId?: string | null;
      metadata?: any;
      message?: string | null;
      createdAt: Date;
    },
    previousHash: string | null,
  ): string {
    // Erstelle eine deterministische String-Repräsentation der Log-Daten
    const dataToHash = [
      logData.sequenceNumber.toString(),
      logData.eventType,
      logData.severity,
      logData.userId || '',
      logData.ipAddress || '',
      logData.userAgent || '',
      logData.sessionId || '',
      JSON.stringify(logData.metadata || {}),
      logData.message || '',
      logData.createdAt.toISOString(),
      previousHash || '',
    ].join('|');

    // Berechne SHA-256 Hash
    const hash = createHash(this.HASH_ALGORITHM);
    hash.update(dataToHash, 'utf8');
    return hash.digest('hex');
  }

  /**
   * Verifiziert die Integrität eines einzelnen Log-Eintrags.
   *
   * @param log - Der zu verifizierende Log-Eintrag
   * @param previousHash - Der Hash des vorherigen Eintrags
   * @returns true wenn der Hash korrekt ist, false sonst
   */
  verifyLogIntegrity(log: SecurityLog, previousHash: string | null): boolean {
    const calculatedHash = this.calculateHash(
      {
        sequenceNumber: log.sequenceNumber,
        eventType: log.eventType,
        severity: log.severity,
        userId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        metadata: log.metadata,
        message: log.message,
        createdAt: log.createdAt,
      },
      previousHash,
    );

    return calculatedHash === log.currentHash;
  }

  /**
   * Verifiziert die Integrität einer Kette von Log-Einträgen.
   *
   * @param logs - Array von Log-Einträgen, sortiert nach sequenceNumber
   * @returns Objekt mit Verifikationsstatus und Details
   */
  verifyChainIntegrity(logs: SecurityLog[]): {
    isValid: boolean;
    brokenAtIndex?: number;
    brokenAtSequence?: bigint;
    error?: string;
  } {
    if (logs.length === 0) {
      return { isValid: true };
    }

    // Verifiziere ersten Eintrag (sollte keinen previousHash haben)
    if (logs[0].previousHash !== null) {
      return {
        isValid: false,
        brokenAtIndex: 0,
        brokenAtSequence: logs[0].sequenceNumber,
        error: 'First log entry should not have a previous hash',
      };
    }

    // Verifiziere jeden Eintrag in der Kette
    for (let i = 0; i < logs.length; i++) {
      const currentLog = logs[i];
      const previousHash = i === 0 ? null : logs[i - 1].currentHash;

      // Verifiziere previousHash-Verknüpfung zuerst
      if (currentLog.previousHash !== previousHash) {
        return {
          isValid: false,
          brokenAtIndex: i,
          brokenAtSequence: currentLog.sequenceNumber,
          error: `Previous hash mismatch at sequence ${currentLog.sequenceNumber}`,
        };
      }

      // Verifiziere Sequenz-Kontinuität
      if (i > 0) {
        const expectedSequence = logs[i - 1].sequenceNumber + 1n;
        if (currentLog.sequenceNumber !== expectedSequence) {
          return {
            isValid: false,
            brokenAtIndex: i,
            brokenAtSequence: currentLog.sequenceNumber,
            error: `Sequence gap detected: expected ${expectedSequence}, got ${currentLog.sequenceNumber}`,
          };
        }
      }

      // Verifiziere Hash
      if (!this.verifyLogIntegrity(currentLog, previousHash)) {
        return {
          isValid: false,
          brokenAtIndex: i,
          brokenAtSequence: currentLog.sequenceNumber,
          error: `Hash mismatch at sequence ${currentLog.sequenceNumber}`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Findet den Punkt, an dem die Hash-Kette unterbrochen wurde.
   *
   * @param logs - Array von Log-Einträgen
   * @param startIndex - Index, ab dem gesucht werden soll
   * @returns Index des ersten ungültigen Eintrags oder -1 wenn alle gültig
   */
  findChainBreakpoint(logs: SecurityLog[], startIndex: number = 0): number {
    for (let i = startIndex; i < logs.length; i++) {
      const currentLog = logs[i];
      const previousHash = i === 0 ? null : logs[i - 1].currentHash;

      // Check chain linkage first
      if (currentLog.previousHash !== previousHash) {
        return i;
      }

      // Then check hash integrity
      if (!this.verifyLogIntegrity(currentLog, previousHash)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Berechnet einen Merkle-Root für eine Gruppe von Logs.
   * Nützlich für effiziente Verifikation großer Log-Mengen.
   *
   * @param hashes - Array von Log-Hashes
   * @returns Merkle-Root Hash
   */
  calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return '';
    }

    if (hashes.length === 1) {
      return hashes[0];
    }

    // Kopiere Array für Manipulation
    let currentLevel = [...hashes];

    // Baue Merkle-Baum auf
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Dupliziere letzten Hash wenn ungerade Anzahl

        const combined = createHash(this.HASH_ALGORITHM);
        combined.update(left + right, 'utf8');
        nextLevel.push(combined.digest('hex'));
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Erstellt einen Checkpoint der aktuellen Hash-Kette.
   *
   * @param logs - Die letzten N Log-Einträge
   * @returns Checkpoint-Daten für spätere Verifikation
   */
  createChainCheckpoint(logs: SecurityLog[]): {
    sequenceNumber: bigint;
    hash: string;
    merkleRoot: string;
    timestamp: Date;
    count: number;
  } | null {
    if (logs.length === 0) {
      return null;
    }

    const lastLog = logs[logs.length - 1];
    const hashes = logs.map((log) => log.currentHash);

    return {
      sequenceNumber: lastLog.sequenceNumber,
      hash: lastLog.currentHash,
      merkleRoot: this.calculateMerkleRoot(hashes),
      timestamp: new Date(),
      count: logs.length,
    };
  }
}
