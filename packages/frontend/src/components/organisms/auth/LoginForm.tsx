import { App, Button, Card, Form, Input, Progress } from 'antd';
import React, { useEffect, useState } from 'react';
import { PiCloudSlash, PiEnvelope, PiLock, PiLockKey, PiWarning } from 'react-icons/pi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useBackendHealth } from '@/hooks/useBackendHealth';

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
  const { isHealthy, isLoading: healthLoading, checkHealth } = useBackendHealth();

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

    // Check backend health before attempting login
    if (!isHealthy) {
      message.error({
        content: 'Backend ist nicht erreichbar. Bitte versuchen Sie es später erneut.',
        duration: 5,
        icon: <PiCloudSlash className="text-red-500" />,
      });
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

          if (remaining === 0 && result.error?.includes('IP')) {
            // IP rate limit case
            message.error({
              content: result.error,
              duration: 5,
              icon: <PiWarning className="text-red-500" />,
            });
          } else if (remaining <= 2 && remaining > 0) {
            message.warning({
              content: `Falsches Passwort! Sie haben noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}, bevor Ihr Account gesperrt wird.`,
              duration: 5,
              icon: <PiWarning className="text-yellow-500" />,
            });
          } else {
            message.error('Falsche E-Mail oder Passwort!');
          }
        } else {
          // Check if it's an IP rate limit error message
          if (result.error?.includes('Too many attempts from this IP')) {
            message.error({
              content: result.error,
              duration: 5,
              icon: <PiWarning className="text-red-500" />,
            });
          } else {
            message.error(result.error || 'Falsche E-Mail oder Passwort!');
          }
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
        {/* Backend Health Status */}
        {!isHealthy && !healthLoading && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <PiCloudSlash className="text-red-500 text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">Verbindung zum Server unterbrochen</h3>
                <p className="text-sm text-red-700 mb-3">
                  Der Server ist momentan nicht erreichbar. Bitte überprüfen Sie Ihre Internetverbindung oder versuchen
                  Sie es später erneut.
                </p>
                <Button
                  type="default"
                  size="small"
                  onClick={checkHealth}
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 hover:text-red-800"
                  loading={healthLoading}
                >
                  Verbindung testen
                </Button>
              </div>
            </div>
          </div>
        )}

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
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading || healthLoading}
              disabled={isLocked || !isHealthy}
            >
              {isLocked ? `Gesperrt (${lockoutTimer}s)` : !isHealthy ? 'Server nicht erreichbar' : 'Anmelden'}
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
