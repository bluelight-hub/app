import { ApiProperty } from '@nestjs/swagger';

/**
 * Minimale Health-Response fuer unauthentifizierte Requests.
 *
 * Diese Response wird zurueckgegeben wenn kein oder ein ungueltiger
 * X-Server-Access-Token Header gesendet wird. Enthaelt nur oeffentliche
 * Informationen die keine sensiblen Systemdetails preisgeben.
 *
 * **Security:**
 * - Keine Database-Details (Verbindungsstatus)
 * - Keine System-Metriken (Memory, CPU, Disk)
 * - Keine Uptime-Information (Information Disclosure)
 *
 * @see DetailedHealthDto fuer authentifizierte Response
 */
export class BasicHealthDto {
  @ApiProperty({
    example: 'ok',
    enum: ['ok', 'error'],
    description: 'Allgemeiner Gesundheitsstatus des Servers',
  })
  status!: 'ok' | 'error';

  @ApiProperty({
    example: true,
    description: 'Ob das Server-Setup abgeschlossen ist (Admin + Token existieren)',
  })
  setupComplete!: boolean;

  @ApiProperty({
    example: '1.0.0-alpha.37',
    description: 'Aktuelle Server-Version',
  })
  version!: string;
}
