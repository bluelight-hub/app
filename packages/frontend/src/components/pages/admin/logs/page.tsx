import React, { useState } from 'react';
import { Badge, Button, Card, Col, DatePicker, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Tooltip } from 'antd';
import { PiArrowClockwise, PiBug, PiCheckCircle, PiDownloadSimple, PiEye, PiFunnel, PiShieldCheck, PiTrash, PiWarning, PiWarningCircle } from 'react-icons/pi';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { AuditLogFilters, useAuditLogById, useAuditLogs, useAuditLogStatistics, useDeleteAuditLog, useDeleteAuditLogs, useExportAuditLogs } from '../../../../hooks/admin/useAuditLogs';
import { AuditLogEntity } from '@bluelight-hub/shared/client/models';
import { LogDetailModal } from './LogDetailModal';

const { RangePicker } = DatePicker;
const { Option } = Select;

// Constants
const ACTION_TYPES = [
  'CREATE', 'READ', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT', 'ERROR', 'SECURITY', 'SYSTEM',
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const SEVERITY_COLORS: Record<string, string> = {
  'LOW': 'green',
  'MEDIUM': 'blue',
  'HIGH': 'orange',
  'CRITICAL': 'red',
};

const ACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  'CREATE': <PiCheckCircle className="text-green-500" />,
  'READ': <PiEye className="text-blue-500" />,
  'UPDATE': <PiArrowClockwise className="text-orange-500" />,
  'DELETE': <PiTrash className="text-red-500" />,
  'LOGIN': <PiShieldCheck className="text-green-500" />,
  'LOGOUT': <PiShieldCheck className="text-gray-500" />,
  'ERROR': <PiBug className="text-red-500" />,
  'SECURITY': <PiWarningCircle className="text-red-600" />,
  'SYSTEM': <PiWarning className="text-yellow-500" />,
};

// Helper functions
const useLogsHandlers = (filters: AuditLogFilters, setFilters: React.Dispatch<React.SetStateAction<AuditLogFilters>>) => {
  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<AuditLogEntity> | SorterResult<AuditLogEntity>[],
  ) => {
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;

    setFilters({
      ...filters,
      page: pagination.current || 1,
      limit: pagination.pageSize || 20,
      sortBy: singleSorter?.field as string || 'timestamp',
      sortOrder: singleSorter?.order === 'ascend' ? 'asc' : 'desc',
    });
  };

  const handleSearch = (value: string) => {
    setFilters({
      ...filters,
      search: value || undefined,
      page: 1,
    });
  };

  const handleDateRangeChange = (
    dates: any,
  ) => {
    if (dates && Array.isArray(dates) && dates.length === 2) {
      setFilters({
        ...filters,
        startDate: dates[0]?.toISOString(),
        endDate: dates[1]?.toISOString(),
        page: 1,
      });
    } else {
      setFilters({
        ...filters,
        startDate: undefined,
        endDate: undefined,
        page: 1,
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  };

  return {
    handleTableChange,
    handleSearch,
    handleDateRangeChange,
    resetFilters,
  };
};

const LogsPage: React.FC = () => {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | undefined>();

  // Hooks
  const { logs, meta, isLoading, refetch } = useAuditLogs(filters);
  const { data: statistics, isLoading: statsLoading } = useAuditLogStatistics(filters);
  const { data: selectedLog, isLoading: detailLoading } = useAuditLogById(selectedLogId);
  const deleteLog = useDeleteAuditLog();
  const deleteLogs = useDeleteAuditLogs();
  const exportLogs = useExportAuditLogs();

  // Handler functions
  const { handleTableChange, handleSearch, handleDateRangeChange, resetFilters } = useLogsHandlers(filters, setFilters);

  const handleExport = async (format: 'csv' | 'json') => {
    await exportLogs.mutateAsync({
      format,
      filters: {
        actionType: filters.actionType,
        severity: filters.severity,
        userId: filters.userId,
        resource: filters.resource,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
        success: filters.success,
      },
    });
  };

  const handleDeleteSelected = async () => {
    Modal.confirm({
      title: 'Ausgewählte Logs löschen?',
      content: `Möchten Sie wirklich ${selectedRowKeys.length} Logs löschen?`,
      okText: 'Löschen',
      okType: 'danger',
      cancelText: 'Abbrechen',
      onOk: async () => {
        await deleteLogs.mutateAsync(selectedRowKeys as string[]);
        setSelectedRowKeys([]);
      },
    });
  };

  const showDetail = (record: AuditLogEntity) => {
    setSelectedLogId(record.id);
    setDetailModalVisible(true);
  };

  const handleDeleteLog = (record: AuditLogEntity) => {
    Modal.confirm({
      title: 'Log löschen?',
      content: 'Möchten Sie diesen Log-Eintrag wirklich löschen?',
      okText: 'Löschen',
      okType: 'danger',
      cancelText: 'Abbrechen',
      onOk: () => deleteLog.mutate(record.id),
    });
  };

  const columns: ColumnsType<AuditLogEntity> = [
    {
      title: 'Zeitstempel',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      sorter: true,
      defaultSortOrder: 'descend',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Aktion',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 120,
      render: (actionType: string) => (
        <Space>
          {ACTION_TYPE_ICONS[actionType]}
          <span>{actionType}</span>
        </Space>
      ),
      filters: ACTION_TYPES.map(type => ({ text: type, value: type })),
      filteredValue: filters.actionType ? [filters.actionType] : null,
      onFilter: (value, record) => record.actionType === value,
    },
    {
      title: 'Schweregrad',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity: string) => severity ? (
        <Tag color={SEVERITY_COLORS[severity]}>
          {severity}
        </Tag>
      ) : '-',
      filters: SEVERITIES.map(sev => ({ text: sev, value: sev })),
      filteredValue: filters.severity ? [filters.severity] : null,
      onFilter: (value, record) => record.severity === value,
    },
    {
      title: 'Status',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      render: (success: boolean | null) => {
        if (success === null) return '-';
        return success ? (
          <Badge status="success" text="Erfolgreich" />
        ) : (
          <Badge status="error" text="Fehlgeschlagen" />
        );
      },
      filters: [
        { text: 'Erfolgreich', value: 'true' },
        { text: 'Fehlgeschlagen', value: 'false' },
      ],
      onFilter: (value, record) => record.success === (value === 'true'),
    },
    {
      title: 'Benutzer',
      dataIndex: 'userEmail',
      key: 'userEmail',
      width: 200,
      render: (email: string, record: AuditLogEntity) => (
        <Tooltip title={`ID: ${record.userId || 'System'}`}>
          {email || 'System'}
        </Tooltip>
      ),
    },
    {
      title: 'Ressource',
      dataIndex: 'resource',
      key: 'resource',
      width: 150,
      render: (resource: string, record: AuditLogEntity) => (
        <Space direction="vertical" size={0}>
          <span>{resource}</span>
          {record.resourceId && (
            <span className="text-xs text-gray-500">ID: {record.resourceId}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Aktion',
      dataIndex: 'action',
      key: 'action',
      ellipsis: true,
    },
    {
      title: 'IP-Adresse',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
    },
    {
      title: 'Aktionen',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Details anzeigen">
            <Button
              type="text"
              icon={<PiEye />}
              onClick={() => showDetail(record)}
            />
          </Tooltip>
          <Tooltip title="Löschen">
            <Button
              type="text"
              danger
              icon={<PiTrash />}
              onClick={() => handleDeleteLog(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-gray-600 mt-2">
          Überwachen Sie alle Systemaktivitäten und Benutzeraktionen
        </p>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <Row gutter={16} className="mb-6">
          <Col span={24}>
            <Card loading />
          </Col>
        </Row>
      ) : (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Gesamt"
                value={statistics?.total || 0}
                prefix={<PiEye />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Fehler"
                value={statistics?.errors || 0}
                valueStyle={{ color: '#cf1322' }}
                prefix={<PiBug />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Warnungen"
                value={statistics?.warnings || 0}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<PiWarning />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Kritisch"
                value={statistics?.critical || 0}
                valueStyle={{ color: '#a61d24' }}
                prefix={<PiWarningCircle />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input.Search
            placeholder="Suche in Logs..."
            style={{ width: 300 }}
            onSearch={handleSearch}
            enterButton
          />
          <Select
            placeholder="Aktionstyp"
            style={{ width: 150 }}
            allowClear
            value={filters.actionType}
            onChange={(value) => setFilters({ ...filters, actionType: value, page: 1 })}
          >
            {ACTION_TYPES.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
          <Select
            placeholder="Schweregrad"
            style={{ width: 150 }}
            allowClear
            value={filters.severity}
            onChange={(value) => setFilters({ ...filters, severity: value, page: 1 })}
          >
            {SEVERITIES.map(sev => (
              <Option key={sev} value={sev}>
                <Tag color={SEVERITY_COLORS[sev]}>{sev}</Tag>
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Status"
            style={{ width: 150 }}
            allowClear
            value={filters.success?.toString()}
            onChange={(value) => setFilters({
              ...filters,
              success: value ? value === 'true' : undefined,
              page: 1,
            })}
          >
            <Option value="true">Erfolgreich</Option>
            <Option value="false">Fehlgeschlagen</Option>
          </Select>
          <RangePicker
            placeholder={['Von', 'Bis']}
            onChange={handleDateRangeChange}
            format="DD.MM.YYYY"
          />
        </div>
        <div className="flex gap-2">
          <Button
            icon={<PiArrowClockwise />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Aktualisieren
          </Button>
          <Button.Group>
            <Button
              icon={<PiDownloadSimple />}
              onClick={() => handleExport('csv')}
              loading={exportLogs.isPending}
            >
              CSV Export
            </Button>
            <Button
              onClick={() => handleExport('json')}
              loading={exportLogs.isPending}
            >
              JSON Export
            </Button>
          </Button.Group>
          <Button
            icon={<PiFunnel />}
            onClick={resetFilters}
          >
            Filter zurücksetzen
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button
              danger
              icon={<PiTrash />}
              onClick={handleDeleteSelected}
              loading={deleteLogs.isPending}
            >
              {selectedRowKeys.length} ausgewählte löschen
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={isLoading}
        onChange={handleTableChange}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: meta?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `Gesamt ${total} Einträge`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1400 }}
        size="small"
      />

      {/* Detail Modal */}
      <LogDetailModal
        visible={detailModalVisible}
        logId={selectedLogId}
        log={selectedLog}
        loading={detailLoading}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedLogId(undefined);
        }}
      />
    </div>
  );
};

export default LogsPage;