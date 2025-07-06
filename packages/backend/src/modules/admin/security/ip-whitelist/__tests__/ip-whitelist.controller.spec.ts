import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { IpWhitelistController } from '../ip-whitelist.controller';
import { IpWhitelistService } from '../ip-whitelist.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { ErrorHandlingService } from '../../../../../common/services/error-handling.service';
import { CreateIpWhitelistDto } from '../dto/create-ip-whitelist.dto';
import { UpdateIpWhitelistDto } from '../dto/update-ip-whitelist.dto';

describe('IpWhitelistController', () => {
    let app: INestApplication;
    let ipWhitelistService: IpWhitelistService;
    let auditLogService: AuditLogService;

    const mockIpWhitelistService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findActive: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        deactivate: jest.fn(),
        activate: jest.fn(),
    };

    const mockAuditLogService = {
        logIpWhitelistCreate: jest.fn(),
        logIpWhitelistUpdate: jest.fn(),
        logIpWhitelistDelete: jest.fn(),
    };

    const mockErrorHandlingService = {
        executeWithErrorHandling: jest.fn().mockImplementation(
            async (fn: () => Promise<any>) => fn()
        ),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IpWhitelistController],
            providers: [
                {
                    provide: IpWhitelistService,
                    useValue: mockIpWhitelistService,
                },
                {
                    provide: AuditLogService,
                    useValue: mockAuditLogService,
                },
                {
                    provide: ErrorHandlingService,
                    useValue: mockErrorHandlingService,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        ipWhitelistService = module.get<IpWhitelistService>(IpWhitelistService);
        auditLogService = module.get<AuditLogService>(AuditLogService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await app.close();
    });

    describe('POST /admin/security/whitelist', () => {
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

            mockIpWhitelistService.create.mockResolvedValue(mockResult);

            const response = await request(app.getHttpServer())
                .post('/admin/security/whitelist')
                .send(createDto)
                .expect(HttpStatus.CREATED);

            expect(response.body).toEqual(mockResult);
            expect(mockIpWhitelistService.create).toHaveBeenCalledWith(createDto);
            expect(mockAuditLogService.logIpWhitelistCreate).toHaveBeenCalledWith(
                createDto.ipAddress,
                mockResult.id,
                createDto.createdBy,
                expect.any(String), // IP address
                expect.any(String), // User agent
            );
        });

        it('should validate IP address format', async () => {
            const invalidDto = {
                ...createDto,
                ipAddress: 'invalid-ip',
            };

            await request(app.getHttpServer())
                .post('/admin/security/whitelist')
                .send(invalidDto)
                .expect(HttpStatus.BAD_REQUEST);

            expect(mockIpWhitelistService.create).not.toHaveBeenCalled();
        });
    });

    describe('GET /admin/security/whitelist', () => {
        it('should return all IP whitelist entries', async () => {
            const mockEntries = [
                {
                    id: 'test-id-1',
                    ipAddress: '192.168.1.100',
                    description: 'Test IP 1',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: 'admin',
                },
                {
                    id: 'test-id-2',
                    ipAddress: '192.168.1.101',
                    description: 'Test IP 2',
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: 'admin',
                },
            ];

            mockIpWhitelistService.findAll.mockResolvedValue(mockEntries);

            const response = await request(app.getHttpServer())
                .get('/admin/security/whitelist')
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(mockEntries);
            expect(mockIpWhitelistService.findAll).toHaveBeenCalled();
        });
    });

    describe('GET /admin/security/whitelist/active', () => {
        it('should return only active IP whitelist entries', async () => {
            const mockActiveEntries = [
                {
                    id: 'test-id-1',
                    ipAddress: '192.168.1.100',
                    description: 'Active Test IP',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: 'admin',
                },
            ];

            mockIpWhitelistService.findActive.mockResolvedValue(mockActiveEntries);

            const response = await request(app.getHttpServer())
                .get('/admin/security/whitelist/active')
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(mockActiveEntries);
            expect(mockIpWhitelistService.findActive).toHaveBeenCalled();
        });
    });

    describe('GET /admin/security/whitelist/:id', () => {
        it('should return IP whitelist entry by ID', async () => {
            const mockEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                description: 'Test IP',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };

            mockIpWhitelistService.findById.mockResolvedValue(mockEntry);

            const response = await request(app.getHttpServer())
                .get('/admin/security/whitelist/test-id')
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(mockEntry);
            expect(mockIpWhitelistService.findById).toHaveBeenCalledWith('test-id');
        });
    });

    describe('PATCH /admin/security/whitelist/:id', () => {
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

            mockIpWhitelistService.findById.mockResolvedValue(existingEntry);
            mockIpWhitelistService.update.mockResolvedValue(updatedEntry);

            const response = await request(app.getHttpServer())
                .patch('/admin/security/whitelist/test-id')
                .send(updateDto)
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(updatedEntry);
            expect(mockIpWhitelistService.update).toHaveBeenCalledWith('test-id', updateDto);
            expect(mockAuditLogService.logIpWhitelistUpdate).toHaveBeenCalled();
        });
    });

    describe('DELETE /admin/security/whitelist/:id', () => {
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

            mockIpWhitelistService.findById.mockResolvedValue(existingEntry);
            mockIpWhitelistService.remove.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .delete('/admin/security/whitelist/test-id')
                .expect(HttpStatus.OK);

            expect(mockIpWhitelistService.findById).toHaveBeenCalledWith('test-id');
            expect(mockIpWhitelistService.remove).toHaveBeenCalledWith('test-id');
            expect(mockAuditLogService.logIpWhitelistDelete).toHaveBeenCalled();
        });
    });

    describe('PATCH /admin/security/whitelist/:id/deactivate', () => {
        it('should deactivate IP whitelist entry', async () => {
            const deactivatedEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                description: 'Test IP',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };

            mockIpWhitelistService.deactivate.mockResolvedValue(deactivatedEntry);

            const response = await request(app.getHttpServer())
                .patch('/admin/security/whitelist/test-id/deactivate')
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(deactivatedEntry);
            expect(mockIpWhitelistService.deactivate).toHaveBeenCalledWith('test-id');
            expect(mockAuditLogService.logIpWhitelistUpdate).toHaveBeenCalled();
        });
    });

    describe('PATCH /admin/security/whitelist/:id/activate', () => {
        it('should activate IP whitelist entry', async () => {
            const activatedEntry = {
                id: 'test-id',
                ipAddress: '192.168.1.100',
                description: 'Test IP',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };

            mockIpWhitelistService.activate.mockResolvedValue(activatedEntry);

            const response = await request(app.getHttpServer())
                .patch('/admin/security/whitelist/test-id/activate')
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(activatedEntry);
            expect(mockIpWhitelistService.activate).toHaveBeenCalledWith('test-id');
            expect(mockAuditLogService.logIpWhitelistUpdate).toHaveBeenCalled();
        });
    });
});