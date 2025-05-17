import { EtbEntryStatus as PrismaEtbEntryStatus, EtbKategorie as PrismaEtbKategorie } from '../../../../prisma/generated/prisma/enums';
import { EtbKategorie } from '../dto/etb-kategorie.enum';
import { EtbAttachment } from './etb-attachment.entity';

/**
 * Entity-Klasse für einen ETB-Eintrag (Einsatztagebuch-Eintrag).
 * Diese Klasse dient als Wrapper für Prisma-generierte Typen und bietet Methoden zur Konvertierung
 * zwischen Entity-Objekten und Prisma-Datenmodellen.
 */
export class EtbEntry {
    /**
     * Eindeutige ID des ETB-Eintrags
     */
    id: string;

    /**
     * Fortlaufende Nummer des Eintrags (automatisch generiert)
     */
    laufendeNummer: number;

    /**
     * Zeitstempel der Erstellung des Eintrags
     */
    timestampErstellung: Date;

    /**
     * Zeitstempel des beschriebenen Ereignisses
     */
    timestampEreignis: Date;

    /**
     * ID des Autors/der Autorin des Eintrags
     */
    autorId: string;

    /**
     * Name des Autors/der Autorin des Eintrags
     */
    autorName: string | null;

    /**
     * Rolle oder Position des Autors/der Autorin
     */
    autorRolle: string | null;

    /**
     * Kategorie des Eintrags (z.B. MELDUNG, ANWEISUNG)
     */
    kategorie: EtbKategorie;

    /**
     * Hauptinhalt des ETB-Eintrags
     */
    inhalt: string;

    /**
     * Optionale Referenz auf eine Einsatz-ID
     */
    referenzEinsatzId: string | null;

    /**
     * Optionale Referenz auf eine Patienten-ID
     */
    referenzPatientId: string | null;

    /**
     * Optionale Referenz auf eine Einsatzmittel-ID
     */
    referenzEinsatzmittelId: string | null;

    /**
     * Quelle für automatisch generierte Einträge
     */
    systemQuelle: string | null;

    /**
     * Versionsnummer des Eintrags
     */
    version: number;

    /**
     * Aktueller Status des Eintrags (AKTIV oder UEBERSCHRIEBEN)
     */
    status: EtbEntryStatus;

    /**
     * Flag, das anzeigt, ob der Eintrag abgeschlossen ist
     */
    istAbgeschlossen: boolean;

    /**
     * Zeitstempel des Abschlusses des Eintrags (falls abgeschlossen)
     */
    timestampAbschluss: Date | null;

    /**
     * ID des Benutzers, der den Eintrag abgeschlossen hat
     */
    abgeschlossenVon: string | null;

    /**
     * Referenz auf den überschreibenden Eintrag (falls vorhanden)
     */
    ueberschriebenDurch: EtbEntry | null;

    /**
     * ID des überschreibenden Eintrags
     */
    ueberschriebenDurchId: string | null;

    /**
     * Liste der Einträge, die von diesem Eintrag überschrieben wurden
     */
    ueberschriebeneEintraege: EtbEntry[];

    /**
     * Zeitstempel der Überschreibung (falls überschrieben)
     */
    timestampUeberschrieben: Date | null;

    /**
     * ID des Benutzers, der den Eintrag überschrieben hat
     */
    ueberschriebenVon: string | null;

    /**
     * Liste von Dateianlagen zu diesem Eintrag
     */
    anlagen: EtbAttachment[];

    /**
     * Absender des Eintrags (optional, für spezielle Kommunikationswege)
     */
    sender: string | null;

    /**
     * Empfänger des Eintrags (optional, für spezielle Kommunikationswege)
     */
    receiver: string | null;

    /**
     * Erstellt eine neue EtbEntry-Instanz
     * 
     * @param partial Teilweise oder vollständige Daten für den ETB-Eintrag
     */
    constructor(partial: Partial<EtbEntry>) {
        Object.assign(this, partial);
    }

    /**
     * Konvertiert diese Entity in ein Prisma-kompatibles Format für Datenbank-Operationen
     * 
     * @returns Ein Prisma-kompatibles Objekt dieses ETB-Eintrags
     */
    toPrisma() {
        return {
            id: this.id,
            laufendeNummer: this.laufendeNummer,
            timestampErstellung: this.timestampErstellung,
            timestampEreignis: this.timestampEreignis,
            autorId: this.autorId,
            autorName: this.autorName,
            autorRolle: this.autorRolle,
            kategorie: this.kategorie as unknown as PrismaEtbKategorie,
            inhalt: this.inhalt,
            referenzEinsatzId: this.referenzEinsatzId,
            referenzPatientId: this.referenzPatientId,
            referenzEinsatzmittelId: this.referenzEinsatzmittelId,
            systemQuelle: this.systemQuelle,
            version: this.version,
            status: this.status as unknown as PrismaEtbEntryStatus,
            istAbgeschlossen: this.istAbgeschlossen,
            timestampAbschluss: this.timestampAbschluss,
            abgeschlossenVon: this.abgeschlossenVon,
            ueberschriebenDurchId: this.ueberschriebenDurchId,
            timestampUeberschrieben: this.timestampUeberschrieben,
            ueberschriebenVon: this.ueberschriebenVon,
            sender: this.sender,
            receiver: this.receiver
        };
    }

    /**
     * Erstellt eine Entity aus einem Prisma-Objekt
     * 
     * @param prismaObj Das rohe Prisma-Objekt aus der Datenbank
     * @returns Eine neue EtbEntry-Instanz mit den konvertierten Daten
     */
    static fromPrisma(prismaObj: any): EtbEntry {
        return new EtbEntry({
            ...prismaObj,
            kategorie: prismaObj.kategorie as unknown as EtbKategorie,
            status: prismaObj.status as EtbEntryStatus,
            ueberschriebenDurch: prismaObj.ueberschriebenDurch ? EtbEntry.fromPrisma(prismaObj.ueberschriebenDurch) : null,
            ueberschriebeneEintraege: prismaObj.ueberschriebeneEintraege ?
                prismaObj.ueberschriebeneEintraege.map((entry: any) => EtbEntry.fromPrisma(entry)) : [],
            anlagen: prismaObj.anlagen ?
                prismaObj.anlagen.map((anlage: any) => EtbAttachment.fromPrisma(anlage)) : []
        });
    }
}

/**
 * Re-export für vereinfachten Import. Definiert die EtbEntryStatus-Werte.
 * Erlaubt die Verwendung der Status-Werte ohne direkte Prisma-Importe.
 */
export const EtbEntryStatus = {
    /**
     * Status für aktive, gültige ETB-Einträge
     */
    AKTIV: 'AKTIV',

    /**
     * Status für ETB-Einträge, die durch neuere Versionen überschrieben wurden
     */
    UEBERSCHRIEBEN: 'UEBERSCHRIEBEN'
} as const;

/**
 * Typdefinition für den Status eines ETB-Eintrags
 */
export type EtbEntryStatus = keyof typeof EtbEntryStatus;
