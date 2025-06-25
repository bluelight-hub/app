import { App, Button, Card, Form, Input } from 'antd';
import React, { useState } from 'react';
import { PiEnvelope, PiLockKey } from 'react-icons/pi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

interface LoginFormValues {
  email: string;
  password: string;
}

/**
 * LoginForm - Anmeldeformular
 *
 * Bietet ein einfaches Anmeldesystem mit E-Mail und Passwort
 */
const LoginForm: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  // Ziel nach erfolgreichem Login
  const from = location.state?.from || '/app';

  const onFinishLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        message.success('Erfolgreich angemeldet!');
        navigate(from);
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card
        title="Bluelight Hub Login"
        className="w-full max-w-md shadow-md"
        styles={{
          header: {
            textAlign: 'center',
            fontSize: '1.5rem',
          },
        }}
      >
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
      </Card>
    </div>
  );
};

export default LoginForm;
