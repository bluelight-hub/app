import { Button, Empty, Tooltip } from 'antd';
import { format } from 'date-fns';
import React from 'react';
import { PiEmpty, PiSwap, PiTextStrikethrough } from 'react-icons/pi';
import { JournalEntryDto } from './ETBEntryForm';

// Mock für natoDateTime
const natoDateTime = 'dd.MM.yyyy HH:mm';

/**
 * Props für die ETBCardList-Komponente
 */
interface ETBCardListProps {
    /**
     * Die anzuzeigenden Einsatztagebuch-Einträge
     */
    entries: JournalEntryDto[];

    /**
     * Callback für das Bearbeiten eines Eintrags
     */
    onEditEntry?: (entry: JournalEntryDto) => void;

    /**
     * Callback für das Archivieren eines Eintrags
     */
    onArchiveEntry?: (nummer: number) => void;
}

/**
 * Karten-Liste für die Mobile-Ansicht des Einsatztagebuchs
 */
export const ETBCardList: React.FC<ETBCardListProps> = ({
    entries,
    onEditEntry,
    onArchiveEntry,
}) => {
    if (!entries.length) {
        return <Empty image={<PiEmpty size={48} />} description="Keine Einträge verfügbar" />;
    }

    return (
        <div className="flex flex-col gap-4">
            {entries.map((item) => {
                const timestampAsNato = format(item.timestamp, natoDateTime);
                return (
                    <div key={item.id} className="p-3 border rounded shadow-sm">
                        <div className="font-semibold flex justify-between mb-1 text-primary-600 dark:text-primary-400">
                            <span>#{item.nummer} | {item.type}</span>
                            <span>{timestampAsNato}</span>
                        </div>
                        <p className="text-sm">{item.content}</p>
                        <div className="text-xs mt-1 text-gray-500 flex items-center justify-between">
                            <span>Absender: {item.sender}</span>
                            <span>Empfänger: {item.receiver}</span>
                        </div>
                        {!item.archived && (
                            <div className="mt-2 flex gap-2 justify-end">
                                <Tooltip title="Eintrag überschreiben">
                                    <Button
                                        size="small"
                                        onClick={() => onEditEntry && onEditEntry(item)}
                                        icon={<PiSwap />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag streichen">
                                    <Button
                                        size="small"
                                        onClick={() => onArchiveEntry && onArchiveEntry(item.nummer)}
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