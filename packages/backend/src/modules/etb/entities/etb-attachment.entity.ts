import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EtbEntry } from './etb-entry.entity';

/**
 * Entity für Anlagen zu Einsatztagebuch-Einträgen.
 * Speichert Metadaten zu hochgeladenen Dateien.
 */
@Entity()
export class EtbAttachment {
    /**
     * Eindeutige ID der Anlage
     */
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Referenz zum zugehörigen ETB-Eintrag
     */
    @Column()
    etbEntryId: string;

    /**
     * Der zugehörige ETB-Eintrag
     */
    @ManyToOne(() => EtbEntry, etbEntry => etbEntry.anlagen)
    @JoinColumn({ name: 'etbEntryId' })
    etbEntry: EtbEntry;

    /**
     * Originaler Dateiname
     */
    @Column()
    dateiname: string;

    /**
     * MIME-Typ der Datei
     */
    @Column()
    dateityp: string;

    /**
     * Speicherort der Datei im Dateisystem oder in einem Speicherdienst
     */
    @Column()
    speicherOrt: string;

    /**
     * Optionale Beschreibung der Anlage
     */
    @Column('text', { nullable: true })
    beschreibung: string;
} 