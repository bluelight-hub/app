import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicHealthDto } from './basic-health.dto';

/**
 * Erweiterte Health-Response fuer authentifizierte Requests.
 *
 * Diese Response wird zurueckgegeben wenn ein gueltiger X-Server-Access-Token
 * Header gesendet wird. Enthaelt zusaetzlich sensible Systemdetails die
 * nur authentifizierte Clients sehen sollten.
 *
 * **Enthaelt zusaetzlich:**
 * - Database-Verbindungsstatus
 * - Server-Uptime in Sekunden
 * - Optional: Memory, Disk, CPU Metriken
 *
 * @see BasicHealthDto fuer unauthentifizierte Response
 */
export class DetailedHealthDto extends BasicHealthDto {
  @ApiProperty({
    example: 'connected',
    enum: ['connected', 'disconnected'],
    description: 'Datenbank-Verbindungsstatus',
  })
  database!: 'connected' | 'disconnected';

  @ApiProperty({
    example: 12345,
    description: 'Server-Uptime in Sekunden',
  })
  uptime!: number;

  @ApiPropertyOptional({
    example: {
      heapUsed: 75000000,
      heapTotal: 150000000,
      rss: 200000000,
    },
    description: 'Memory-Metriken (optional)',
  })
  memory?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };

  @ApiPropertyOptional({
    example: [0.5, 0.7, 0.6],
    description: 'CPU Load Average [1min, 5min, 15min] (optional)',
  })
  loadAverage?: number[];
}
