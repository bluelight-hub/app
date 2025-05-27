/**
 * Mock für Prisma-generierte Enums für Tests
 * Diese Datei reduziert die Abhängigkeit von Prisma-generierten Dateien in Tests
 */

export const EtbKategorie = {
    LAGEMELDUNG: 'LAGEMELDUNG',
    MELDUNG: 'MELDUNG',
    ANFORDERUNG: 'ANFORDERUNG',
    KORREKTUR: 'KORREKTUR',
    AUTO_KRAEFTE: 'AUTO_KRAEFTE',
    AUTO_PATIENTEN: 'AUTO_PATIENTEN',
    AUTO_TECHNISCH: 'AUTO_TECHNISCH',
    AUTO_SONSTIGES: 'AUTO_SONSTIGES'
} as const;

export type EtbKategorie = (typeof EtbKategorie)[keyof typeof EtbKategorie];

export const EtbEntryStatus = {
    AKTIV: 'AKTIV',
    UEBERSCHRIEBEN: 'UEBERSCHRIEBEN'
} as const;

export type EtbEntryStatus = (typeof EtbEntryStatus)[keyof typeof EtbEntryStatus]; 