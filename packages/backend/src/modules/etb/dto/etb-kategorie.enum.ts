import { EtbKategorie as PrismaEtbKategorie } from '../../../../prisma/generated/prisma/enums';

/**
 * Re-Export des Prisma-generierten EtbKategorie-Enums
 *
 * Definiert die verfügbaren Kategorien für ETB-Einträge.
 * Diese Kategorien ermöglichen eine strukturierte Klassifizierung
 * von Einträgen im elektronischen Einsatztagebuch.
 *
 * @const
 */
export const EtbKategorie = PrismaEtbKategorie;

/**
 * TypeScript-Typ für ETB-Kategorien
 * @typedef {string} EtbKategorie
 */
export type EtbKategorie = (typeof PrismaEtbKategorie)[keyof typeof PrismaEtbKategorie];

/**
 * Benutzerfreundliche Anzeigebezeichnungen für die ETB-Kategorien
 *
 * Mapping von technischen Enum-Werten zu lesbaren deutschen Bezeichnungen
 * für die Anzeige in der Benutzeroberfläche.
 *
 * @constant {Record<EtbKategorie, string>} EtbKategorieLabels
 */
export const EtbKategorieLabels: Record<EtbKategorie, string> = {
  [EtbKategorie.LAGEMELDUNG]: 'Lagemeldung',
  [EtbKategorie.MELDUNG]: 'Meldung',
  [EtbKategorie.ANFORDERUNG]: 'Anforderung',
  [EtbKategorie.KORREKTUR]: 'Korrektur',
  [EtbKategorie.AUTO_KRAEFTE]: 'Meldung (automatisiert) - Kräfte',
  [EtbKategorie.AUTO_PATIENTEN]: 'Meldung (automatisiert) - Patienten',
  [EtbKategorie.AUTO_TECHNISCH]: 'Meldung (automatisiert) - Technisch',
  [EtbKategorie.AUTO_SONSTIGES]: 'Meldung (automatisiert) - Sonstiges',
};
