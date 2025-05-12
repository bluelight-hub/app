/**
 * Enum für die Kategorien eines Einsatztagebuch-Eintrags
 */
export enum EtbKategorie {
    LAGEMELDUNG = 'Lagemeldung',
    MELDUNG = 'Meldung',
    ANFORDERUNG = 'Anforderung',
    KORREKTUR = 'Korrektur',
    AUTO_KRAEFTE = 'Meldung (automatisiert) - Kräfte',
    AUTO_PATIENTEN = 'Meldung (automatisiert) - Patienten',
    AUTO_TECHNISCH = 'Meldung (automatisiert) - Technisch',
    AUTO_SONSTIGES = 'Meldung (automatisiert) - Sonstiges'
} 