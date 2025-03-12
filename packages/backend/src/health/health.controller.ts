import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService, MemoryHealthIndicator,
    TypeOrmHealthIndicator
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import * as os from 'os';
import { DataSource } from 'typeorm';

/**
 * Controller für Gesundheitscheck-Endpunkte, die den Gesundheitsstatus der Anwendung überwachen.
 * Stellt Endpunkte für Gesamtgesundheit, Liveness, Readiness und Datenbankprüfungen bereit.
 * 
 * @class HealthController
 */
@Controller({ path: 'api/health', version: VERSION_NEUTRAL })
export class HealthController {
    /**
     * Erstellt eine Instanz des HealthControllers.
     * 
     * @constructor
     * @param {HealthCheckService} health - Service zur Durchführung von Gesundheitschecks
     * @param {MemoryHealthIndicator} memory - Indikator für Speicher-Gesundheitschecks
     * @param {DiskHealthIndicator} disk - Indikator für Festplatten-Gesundheitschecks
     * @param {TypeOrmHealthIndicator} db - Indikator für Datenbank-Gesundheitschecks
     * @param {DataSource} defaultConnection - TypeORM-Datenbankverbindung
     */
    constructor(
        private health: HealthCheckService,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private db: TypeOrmHealthIndicator,
        @InjectDataSource() private defaultConnection: DataSource,
    ) { }

    /**
     * Führt einen umfassenden Gesundheitscheck der Anwendung durch.
     * Überprüft Datenbankverbindung, Speichernutzung, Festplattenplatz und CPU-Status.
     * 
     * @returns {Promise<object>} Gesundheitscheck-Ergebnisobjekt
     */
    @Get()
    @HealthCheck()
    async check() {
        return this.health.check([
            // Datenbank-Checks
            () => this.db.pingCheck('database', { connection: this.defaultConnection }),

            // Memory-Checks
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
            () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB

            // Disk-Checks
            () => this.disk.checkStorage('storage', {
                thresholdPercent: 0.9, // 90%
                path: '/',
            }),

            // CPU-Check
            async () => ({
                cpu: {
                    status: 'up',
                    loadAverage: os.loadavg(),
                    usedCores: os.cpus().length,
                }
            }),
        ]);
    }

    /**
     * Führt einen Liveness-Check durch, um festzustellen, ob die Anwendung läuft.
     * Überprüft nur die Datenbankverbindung als primären Indikator.
     * 
     * @returns {Promise<object>} Liveness-Check-Ergebnisobjekt
     */
    @Get('liveness')
    @HealthCheck()
    async checkLiveness() {
        return this.health.check([
            () => this.db.pingCheck('database', { connection: this.defaultConnection }),
        ]);
    }

    /**
     * Führt einen Readiness-Check durch, um festzustellen, ob die Anwendung bereit ist, Anfragen anzunehmen.
     * Überprüft Speicher- und Festplattenverfügbarkeit.
     * 
     * @returns {Promise<object>} Readiness-Check-Ergebnisobjekt
     */
    @Get('readiness')
    @HealthCheck()
    async checkReadiness() {
        return this.health.check([
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
            () => this.disk.checkStorage('storage', {
                thresholdPercent: 0.9,
                path: '/',
            }),
        ]);
    }

    /**
     * Führt einen detaillierten Datenbank-Gesundheitscheck durch.
     * Überprüft Datenbankverbindung und Initialisierungsstatus.
     * 
     * @returns {Promise<object>} Datenbank-Check-Ergebnisobjekt
     */
    @Get('db')
    @HealthCheck()
    async checkDatabase() {
        return this.health.check([
            () => this.db.pingCheck('database', { connection: this.defaultConnection }),
            async () => ({
                database_connections: {
                    status: 'up',
                    details: {
                        isInitialized: this.defaultConnection.isInitialized
                    }
                }
            }),
        ]);
    }
} 