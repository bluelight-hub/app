import { EtbKategorie as PrismaEtbKategorie } from '../../../../prisma/generated/prisma/enums';

/**
 * Re-Export des Prisma-generierten EtbKategorie-Enums
 * 
 * Da wir vollständig zu Prisma migriert sind, verwenden wir den von Prisma
 * generierten Enum direkt, anstatt einen eigenen zu definieren.
 */
export const EtbKategorie = PrismaEtbKategorie;
export type EtbKategorie = typeof PrismaEtbKategorie[keyof typeof PrismaEtbKategorie];

/**
 * Benutzerfreundliche Anzeigebezeichnungen für die ETB-Kategorien
 */
export const EtbKategorieLabels: Record<EtbKategorie, string> = {
    [EtbKategorie.LAGEMELDUNG]: 'Lagemeldung',
    [EtbKategorie.MELDUNG]: 'Meldung',
    [EtbKategorie.ANFORDERUNG]: 'Anforderung',
    [EtbKategorie.KORREKTUR]: 'Korrektur',
    [EtbKategorie.AUTO_KRAEFTE]: 'Meldung (automatisiert) - Kräfte',
    [EtbKategorie.AUTO_PATIENTEN]: 'Meldung (automatisiert) - Patienten',
    [EtbKategorie.AUTO_TECHNISCH]: 'Meldung (automatisiert) - Technisch',
    [EtbKategorie.AUTO_SONSTIGES]: 'Meldung (automatisiert) - Sonstiges'
} 