import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Badge, Modal, Input, Select, Timeline, message, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PiWarning,
  PiShieldCheck,
  PiMagnifyingGlass,
  PiArrowsClockwise,
  PiBell,
  PiCheckCircle,
  PiXCircle,
  PiClock,
  PiUser,
  PiGlobe,
} from 'react-icons/pi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi, SecurityAlert } from '@/api/security';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { io, Socket } from 'socket.io-client';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Alerts View - Echtzeit-Sicherheitswarnungen
 */
const AlertsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<string>('unresolved');
  const [searchText, setSearchText] = useState('');
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [resolution, setResolution] = useState('');

  // Query für Alerts
  const {
    data: alerts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['security-alerts', filterSeverity, filterResolved],
    queryFn: () =>
      securityApi.getRecentAlerts({
        severity: filterSeverity !== 'all' ? filterSeverity : undefined,
      }),
    refetchInterval: 30000, // Aktualisierung alle 30 Sekunden
  });

  // WebSocket-Verbindung für Echtzeit-Updates
  useEffect(() => {
    const newSocket = io(process.env.VITE_API_URL || 'http://localhost:3000', {
      path: '/ws',
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected for security alerts');
      newSocket.emit('subscribe', 'security-alerts');
    });

    newSocket.on('security-alert', (alert: SecurityAlert) => {
      queryClient.setQueryData(['security-alerts', filterSeverity, filterResolved], (old: SecurityAlert[] = []) => {
        // Füge neuen Alert am Anfang hinzu
        return [alert, ...old.filter((a) => a.id !== alert.id)];
      });

      // Zeige Notification für kritische Alerts
      if (alert.severity === 'critical') {
        message.error({
          content: `Kritischer Alert: ${alert.message}`,
          duration: 5,
          icon: <PiWarning />,
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient, filterSeverity, filterResolved]);

  // Mutation für Alert-Auflösung
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) => securityApi.resolveAlert(id, resolution),
    onSuccess: () => {
      message.success('Alert wurde erfolgreich aufgelöst');
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      setResolutionModalOpen(false);
      setResolution('');
      setSelectedAlert(null);
    },
    onError: () => {
      message.error('Fehler beim Auflösen des Alerts');
    },
  });

  // Filter Alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      searchText === '' ||
      alert.message.toLowerCase().includes(searchText.toLowerCase()) ||
      alert.ipAddress.includes(searchText) ||
      (alert.userId && alert.userId.includes(searchText));

    const matchesResolved =
      filterResolved === 'all' ||
      (filterResolved === 'resolved' && alert.resolved) ||
      (filterResolved === 'unresolved' && !alert.resolved);

    return matchesSearch && matchesResolved;
  });

  // Severity Badge
  const getSeverityBadge = (severity: string) => {
    const config = {
      critical: { color: 'red', icon: <PiXCircle /> },
      high: { color: 'orange', icon: <PiWarning /> },
      medium: { color: 'gold', icon: <PiBell /> },
      low: { color: 'blue', icon: <PiShieldCheck /> },
    }[severity] || { color: 'default', icon: null };

    return <Badge status={config.color as 'success' | 'warning' | 'error' | 'default'} text={severity.toUpperCase()} />;
  };

  // Alert Type Tag
  const getAlertTypeTag = (type: string) => {
    const config = {
      LOGIN_FAILURE: { color: 'red', text: 'Login-Fehler' },
      SUSPICIOUS_ACTIVITY: { color: 'orange', text: 'Verdächtige Aktivität' },
      IP_BLOCKED: { color: 'purple', text: 'IP blockiert' },
      SESSION_HIJACKING: { color: 'magenta', text: 'Session-Hijacking' },
      BRUTE_FORCE: { color: 'volcano', text: 'Brute-Force' },
    }[type] || { color: 'default', text: type };

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Tabellen-Spalten
  const columns: ColumnsType<SecurityAlert> = [
    {
      title: 'Schweregrad',
      key: 'severity',
      width: 120,
      render: (_, record) => getSeverityBadge(record.severity),
    },
    {
      title: 'Typ',
      key: 'type',
      render: (_, record) => getAlertTypeTag(record.type),
    },
    {
      title: 'Nachricht',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Details',
      key: 'details',
      render: (_, record) => (
        <Space size="small" direction="vertical">
          {record.userId && (
            <Space>
              <PiUser className="text-gray-400" />
              <span className="text-sm">User: {record.userId}</span>
            </Space>
          )}
          <Space>
            <PiGlobe className="text-gray-400" />
            <span className="text-sm">{record.ipAddress}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Zeitpunkt',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => (
        <Space>
          <PiClock />
          {format(new Date(date), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) =>
        record.resolved ? (
          <Tag color="green" icon={<PiCheckCircle />}>
            Aufgelöst
          </Tag>
        ) : (
          <Tag color="red">Offen</Tag>
        ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelectedAlert(record)}>
            Details
          </Button>
          {!record.resolved && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setSelectedAlert(record);
                setResolutionModalOpen(true);
              }}
            >
              Auflösen
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Statistik-Karten
  const unresolvedCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Sicherheitswarnungen</h1>
        <p className="text-gray-600">Überwachen und reagieren Sie auf Sicherheitsereignisse in Echtzeit</p>
      </div>

      {/* Statistik-Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">{unresolvedCount}</div>
            <div className="text-gray-600">Offene Alerts</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">{criticalCount}</div>
            <div className="text-gray-600">Kritische Alerts</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">{alerts.length}</div>
            <div className="text-gray-600">Gesamt heute</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">{socket?.connected ? 'Online' : 'Offline'}</div>
            <div className="text-gray-600">WebSocket Status</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-4 justify-between">
          <Space>
            <Search
              placeholder="Suche in Alerts..."
              allowClear
              onSearch={setSearchText}
              style={{ width: 300 }}
              prefix={<PiMagnifyingGlass />}
            />
            <Select value={filterSeverity} onChange={setFilterSeverity} style={{ width: 150 }}>
              <Option value="all">Alle Schweregrade</Option>
              <Option value="critical">Kritisch</Option>
              <Option value="high">Hoch</Option>
              <Option value="medium">Mittel</Option>
              <Option value="low">Niedrig</Option>
            </Select>
            <Select value={filterResolved} onChange={setFilterResolved} style={{ width: 150 }}>
              <Option value="all">Alle Status</Option>
              <Option value="unresolved">Nur offene</Option>
              <Option value="resolved">Nur aufgelöste</Option>
            </Select>
          </Space>
          <Button icon={<PiArrowsClockwise />} onClick={() => refetch()}>
            Aktualisieren
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredAlerts}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} Alerts gesamt`,
          }}
          rowClassName={(record) => (!record.resolved && record.severity === 'critical' ? 'bg-red-50' : '')}
        />
      </Card>

      {/* Alert Details Modal */}
      <Modal
        title="Alert Details"
        open={!!selectedAlert && !resolutionModalOpen}
        onCancel={() => setSelectedAlert(null)}
        footer={null}
        width={600}
      >
        {selectedAlert && (
          <div className="space-y-4">
            <Alert
              message={getAlertTypeTag(selectedAlert.type)}
              description={selectedAlert.message}
              type={selectedAlert.severity === 'critical' ? 'error' : 'warning'}
              showIcon
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Alert ID</p>
                <p className="font-mono">{selectedAlert.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Schweregrad</p>
                <p>{getSeverityBadge(selectedAlert.severity)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IP-Adresse</p>
                <p className="font-mono">{selectedAlert.ipAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Benutzer ID</p>
                <p className="font-mono">{selectedAlert.userId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zeitpunkt</p>
                <p>{format(new Date(selectedAlert.timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: de })}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p>
                  {selectedAlert.resolved ? (
                    <Tag color="green" icon={<PiCheckCircle />}>
                      Aufgelöst
                    </Tag>
                  ) : (
                    <Tag color="red">Offen</Tag>
                  )}
                </p>
              </div>
            </div>

            {/* Alert Timeline */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Ereignisverlauf</h4>
              <Timeline>
                <Timeline.Item color="red">
                  Alert ausgelöst - {format(new Date(selectedAlert.timestamp), 'HH:mm:ss', { locale: de })}
                </Timeline.Item>
                {selectedAlert.resolved && (
                  <Timeline.Item color="green">
                    Alert aufgelöst - {format(new Date(), 'HH:mm:ss', { locale: de })}
                  </Timeline.Item>
                )}
              </Timeline>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolution Modal */}
      <Modal
        title="Alert auflösen"
        open={resolutionModalOpen}
        onCancel={() => {
          setResolutionModalOpen(false);
          setResolution('');
        }}
        onOk={() => {
          if (selectedAlert && resolution) {
            resolveMutation.mutate({ id: selectedAlert.id, resolution });
          }
        }}
        confirmLoading={resolveMutation.isPending}
      >
        <div className="space-y-4">
          <Alert message="Bitte geben Sie eine Begründung für die Auflösung des Alerts an." type="info" showIcon />
          <TextArea
            rows={4}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Beschreiben Sie die durchgeführten Maßnahmen..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default AlertsView;
