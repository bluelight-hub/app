import { Injectable, Logger } from '@nestjs/common';
import { DRKEinsatzCategory, ProfileUtils, SeedProfile } from './profiles';
import { SeedService } from './seed.service';

/**
 * Service zur Verwaltung und Verwendung von vordefinierten DRK-Seed-Profilen.
 * Ermöglicht das Erstellen von Einsätzen basierend auf vordefinierten Szenarien.
 */
@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(private readonly seedService: SeedService) { }

    /**
     * Erstellt einen Einsatz basierend auf einem vordefinierten Profil.
     *
     * @param profileKey Der Schlüssel des zu verwendenden Profils
     * @returns Der erstellte Einsatz oder null bei Fehler
     */
    async createEinsatzFromProfile(profileKey: string) {
        this.logger.log(`Erstelle Einsatz aus Profil: ${profileKey}`);

        // Profil validieren
        const profile = ProfileUtils.getProfileByKey(profileKey);
        if (!profile) {
            const availableKeys = ProfileUtils.getAvailableKeys();
            throw new Error(
                `Profil '${profileKey}' nicht gefunden. Verfügbare Profile: ${availableKeys.join(', ')}`,
            );
        }

        this.logger.log(`Verwende Profil: ${profile.name}`);

        try {
            // Einsatz mit dem Profile-Service erstellen
            const einsatz = await this.seedService.createEinsatzWithRetry(
                profile.einsatz.name,
                profile.einsatz.beschreibung,
            );

            if (einsatz) {
                this.logger.log(
                    `Einsatz erfolgreich aus Profil '${profile.name}' erstellt: ${einsatz.name} (ID: ${einsatz.id})`,
                );

                // Log zusätzliche Profile-Metadaten für Übersicht
                this.logger.debug('Profile-Metadaten:', {
                    category: profile.metadata.category,
                    estimatedPersonsAffected: profile.metadata.estimatedPersonsAffected,
                    estimatedDurationHours: profile.metadata.estimatedDurationHours,
                    priority: profile.metadata.priority,
                    requiredResources: profile.metadata.requiredResources.length,
                });
            }

            return einsatz;
        } catch (error) {
            this.logger.error(`Fehler beim Erstellen des Einsatzes aus Profil '${profileKey}':`, error);
            throw error;
        }
    }

    /**
     * Gibt alle verfügbaren Profile zurück.
     */
    getAllProfiles(): SeedProfile[] {
        return ProfileUtils.getAllProfiles();
    }

    /**
     * Gibt ein spezifisches Profil zurück.
     */
    getProfile(profileKey: string): SeedProfile | undefined {
        return ProfileUtils.getProfileByKey(profileKey);
    }

    /**
     * Gibt Profile nach Kategorie gefiltert zurück.
     */
    getProfilesByCategory(category: DRKEinsatzCategory): SeedProfile[] {
        return ProfileUtils.getProfilesByCategory(category);
    }

    /**
     * Gibt Profile nach Priorität gefiltert zurück.
     */
    getProfilesByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): SeedProfile[] {
        return ProfileUtils.getProfilesByPriority(priority);
    }

    /**
     * Validiert einen Profil-Schlüssel.
     */
    isValidProfileKey(profileKey: string): boolean {
        return ProfileUtils.isValidProfileKey(profileKey);
    }

    /**
     * Gibt alle verfügbaren Profil-Schlüssel zurück.
     */
    getAvailableProfileKeys(): string[] {
        return ProfileUtils.getAvailableKeys();
    }

    /**
     * Gibt eine formatierte Liste aller Profile für CLI/Log-Ausgabe zurück.
     */
    getFormattedProfileList(): string {
        const profiles = this.getAllProfiles();
        return profiles
            .map(
                (profile) =>
                    `${profile.key}: ${profile.name} (${profile.metadata.category}, ${profile.metadata.priority} priority)`,
            )
            .join('\n');
    }

    /**
     * Gibt detaillierte Informationen zu einem Profil zurück.
     */
    getProfileDetails(profileKey: string): string | null {
        const profile = this.getProfile(profileKey);
        if (!profile) {
            return null;
        }

        return `
Profil: ${profile.name}
Kategorie: ${profile.metadata.category}
Beschreibung: ${profile.description}

Einsatz: ${profile.einsatz.name}
Szenario: ${profile.einsatz.beschreibung}

Metadaten:
- Betroffene Personen: ${profile.metadata.estimatedPersonsAffected}
- Geschätzte Dauer: ${profile.metadata.estimatedDurationHours}h
- Priorität: ${profile.metadata.priority}
- Benötigte Ressourcen: ${profile.metadata.requiredResources.join(', ')}
    `.trim();
    }

    /**
     * Sucht Profile basierend auf einem Suchtext.
     */
    searchProfiles(searchTerm: string): SeedProfile[] {
        const normalizedSearch = searchTerm.toLowerCase();
        return this.getAllProfiles().filter(
            (profile) =>
                profile.name.toLowerCase().includes(normalizedSearch) ||
                profile.description.toLowerCase().includes(normalizedSearch) ||
                profile.einsatz.name.toLowerCase().includes(normalizedSearch) ||
                profile.einsatz.beschreibung.toLowerCase().includes(normalizedSearch) ||
                profile.metadata.category.toLowerCase().includes(normalizedSearch),
        );
    }

    /**
     * Gibt Empfehlungen für Profile basierend auf Kriterien zurück.
     */
    getRecommendedProfiles(criteria?: {
        maxPersonsAffected?: number;
        maxDurationHours?: number;
        category?: DRKEinsatzCategory;
        priority?: 'low' | 'medium' | 'high' | 'critical';
    }): SeedProfile[] {
        let profiles = this.getAllProfiles();

        if (criteria?.maxPersonsAffected) {
            profiles = profiles.filter(
                (p) => p.metadata.estimatedPersonsAffected <= criteria.maxPersonsAffected!,
            );
        }

        if (criteria?.maxDurationHours) {
            profiles = profiles.filter(
                (p) => p.metadata.estimatedDurationHours <= criteria.maxDurationHours!,
            );
        }

        if (criteria?.category) {
            profiles = profiles.filter((p) => p.metadata.category === criteria.category);
        }

        if (criteria?.priority) {
            profiles = profiles.filter((p) => p.metadata.priority === criteria.priority);
        }

        return profiles;
    }
} 