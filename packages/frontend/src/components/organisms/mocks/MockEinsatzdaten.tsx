import { Button, Card, Col, DatePicker, Form, Input, message, Modal, Row, Select } from 'antd';
import { Dayjs } from 'dayjs';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatNatoDateTime, parseNatoDateTime } from '../../../utils/date';
import { PiExclamationMark } from 'react-icons/pi';

interface Einsatzdaten {
  einsatzstichwort: string;
  zeitpunkt: string; // NATO-Format: "230800jan23"
  einsatzleiter: string;
  einsatzort: string;
  rettungsmittel: string;
  bemerkungen?: string;
}

interface EinsatzdatenFormValues {
  einsatzstichwort: string;
  zeitpunkt: Dayjs; // Combined DateTime
  einsatzleiter: string;
  einsatzort: string;
  rettungsmittel: string;
  bemerkungen?: string;
}

// Beispielhafter Initialwert (Mock)
const initialEinsatz: Einsatzdaten = {
  einsatzstichwort: 'Verkehrsunfall',
  zeitpunkt: '150830jan25', // NATO-Format
  einsatzleiter: 'Max Mustermann',
  einsatzort: 'A5, Abfahrt Musterstadt',
  rettungsmittel: 'RTW 1',
  bemerkungen: 'Mehrere Pkw beteiligt',
};

const rettungsmittelOptions = ['RTW 1', 'RTW 2', 'NEF 2', 'KTW 1'];

// Modal.confirm entfernt - wird durch useState Modal ersetzt

const EinsatzdatenPage: React.FC = () => {
  const [form] = Form.useForm<EinsatzdatenFormValues>();
  const [einsatz, setEinsatz] = useState<Einsatzdaten>(initialEinsatz);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

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
      zeitpunkt: formatNatoDateTime(values.zeitpunkt) || '',
      einsatzleiter: values.einsatzleiter,
      einsatzort: values.einsatzort,
      rettungsmittel: values.rettungsmittel,
      bemerkungen: values.bemerkungen,
    };
    setEinsatz(updated);
    message.success('Einsatzdaten gespeichert');
  };

  /**
   * Einsatz schließen - zeigt Bestätigungsdialog
   */
  const handleCloseEinsatz = () => {
    setShowConfirmModal(true);
  };

  /**
   * Bestätigter Einsatz-Schließung
   */
  const handleConfirmCloseEinsatz = async () => {
    setLoading(true);
    try {
      // TODO: API-Call zum Schließen des Einsatzes implementieren
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulierter API-Call

      message.success('Einsatz wurde erfolgreich geschlossen');
      setShowConfirmModal(false);
      navigate('/app/einsaetze');
    } catch {
      message.error('Fehler beim Schließen des Einsatzes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Row justify="space-between" align="middle" className="mb-6">
        <Col>
          <h2 className="text-2xl font-semibold">Einsatzdaten</h2>
        </Col>
        <Col>
          <Button danger size="large" onClick={handleCloseEinsatz} loading={loading} icon={<PiExclamationMark />}>
            Einsatz schließen
          </Button>
        </Col>
      </Row>

      <Card>
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
            <DatePicker showTime placeholder="Datum und Uhrzeit wählen" />
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

      {/* Bestätigungs-Modal für Einsatz schließen */}
      <Modal
        title="Einsatz schließen"
        open={showConfirmModal}
        onOk={handleConfirmCloseEinsatz}
        onCancel={() => setShowConfirmModal(false)}
        okText="Ja, Einsatz schließen"
        cancelText="Abbrechen"
        okType="danger"
        confirmLoading={loading}
      >
        <div className="flex items-center gap-3 mb-4">
          <PiExclamationMark className="text-orange-500 text-xl" />
          <span>Möchten Sie diesen Einsatz wirklich schließen?</span>
        </div>
        <p className="text-gray-600 text-sm">
          Diese Aktion kann nicht rückgängig gemacht werden. Der Einsatz wird geschlossen und Sie werden zur
          Einsatzliste weitergeleitet.
        </p>
      </Modal>
    </div>
  );
};

export default EinsatzdatenPage;
