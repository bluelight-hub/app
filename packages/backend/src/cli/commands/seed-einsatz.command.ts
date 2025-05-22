import {EinsatzService} from '@/modules/einsatz/einsatz.service';
import {Injectable, Logger} from '@nestjs/common';
import {Command, CommandRunner, Option} from 'nest-commander';

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
}

/**
 * CLI-Befehl zum manuellen Erstellen eines Test-Einsatzes.
 * Verwendung: npm run cli -- seed:einsatz [--name="Mein Test-Einsatz"] [--beschreibung="Optionale Beschreibung"]
 * Ohne Parameter wird ein Standard-Name generiert.
 */
@Injectable()
@Command({
    name: 'seed:einsatz',
    description: 'Erstellt einen Test-Einsatz mit dem angegebenen Namen',
})
export class SeedEinsatzCommand extends CommandRunner {
    private readonly logger = new Logger(SeedEinsatzCommand.name);

    constructor(private readonly einsatzService: EinsatzService) {
        super();
    }

    /**
     * Führt den Befehl aus.
     *
     * @param passedParams Übergebene Parameter
     * @param options Übergebene Optionen
     */
    async run(
        passedParams: string[],
        options?: SeedEinsatzOptions,
    ): Promise<void> {
        try {
            const name = options?.name || this.generateDefaultName();

            this.logger.log(`Erstelle Einsatz "${name}"...`);

            const einsatz = await this.einsatzService.create({
                name,
                beschreibung: options?.beschreibung,
            });

            this.logger.log(`Einsatz erfolgreich erstellt: ${einsatz.name} (ID: ${einsatz.id})`);
        } catch (error) {
            this.logger.error(`Fehler beim Erstellen des Einsatzes: ${error.message}`);
            if (error.code === 'P2002') {
                this.logger.error('Ein Einsatz mit diesem Namen existiert bereits');
            }
        }
    }

    /**
     * Parser für die Name-Option.
     *
     * @param val Der übergebene Wert
     * @returns Der geparste Wert
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
     *
     * @param val Der übergebene Wert
     * @returns Der geparste Wert
     */
    @Option({
        flags: '-d, --beschreibung [beschreibung]',
        description: 'Optionale Beschreibung des Einsatzes',
    })
    parseBeschreibung(val: string): string {
        return val;
    }

    /**
     * Generiert einen Standard-Einsatz-Namen.
     *
     * @returns Ein eindeutiger Standard-Name
     */
    private generateDefaultName(): string {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');
        return `Test-Einsatz ${timestamp}`;
    }
} 