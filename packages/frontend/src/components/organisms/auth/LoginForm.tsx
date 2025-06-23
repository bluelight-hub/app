import { Button, Card, Form, Input, message } from 'antd';
import React, { useState } from 'react';
import { PiEnvelope, PiLockKey, PiShieldCheck } from 'react-icons/pi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

interface LoginFormValues {
  email: string;
  password: string;
}

interface MfaFormValues {
  code: string;
}

/**
 * LoginForm - Anmeldeformular mit MFA-Unterstützung
 *
 * Bietet ein zweistufiges Anmeldesystem:
 * 1. E-Mail und Passwort
 * 2. MFA-Code (falls aktiviert)
 */
const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState<string>('');
  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [mfaForm] = Form.useForm();

  // Ziel nach erfolgreichem Login
  const from = location.state?.from || '/app';

  const onFinishLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        message.success('Erfolgreich angemeldet!');
        navigate(from);
      } else if (result.requiresMfa && result.mfaChallengeId) {
        // MFA erforderlich
        setMfaChallengeId(result.mfaChallengeId);
        setShowMfa(true);
        message.info('Bitte geben Sie Ihren MFA-Code ein');
      } else {
        message.error('Falsche E-Mail oder Passwort!');
      }
    } catch (error) {
      message.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinishMfa = async (values: MfaFormValues) => {
    setLoading(true);
    try {
      const success = await completeMfaLogin(mfaChallengeId, values.code);

      if (success) {
        message.success('Erfolgreich angemeldet!');
        navigate(from);
      } else {
        message.error('Ungültiger MFA-Code!');
        mfaForm.resetFields();
      }
    } catch (error) {
      message.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowMfa(false);
    setMfaChallengeId('');
    form.resetFields();
    mfaForm.resetFields();
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card
        title={showMfa ? 'Zwei-Faktor-Authentifizierung' : 'Bluelight Hub Login'}
        className="w-full max-w-md shadow-md"
        styles={{
          header: {
            textAlign: 'center',
            fontSize: '1.5rem',
          },
        }}
      >
        {!showMfa ? (
          <Form
            form={form}
            name="login"
            initialValues={{ email: 'admin@bluelight-hub.com', password: 'admin123' }}
            onFinish={onFinishLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Bitte geben Sie Ihre E-Mail-Adresse ein!' },
                { type: 'email', message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein!' },
              ]}
            >
              <Input type="email" placeholder="E-Mail" prefix={<PiEnvelope size={18} />} />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: 'Bitte geben Sie Ihr Passwort ein!' }]}>
              <Input.Password placeholder="Passwort" prefix={<PiLockKey size={18} />} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                Anmelden
              </Button>
            </Form.Item>

            <div className="text-center text-gray-500 text-sm">
              <p>Demo Anmeldedaten:</p>
              <p>E-Mail: admin@bluelight-hub.com</p>
              <p>Passwort: admin123</p>
            </div>
          </Form>
        ) : (
          <Form form={mfaForm} name="mfa" onFinish={onFinishMfa} layout="vertical" size="large">
            <div className="mb-4 text-center">
              <PiShieldCheck size={48} className="mx-auto mb-2 text-blue-600" />
              <p className="text-gray-600">Bitte geben Sie den Code aus Ihrer Authenticator-App ein</p>
            </div>

            <Form.Item
              name="code"
              rules={[
                { required: true, message: 'Bitte geben Sie den MFA-Code ein!' },
                { pattern: /^\d{6}$/, message: 'Der Code muss 6 Ziffern lang sein!' },
              ]}
            >
              <Input
                placeholder="6-stelliger Code"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                prefix={<PiShieldCheck size={18} />}
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                Verifizieren
              </Button>
            </Form.Item>

            <Form.Item>
              <Button type="link" onClick={handleBackToLogin} className="w-full">
                Zurück zur Anmeldung
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default LoginForm;
