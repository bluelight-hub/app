import { CreateEinsatzDto } from '@bluelight-hub/shared/client/models';
import { Alert, Button, Card, Form, Input, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { PiPlus } from 'react-icons/pi';
import { useNavigate } from 'react-router';
import { useCreateEinsatz, useEinsatzOperations } from '../../../hooks/einsatz/useEinsatzQueries';

/**
 * Form-Werte für die Einsatz-Erstellung
 */
interface CreateEinsatzFormValues {
  name: string;
  beschreibung?: string;
}

/**
 * CreateInitialEinsatz - Komponente für die manuelle Erstellung eines initialen Einsatzes
 *
 * Diese Komponente wird angezeigt, wenn kein Einsatz existiert und ermöglicht es dem Benutzer,
 * manuell einen neuen Einsatz zu erstellen. Sie ist nur im Dev-Modus sichtbar.
 */
export const CreateInitialEinsatz: React.FC = () => {
  const [form] = Form.useForm<CreateEinsatzFormValues>();
  const navigate = useNavigate();
  const createEinsatzMutation = useCreateEinsatz();
  const { hasEinsatz, hasDataBeenFetched } = useEinsatzOperations();
  const [error, setError] = useState<string>('');

  // Leite zur Dashboard um, wenn bereits Einsätze existieren
  useEffect(() => {
    if (hasDataBeenFetched && hasEinsatz()) {
      navigate('/app', { replace: true });
    }
  }, [hasDataBeenFetched, hasEinsatz, navigate]);

  /**
   * Behandelt die Formular-Übermittlung
   */
  const handleSubmit = async (values: CreateEinsatzFormValues) => {
    setError('');

    try {
      const createEinsatzDto: CreateEinsatzDto = {
        name: values.name.trim(),
        beschreibung: values.beschreibung?.trim() || undefined,
      };

      await createEinsatzMutation.mutateAsync(createEinsatzDto);

      message.success('Einsatz wurde erfolgreich erstellt');
      navigate('/app/einsaetze');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Erstellen des Einsatzes';
      setError(errorMessage);
      message.error(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card
        title="Initialen Einsatz erstellen"
        className="w-full max-w-md shadow-lg"
        styles={{
          header: {
            textAlign: 'center',
            fontSize: '1.5rem',
          },
        }}
      >
        <Alert
          message="Dev-Modus"
          description="Dieser Schritt ist nur im Development-Modus sichtbar"
          type="info"
          showIcon
          className="mb-4"
        />

        {error && <Alert message="Fehler" description={error} type="error" showIcon className="mb-4" />}

        <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item
            label="Einsatz Name"
            name="name"
            rules={[
              { required: true, message: 'Bitte geben Sie einen Namen für den Einsatz ein' },
              { min: 2, message: 'Der Name muss mindestens 2 Zeichen lang sein' },
            ]}
          >
            <Input placeholder="z.B. Brandeinsatz Hauptstraße" maxLength={100} />
          </Form.Item>

          <Form.Item label="Beschreibung (optional)" name="beschreibung">
            <Input.TextArea placeholder="Zusätzliche Details zum Einsatz..." rows={3} maxLength={500} showCount />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={createEinsatzMutation.isPending}
              icon={<PiPlus />}
              className="w-full"
              size="large"
            >
              {createEinsatzMutation.isPending ? 'Wird erstellt...' : 'Einsatz erstellen'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateInitialEinsatz;
