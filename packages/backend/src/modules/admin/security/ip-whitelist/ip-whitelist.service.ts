import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateIpWhitelistDto } from './dto/create-ip-whitelist.dto';
import { UpdateIpWhitelistDto } from './dto/update-ip-whitelist.dto';
import { IpWhitelist } from './entities/ip-whitelist.entity';

/**
 * Service for managing IP whitelist entries
 * Provides CRUD operations with proper validation and error handling
 */
@Injectable()
export class IpWhitelistService {
    private readonly logger = new Logger(IpWhitelistService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a new IP whitelist entry
     */
    async create(createIpWhitelistDto: CreateIpWhitelistDto): Promise<IpWhitelist> {
        this.logger.log(`Creating IP whitelist entry for: ${createIpWhitelistDto.ipAddress}`);

        try {
            // Check if IP already exists
            const existing = await this.prisma.ipWhitelist.findUnique({
                where: { ipAddress: createIpWhitelistDto.ipAddress }
            });

            if (existing) {
                throw new ConflictException(`IP address ${createIpWhitelistDto.ipAddress} is already whitelisted`);
            }

            const entry = await this.prisma.ipWhitelist.create({
                data: {
                    ipAddress: createIpWhitelistDto.ipAddress,
                    description: createIpWhitelistDto.description,
                    createdBy: createIpWhitelistDto.createdBy,
                }
            });

            this.logger.log(`Successfully created IP whitelist entry: ${entry.id}`);
            return entry;
        } catch (error) {
            this.logger.error(`Failed to create IP whitelist entry: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Find all IP whitelist entries
     */
    async findAll(): Promise<IpWhitelist[]> {
        this.logger.log('Retrieving all IP whitelist entries');
        
        return this.prisma.ipWhitelist.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Find active IP whitelist entries only
     */
    async findActive(): Promise<IpWhitelist[]> {
        this.logger.log('Retrieving active IP whitelist entries');
        
        return this.prisma.ipWhitelist.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Find a specific IP whitelist entry by ID
     */
    async findById(id: string): Promise<IpWhitelist> {
        this.logger.log(`Retrieving IP whitelist entry: ${id}`);

        const entry = await this.prisma.ipWhitelist.findUnique({
            where: { id }
        });

        if (!entry) {
            throw new NotFoundException(`IP whitelist entry with ID ${id} not found`);
        }

        return entry;
    }

    /**
     * Check if an IP address is whitelisted and active
     */
    async isIpWhitelisted(ipAddress: string): Promise<boolean> {
        this.logger.debug(`Checking if IP is whitelisted: ${ipAddress}`);

        const entry = await this.prisma.ipWhitelist.findFirst({
            where: {
                ipAddress,
                isActive: true
            }
        });

        const isWhitelisted = !!entry;
        this.logger.debug(`IP ${ipAddress} whitelist status: ${isWhitelisted}`);
        
        return isWhitelisted;
    }

    /**
     * Update an IP whitelist entry
     */
    async update(id: string, updateIpWhitelistDto: UpdateIpWhitelistDto): Promise<IpWhitelist> {
        this.logger.log(`Updating IP whitelist entry: ${id}`);

        // Verify entry exists
        await this.findById(id);

        try {
            const updatedEntry = await this.prisma.ipWhitelist.update({
                where: { id },
                data: {
                    description: updateIpWhitelistDto.description,
                    isActive: updateIpWhitelistDto.isActive,
                    updatedAt: new Date(),
                }
            });

            this.logger.log(`Successfully updated IP whitelist entry: ${id}`);
            return updatedEntry;
        } catch (error) {
            this.logger.error(`Failed to update IP whitelist entry ${id}: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Delete an IP whitelist entry
     */
    async remove(id: string): Promise<void> {
        this.logger.log(`Removing IP whitelist entry: ${id}`);

        // Verify entry exists
        await this.findById(id);

        try {
            await this.prisma.ipWhitelist.delete({
                where: { id }
            });

            this.logger.log(`Successfully removed IP whitelist entry: ${id}`);
        } catch (error) {
            this.logger.error(`Failed to remove IP whitelist entry ${id}: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Deactivate an IP whitelist entry instead of deleting
     */
    async deactivate(id: string): Promise<IpWhitelist> {
        this.logger.log(`Deactivating IP whitelist entry: ${id}`);

        return this.update(id, { isActive: false });
    }

    /**
     * Activate an IP whitelist entry
     */
    async activate(id: string): Promise<IpWhitelist> {
        this.logger.log(`Activating IP whitelist entry: ${id}`);

        return this.update(id, { isActive: true });
    }
}