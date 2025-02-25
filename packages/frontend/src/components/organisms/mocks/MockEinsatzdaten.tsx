import { Button, Card, DatePicker, Form, Input, message, Select } from 'antd';
import { Dayjs } from 'dayjs';
import React, { useState } from 'react';
import { formatNatoDateTime, parseNatoDateTime } from '../../../utils/date';

interface Einsatzdaten {
    einsatzstichwort: string;
    zeitpunkt: string;   // NATO-Format: "230800jan23"
    einsatzleiter: string;
    einsatzort: string;
    rettungsmittel: string;
    bemerkungen?: string;
}

interface EinsatzdatenFormValues {
    einsatzstichwort: string;
    zeitpunkt: Dayjs;   // Combined DateTime
    einsatzleiter: string;
    einsatzort: string;
    rettungsmittel: string;
    bemerkungen?: string;
}

// Beispielhafter Initialwert (Mock)
const initialEinsatz: Einsatzdaten = {
    einsatzstichwort: 'Verkehrsunfall',
    zeitpunkt: '150830jan25',  // NATO-Format
    einsatzleiter: 'Max Mustermann',
    einsatzort: 'A5, Abfahrt Musterstadt',
    rettungsmittel: 'RTW 1',
    bemerkungen: 'Mehrere Pkw beteiligt',
};

const rettungsmittelOptions = ['RTW 1', 'RTW 2', 'NEF 2', 'KTW 1'];

const EinsatzdatenPage: React.FC = () => {
    const [form] = Form.useForm<EinsatzdatenFormValues>();
    const [einsatz, setEinsatz] = useState<Einsatzdaten>(initialEinsatz);

    React.useEffect(() => {
        // Initialisiere das Formular mit den Anfangswerten
        form.setFieldsValue({
            einsatzstichwort: einsatz.einsatzstichwort,
            zeitpunkt: parseNatoDateTime(einsatz.zeitpunkt),
            einsatzleiter: einsatz.einsatzleiter,
            einsatzort: einsatz.einsatzort,
            rettungsmittel: einsatz.rettungsmittel,
            bemerkungen: einsatz.bemerkungen,
        });
    }, [form, einsatz]);

    /**
     * Änderungen aus dem Formular speichern
     */
    const handleSave = (values: EinsatzdatenFormValues) => {
        const updated: Einsatzdaten = {
            ...einsatz,
            einsatzstichwort: values.einsatzstichwort,
            zeitpunkt: formatNatoDateTime(values.zeitpunkt, 'NATO') || '',
            einsatzleiter: values.einsatzleiter,
            einsatzort: values.einsatzort,
            rettungsmittel: values.rettungsmittel,
            bemerkungen: values.bemerkungen,
        };
        setEinsatz(updated);
        message.success('Einsatzdaten gespeichert');
    };

    return (
        <Card title="Einsatzdaten">
            <Form layout="vertical" form={form} onFinish={handleSave}>
                <Form.Item
                    label="Einsatzstichwort"
                    name="einsatzstichwort"
                    rules={[{ required: true, message: 'Bitte Einsatzstichwort eingeben' }]}
                >
                    <Input placeholder="z.B. Brand, VU, MANV" />
                </Form.Item>

                <Form.Item
                    label="Datum und Uhrzeit"
                    name="zeitpunkt"
                    rules={[{ required: true, message: 'Bitte ein Datum und eine Uhrzeit wählen' }]}
                >
                    <DatePicker
                        showTime
                        placeholder="Datum und Uhrzeit wählen"
                    />
                </Form.Item>

                <Form.Item
                    label="Einsatzleiter"
                    name="einsatzleiter"
                    rules={[{ required: true, message: 'Bitte einen Namen eingeben' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Einsatzort"
                    name="einsatzort"
                    rules={[{ required: true, message: 'Bitte Einsatzort eingeben' }]}
                >
                    <Input placeholder="z.B. A5, Ausfahrt Musterstadt" />
                </Form.Item>

                <Form.Item
                    label="Rettungsmittel"
                    name="rettungsmittel"
                    rules={[{ required: true, message: 'Bitte ein Rettungsmittel auswählen' }]}
                >
                    <Select options={rettungsmittelOptions.map((item) => ({ label: item, value: item }))} />
                </Form.Item>

                <Form.Item label="Bemerkungen" name="bemerkungen">
                    <Input.TextArea rows={3} />
                </Form.Item>

                <Button type="primary" htmlType="submit">
                    Speichern
                </Button>
            </Form>
        </Card>
    );
};

export default EinsatzdatenPage;