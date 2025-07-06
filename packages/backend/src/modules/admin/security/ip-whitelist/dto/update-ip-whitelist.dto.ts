import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, MinLength, MaxLength } from 'class-validator';
import { CreateIpWhitelistDto } from './create-ip-whitelist.dto';

/**
 * DTO for updating an IP whitelist entry
 */
export class UpdateIpWhitelistDto extends PartialType(CreateIpWhitelistDto) {
    @ApiProperty({
        description: 'Whether this IP address should be active',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: 'Optional description for the IP address',
        example: 'Updated office network gateway',
        required: false,
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    description?: string;
}