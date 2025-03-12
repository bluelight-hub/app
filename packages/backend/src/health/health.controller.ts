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

@Controller({ path: 'api/health', version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private db: TypeOrmHealthIndicator,
        @InjectDataSource() private defaultConnection: DataSource,
    ) { }

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

    @Get('liveness')
    @HealthCheck()
    async checkLiveness() {
        return this.health.check([
            () => this.db.pingCheck('database', { connection: this.defaultConnection }),
        ]);
    }

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