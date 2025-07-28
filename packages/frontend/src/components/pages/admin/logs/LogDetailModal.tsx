import React from 'react';
import { Modal, Descriptions, Spin, Badge, Tag, Space, Button } from 'antd';
import dayjs from 'dayjs';
import { AuditLogEntity } from '@bluelight-hub/shared/client/models';
import { PiCheckCircle, PiEye, PiArrowClockwise, PiTrash, PiShieldCheck, PiBug, PiWarningCircle, PiWarning } from 'react-icons/pi';

interface LogDetailModalProps {
  visible: boolean;
  logId?: string;
  log?: AuditLogEntity;
  loading?: boolean;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  'LOW': 'green',
  'MEDIUM': 'blue',
  'HIGH': 'orange',
  'CRITICAL': 'red'
};

const actionTypeIcons: Record<string, React.ReactNode> = {
  'CREATE': <PiCheckCircle className="text-green-500" />,
  'READ': <PiEye className="text-blue-500" />,
  'UPDATE': <PiArrowClockwise className="text-orange-500" />,
  'DELETE': <PiTrash className="text-red-500" />,
  'LOGIN': <PiShieldCheck className="text-green-500" />,
  'LOGOUT': <PiShieldCheck className="text-gray-500" />,
  'ERROR': <PiBug className="text-red-500" />,
  'SECURITY': <PiWarningCircle className="text-red-600" />,
  'SYSTEM': <PiWarning className="text-yellow-500" />
};

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  visible,
  log,
  loading = false,
  onClose,
}) => {
  return (
    <Modal
      title="Audit Log Details"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Schließen
        </Button>
      ]}
      width={800}
    >
      <Spin spinning={loading}>
        {log && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="ID" span={2}>
              {log.id}
            </Descriptions.Item>
            <Descriptions.Item label="Zeitstempel">
              {dayjs(log.timestamp || log.createdAt).format('DD.MM.YYYY HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Benutzer">
              {log.userEmail || 'System'} ({log.userId || '-'})
            </Descriptions.Item>
            <Descriptions.Item label="Aktion">
              {log.action}
            </Descriptions.Item>
            <Descriptions.Item label="Aktionstyp">
              <Space>
                {actionTypeIcons[log.actionType]}
                {log.actionType}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Ressource">
              {log.resource} {log.resourceId && `(ID: ${log.resourceId})`}
            </Descriptions.Item>
            <Descriptions.Item label="Schweregrad">
              {log.severity && (
                <Tag color={severityColors[log.severity]}>
                  {log.severity}
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {log.success === null ? '-' : log.success ? (
                <Badge status="success" text="Erfolgreich" />
              ) : (
                <Badge status="error" text="Fehlgeschlagen" />
              )}
            </Descriptions.Item>
            <Descriptions.Item label="IP-Adresse">
              {log.ipAddress}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent" span={2}>
              <div className="break-all text-xs">
                {log.userAgent}
              </div>
            </Descriptions.Item>
            {log.oldValues && (
              <Descriptions.Item label="Alte Werte" span={2}>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            {log.newValues && (
              <Descriptions.Item label="Neue Werte" span={2}>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            {log.metadata && (
              <Descriptions.Item label="Metadaten" span={2}>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Spin>
    </Modal>
  );
};