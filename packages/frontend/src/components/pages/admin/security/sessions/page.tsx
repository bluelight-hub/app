import React, { useState } from 'react';
import { Button, Card, Input, message, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PiArrowsClockwise,
  PiClock,
  PiDesktop,
  PiDeviceMobile,
  PiDownload,
  PiGlobe,
  PiMagnifyingGlass,
  PiTrash,
  PiWarning,
} from 'react-icons/pi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { securityApi, Session } from '@/api/security';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const { Search } = Input;
const { Option } = Select;

/**
 * Sessions Table - Verwaltung aktiver Benutzersitzungen
 */
const SessionsTable: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspicious'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Query für Sessions
  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['sessions', filterStatus],
    queryFn: () => securityApi.getSessions({ isActive: filterStatus === 'active' }),
    refetchInterval: 30000, // Aktualisierung alle 30 Sekunden
  });

  // Mutation für Session-Revokierung
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => securityApi.revokeSession(id, reason),
    onSuccess: () => {
      message.success('Session wurde erfolgreich beendet');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSelectedRowKeys([]);
    },
    onError: () => {
      message.error('Fehler beim Beenden der Session');
    },
  });

  // Mutation für Bulk-Revokierung
  const bulkRevokeMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: React.Key[]; reason: string }) => {
      await Promise.all(ids.map((id) => securityApi.revokeSession(id as string, reason)));
    },
    onSuccess: () => {
      message.success(`${selectedRowKeys.length} Sessions wurden beendet`);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSelectedRowKeys([]);
    },
    onError: () => {
      message.error('Fehler beim Beenden der Sessions');
    },
  });

  // Filter Sessions
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      searchText === '' ||
      session.username.toLowerCase().includes(searchText.toLowerCase()) ||
      session.email.toLowerCase().includes(searchText.toLowerCase()) ||
      session.ipAddress?.includes(searchText);

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && session.isOnline) ||
      (filterStatus === 'suspicious' && session.riskScore > 50);

    return matchesSearch && matchesFilter;
  });

  // Tabellen-Spalten
  const columns: ColumnsType<Session> = [
    {
      title: 'Benutzer',
      key: 'user',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.username}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'IP-Adresse',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip, record) => (
        <Space>
          <span>{ip}</span>
          {record.location && (
            <Tooltip title={record.location}>
              <PiGlobe className="text-gray-400" />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Gerät',
      key: 'device',
      render: (_, record) => (
        <Space>
          {record.deviceType === 'mobile' ? <PiDeviceMobile /> : <PiDesktop />}
          <span>
            {record.browser} {record.browserVersion}
          </span>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.isRevoked) {
          return <Tag color="red">Beendet</Tag>;
        }
        if (record.isOnline) {
          return <Tag color="green">Online</Tag>;
        }
        return <Tag color="orange">Offline</Tag>;
      },
    },
    {
      title: 'Risiko',
      dataIndex: 'riskScore',
      key: 'riskScore',
      render: (score) => {
        let color = 'green';
        if (score > 70) color = 'red';
        else if (score > 40) color = 'orange';

        return <Tag color={color}>{score > 70 ? 'Hoch' : score > 40 ? 'Mittel' : 'Niedrig'}</Tag>;
      },
    },
    {
      title: 'Letzte Aktivität',
      dataIndex: 'lastActivityAt',
      key: 'lastActivityAt',
      render: (date) => (
        <Tooltip title={format(new Date(date), 'dd.MM.yyyy HH:mm:ss', { locale: de })}>
          <Space>
            <PiClock />
            {format(new Date(date as string), 'HH:mm', { locale: de })}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelectedSession(record)}>
            Details
          </Button>
          {!record.isRevoked && (
            <Popconfirm
              title="Session beenden?"
              description="Möchten Sie diese Session wirklich beenden?"
              onConfirm={() => revokeMutation.mutate({ id: record.id, reason: 'Admin action' })}
              okText="Ja"
              cancelText="Nein"
            >
              <Button size="small" danger icon={<PiTrash />}>
                Beenden
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const handleBulkRevoke = () => {
    Modal.confirm({
      title: 'Mehrere Sessions beenden',
      content: `Möchten Sie wirklich ${selectedRowKeys.length} Sessions beenden?`,
      okText: 'Beenden',
      cancelText: 'Abbrechen',
      okButtonProps: { danger: true },
      onOk: () => {
        bulkRevokeMutation.mutate({ ids: selectedRowKeys, reason: 'Bulk admin action' });
      },
    });
  };

  const exportSessions = () => {
    const csvContent = [
      ['Benutzer', 'E-Mail', 'IP-Adresse', 'Gerät', 'Browser', 'Status', 'Risiko', 'Letzte Aktivität'].join(','),
      ...filteredSessions.map((s) =>
        [
          s.username,
          s.email,
          s.ipAddress,
          s.deviceType,
          `${s.browser} ${s.browserVersion}`,
          s.isRevoked ? 'Beendet' : s.isOnline ? 'Online' : 'Offline',
          s.riskScore,
          format(new Date(s.lastActivityAt), 'dd.MM.yyyy HH:mm:ss', { locale: de }),
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Sessions exportiert');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Aktive Sessions</h1>
        <p className="text-gray-600">
          Verwalten Sie aktive Benutzersitzungen und überwachen Sie verdächtige Aktivitäten
        </p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-4 justify-between">
          <Space>
            <Search
              placeholder="Suche nach Benutzer, E-Mail oder IP"
              allowClear
              onSearch={setSearchText}
              style={{ width: 300 }}
              prefix={<PiMagnifyingGlass />}
            />
            <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 150 }}>
              <Option value="all">Alle Sessions</Option>
              <Option value="active">Nur aktive</Option>
              <Option value="suspicious">Verdächtige</Option>
            </Select>
          </Space>
          <Space>
            <Button icon={<PiArrowsClockwise />} onClick={() => refetch()}>
              Aktualisieren
            </Button>
            <Button icon={<PiDownload />} onClick={exportSessions}>
              Export CSV
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button danger icon={<PiTrash />} onClick={handleBulkRevoke} loading={bulkRevokeMutation.isPending}>
                {selectedRowKeys.length} Sessions beenden
              </Button>
            )}
          </Space>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredSessions}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} Sessions gesamt`,
          }}
        />
      </Card>

      {/* Session Details Modal */}
      <Modal
        title="Session Details"
        open={!!selectedSession}
        onCancel={() => setSelectedSession(null)}
        footer={null}
        width={600}
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Benutzer</p>
                <p className="font-medium">{selectedSession.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">E-Mail</p>
                <p className="font-medium">{selectedSession.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IP-Adresse</p>
                <p className="font-medium">{selectedSession.ipAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Standort</p>
                <p className="font-medium">{selectedSession.location || 'Unbekannt'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gerät</p>
                <p className="font-medium">
                  {selectedSession.os} {selectedSession.osVersion}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Browser</p>
                <p className="font-medium">
                  {selectedSession.browser} {selectedSession.browserVersion}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Login-Methode</p>
                <p className="font-medium">{selectedSession.loginMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktivitäten</p>
                <p className="font-medium">{selectedSession.activityCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Session Start</p>
                <p className="font-medium">
                  {format(new Date(selectedSession.createdAt), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Läuft ab</p>
                <p className="font-medium">
                  {format(new Date(selectedSession.expiresAt), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                </p>
              </div>
            </div>

            {selectedSession.suspiciousFlags.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Verdächtige Flags</p>
                <Space wrap>
                  {selectedSession.suspiciousFlags.map((flag) => (
                    <Tag key={flag} color="orange" icon={<PiWarning />}>
                      {flag}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">User Agent</p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded">{selectedSession.userAgent}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SessionsTable;
