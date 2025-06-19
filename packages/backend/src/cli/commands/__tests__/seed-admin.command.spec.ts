import { Test } from '@nestjs/testing';
import { SeedService } from '@/modules/seed/seed.service';
import { SeedAdminCommand } from '../seed-admin.command';

describe('SeedAdminCommand', () => {
    let command: SeedAdminCommand;
    let seedService: jest.Mocked<SeedService>;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                SeedAdminCommand,
                {
                    provide: SeedService,
                    useValue: {
                        seedAdminAuthentication: jest.fn(),
                        seedAdminRolePermissions: jest.fn(),
                        seedAdminUsers: jest.fn(),
                    },
                },
            ],
        }).compile();

        command = moduleRef.get<SeedAdminCommand>(SeedAdminCommand);
        seedService = moduleRef.get(SeedService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('run', () => {
        it('sollte vollständiges Admin-Authentication-Seeding durchführen', async () => {
            // Arrange
            seedService.seedAdminAuthentication.mockResolvedValue(true);

            // Act
            await command.run([], {});

            // Assert
            expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith('admin123');
        });

        it('sollte benutzerdefiniertes Passwort verwenden', async () => {
            // Arrange
            const customPassword = 'superSecurePassword123!';
            seedService.seedAdminAuthentication.mockResolvedValue(true);

            // Act
            await command.run([], { password: customPassword });

            // Assert
            expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith(customPassword);
        });

        it('sollte nur Permissions seeden wenn permissionsOnly flag gesetzt ist', async () => {
            // Arrange
            seedService.seedAdminRolePermissions.mockResolvedValue(true);

            // Act
            await command.run([], { permissionsOnly: true });

            // Assert
            expect(seedService.seedAdminRolePermissions).toHaveBeenCalled();
            expect(seedService.seedAdminUsers).not.toHaveBeenCalled();
            expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
        });

        it('sollte nur Users seeden wenn usersOnly flag gesetzt ist', async () => {
            // Arrange
            seedService.seedAdminUsers.mockResolvedValue(true);

            // Act
            await command.run([], { usersOnly: true, password: 'testpass' });

            // Assert
            expect(seedService.seedAdminUsers).toHaveBeenCalledWith('testpass');
            expect(seedService.seedAdminRolePermissions).not.toHaveBeenCalled();
            expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
        });

        it('sollte Fehler behandeln', async () => {
            // Arrange
            const error = new Error('Seed failed');
            seedService.seedAdminAuthentication.mockRejectedValue(error);
            
            // Logger spy
            const loggerErrorSpy = jest.spyOn(command['logger'], 'error').mockImplementation();

            // Act
            await command.run([], {});

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Fehler beim Ausführen des Befehls:'),
                expect.anything()
            );

            loggerErrorSpy.mockRestore();
        });
    });

    describe('Option Parsers', () => {
        it('sollte Passwort-Option parsen', () => {
            const result = command.parsePassword('myPassword');
            expect(result).toBe('myPassword');
        });

        it('sollte Permissions-Only-Option parsen', () => {
            const result = command.parsePermissionsOnly();
            expect(result).toBe(true);
        });

        it('sollte Users-Only-Option parsen', () => {
            const result = command.parseUsersOnly();
            expect(result).toBe(true);
        });
    });
});