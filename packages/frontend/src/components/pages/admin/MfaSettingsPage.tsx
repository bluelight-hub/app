import React, { useEffect, useState } from 'react';
import { Card, Button, Space, Typography, Spin, message, Alert, Modal, Input, Form, QRCode, Tag } from 'antd';
import { PiShieldCheck, PiKey, PiTrash, PiPlus, PiWarning } from 'react-icons/pi';
import { api } from '../../../api';
import { MfaMethodsResponseDto } from '@bluelight-hub/shared/client';

const { Title, Text, Paragraph } = Typography;

/**
 * MfaSettingsPage - Verwaltung der Zwei-Faktor-Authentifizierung
 *
 * Ermöglicht Benutzern:
 * - TOTP (Authenticator App) einrichten/entfernen
 * - WebAuthn/Passkeys hinzufügen/entfernen
 * - Backup-Codes anzeigen
 */
const MfaSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [mfaMethods, setMfaMethods] = useState<MfaMethodsResponseDto | null>(null);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qrCode: string; backupCodes: string[] } | null>(
    null,
  );
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [removingTotp, setRemovingTotp] = useState(false);
  const [form] = Form.useForm();

  const loadMfaMethods = async () => {
    try {
      setLoading(true);
      const response = await api.mfa.mfaControllerGetMfaMethodsV1();
      setMfaMethods(response);
    } catch (error) {
      console.error('Failed to load MFA methods:', error);
      message.error('Fehler beim Laden der MFA-Methoden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMfaMethods();
  }, []);

  const handleSetupTotp = async () => {
    try {
      const response = await api.mfa.mfaControllerSetupTotpV1();
      setTotpSetupData({
        secret: response.secret,
        qrCode: response.qrCode,
        backupCodes: response.backupCodes || [],
      });
      setSetupModalVisible(true);
    } catch (error) {
      console.error('Failed to setup TOTP:', error);
      message.error('Fehler beim Einrichten der Authenticator-App');
    }
  };

  const handleVerifyTotp = async (values: { code: string }) => {
    try {
      setVerifyingTotp(true);
      await api.mfa.mfaControllerVerifyTotpV1({
        verifyTotpDto: { code: values.code },
      });
      message.success('Authenticator-App erfolgreich eingerichtet!');
      setSetupModalVisible(false);
      setTotpSetupData(null);
      form.resetFields();
      await loadMfaMethods();
    } catch (error) {
      console.error('Failed to verify TOTP:', error);
      message.error('Ungültiger Code. Bitte versuchen Sie es erneut.');
    } finally {
      setVerifyingTotp(false);
    }
  };

  const handleRemoveTotp = async () => {
    Modal.confirm({
      title: 'Authenticator-App entfernen?',
      content: 'Sind Sie sicher, dass Sie die Authenticator-App als MFA-Methode entfernen möchten?',
      okText: 'Entfernen',
      cancelText: 'Abbrechen',
      okType: 'danger',
      icon: <PiWarning />,
      onOk: async () => {
        try {
          setRemovingTotp(true);
          await api.mfa.mfaControllerRemoveTotpV1();
          message.success('Authenticator-App wurde entfernt');
          await loadMfaMethods();
        } catch (error) {
          console.error('Failed to remove TOTP:', error);
          message.error('Fehler beim Entfernen der Authenticator-App');
        } finally {
          setRemovingTotp(false);
        }
      },
    });
  };

  const handleSetupWebAuthn = async () => {
    try {
      // Start WebAuthn registration
      const startResponse = await api.mfa.mfaControllerStartWebAuthnRegistrationV1({
        webAuthnRegistrationStartDto: {},
      });

      // Convert the challenge for the browser API
      const publicKeyOptions = JSON.parse(startResponse as any);

      // Create credential using browser API
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      if (credential && credential.type === 'public-key') {
        // Complete registration
        await api.mfa.mfaControllerCompleteWebAuthnRegistrationV1({
          webAuthnRegistrationCompleteDto: {
            response: credential as any,
          },
        });

        message.success('Passkey erfolgreich hinzugefügt!');
        await loadMfaMethods();
      }
    } catch (error) {
      console.error('Failed to setup WebAuthn:', error);
      message.error('Fehler beim Hinzufügen des Passkeys');
    }
  };

  const handleRemoveWebAuthn = async (credentialId: string) => {
    Modal.confirm({
      title: 'Passkey entfernen?',
      content: 'Sind Sie sicher, dass Sie diesen Passkey entfernen möchten?',
      okText: 'Entfernen',
      cancelText: 'Abbrechen',
      okType: 'danger',
      icon: <PiWarning />,
      onOk: async () => {
        try {
          await api.mfa.mfaControllerRemoveWebAuthnCredentialV1({
            removeWebAuthnCredentialDto: { credentialId },
          });
          message.success('Passkey wurde entfernt');
          await loadMfaMethods();
        } catch (error) {
          console.error('Failed to remove WebAuthn:', error);
          message.error('Fehler beim Entfernen des Passkeys');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Title level={2}>
        <PiShieldCheck className="inline mr-2" />
        Zwei-Faktor-Authentifizierung
      </Title>

      <Alert
        message="Schützen Sie Ihr Konto"
        description="Die Zwei-Faktor-Authentifizierung bietet zusätzlichen Schutz für Ihr Konto. Sie benötigen neben Ihrem Passwort einen zweiten Faktor zur Anmeldung."
        type="info"
        showIcon
        className="mb-6"
      />

      {/* TOTP Section */}
      <Card title="Authenticator-App" className="mb-6">
        {mfaMethods?.totp?.enabled ? (
          <div>
            <Alert message="Authenticator-App ist aktiviert" type="success" showIcon className="mb-4" />
            <Space direction="vertical" className="w-full">
              <Text>Eingerichtet am: {new Date(mfaMethods.totp.createdAt!).toLocaleDateString('de-DE')}</Text>
              <Button danger icon={<PiTrash />} onClick={handleRemoveTotp} loading={removingTotp}>
                Authenticator-App entfernen
              </Button>
            </Space>
          </div>
        ) : (
          <div>
            <Paragraph>
              Verwenden Sie eine Authenticator-App wie Google Authenticator oder Authy, um Einmal-Codes zu generieren.
            </Paragraph>
            <Button type="primary" icon={<PiPlus />} onClick={handleSetupTotp}>
              Authenticator-App einrichten
            </Button>
          </div>
        )}
      </Card>

      {/* WebAuthn Section */}
      <Card title="Passkeys / Sicherheitsschlüssel" className="mb-6">
        <Paragraph>
          Verwenden Sie biometrische Daten oder Sicherheitsschlüssel für eine schnelle und sichere Anmeldung.
        </Paragraph>

        {mfaMethods?.webauthn && mfaMethods.webauthn.length > 0 ? (
          <div className="mb-4">
            <Title level={5}>Registrierte Passkeys:</Title>
            {mfaMethods.webauthn.map((cred) => (
              <div key={cred.id} className="flex items-center justify-between p-3 bg-gray-50 rounded mb-2">
                <Space>
                  <PiKey />
                  <Text>{cred.name || 'Unbenannter Passkey'}</Text>
                  <Tag color="blue">Hinzugefügt: {new Date(cred.createdAt!).toLocaleDateString('de-DE')}</Tag>
                </Space>
                <Button size="small" danger icon={<PiTrash />} onClick={() => handleRemoveWebAuthn(cred.id)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Alert message="Keine Passkeys registriert" type="warning" className="mb-4" />
        )}

        <Button icon={<PiPlus />} onClick={handleSetupWebAuthn}>
          Passkey hinzufügen
        </Button>
      </Card>

      {/* TOTP Setup Modal */}
      <Modal
        title="Authenticator-App einrichten"
        open={setupModalVisible}
        onCancel={() => {
          setSetupModalVisible(false);
          setTotpSetupData(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        {totpSetupData && (
          <div>
            <Alert
              message="Wichtig"
              description="Speichern Sie die Backup-Codes an einem sicheren Ort. Sie können diese verwenden, falls Sie keinen Zugriff auf Ihre Authenticator-App haben."
              type="warning"
              showIcon
              className="mb-4"
            />

            <div className="text-center mb-6">
              <Title level={5}>1. Scannen Sie den QR-Code mit Ihrer Authenticator-App</Title>
              <div className="flex justify-center mb-4">
                <QRCode value={totpSetupData.qrCode} size={200} />
              </div>
              <Text type="secondary">Oder geben Sie diesen Code manuell ein:</Text>
              <div className="mt-2">
                <Text code copyable>
                  {totpSetupData.secret}
                </Text>
              </div>
            </div>

            <div className="mb-6">
              <Title level={5}>2. Backup-Codes</Title>
              <Alert message="Speichern Sie diese Codes sicher!" type="warning" className="mb-2" />
              <div className="grid grid-cols-2 gap-2">
                {totpSetupData.backupCodes.map((code, index) => (
                  <Text key={index} code copyable>
                    {code}
                  </Text>
                ))}
              </div>
            </div>

            <div>
              <Title level={5}>3. Verifizieren Sie die Einrichtung</Title>
              <Form form={form} onFinish={handleVerifyTotp}>
                <Form.Item
                  name="code"
                  rules={[
                    { required: true, message: 'Bitte geben Sie den Code ein' },
                    { pattern: /^\d{6}$/, message: 'Der Code muss 6 Ziffern lang sein' },
                  ]}
                >
                  <Input placeholder="6-stelliger Code aus der App" maxLength={6} autoComplete="one-time-code" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={verifyingTotp} block>
                    Einrichtung abschließen
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MfaSettingsPage;
