
/**
 * Entity-Klasse für eine Anlage (Anhang) zu einem ETB-Eintrag.
 * Diese Klasse dient als Wrapper für Prisma-generierte Typen und bietet Methoden zur Konvertierung
 * zwischen Entity-Objekten und Prisma-Datenmodellen.
 */
export class EtbAttachment {
    /**
     * Eindeutige ID der Anlage
     */
    id: string;

    /**
     * ID des ETB-Eintrags, zu dem diese Anlage gehört
     */
    etbEntryId: string;

    /**
     * Originaler Dateiname der hochgeladenen Datei
     */
    dateiname: string;

    /**
     * MIME-Typ der Datei (z.B. 'image/jpeg', 'application/pdf')
     */
    dateityp: string;

    /**
     * Speicherort der Datei im Dateisystem
     */
    speicherOrt: string;

    /**
     * Optionale Beschreibung der Anlage
     */
    beschreibung: string | null;

    /**
     * Zeitstempel der Erstellung der Anlage
     */
    createdAt: Date;

    /**
     * Zeitstempel der letzten Aktualisierung der Anlage
     */
    updatedAt: Date;

    /**
     * Erstellt eine neue EtbAttachment-Instanz
     * 
     * @param partial Teilweise oder vollständige Daten für die Anlage
     */
    constructor(partial: Partial<EtbAttachment>) {
        Object.assign(this, partial);
    }

    /**
     * Konvertiert diese Entity in ein Prisma-kompatibles Format für Datenbank-Operationen
     * 
     * @returns Ein Prisma-kompatibles Objekt dieser Anlage
     */
    toPrisma() {
        return {
            id: this.id,
            etbEntryId: this.etbEntryId,
            dateiname: this.dateiname,
            dateityp: this.dateityp,
            speicherOrt: this.speicherOrt,
            beschreibung: this.beschreibung,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Erstellt eine Entity aus einem Prisma-Objekt
     * 
     * @param prismaObj Das rohe Prisma-Objekt aus der Datenbank
     * @returns Eine neue EtbAttachment-Instanz mit den konvertierten Daten
     */
    static fromPrisma(prismaObj: any): EtbAttachment {
        return new EtbAttachment(prismaObj);
    }
} 