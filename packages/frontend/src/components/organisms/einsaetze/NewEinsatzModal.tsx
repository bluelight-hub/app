import { CreateEinsatzDto } from '@bluelight-hub/shared/client/models';
import { Form, Input, Modal, notification } from 'antd';
import React, { useEffect } from 'react';
import { PiPlus } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { useEinsatzContext } from '../../../contexts/EinsatzContext';
import { useCreateEinsatz } from '../../../hooks/einsatz/useEinsatzQueries';
import { logger } from '../../../utils/logger';

interface NewEinsatzModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CreateEinsatzFormValues {
  name: string;
  beschreibung?: string;
}

export const NewEinsatzModal: React.FC<NewEinsatzModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm<CreateEinsatzFormValues>();
  const navigate = useNavigate();
  const { selectEinsatz } = useEinsatzContext();
  const createEinsatzMutation = useCreateEinsatz();

  // Form zurücksetzen wenn Modal geschlossen wird
  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async (values: CreateEinsatzFormValues) => {
    try {
      const createEinsatzDto: CreateEinsatzDto = {
        name: values.name.trim(),
        beschreibung: values.beschreibung?.trim() || undefined,
      };

      logger.debug('Creating new Einsatz via modal', { name: createEinsatzDto.name });

      const newEinsatz = await createEinsatzMutation.mutateAsync(createEinsatzDto);

      // Success feedback
      notification.success({
        message: 'Einsatz erstellt',
        description: `Der Einsatz "${createEinsatzDto.name}" wurde erfolgreich erstellt und geöffnet.`,
        duration: 4,
        placement: 'topRight',
      });

      logger.info('Einsatz successfully created via modal', { name: createEinsatzDto.name, id: newEinsatz.id });

      // Wähle den neuen Einsatz aus und navigiere zur Einsatzdaten-Seite
      selectEinsatz(newEinsatz);
      navigate('/app/einsatzdaten');

      // Schließe Modal und rufe Success-Callback auf
      onClose();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Erstellen des Einsatzes';

      logger.error('Failed to create Einsatz via modal', { error: errorMessage });

      notification.error({
        message: 'Fehler beim Erstellen',
        description: errorMessage,
        duration: 6,
        placement: 'topRight',
      });
    }
  };

  const handleCancel = () => {
    logger.debug('NewEinsatzModal cancelled by user');
    onClose();
  };

  // Keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  return (
    <Modal
      title="Neuer Einsatz"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={520}
      destroyOnClose
      maskClosable={!createEinsatzMutation.isPending}
      keyboard={!createEinsatzMutation.isPending}
      onKeyDown={handleKeyDown}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        size="large"
        disabled={createEinsatzMutation.isPending}
      >
        <Form.Item
          label="Einsatz Name"
          name="name"
          rules={[
            {
              required: true,
              message: 'Bitte geben Sie einen Namen für den Einsatz ein',
            },
            {
              min: 2,
              message: 'Der Name muss mindestens 2 Zeichen lang sein',
            },
            {
              max: 100,
              message: 'Der Name darf maximal 100 Zeichen lang sein',
            },
            {
              validator: (_, value) => {
                if (value && value.trim().length === 0) {
                  return Promise.reject('Der Name darf nicht nur aus Leerzeichen bestehen');
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input placeholder="z.B. Brandeinsatz Hauptstraße" maxLength={100} showCount autoFocus />
        </Form.Item>

        <Form.Item
          label="Beschreibung (optional)"
          name="beschreibung"
          rules={[
            {
              max: 500,
              message: 'Die Beschreibung darf maximal 500 Zeichen lang sein',
            },
          ]}
        >
          <Input.TextArea placeholder="Zusätzliche Details zum Einsatz..." rows={3} maxLength={500} showCount />
        </Form.Item>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            disabled={createEinsatzMutation.isPending}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Abbrechen
          </button>

          <button
            type="submit"
            disabled={createEinsatzMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createEinsatzMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Wird erstellt...
              </>
            ) : (
              <>
                <PiPlus className="w-4 h-4" />
                Einsatz erstellen
              </>
            )}
          </button>
        </div>
      </Form>
    </Modal>
  );
};

export default NewEinsatzModal;
