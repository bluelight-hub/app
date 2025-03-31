import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EtbAttachment } from './etb-attachment.entity';
/**
 * Entity für Einträge im Einsatztagebuch.
 * Speichert alle relevanten Informationen zu einem Ereignis während eines Einsatzes.
 */
@Entity()
export class EtbEntry {
    /**
     * Eindeutige ID des Eintrags
     */
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Zeitpunkt der Erstellung des Eintrags
     */
    @Column({ type: 'datetime' })
    timestampErstellung: Date;

    /**
     * Zeitpunkt des tatsächlichen Ereignisses
     */
    @Column({ type: 'datetime' })
    timestampEreignis: Date;

    /**
     * ID des Autors, der den Eintrag erstellt hat
     */
    @Column()
    autorId: string;

    /**
     * Name des Autors (optional)
     */
    @Column({ nullable: true })
    autorName: string;

    /**
     * Rolle des Autors (optional)
     */
    @Column({ nullable: true })
    autorRolle: string;

    /**
     * Kategorie des Eintrags (z.B. "Meldung", "Befehl", "Patientenmaßnahme")
     */
    @Column()
    kategorie: string;

    /**
     * Optionaler Titel für den Eintrag
     */
    @Column({ nullable: true })
    titel: string;

    /**
     * Detaillierte Beschreibung des Ereignisses
     */
    @Column('text')
    beschreibung: string;

    /**
     * Referenz zur Einsatz-ID (optional)
     */
    @Column({ nullable: true })
    referenzEinsatzId: string;

    /**
     * Referenz zur Patienten-ID (optional)
     */
    @Column({ nullable: true })
    referenzPatientId: string;

    /**
     * Referenz zur Einsatzmittel-ID (optional)
     */
    @Column({ nullable: true })
    referenzEinsatzmittelId: string;

    /**
     * Quelle des Eintrags, falls automatisch generiert
     */
    @Column({ nullable: true })
    systemQuelle: string;

    /**
     * Aktuelle Version des Eintrags
     */
    @Column({ default: 1 })
    version: number;

    /**
     * Gibt an, ob der Eintrag abgeschlossen ist
     */
    @Column({ default: false })
    istAbgeschlossen: boolean;

    /**
     * Zeitpunkt des Abschlusses (optional)
     */
    @Column({ type: 'datetime', nullable: true })
    timestampAbschluss: Date;

    /**
     * ID der Person, die den Eintrag abgeschlossen hat (optional)
     */
    @Column({ nullable: true })
    abgeschlossenVon: string;

    /**
     * Liste aller Anlagen zu diesem Eintrag
     */
    @OneToMany(() => EtbAttachment, attachment => attachment.etbEntry)
    anlagen: EtbAttachment[];
} 