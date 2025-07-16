import { App, Button, Card, Form, Input, Progress } from 'antd';
import React, { useState, useEffect } from 'react';
import { PiEnvelope, PiLockKey, PiWarning, PiLock } from 'react-icons/pi';
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
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [initialLockoutDuration, setInitialLockoutDuration] = useState<number>(0);
  const [isLocked, setIsLocked] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  // Ziel nach erfolgreichem Login
  const from = location.state?.from || '/app';

  // Effect für Lockout-Timer
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setInitialLockoutDuration(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  const onFinishLogin = async (values: LoginFormValues) => {
    if (isLocked) {
      return;
    }

    setLoading(true);
    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        message.success('Erfolgreich angemeldet!');
        navigate(from);
      } else {
        // Handle different error cases
        if (result.errorCode === 'ACCOUNT_LOCKED' && result.errorDetails?.lockedUntil) {
          const lockedUntil = new Date(result.errorDetails.lockedUntil);
          const remainingSeconds = Math.max(0, Math.floor((lockedUntil.getTime() - Date.now()) / 1000));

          setIsLocked(true);
          setLockoutTimer(remainingSeconds);
          setInitialLockoutDuration(remainingSeconds);

          message.error({
            content: `Ihr Account wurde aufgrund zu vieler fehlgeschlagener Anmeldeversuche gesperrt. Bitte warten Sie ${remainingSeconds} Sekunden.`,
            duration: 5,
            icon: <PiLock className="text-red-500" />,
          });
        } else if (result.errorCode === 'INVALID_CREDENTIALS' && result.errorDetails?.remainingAttempts !== undefined) {
          const remaining = result.errorDetails.remainingAttempts;

          if (remaining <= 2 && remaining > 0) {
            message.warning({
              content: `Falsches Passwort! Sie haben noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}, bevor Ihr Account gesperrt wird.`,
              duration: 5,
              icon: <PiWarning className="text-yellow-500" />,
            });
          } else {
            message.error('Falsche E-Mail oder Passwort!');
          }
        } else {
          message.error(result.error || 'Falsche E-Mail oder Passwort!');
        }
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
        className="w-full max-w-md shadow-md relative"
        styles={{
          header: {
            textAlign: 'center',
            fontSize: '1.5rem',
          },
        }}
      >
        {/* Lockout-Overlay */}
        {isLocked && lockoutTimer > 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-95 z-10 flex flex-col items-center justify-center rounded-lg">
            <PiLock size={48} className="text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account gesperrt</h3>
            <p className="text-center text-gray-600 mb-4 px-6">
              Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie.
            </p>
            <div className="text-2xl font-bold text-red-500 mb-4">{lockoutTimer} Sekunden</div>
            <Progress
              percent={
                initialLockoutDuration > 0
                  ? ((initialLockoutDuration - lockoutTimer) / initialLockoutDuration) * 100
                  : 0
              }
              showInfo={false}
              strokeColor="#ef4444"
              className="w-3/4"
            />
          </div>
        )}

        <Form
          form={form}
          name="login"
          initialValues={{ email: 'admin@bluelight-hub.com', password: 'admin123' }}
          onFinish={onFinishLogin}
          layout="vertical"
          size="large"
          disabled={isLocked}
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
            <Button type="primary" htmlType="submit" className="w-full" loading={loading} disabled={isLocked}>
              {isLocked ? `Gesperrt (${lockoutTimer}s)` : 'Anmelden'}
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
