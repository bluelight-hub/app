import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpStatus,
    Logger,
    UseGuards,
    Req,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { ErrorHandlingService } from '../../../../common/services/error-handling.service';
import { IpWhitelistService } from './ip-whitelist.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateIpWhitelistDto } from './dto/create-ip-whitelist.dto';
import { UpdateIpWhitelistDto } from './dto/update-ip-whitelist.dto';
import { IpWhitelist } from './entities/ip-whitelist.entity';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';

@ApiTags('Admin - IP Whitelist')
@Controller('admin/security/whitelist')
@UseInterceptors(RateLimitInterceptor)
export class IpWhitelistController {
    private readonly logger = new Logger(IpWhitelistController.name);

    constructor(
        private readonly ipWhitelistService: IpWhitelistService,
        private readonly auditLogService: AuditLogService,
        private readonly errorHandlingService: ErrorHandlingService,
    ) {}

    /**
     * Create a new IP whitelist entry
     */
    @Post()
    @ApiOperation({ summary: 'Add IP address to whitelist' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'IP address successfully added to whitelist',
        type: IpWhitelist,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid IP address or validation error',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'IP address already exists in whitelist',
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: 'Rate limit exceeded',
    })
    async create(
        @Body() createIpWhitelistDto: CreateIpWhitelistDto,
        @Req() request: Request,
    ): Promise<IpWhitelist> {
        return await this.errorHandlingService.executeWithErrorHandling(
            async () => {
                this.logger.log(`Creating IP whitelist entry for: ${createIpWhitelistDto.ipAddress}`);
                
                const entry = await this.ipWhitelistService.create(createIpWhitelistDto);
                
                // Log the action for audit
                await this.auditLogService.logIpWhitelistCreate(
                    entry.ipAddress,
                    entry.id,
                    createIpWhitelistDto.createdBy,
                    this.getClientIp(request),
                    request.get('User-Agent'),
                );

                return entry;
            },
            `create-ip-whitelist-${createIpWhitelistDto.ipAddress}`,
            createIpWhitelistDto,
        );
    }

    /**
     * Get all IP whitelist entries
     */
    @Get()
    @ApiOperation({ summary: 'Get all IP whitelist entries' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of all IP whitelist entries',
        type: [IpWhitelist],
    })
    async findAll(): Promise<IpWhitelist[]> {
        this.logger.log('Retrieving all IP whitelist entries');
        return this.ipWhitelistService.findAll();
    }

    /**
     * Get only active IP whitelist entries
     */
    @Get('active')
    @ApiOperation({ summary: 'Get active IP whitelist entries' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of active IP whitelist entries',
        type: [IpWhitelist],
    })
    async findActive(): Promise<IpWhitelist[]> {
        this.logger.log('Retrieving active IP whitelist entries');
        return this.ipWhitelistService.findActive();
    }

    /**
     * Get a specific IP whitelist entry
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get IP whitelist entry by ID' })
    @ApiParam({ name: 'id', description: 'IP whitelist entry ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'IP whitelist entry found',
        type: IpWhitelist,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'IP whitelist entry not found',
    })
    async findById(@Param('id') id: string): Promise<IpWhitelist> {
        this.logger.log(`Retrieving IP whitelist entry: ${id}`);
        return this.ipWhitelistService.findById(id);
    }

    /**
     * Update an IP whitelist entry
     */
    @Patch(':id')
    @ApiOperation({ summary: 'Update IP whitelist entry' })
    @ApiParam({ name: 'id', description: 'IP whitelist entry ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'IP whitelist entry successfully updated',
        type: IpWhitelist,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'IP whitelist entry not found',
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: 'Rate limit exceeded',
    })
    async update(
        @Param('id') id: string,
        @Body() updateIpWhitelistDto: UpdateIpWhitelistDto,
        @Req() request: Request,
    ): Promise<IpWhitelist> {
        return await this.errorHandlingService.executeWithErrorHandling(
            async () => {
                this.logger.log(`Updating IP whitelist entry: ${id}`);
                
                const oldEntry = await this.ipWhitelistService.findById(id);
                const updatedEntry = await this.ipWhitelistService.update(id, updateIpWhitelistDto);
                
                // Log the action for audit
                await this.auditLogService.logIpWhitelistUpdate(
                    id,
                    'admin', // TODO: Get from authentication context
                    { old: oldEntry, new: updatedEntry },
                    this.getClientIp(request),
                    request.get('User-Agent'),
                );

                return updatedEntry;
            },
            `update-ip-whitelist-${id}`,
            { id, ...updateIpWhitelistDto },
        );
    }

    /**
     * Delete an IP whitelist entry
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete IP whitelist entry' })
    @ApiParam({ name: 'id', description: 'IP whitelist entry ID' })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'IP whitelist entry successfully deleted',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'IP whitelist entry not found',
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: 'Rate limit exceeded',
    })
    async remove(
        @Param('id') id: string,
        @Req() request: Request,
    ): Promise<void> {
        return await this.errorHandlingService.executeWithErrorHandling(
            async () => {
                this.logger.log(`Deleting IP whitelist entry: ${id}`);
                
                const entry = await this.ipWhitelistService.findById(id);
                await this.ipWhitelistService.remove(id);
                
                // Log the action for audit
                await this.auditLogService.logIpWhitelistDelete(
                    entry.ipAddress,
                    id,
                    'admin', // TODO: Get from authentication context
                    this.getClientIp(request),
                    request.get('User-Agent'),
                );
            },
            `delete-ip-whitelist-${id}`,
            { id },
        );
    }

    /**
     * Deactivate an IP whitelist entry
     */
    @Patch(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate IP whitelist entry' })
    @ApiParam({ name: 'id', description: 'IP whitelist entry ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'IP whitelist entry successfully deactivated',
        type: IpWhitelist,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'IP whitelist entry not found',
    })
    async deactivate(
        @Param('id') id: string,
        @Req() request: Request,
    ): Promise<IpWhitelist> {
        return await this.errorHandlingService.executeWithErrorHandling(
            async () => {
                this.logger.log(`Deactivating IP whitelist entry: ${id}`);
                
                const result = await this.ipWhitelistService.deactivate(id);
                
                // Log the action for audit
                await this.auditLogService.logIpWhitelistUpdate(
                    id,
                    'admin', // TODO: Get from authentication context
                    { action: 'deactivate' },
                    this.getClientIp(request),
                    request.get('User-Agent'),
                );

                return result;
            },
            `deactivate-ip-whitelist-${id}`,
            { id },
        );
    }

    /**
     * Activate an IP whitelist entry
     */
    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activate IP whitelist entry' })
    @ApiParam({ name: 'id', description: 'IP whitelist entry ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'IP whitelist entry successfully activated',
        type: IpWhitelist,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'IP whitelist entry not found',
    })
    async activate(
        @Param('id') id: string,
        @Req() request: Request,
    ): Promise<IpWhitelist> {
        return await this.errorHandlingService.executeWithErrorHandling(
            async () => {
                this.logger.log(`Activating IP whitelist entry: ${id}`);
                
                const result = await this.ipWhitelistService.activate(id);
                
                // Log the action for audit
                await this.auditLogService.logIpWhitelistUpdate(
                    id,
                    'admin', // TODO: Get from authentication context
                    { action: 'activate' },
                    this.getClientIp(request),
                    request.get('User-Agent'),
                );

                return result;
            },
            `activate-ip-whitelist-${id}`,
            { id },
        );
    }

    /**
     * Helper method to extract client IP address
     */
    private getClientIp(request: Request): string {
        return (
            request.get('x-forwarded-for') ||
            request.get('x-real-ip') ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown'
        );
    }
}