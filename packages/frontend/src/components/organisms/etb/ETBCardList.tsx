import { formatNatoDateTime } from '@/utils/date';
import { logger } from '@/utils/logger';
import { EtbEntryDto } from '@bluelight-hub/shared/client';
import { Button, Empty, Tag, Tooltip } from 'antd';
import { PiEmpty, PiSwap, PiTextStrikethrough } from 'react-icons/pi';

/**
 * Internes Hilfs-Interface für Typannotationen
 * @private
 */
type ETBEntryFields = {
    nummer?: number;
    type?: string;
    timestamp?: Date;
    content?: string;
    sender?: string;
    receiver?: string;
    archived?: boolean;
    status?: 'aktiv' | 'ueberschrieben';
};

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
            {entries.map((item) => {
                // Sichere Typzugriffe mit optionalem Chaining und Fallbacks
                const entryWithFields = item as EtbEntryDto & ETBEntryFields;
                const entryId = item.id || `entry-${Math.random()}`;
                const entryNumber = entryWithFields.nummer ?? "-";
                const entryType = entryWithFields.type ?? "Standard";
                const entryContent = entryWithFields.content ?? "";
                const entrySender = entryWithFields.sender ?? "";
                const entryReceiver = entryWithFields.receiver ?? "";
                const isArchived = entryWithFields.archived ?? false;
                const isUeberschrieben = entryWithFields.status === 'ueberschrieben';

                // Datum formatieren, falls vorhanden
                let formattedDate = "-";
                if (entryWithFields.timestamp) {
                    try {
                        formattedDate = formatNatoDateTime(entryWithFields.timestamp) ?? "-";
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
                                        onClick={() => onUeberschreibeEntry && onUeberschreibeEntry(item)}
                                        icon={<PiSwap />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag bearbeiten">
                                    <Button
                                        size="small"
                                        onClick={() => onEditEntry && onEditEntry(item)}
                                        icon={<PiSwap />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag streichen">
                                    <Button
                                        size="small"
                                        onClick={() =>
                                            onArchiveEntry &&
                                            typeof entryNumber === 'number' &&
                                            onArchiveEntry(entryNumber)
                                        }
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