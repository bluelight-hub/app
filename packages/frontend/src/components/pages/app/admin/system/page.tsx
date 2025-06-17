import React, { useState } from 'react';
import { Card, Form, Input, Switch, Button, Select, Tabs, message, Alert, Space, Divider } from 'antd';
import { PiFloppyDisk, PiArrowClockwise, PiDatabase, PiShieldCheck, PiBell, PiEnvelope } from 'react-icons/pi';

const { TabPane } = Tabs;
const { Option } = Select;

const SystemPage: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSave = async (_values: any) => {
        setLoading(true);
        try {
            // TODO: API-Call zum Speichern der Einstellungen
            await new Promise(resolve => setTimeout(resolve, 1000));
            message.success('Einstellungen wurden gespeichert');
        } catch (_error) {
            message.error('Fehler beim Speichern der Einstellungen');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        message.info('Einstellungen wurden zurückgesetzt');
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Systemeinstellungen</h1>
                <p className="text-gray-600 mt-2">
                    Konfigurieren Sie globale Systemeinstellungen und Parameter
                </p>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{
                    siteName: 'Bluelight Hub',
                    siteUrl: 'https://bluelight-hub.local',
                    adminEmail: 'admin@bluelight-hub.local',
                    maintenanceMode: false,
                    autoBackup: true,
                    backupInterval: 'daily',
                    sessionTimeout: 30,
                    maxLoginAttempts: 5,
                    enableRegistration: false,
                    requireEmailVerification: true,
                    smtpHost: 'smtp.example.com',
                    smtpPort: 587,
                    smtpSecure: true,
                }}
            >
                <Tabs defaultActiveKey="general">
                    <TabPane tab="Allgemein" key="general">
                        <Card className="mb-4">
                            <Form.Item
                                name="siteName"
                                label="System Name"
                                rules={[{ required: true, message: 'Bitte System Namen eingeben' }]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="siteUrl"
                                label="System URL"
                                rules={[
                                    { required: true, message: 'Bitte System URL eingeben' },
                                    { type: 'url', message: 'Bitte gültige URL eingeben' }
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="adminEmail"
                                label="Administrator E-Mail"
                                rules={[
                                    { required: true, message: 'Bitte E-Mail eingeben' },
                                    { type: 'email', message: 'Bitte gültige E-Mail eingeben' }
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="maintenanceMode"
                                label="Wartungsmodus"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Card>
                    </TabPane>

                    <TabPane tab={<span><PiDatabase /> Datenbank</span>} key="database">
                        <Card className="mb-4">
                            <Alert
                                message="Datenbankstatus"
                                description="Verbindung zur Datenbank ist aktiv. Letzte Sicherung: vor 2 Stunden"
                                type="success"
                                showIcon
                                className="mb-4"
                            />
                            <Form.Item
                                name="autoBackup"
                                label="Automatische Sicherung"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                name="backupInterval"
                                label="Sicherungsintervall"
                                rules={[{ required: true, message: 'Bitte Intervall auswählen' }]}
                            >
                                <Select>
                                    <Option value="hourly">Stündlich</Option>
                                    <Option value="daily">Täglich</Option>
                                    <Option value="weekly">Wöchentlich</Option>
                                    <Option value="monthly">Monatlich</Option>
                                </Select>
                            </Form.Item>
                            <Space>
                                <Button icon={<PiDatabase />}>
                                    Manuelle Sicherung starten
                                </Button>
                                <Button icon={<PiArrowClockwise />}>
                                    Datenbank optimieren
                                </Button>
                            </Space>
                        </Card>
                    </TabPane>

                    <TabPane tab={<span><PiShieldCheck /> Sicherheit</span>} key="security">
                        <Card className="mb-4">
                            <Form.Item
                                name="sessionTimeout"
                                label="Session Timeout (Minuten)"
                                rules={[
                                    { required: true, message: 'Bitte Timeout eingeben' },
                                    { type: 'number', min: 5, max: 120, message: 'Wert muss zwischen 5 und 120 liegen' }
                                ]}
                            >
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item
                                name="maxLoginAttempts"
                                label="Maximale Anmeldeversuche"
                                rules={[
                                    { required: true, message: 'Bitte maximale Versuche eingeben' },
                                    { type: 'number', min: 3, max: 10, message: 'Wert muss zwischen 3 und 10 liegen' }
                                ]}
                            >
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item
                                name="enableRegistration"
                                label="Selbstregistrierung erlauben"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                name="requireEmailVerification"
                                label="E-Mail Verifizierung erforderlich"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            <Divider />
                            <Form.Item label="Zwei-Faktor-Authentifizierung">
                                <Switch defaultChecked />
                                <div className="text-sm text-gray-500 mt-2">
                                    Ermöglicht Benutzern die Aktivierung von 2FA
                                </div>
                            </Form.Item>
                        </Card>
                    </TabPane>

                    <TabPane tab={<span><PiEnvelope /> E-Mail</span>} key="email">
                        <Card className="mb-4">
                            <Alert
                                message="E-Mail Konfiguration"
                                description="Konfigurieren Sie die SMTP-Einstellungen für den E-Mail-Versand"
                                type="info"
                                showIcon
                                className="mb-4"
                            />
                            <Form.Item
                                name="smtpHost"
                                label="SMTP Server"
                                rules={[{ required: true, message: 'Bitte SMTP Server eingeben' }]}
                            >
                                <Input />
                            </Form.Item>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Form.Item
                                    name="smtpPort"
                                    label="SMTP Port"
                                    rules={[{ required: true, message: 'Bitte Port eingeben' }]}
                                >
                                    <Input type="number" />
                                </Form.Item>
                                <Form.Item
                                    name="smtpSecure"
                                    label="Verschlüsselung (TLS/SSL)"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Form.Item
                                    name="smtpUser"
                                    label="SMTP Benutzername"
                                >
                                    <Input />
                                </Form.Item>
                                <Form.Item
                                    name="smtpPassword"
                                    label="SMTP Passwort"
                                >
                                    <Input.Password />
                                </Form.Item>
                            </div>
                            <Button icon={<PiEnvelope />}>
                                Test-E-Mail senden
                            </Button>
                        </Card>
                    </TabPane>

                    <TabPane tab={<span><PiBell /> Benachrichtigungen</span>} key="notifications">
                        <Card className="mb-4">
                            <Form.Item label="E-Mail Benachrichtigungen">
                                <Space direction="vertical" className="w-full">
                                    <div className="flex justify-between items-center">
                                        <span>Neue Benutzerregistrierung</span>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Systemfehler</span>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Sicherheitswarnungen</span>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Backup-Status</span>
                                        <Switch />
                                    </div>
                                </Space>
                            </Form.Item>
                            <Divider />
                            <Form.Item
                                name="notificationEmail"
                                label="Benachrichtigungs-E-Mail"
                                rules={[{ type: 'email', message: 'Bitte gültige E-Mail eingeben' }]}
                            >
                                <Input placeholder="admin@example.com" />
                            </Form.Item>
                        </Card>
                    </TabPane>
                </Tabs>

                <div className="flex gap-2 mt-6">
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PiFloppyDisk />}
                        loading={loading}
                    >
                        Einstellungen speichern
                    </Button>
                    <Button
                        icon={<PiArrowClockwise />}
                        onClick={handleReset}
                    >
                        Zurücksetzen
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default SystemPage;