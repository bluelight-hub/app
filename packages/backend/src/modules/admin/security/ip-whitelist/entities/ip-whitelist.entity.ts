import { ApiProperty } from '@nestjs/swagger';

/**
 * IP Whitelist Entity
 * Represents an allowed IP address for platform access
 */
export class IpWhitelist {
    @ApiProperty({
        description: 'Unique identifier for the IP whitelist entry',
        example: 'xyz123abc',
    })
    id: string;

    @ApiProperty({
        description: 'IP address (IPv4 or IPv6)',
        example: '192.168.1.100',
    })
    ipAddress: string;

    @ApiProperty({
        description: 'Optional description for the IP address',
        example: 'Office network main gateway',
        required: false,
    })
    description?: string;

    @ApiProperty({
        description: 'Whether this IP address is currently active',
        example: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Timestamp when the entry was created',
        example: '2024-01-15T10:30:00Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Timestamp when the entry was last updated',
        example: '2024-01-15T10:30:00Z',
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'User ID who created this entry',
        example: 'admin123',
    })
    createdBy: string;
}