import { EinsatzService } from '@/modules/einsatz/einsatz.service';
import { ProfileService } from '@/modules/seed/profile.service';
import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';

/**
 * Optionen für den Seed-Einsatz-Befehl.
 */
interface SeedEinsatzOptions {
    /**
     * Name des zu erstellenden Einsatzes.
     * Wenn nicht angegeben, wird ein Standard-Name generiert.
     */
    name?: string;

    /**
     * Optionale Beschreibung des Einsatzes.
     */
    beschreibung?: string;

    /**
     * Vordefiniertes DRK-Profil verwenden.
     * Verfügbare Profile: manv, sanitaetsdienst, katastrophenschutz, betreuung, rettungsdienst, psnv, ausbildung
     */
    profile?: string;

    /**
     * Alle verfügbaren Profile auflisten.
     */
    list?: boolean;

    /**
     * Detaillierte Informationen zu einem Profil anzeigen.
     */
    info?: string;

    /**
     * Profile nach Kategorie filtern.
     */
    category?: string;

    /**
     * Profile nach Priorität filtern.
     */
    priority?: string;
}

/**
 * CLI-Befehl zum manuellen Erstellen eines Test-Einsatzes.
 * Unterstützt jetzt vordefinierte DRK-Profile für realistische Szenarien.
 * 
 * Verwendung: 
 * - npm run cli -- seed:einsatz --profile=manv
 * - npm run cli -- seed:einsatz --name="Mein Test-Einsatz" --beschreibung="Optionale Beschreibung"
 * - npm run cli -- seed:einsatz --list
 * - npm run cli -- seed:einsatz --info=manv
 */
@Injectable()
@Command({
    name: 'seed:einsatz',
    description: 'Erstellt einen Test-Einsatz mit dem angegebenen Namen oder aus einem vordefinierten DRK-Profil',
})
export class SeedEinsatzCommand extends CommandRunner {
    private readonly logger = new Logger(SeedEinsatzCommand.name);

    constructor(
        private readonly einsatzService: EinsatzService,
        private readonly profileService: ProfileService,
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
        options?: SeedEinsatzOptions,
    ): Promise<void> {
        try {
            // Liste aller Profile anzeigen
            if (options?.list) {
                this.showProfileList();
                return;
            }

            // Informationen zu einem spezifischen Profil anzeigen
            if (options?.info) {
                this.showProfileInfo(options.info);
                return;
            }

            // Profile nach Kriterien filtern und anzeigen
            if (options?.category || options?.priority) {
                this.showFilteredProfiles(options.category, options.priority);
                return;
            }

            // Einsatz aus Profil erstellen
            if (options?.profile) {
                await this.createEinsatzFromProfile(options.profile);
                return;
            }

            // Einsatz mit benutzerdefinierten Daten erstellen
            await this.createCustomEinsatz(options);

        } catch (error) {
            this.logger.error(`Fehler beim Ausführen des Befehls: ${error.message}`);
        }
    }

    /**
     * Erstellt einen Einsatz aus einem vordefinierten Profil.
     */
    private async createEinsatzFromProfile(profileKey: string): Promise<void> {
        this.logger.log(`Erstelle Einsatz aus DRK-Profil "${profileKey}"...`);

        try {
            const einsatz = await this.profileService.createEinsatzFromProfile(profileKey);

            if (einsatz) {
                const profile = this.profileService.getProfile(profileKey);
                this.logger.log(`✅ DRK-Einsatz erfolgreich erstellt:`);
                this.logger.log(`   Name: ${einsatz.name}`);
                this.logger.log(`   ID: ${einsatz.id}`);
                this.logger.log(`   Profil: ${profile?.name} (${profile?.metadata.category})`);
                this.logger.log(`   Priorität: ${profile?.metadata.priority}`);
                this.logger.log(`   Betroffene Personen: ${profile?.metadata.estimatedPersonsAffected}`);
            }
        } catch (error) {
            this.logger.error(`❌ Fehler beim Erstellen des Einsatzes aus Profil: ${error.message}`);

            if (error.message.includes('nicht gefunden')) {
                this.logger.log('\n📋 Verfügbare DRK-Profile:');
                this.showProfileList();
            }
        }
    }

    /**
     * Erstellt einen benutzerdefinierten Einsatz.
     */
    private async createCustomEinsatz(options?: SeedEinsatzOptions): Promise<void> {
        const name = options?.name || this.generateDefaultName();

        this.logger.log(`Erstelle benutzerdefinierten Einsatz "${name}"...`);

        try {
            const einsatz = await this.einsatzService.create({
                name,
                beschreibung: options?.beschreibung,
            });

            this.logger.log(`✅ Einsatz erfolgreich erstellt: ${einsatz.name} (ID: ${einsatz.id})`);
        } catch (error) {
            this.logger.error(`❌ Fehler beim Erstellen des Einsatzes: ${error.message}`);
            if (error.code === 'P2002') {
                this.logger.error('Ein Einsatz mit diesem Namen existiert bereits');
            }
        }
    }

    /**
     * Zeigt eine Liste aller verfügbaren Profile an.
     */
    private showProfileList(): void {
        this.logger.log('\n📋 Verfügbare DRK-Profile:');
        this.logger.log('=====================================');

        const profiles = this.profileService.getAllProfiles();
        profiles.forEach(profile => {
            this.logger.log(`🔹 ${profile.key}: ${profile.name}`);
            this.logger.log(`   Kategorie: ${profile.metadata.category} | Priorität: ${profile.metadata.priority}`);
            this.logger.log(`   Personen: ${profile.metadata.estimatedPersonsAffected} | Dauer: ${profile.metadata.estimatedDurationHours}h`);
            this.logger.log('');
        });

        this.logger.log('💡 Verwendung:');
        this.logger.log('   npm run cli -- seed:einsatz --profile=<key>');
        this.logger.log('   npm run cli -- seed:einsatz --info=<key>');
    }

    /**
     * Zeigt detaillierte Informationen zu einem Profil an.
     */
    private showProfileInfo(profileKey: string): void {
        const details = this.profileService.getProfileDetails(profileKey);

        if (!details) {
            this.logger.error(`❌ Profil "${profileKey}" nicht gefunden.`);
            this.logger.log('\n📋 Verfügbare Profile:');
            this.logger.log(this.profileService.getAvailableProfileKeys().join(', '));
            return;
        }

        this.logger.log('\n📋 DRK-Profil Details:');
        this.logger.log('=====================================');
        this.logger.log(details);
        this.logger.log('\n💡 Einsatz erstellen:');
        this.logger.log(`   npm run cli -- seed:einsatz --profile=${profileKey}`);
    }

    /**
     * Zeigt gefilterte Profile nach Kategorie und/oder Priorität an.
     */
    private showFilteredProfiles(category?: string, priority?: string): void {
        let profiles = this.profileService.getAllProfiles();

        if (category) {
            const categoryProfiles = this.profileService.getProfilesByCategory(category as any);
            if (categoryProfiles.length === 0) {
                this.logger.error(`❌ Keine Profile für Kategorie "${category}" gefunden.`);
                return;
            }
            profiles = categoryProfiles;
        }

        if (priority) {
            const priorityProfiles = this.profileService.getProfilesByPriority(priority as any);
            if (priorityProfiles.length === 0) {
                this.logger.error(`❌ Keine Profile für Priorität "${priority}" gefunden.`);
                return;
            }
            profiles = priorityProfiles;
        }

        this.logger.log(`\n📋 Gefilterte DRK-Profile (${category || 'alle'} Kategorien, ${priority || 'alle'} Prioritäten):`);
        this.logger.log('=====================================');

        profiles.forEach(profile => {
            this.logger.log(`🔹 ${profile.key}: ${profile.name}`);
            this.logger.log(`   ${profile.description}`);
            this.logger.log('');
        });
    }

    /**
     * Parser für die Name-Option.
     */
    @Option({
        flags: '-n, --name [name]',
        description: 'Name des zu erstellenden Einsatzes (optional, Standard wird generiert)',
        required: false,
    })
    parseName(val: string): string {
        return val;
    }

    /**
     * Parser für die Beschreibungs-Option.
     */
    @Option({
        flags: '-d, --beschreibung [beschreibung]',
        description: 'Optionale Beschreibung des Einsatzes',
    })
    parseBeschreibung(val: string): string {
        return val;
    }

    /**
     * Parser für die Profil-Option.
     */
    @Option({
        flags: '-p, --profile [profile]',
        description: 'Vordefiniertes DRK-Profil verwenden (manv, sanitaetsdienst, katastrophenschutz, betreuung, rettungsdienst, psnv, ausbildung)',
    })
    parseProfile(val: string): string {
        return val;
    }

    /**
     * Parser für die List-Option.
     */
    @Option({
        flags: '-l, --list',
        description: 'Alle verfügbaren DRK-Profile auflisten',
    })
    parseList(): boolean {
        return true;
    }

    /**
     * Parser für die Info-Option.
     */
    @Option({
        flags: '-i, --info [profile]',
        description: 'Detaillierte Informationen zu einem DRK-Profil anzeigen',
    })
    parseInfo(val: string): string {
        return val;
    }

    /**
     * Parser für die Kategorie-Option.
     */
    @Option({
        flags: '-c, --category [category]',
        description: 'Profile nach Kategorie filtern (rettungsdienst, katastrophenschutz, sanitaetsdienst, betreuung, psnv, manv, ausbildung)',
    })
    parseCategory(val: string): string {
        return val;
    }

    /**
     * Parser für die Priorität-Option.
     */
    @Option({
        flags: '--priority [priority]',
        description: 'Profile nach Priorität filtern (low, medium, high, critical)',
    })
    parsePriority(val: string): string {
        return val;
    }

    /**
     * Generiert einen Standard-Einsatz-Namen.
     */
    private generateDefaultName(): string {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');
        return `Test-Einsatz ${timestamp}`;
    }
} 