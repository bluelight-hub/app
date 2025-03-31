import { Button } from 'antd';
import React from 'react';
import { PiX } from 'react-icons/pi';

/**
 * Wrapper-Komponente für das Einsatztagebuch-Formular
 * Dient als Container für das Eingabeformular
 */
interface ETBFormWrapperProps {
    /**
     * Gibt an, ob das Eingabeformular sichtbar ist
     */
    inputVisible: boolean;

    /**
     * Funktion zum Schließen des Formulars
     */
    closeForm: () => void;

    /**
     * Kinder-Komponenten (Formular-Inhalt)
     */
    children?: React.ReactNode;
}

export const ETBFormWrapper: React.FC<ETBFormWrapperProps> = ({
    inputVisible,
    closeForm,
    children
}) => {
    if (!inputVisible) return null;

    return (
        <div className="mt-4 p-4 border border-gray-200 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900">Neuer Einsatztagebucheintrag</h3>
                <Button
                    type="text"
                    icon={<PiX />}
                    onClick={closeForm}
                    className="text-gray-500 hover:text-gray-700"
                />
            </div>
            <p className="text-sm text-gray-500 mb-4">Bitte füllen Sie alle Felder aus</p>
            {children}
        </div>
    );
}; 