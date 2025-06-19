import { SeedService } from '@/modules/seed/seed.service';
import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';

/**
 * Optionen für den Seed-Admin-Befehl.
 */
interface SeedAdminOptions {
    /**
     * Passwort für die Admin-Benutzer.
     * Standard: admin123
     */
    password?: string;

    /**
     * Nur Rollen-Berechtigungen seeden, keine Benutzer.
     */
    permissionsOnly?: boolean;

    /**
     * Nur Benutzer seeden, keine Berechtigungen.
     */
    usersOnly?: boolean;
}

/**
 * CLI-Befehl zum manuellen Seeden der Admin-Authentifizierung.
 * 
 * Verwendung: 
 * - npm run cli -- seed:admin
 * - npm run cli -- seed:admin --password="sicheres-passwort"
 * - npm run cli -- seed:admin --permissions-only
 * - npm run cli -- seed:admin --users-only
 */
@Injectable()
@Command({
    name: 'seed:admin',
    description: 'Erstellt initiale Admin-Benutzer und Rollen-Berechtigungen',
})
export class SeedAdminCommand extends CommandRunner {
    private readonly logger = new Logger(SeedAdminCommand.name);

    constructor(
        private readonly seedService: SeedService,
    ) {
        super();
    }

    /**
     * Führt den Befehl aus.
     *
     * @param _passedParams Übergebene Parameter
     * @param options Übergebene Optionen
     */
    async run(
        _passedParams: string[],
        options?: SeedAdminOptions,
    ): Promise<void> {
        try {
            const password = options?.password || 'admin123';

            if (options?.permissionsOnly) {
                await this.seedPermissionsOnly();
            } else if (options?.usersOnly) {
                await this.seedUsersOnly(password);
            } else {
                await this.seedFullAdminAuth(password);
            }

        } catch (error) {
            this.logger.error(`Fehler beim Ausführen des Befehls: ${error.message}`, error.stack);
        }
    }

    /**
     * Führt das komplette Admin-Authentication-Seeding durch.
     */
    private async seedFullAdminAuth(password: string): Promise<void> {
        this.logger.log('Starte vollständiges Admin-Authentication-Seeding...');

        const success = await this.seedService.seedAdminAuthentication(password);

        if (success) {
            this.logger.log('✅ Admin-Authentication erfolgreich geseeded!');
            this.logger.log('');
            this.logger.log('📋 Erstelle Admin-Benutzer:');
            this.logger.log('=====================================');
            this.logger.log('🔹 Super Admin:');
            this.logger.log('   Email: superadmin@bluelight-hub.com');
            this.logger.log('   Username: superadmin');
            this.logger.log(`   Passwort: ${password}`);
            this.logger.log('   Berechtigungen: Alle');
            this.logger.log('');
            this.logger.log('🔹 Admin:');
            this.logger.log('   Email: admin@bluelight-hub.com');
            this.logger.log('   Username: admin');
            this.logger.log(`   Passwort: ${password}`);
            this.logger.log('   Berechtigungen: Admin-Benutzer verwalten, System-Einstellungen, Audit-Logs');
            this.logger.log('');
            this.logger.log('🔹 Support:');
            this.logger.log('   Email: support@bluelight-hub.com');
            this.logger.log('   Username: support');
            this.logger.log(`   Passwort: ${password}`);
            this.logger.log('   Berechtigungen: Admin-Benutzer lesen, Audit-Logs lesen');
            this.logger.log('');
            this.logger.warn('⚠️  WICHTIG: Ändern Sie diese Passwörter vor dem Produktivbetrieb!');
        } else {
            this.logger.error('❌ Admin-Authentication-Seeding fehlgeschlagen oder bereits vorhanden');
        }
    }

    /**
     * Seedet nur die Rollen-Berechtigungen.
     */
    private async seedPermissionsOnly(): Promise<void> {
        this.logger.log('Seede nur Admin-Rollen-Berechtigungen...');

        const success = await this.seedService.seedAdminRolePermissions();

        if (success) {
            this.logger.log('✅ Admin-Rollen-Berechtigungen erfolgreich erstellt!');
        } else {
            this.logger.error('❌ Fehler beim Erstellen der Admin-Rollen-Berechtigungen');
        }
    }

    /**
     * Seedet nur die Admin-Benutzer.
     */
    private async seedUsersOnly(password: string): Promise<void> {
        this.logger.log('Seede nur Admin-Benutzer...');

        const success = await this.seedService.seedAdminUsers(password);

        if (success) {
            this.logger.log('✅ Admin-Benutzer erfolgreich erstellt!');
            this.logger.warn(`⚠️  Alle Benutzer verwenden das Passwort: ${password}`);
            this.logger.warn('⚠️  WICHTIG: Ändern Sie diese Passwörter vor dem Produktivbetrieb!');
        } else {
            this.logger.warn('⚠️  Admin-Benutzer wurden nicht erstellt (existieren bereits oder Fehler)');
        }
    }

    /**
     * Parser für die Passwort-Option.
     */
    @Option({
        flags: '-p, --password [password]',
        description: 'Passwort für die Admin-Benutzer (Standard: admin123)',
        required: false,
    })
    parsePassword(val: string): string {
        return val;
    }

    /**
     * Parser für die Permissions-Only-Option.
     */
    @Option({
        flags: '--permissions-only',
        description: 'Nur Rollen-Berechtigungen seeden, keine Benutzer',
    })
    parsePermissionsOnly(): boolean {
        return true;
    }

    /**
     * Parser für die Users-Only-Option.
     */
    @Option({
        flags: '--users-only',
        description: 'Nur Benutzer seeden, keine Berechtigungen',
    })
    parseUsersOnly(): boolean {
        return true;
    }
}