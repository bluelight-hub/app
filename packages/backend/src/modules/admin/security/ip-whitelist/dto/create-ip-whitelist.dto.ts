import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIP, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for creating a new IP whitelist entry
 */
export class CreateIpWhitelistDto {
    @ApiProperty({
        description: 'IP address to whitelist (IPv4 or IPv6)',
        example: '192.168.1.100',
    })
    @IsString()
    @IsIP()
    ipAddress: string;

    @ApiProperty({
        description: 'Optional description for the IP address',
        example: 'Office network main gateway',
        required: false,
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    description?: string;

    @ApiProperty({
        description: 'User ID creating this entry',
        example: 'admin123',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    createdBy: string;
}