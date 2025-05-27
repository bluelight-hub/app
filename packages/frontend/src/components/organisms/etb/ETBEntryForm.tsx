import { FahrzeugMock, useFahrzeuge } from '@/hooks/etb/useFahrzeuge';
import { EtbEntryDto } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { Button, Form, Input, Select } from 'antd';
import React from 'react';
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

const InputWrapper: React.FC<InputWrapperProps> = ({ label, name, rules, children }) => (
    <Form.Item
        label={label}
        name={name}
        rules={rules}
        className="mb-4"
    >
        {children}
    </Form.Item>
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
    const [antForm] = Form.useForm();

    return (
        <Form
            form={antForm}
            initialValues={form.initialValues}
            onFinish={form.onFinish}
            layout="vertical"
        >
            {children}
            <div className="mt-5">
                <Button type="primary" htmlType="submit" icon={buttons.submit.icon}>
                    {buttons.submit.children}
                </Button>
            </div>
        </Form>
    );
}

/**
 * Datenstruktur für das ETB-Eintragsformular
 * 
 * Diese Schnittstelle enthält die Daten, die im Formular bearbeitet werden.
 */
export interface ETBEntryFormData {
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
     * Eindeutige ID des Eintrags (optional)
     */
    id?: string;
}

/**
 * Props für das ETBEntryForm
 */
interface ETBEntryFormProps {
    /**
     * Entry to edit, if in edit mode
     */
    editingEntry?: EtbEntryDto | null;

    /**
     * Callback für das erfolgreiche Absenden des Formulars
     */
    onSubmitSuccess?: (data: Partial<ETBEntryFormData>) => void;

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
    const initialValues: Partial<ETBEntryFormData> = {

        sender: editingEntry?.autorName || '',
        receiver: editingEntry?.abgeschlossenVon || '',
        content: editingEntry?.inhalt || '',
    };

    /**
     * Submit-Handler für das Formular
     */
    const handleFormSubmit = async (values: ETBEntryFormData) => {
        if (onSubmitSuccess) {
            onSubmitSuccess(values);
        }
    };

    const { fahrzeuge } = useFahrzeuge();
    const fahrzeugListe = fahrzeuge.data.fahrzeugeImEinsatz || [];

    /**
     * Filterfunktion für die Fahrzeugauswahl
     */
    const filterOption = (input: string, option?: { label: string; value: string }) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

    return (
        <FormLayout<ETBEntryFormData>
            form={{
                initialValues,
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
                <Select
                    placeholder="z.B. ELRD, RTW-1"
                    className='w-full'
                    showSearch
                    filterOption={filterOption}
                    allowClear
                    options={fahrzeugListe.map((fahrzeug: FahrzeugMock) => ({
                        label: fahrzeug.fullOpta,
                        value: fahrzeug.fullOpta
                    }))}
                />
            </InputWrapper>

            <InputWrapper
                label="Empfänger"
                name="receiver"
                rules={[{ required: true, message: 'Es sollte ein Empfänger angegeben werden' }]}
            >
                <Select
                    placeholder="z.B. RTW-1, NEF-1"
                    className='w-full'
                    showSearch
                    filterOption={filterOption}
                    allowClear
                    options={fahrzeugListe.map((fahrzeug: FahrzeugMock) => ({
                        label: fahrzeug.fullOpta,
                        value: fahrzeug.fullOpta
                    }))}
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