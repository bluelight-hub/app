import { Button, Input } from 'antd';
import React, { useState } from 'react';
import { PiPlus, PiSwap, PiX } from 'react-icons/pi';

/**
 * Input-Wrapper-Komponente für Formular-Felder
 */
interface InputWrapperProps {
    /**
     * Label für das Eingabefeld
     */
    label: string;

    /**
     * Name des Eingabefelds
     */
    name: string;

    /**
     * Regeln für die Validierung
     */
    rules?: { required: boolean; message: string }[];

    /**
     * Kinder-Komponenten (Eingabefeld)
     */
    children: React.ReactNode;
}

const InputWrapper: React.FC<InputWrapperProps> = ({ label, children }) => (
    <div className="mb-4">
        <div className="block mb-1 font-medium text-gray-700">{label}</div>
        {children}
    </div>
);

/**
 * Form-Layout-Komponente für strukturierte Formulare
 */
interface FormLayoutProps<T extends object> {
    /**
     * Formular-Konfiguration
     */
    form: {
        /**
         * Anfangswerte für das Formular
         */
        initialValues?: Partial<T>;

        /**
         * Funktion, die beim Absenden des Formulars aufgerufen wird
         */
        onFinish: (values: T) => Promise<void> | void;
    };

    /**
     * Button-Konfiguration
     */
    buttons: {
        /**
         * Konfiguration für den Submit-Button
         */
        submit: {
            /**
             * Text auf dem Button
             */
            children: React.ReactNode;

            /**
             * Icon für den Button
             */
            icon?: React.ReactNode;
        };
    };

    /**
     * Kinder-Komponenten (Formular-Felder)
     */
    children: React.ReactNode;
}

function FormLayout<T extends object>({
    form,
    buttons,
    children,
}: FormLayoutProps<T>) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.onFinish(form.initialValues as T);
    };

    return (
        <form onSubmit={handleSubmit}>
            {children}
            <div className="mt-5">
                <Button type="primary" htmlType="submit" icon={buttons.submit.icon}>
                    {buttons.submit.children}
                </Button>
            </div>
        </form>
    );
}

/**
 * Journal-Eintrag-Datentransfer-Objekt
 */
export interface JournalEntryDto {
    /**
     * Eindeutige ID des Eintrags
     */
    id: string;

    /**
     * Nummer des Eintrags
     */
    nummer: number;

    /**
     * Typ des Eintrags
     */
    type: 'USER' | 'LAGEMELDUNG' | 'RESSOURCEN' | 'BETROFFENE_PATIENTEN' | 'KORREKTUR';

    /**
     * Zeitstempel des Eintrags
     */
    timestamp: Date;

    /**
     * Absender des Eintrags
     */
    sender: string;

    /**
     * Empfänger des Eintrags
     */
    receiver: string;

    /**
     * Inhalt des Eintrags
     */
    content: string;

    /**
     * Gibt an, ob der Eintrag archiviert ist
     */
    archived: boolean;
}

/**
 * Props für das ETBEntryForm
 */
interface ETBEntryFormProps {
    /**
     * Entry to edit, if in edit mode
     */
    editingEntry?: JournalEntryDto | null;

    /**
     * Callback für das erfolgreiche Absenden des Formulars
     */
    onSubmitSuccess?: (data: Partial<JournalEntryDto>) => void;

    /**
     * Callback für das Abbrechen des Formulars
     */
    onCancel?: () => void;

    /**
     * Gibt an, ob das Formular im Bearbeitungsmodus ist
     */
    isEditMode?: boolean;
}

/**
 * Formular zum Erstellen und Bearbeiten von ETB-Einträgen
 */
export const ETBEntryForm: React.FC<ETBEntryFormProps> = ({
    editingEntry,
    onSubmitSuccess,
    onCancel,
    isEditMode = false,
}) => {
    const [formData, setFormData] = useState<Partial<JournalEntryDto>>({
        sender: editingEntry?.sender || '',
        receiver: editingEntry?.receiver || '',
        content: editingEntry?.content || '',
    });

    /**
     * Aktualisiert die Formulardaten
     */
    const handleChange = (field: keyof JournalEntryDto, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    /**
     * Submit-Handler für das Formular
     */
    const handleFormSubmit = async () => {
        if (onSubmitSuccess) {
            onSubmitSuccess(formData);
        }
    };

    return (
        <FormLayout<JournalEntryDto>
            form={{
                initialValues: formData,
                onFinish: handleFormSubmit,
            }}
            buttons={{
                submit: {
                    children: isEditMode ? 'Eintrag ändern' : 'Eintrag erstellen',
                    icon: isEditMode ? <PiSwap /> : <PiPlus />,
                },
            }}
        >
            <InputWrapper
                label="Absender"
                name="sender"
                rules={[{ required: true, message: 'Es sollte ein Absender angegeben werden' }]}
            >
                <Input
                    placeholder="z.B. ELRD, RTW-1"
                    value={formData.sender}
                    onChange={(e) => handleChange('sender', e.target.value)}
                />
            </InputWrapper>

            <InputWrapper
                label="Empfänger"
                name="receiver"
                rules={[{ required: true, message: 'Es sollte ein Empfänger angegeben werden' }]}
            >
                <Input
                    placeholder="z.B. RTW-1, NEF-1"
                    value={formData.receiver}
                    onChange={(e) => handleChange('receiver', e.target.value)}
                />
            </InputWrapper>

            <InputWrapper
                label="Notiz"
                name="content"
                rules={[{ required: true, message: 'Der Inhalt darf nicht leer sein' }]}
            >
                <Input.TextArea
                    rows={5}
                    placeholder="Geben Sie hier den Inhalt des Einsatztagebucheintrags ein"
                    value={formData.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                />
            </InputWrapper>

            {onCancel && (
                <div className="mt-2">
                    <Button onClick={onCancel} icon={<PiX />}>
                        Abbrechen
                    </Button>
                </div>
            )}
        </FormLayout>
    );
}; 