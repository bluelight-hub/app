import { Controller, Get } from '@nestjs/common';
import { DiskHealthIndicator, HealthCheck, HealthCheckService, MemoryHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('api/health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private db: TypeOrmHealthIndicator,
        @InjectConnection() private defaultConnection: Connection,
    ) { }

    @Get()
    @HealthCheck()
    async check() {
        return this.health.check([
            // Überprüfe ob die Datenbank erreichbar ist
            () => this.db.pingCheck('database', { connection: this.defaultConnection }),

            // Überprüfe den Arbeitsspeicher
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
            () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB

            // Überprüfe den Speicherplatz
            () => this.disk.checkStorage('storage', {
                thresholdPercent: 0.9, // 90%
                path: '/',
            }),
        ]);
    }
} 