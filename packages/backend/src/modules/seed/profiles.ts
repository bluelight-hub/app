/**
 * Konfiguration für vordefinierte DRK-Seed-Profile.
 * Diese Profile enthalten realistische Szenarien für verschiedene DRK-Einsatzbereiche.
 */

/**
 * Interface für ein Seed-Profil.
 * Definiert die Struktur eines vordefinierten Einsatz-Szenarios.
 */
export interface SeedProfile {
    /** Eindeutiger Schlüssel für das Profil */
    key: string;
    /** Anzeigename des Profils */
    name: string;
    /** Beschreibung des Profils und Einsatzbereichs */
    description: string;
    /** Einsatz-Daten für das Profil */
    einsatz: {
        /** Name des zu erstellenden Einsatzes */
        name: string;
        /** Detaillierte Beschreibung des Szenarios */
        beschreibung: string;
    };
    /** DRK-spezifische Metadaten */
    metadata: {
        /** Kategorie des Einsatzes (z.B. Rettungsdienst, Katastrophenschutz) */
        category: DRKEinsatzCategory;
        /** Geschätzte Anzahl betroffener Personen */
        estimatedPersonsAffected: number;
        /** Geschätzte Einsatzdauer in Stunden */
        estimatedDurationHours: number;
        /** Benötigte DRK-Ressourcen */
        requiredResources: string[];
        /** Prioritätsstufe des Einsatzes */
        priority: 'low' | 'medium' | 'high' | 'critical';
    };
}

/**
 * Kategorien für DRK-Einsätze.
 */
export enum DRKEinsatzCategory {
    RETTUNGSDIENST = 'rettungsdienst',
    KATASTROPHENSCHUTZ = 'katastrophenschutz',
    SANITAETSDIENST = 'sanitaetsdienst',
    BETREUUNG = 'betreuung',
    PSNV = 'psnv',
    MANV = 'manv',
    AUSBILDUNG = 'ausbildung',
}

/**
 * Vordefinierte DRK-Seed-Profile für verschiedene Einsatzszenarien.
 */
export const DRK_SEED_PROFILES: Record<string, SeedProfile> = {
    manv: {
        key: 'manv',
        name: 'MANV (Massenanfall von Verletzten)',
        description: 'Kerneinsatzbereich des DRK bei Großschadensereignissen mit vielen Verletzten',
        einsatz: {
            name: 'MANV Hauptbahnhof',
            beschreibung: 'Zugunglück mit 25 Verletzten, Aufbau Behandlungsplatz und Patientenverteilung. Sichtung nach STaRT-Algorithmus, Einrichtung von 3 Behandlungsplätzen (rot/gelb/grün), Koordination mit Rettungsleitstelle.',
        },
        metadata: {
            category: DRKEinsatzCategory.MANV,
            estimatedPersonsAffected: 25,
            estimatedDurationHours: 8,
            requiredResources: [
                'ELW 1',
                'RTW (3x)',
                'NEF (2x)',
                'GW-San',
                'Behandlungsplatz-Material',
                'Sichtungsanhänger',
                'Bereitschaftsführung',
            ],
            priority: 'critical',
        },
    },

    sanitaetsdienst: {
        key: 'sanitaetsdienst',
        name: 'Sanitätsdienst bei Veranstaltungen',
        description: 'Regelmäßige DRK-Aufgabe bei öffentlichen Veranstaltungen und Events',
        einsatz: {
            name: 'Sanitätsdienst Stadtfest',
            beschreibung: 'Medizinische Betreuung beim Stadtfest mit 10.000 Besuchern. Aufbau Sanitätszelt, Bereitstellung von Sanitätspersonal, Behandlung kleinerer Verletzungen und Kreislaufprobleme.',
        },
        metadata: {
            category: DRKEinsatzCategory.SANITAETSDIENST,
            estimatedPersonsAffected: 10000,
            estimatedDurationHours: 12,
            requiredResources: [
                'Sanitätszelt',
                'Krankentrage (4x)',
                'Sanitätsmaterial',
                'Sanitäter (6x)',
                'Bereitschaftsleiter',
                'Funkgeräte',
            ],
            priority: 'medium',
        },
    },

    katastrophenschutz: {
        key: 'katastrophenschutz',
        name: 'Katastrophenschutz (Hochwasser)',
        description: 'Hauptaufgabe DRK bei Naturkatastrophen und Großschadensereignissen',
        einsatz: {
            name: 'Hochwasser Elbe',
            beschreibung: 'Evakuierung und Betreuung bei Hochwasserlage, 200 betroffene Personen. Einrichtung Notunterkunft, Verpflegung, medizinische Grundversorgung, Koordination mit Feuerwehr und THW.',
        },
        metadata: {
            category: DRKEinsatzCategory.KATASTROPHENSCHUTZ,
            estimatedPersonsAffected: 200,
            estimatedDurationHours: 72,
            requiredResources: [
                'ELW KatS',
                'GW-Betreuung',
                'Feldküche',
                'Notunterkunft-Material',
                'Einsatzleitung',
                'Betreuungsteams (4x)',
                'Sanitätsdienst',
            ],
            priority: 'high',
        },
    },

    betreuung: {
        key: 'betreuung',
        name: 'Betreuung von Evakuierten',
        description: 'Soziale Betreuung und Versorgung hilfsbedürftiger Personen durch DRK',
        einsatz: {
            name: 'Betreuung Notunterkunft',
            beschreibung: 'Einrichtung und Betrieb einer Notunterkunft für 150 Personen nach Hausbrand. Versorgung mit Nahrung, Kleidung, psychosoziale Betreuung, Vermisstensuche.',
        },
        metadata: {
            category: DRKEinsatzCategory.BETREUUNG,
            estimatedPersonsAffected: 150,
            estimatedDurationHours: 48,
            requiredResources: [
                'GW-Betreuung',
                'Betreuungsteams (3x)',
                'Verpflegung',
                'Kleiderkammer-Material',
                'Kinderbetreuung',
                'Dolmetscher',
            ],
            priority: 'medium',
        },
    },

    rettungsdienst: {
        key: 'rettungsdienst',
        name: 'Rettungsdienst-Einsatz',
        description: 'Medizinische Notfallversorgung im regulären Rettungsdienst',
        einsatz: {
            name: 'Rettungsdienst Verkehrsunfall',
            beschreibung: 'Schwerer Verkehrsunfall A9, 3 Verletzte, Notarzt angefordert. Eine Person eingeklemmt, technische Rettung erforderlich, Schockraumvoranmeldung für 2 Patienten.',
        },
        metadata: {
            category: DRKEinsatzCategory.RETTUNGSDIENST,
            estimatedPersonsAffected: 3,
            estimatedDurationHours: 2,
            requiredResources: [
                'RTW (2x)',
                'NEF',
                'Rettungshubschrauber',
                'Notarzt',
                'Rettungsassistent (4x)',
            ],
            priority: 'high',
        },
    },

    psnv: {
        key: 'psnv',
        name: 'PSNV (Psychosoziale Notfallversorgung)',
        description: 'DRK-Spezialgebiet für psychische Betreuung von Betroffenen und Einsatzkräften',
        einsatz: {
            name: 'PSNV Schulunfall',
            beschreibung: 'Psychosoziale Betreuung nach schwerem Schulunfall, 30 betroffene Schüler und Lehrer. Akute Belastungsreaktionen, Krisenintervention, Angehörigenbetreuung.',
        },
        metadata: {
            category: DRKEinsatzCategory.PSNV,
            estimatedPersonsAffected: 30,
            estimatedDurationHours: 6,
            requiredResources: [
                'PSNV-Team (3x)',
                'Betreuungsraum',
                'Kriseninterventionsmaterial',
                'Supervisorin',
                'Angehörigenbetreuung',
            ],
            priority: 'high',
        },
    },

    ausbildung: {
        key: 'ausbildung',
        name: 'Ausbildungs-Einsatz',
        description: 'Simulierter Einsatz für Ausbildungszwecke und Übungen',
        einsatz: {
            name: 'Ausbildung MANV-Übung',
            beschreibung: 'Großübung MANV-Szenario mit 15 Statisten als Verletzte. Übung der Sichtung, Behandlungsplatz-Aufbau und Zusammenarbeit mit anderen Hilfsorganisationen.',
        },
        metadata: {
            category: DRKEinsatzCategory.AUSBILDUNG,
            estimatedPersonsAffected: 15,
            estimatedDurationHours: 4,
            requiredResources: [
                'Übungsleitung',
                'Schminkmaterial',
                'Behandlungsplatz-Material',
                'Ausbilder (2x)',
                'Beobachter',
                'Statisten (15x)',
            ],
            priority: 'low',
        },
    },
};

/**
 * Hilfsfunktionen für Profile-Management.
 */
export class ProfileUtils {
    /**
     * Gibt alle verfügbaren Profile zurück.
     */
    static getAllProfiles(): SeedProfile[] {
        return Object.values(DRK_SEED_PROFILES);
    }

    /**
     * Sucht ein Profil nach Schlüssel.
     */
    static getProfileByKey(key: string): SeedProfile | undefined {
        return DRK_SEED_PROFILES[key];
    }

    /**
     * Gibt Profile nach Kategorie zurück.
     */
    static getProfilesByCategory(category: DRKEinsatzCategory): SeedProfile[] {
        return Object.values(DRK_SEED_PROFILES).filter(
            (profile) => profile.metadata.category === category,
        );
    }

    /**
     * Gibt Profile nach Priorität zurück.
     */
    static getProfilesByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): SeedProfile[] {
        return Object.values(DRK_SEED_PROFILES).filter(
            (profile) => profile.metadata.priority === priority,
        );
    }

    /**
     * Validiert, ob ein Profil-Schlüssel existiert.
     */
    static isValidProfileKey(key: string): boolean {
        return key in DRK_SEED_PROFILES;
    }

    /**
     * Gibt alle verfügbaren Profil-Schlüssel zurück.
     */
    static getAvailableKeys(): string[] {
        return Object.keys(DRK_SEED_PROFILES);
    }
} 