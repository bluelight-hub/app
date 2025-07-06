import { ApiProperty } from '@nestjs/swagger';

/**
 * Audit Log Entity
 * Records security-relevant events for compliance and monitoring
 */
export class AuditLog {
    @ApiProperty({
        description: 'Unique identifier for the audit log entry',
        example: 'xyz123abc',
    })
    id: string;

    @ApiProperty({
        description: 'Action that was performed',
        example: 'CREATE',
    })
    action: string;

    @ApiProperty({
        description: 'Resource type that was affected',
        example: 'IP_WHITELIST',
    })
    resource: string;

    @ApiProperty({
        description: 'ID of the affected resource',
        example: 'abc123xyz',
        required: false,
    })
    resourceId?: string;

    @ApiProperty({
        description: 'User ID who performed the action',
        example: 'admin123',
    })
    userId: string;

    @ApiProperty({
        description: 'IP address of the user',
        example: '192.168.1.100',
        required: false,
    })
    ipAddress?: string;

    @ApiProperty({
        description: 'User agent string',
        example: 'Mozilla/5.0...',
        required: false,
    })
    userAgent?: string;

    @ApiProperty({
        description: 'Additional details about the action',
        example: { oldValue: 'active', newValue: 'inactive' },
        required: false,
    })
    details?: any;

    @ApiProperty({
        description: 'Timestamp when the action occurred',
        example: '2024-01-15T10:30:00Z',
    })
    timestamp: Date;
}