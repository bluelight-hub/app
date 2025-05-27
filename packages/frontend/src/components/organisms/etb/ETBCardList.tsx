import { formatNatoDateTime } from '@/utils/date';
import { logger } from '@/utils/logger';
import { EtbEntryDto, EtbEntryDtoStatusEnum, EtbKategorie } from '@bluelight-hub/shared/client';
import { Button, Empty, Tag, Tooltip } from 'antd';
import { PiEmpty, PiSwap, PiTextStrikethrough } from 'react-icons/pi';

/**
 * Props für die ETBCardList-Komponente
 */
interface ETBCardListProps {
    /**
     * Die anzuzeigenden Einsatztagebuch-Einträge
     */
    entries: EtbEntryDto[];

    /**
     * Callback für das Bearbeiten eines Eintrags
     */
    onEditEntry?: (entry: EtbEntryDto) => void;

    /**
     * Callback für das Archivieren eines Eintrags
     */
    onArchiveEntry?: (nummer: number) => void;

    /**
     * Callback für das Überschreiben eines Eintrags
     */
    onUeberschreibeEntry?: (entry: EtbEntryDto) => void;
}

/**
 * Hilfsfunktion um EtbKategorie in lesbaren Text zu konvertieren
 */
const getKategorieDisplayName = (kategorie: EtbKategorie): string => {
    const kategorieMap: Record<EtbKategorie, string> = {
        [EtbKategorie.Lagemeldung]: 'Lagemeldung',
        [EtbKategorie.Meldung]: 'Meldung',
        [EtbKategorie.Anforderung]: 'Anforderung',
        [EtbKategorie.Korrektur]: 'Korrektur',
        [EtbKategorie.AutoKraefte]: 'Auto Kräfte',
        [EtbKategorie.AutoPatienten]: 'Auto Patienten',
        [EtbKategorie.AutoTechnisch]: 'Auto Technisch',
        [EtbKategorie.AutoSonstiges]: 'Auto Sonstiges',
    };
    return kategorieMap[kategorie] || kategorie;
};

/**
 * Karten-Liste für die Mobile-Ansicht des Einsatztagebuchs
 */
export const ETBCardList: React.FC<ETBCardListProps> = ({
    entries,
    onEditEntry,
    onArchiveEntry,
    onUeberschreibeEntry,
}) => {
    if (!entries.length) {
        return <Empty image={<PiEmpty size={48} />} description="Keine Einträge verfügbar" />;
    }

    return (
        <div className="flex flex-col gap-4">
            {entries.map((entry) => {
                // Verwende die echten Properties aus EtbEntryDto
                const entryId = entry.id;
                const entryNumber = entry.laufendeNummer;
                const entryType = getKategorieDisplayName(entry.kategorie);
                const entryContent = entry.inhalt;
                const entrySender = entry.sender || "Unbekannt";
                const entryReceiver = entry.receiver;
                const isArchived = entry.istAbgeschlossen;
                const isUeberschrieben = entry.status === EtbEntryDtoStatusEnum.Ueberschrieben;

                // Datum formatieren - verwende timestampEreignis für das eigentliche Ereignis
                let formattedDate = "-";
                if (entry.timestampEreignis) {
                    try {
                        formattedDate = formatNatoDateTime(entry.timestampEreignis) ?? "-";
                    } catch (error) {
                        logger.error("Fehler beim Formatieren des Datums:", error);
                    }
                }

                return (
                    <div
                        key={entryId}
                        className={`p-3 border rounded shadow-sm ${isUeberschrieben ? 'opacity-60' : ''}`}
                    >
                        <div className="font-semibold flex justify-between mb-1 text-primary-600 dark:text-primary-400">
                            <span className="flex items-center">
                                #{entryNumber} | {entryType}
                                {isUeberschrieben && (
                                    <Tag color="warning" className="ml-2">Überschrieben</Tag>
                                )}
                            </span>
                            <span>{formattedDate}</span>
                        </div>
                        <p className={`text-sm ${isUeberschrieben ? 'line-through' : ''}`}>{entryContent}</p>
                        <div className="text-xs mt-1 text-gray-500 flex items-center justify-between">
                            <span>Absender: {entrySender}</span>
                            <span>Empfänger: {entryReceiver}</span>
                        </div>
                        {!isArchived && !isUeberschrieben && (
                            <div className="mt-2 flex gap-2 justify-end">
                                <Tooltip title="Eintrag überschreiben">
                                    <Button
                                        size="small"
                                        data-testid="ueberschreiben-button"
                                        onClick={() => onUeberschreibeEntry && onUeberschreibeEntry(entry)}
                                        icon={<PiSwap />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag bearbeiten">
                                    <Button
                                        size="small"
                                        data-testid="edit-button"
                                        onClick={() => onEditEntry && onEditEntry(entry)}
                                        icon={<PiSwap />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag streichen">
                                    <Button
                                        size="small"
                                        data-testid="archive-button"
                                        onClick={() => onArchiveEntry && onArchiveEntry(entryNumber)}
                                        danger
                                        icon={<PiTextStrikethrough />}
                                    />
                                </Tooltip>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
