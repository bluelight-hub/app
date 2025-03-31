import { Button } from 'antd';
import React from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * Header-Komponente für das Einsatztagebuch
 * Enthält den Titel und einen Button zum Erstellen neuer Einträge
 */
interface ETBHeaderProps {
    /**
     * Gibt an, ob das Eingabeformular sichtbar ist
     */
    inputVisible: boolean;

    /**
     * Funktion zum Umschalten der Sichtbarkeit des Eingabeformulars
     */
    setInputVisible: (visible: boolean) => void;
}

export const ETBHeader: React.FC<ETBHeaderProps> = ({
    inputVisible,
    setInputVisible
}) => {
    return (
        <div className="flex items-center justify-between pb-5 border-b border-gray-200">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Einsatztagebuch
            </h1>
            <div className="mt-3 sm:mt-0 sm:ml-4">
                <Button
                    type="primary"
                    onClick={() => setInputVisible(!inputVisible)}
                    icon={<PiPlus />}
                >
                    Neuer Eintrag
                </Button>
            </div>
        </div>
    );
}; 