import { ApiProperty } from '@nestjs/swagger';

/**
 * Audit Log Statistiken Response
 */
export class AuditLogStatisticsResponse {
  @ApiProperty({ 
    description: 'Gesamtzahl der Logs',
    example: 1234 
  })
  totalLogs: number;

  @ApiProperty({ 
    description: 'Statistiken nach Aktionstyp',
    example: { CREATE: 100, READ: 500, UPDATE: 200, DELETE: 50 } 
  })
  actionTypes: Record<string, number>;

  @ApiProperty({ 
    description: 'Statistiken nach Schweregrad',
    example: { LOW: 300, MEDIUM: 200, HIGH: 100, CRITICAL: 50 } 
  })
  severities: Record<string, number>;

  @ApiProperty({ 
    description: 'Erfolgsrate',
    example: { success: 900, failed: 100 } 
  })
  successRate: Record<string, number>;

  @ApiProperty({ 
    description: 'Top 10 Benutzer nach Aktivität',
    isArray: true,
    example: [{ userId: '123', userEmail: 'user@example.com', count: 50 }] 
  })
  topUsers: Array<{
    userId: string;
    userEmail: string;
    count: number;
  }>;

  @ApiProperty({ 
    description: 'Top 10 Ressourcen nach Zugriff',
    isArray: true,
    example: [{ resource: 'users', count: 100 }] 
  })
  topResources: Array<{
    resource: string;
    count: number;
  }>;
}