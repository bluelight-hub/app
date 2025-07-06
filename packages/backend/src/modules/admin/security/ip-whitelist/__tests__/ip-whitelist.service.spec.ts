import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { IpWhitelistService } from '../ip-whitelist.service';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CreateIpWhitelistDto } from '../dto/create-ip-whitelist.dto';
import { UpdateIpWhitelistDto } from '../dto/update-ip-whitelist.dto';

describe('IpWhitelistService', () => {
    let service: IpWhitelistService;
    let prismaService: PrismaService;

    const mockPrismaService = {
        ipWhitelist: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IpWhitelistService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<IpWhitelistService>(IpWhitelistService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createDto: CreateIpWhitelistDto = {
            ipAddress: '192.168.1.100',
            description: 'Test IP',
            createdBy: 'admin',
        };

        it('should create a new IP whitelist entry', async () => {
            const mockResult = {
                id: 'test-id',
                ...createDto,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);
            mockPrismaService.ipWhitelist.create.mockResolvedValue(mockResult);

            const result = await service.create(createDto);

            expect(result).toEqual(mockResult);
            expect(mockPrismaService.ipWhitelist.findUnique).toHaveBeenCalledWith({
                where: { ipAddress: createDto.ipAddress },
            });
            expect(mockPrismaService.ipWhitelist.create).toHaveBeenCalledWith({
                data: {
                    ipAddress: createDto.ipAddress,
                    description: createDto.description,
                    createdBy: createDto.createdBy,
                },
            });
        });

        it('should throw ConflictException if IP already exists', async () => {
            const existingEntry = { id: 'existing-id', ipAddress: createDto.ipAddress };
            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(existingEntry);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            expect(mockPrismaService.ipWhitelist.create).not.toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should return IP whitelist entry if found', async () => {
            const mockEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                description: 'Test IP',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };

            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(mockEntry);

            const result = await service.findById('test-id');

            expect(result).toEqual(mockEntry);
            expect(mockPrismaService.ipWhitelist.findUnique).toHaveBeenCalledWith({
                where: { id: 'test-id' },
            });
        });

        it('should throw NotFoundException if entry not found', async () => {
            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);

            await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('isIpWhitelisted', () => {
        it('should return true if IP is whitelisted and active', async () => {
            const mockEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                isActive: true,
            };

            mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(mockEntry);

            const result = await service.isIpWhitelisted('192.168.1.100');

            expect(result).toBe(true);
            expect(mockPrismaService.ipWhitelist.findFirst).toHaveBeenCalledWith({
                where: {
                    ipAddress: '192.168.1.100',
                    isActive: true,
                },
            });
        });

        it('should return false if IP is not whitelisted', async () => {
            mockPrismaService.ipWhitelist.findFirst.mockResolvedValue(null);

            const result = await service.isIpWhitelisted('192.168.1.101');

            expect(result).toBe(false);
        });
    });

    describe('update', () => {
        const updateDto: UpdateIpWhitelistDto = {
            description: 'Updated description',
            isActive: false,
        };

        it('should update IP whitelist entry', async () => {
            const existingEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                description: 'Original description',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };

            const updatedEntry = {
                ...existingEntry,
                ...updateDto,
                updatedAt: new Date(),
            };

            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(existingEntry);
            mockPrismaService.ipWhitelist.update.mockResolvedValue(updatedEntry);

            const result = await service.update('test-id', updateDto);

            expect(result).toEqual(updatedEntry);
            expect(mockPrismaService.ipWhitelist.update).toHaveBeenCalledWith({
                where: { id: 'test-id' },
                data: {
                    description: updateDto.description,
                    isActive: updateDto.isActive,
                    updatedAt: expect.any(Date),
                },
            });
        });

        it('should throw NotFoundException if entry not found', async () => {
            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);

            await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.ipWhitelist.update).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should delete IP whitelist entry', async () => {
            const existingEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                description: 'Test IP',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };

            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(existingEntry);
            mockPrismaService.ipWhitelist.delete.mockResolvedValue(existingEntry);

            await service.remove('test-id');

            expect(mockPrismaService.ipWhitelist.delete).toHaveBeenCalledWith({
                where: { id: 'test-id' },
            });
        });

        it('should throw NotFoundException if entry not found', async () => {
            mockPrismaService.ipWhitelist.findUnique.mockResolvedValue(null);

            await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.ipWhitelist.delete).not.toHaveBeenCalled();
        });
    });
});