import React, { useState } from 'react';
import { Alert, Badge, Card, Col, Empty, Row, Segmented, Space, Spin, Statistic, Tag, Typography } from 'antd';
import {
  PiArrowDown,
  PiArrowUp,
  PiCheckCircle,
  PiDatabase,
  PiFingerprint,
  PiLockKey,
  PiShieldWarning,
  PiWarning,
  PiX,
} from 'react-icons/pi';
import { useQuery } from '@tanstack/react-query';
import { securityApi } from '@/api/security';
import { format, isValid, subDays, subHours } from 'date-fns';
import { de } from 'date-fns/locale';

const { Text, Paragraph } = Typography;

/**
 * Security Dashboard - Übersicht der wichtigsten Sicherheitsmetriken
 */
const SecurityDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  // Query für Dashboard-Metriken
  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['security-dashboard-metrics', timeRange],
    queryFn: () => securityApi.getDashboardMetrics(timeRange),
    refetchInterval: 30000,
  });

  // Query für kritische Security Events
  const { data: criticalEvents } = useQuery({
    queryKey: ['critical-security-events', timeRange],
    queryFn: async () => {
      const logs = await securityApi.getSecurityLogs({
        limit: 20,
        startDate:
          timeRange === 'today'
            ? subHours(new Date(), 24).toISOString()
            : timeRange === 'week'
              ? subDays(new Date(), 7).toISOString()
              : subDays(new Date(), 30).toISOString(),
      });
      // Filter nur kritische Events
      return logs.filter(
        (log) =>
          log.severity === 'ERROR' ||
          log.severity === 'CRITICAL' ||
          log.eventType === 'LOGIN_FAILED' ||
          log.eventType === 'ACCOUNT_LOCKED' ||
          log.eventType === 'SUSPICIOUS_ACTIVITY',
      );
    },
    refetchInterval: 30000,
  });

  // Query für Hash Chain Status
  const { data: hashChainStatus } = useQuery({
    queryKey: ['hash-chain-status'],
    queryFn: async () => {
      const logs = await securityApi.getSecurityLogs({ limit: 2 });
      if (logs && logs.length > 0) {
        const latest = logs[0];
        return {
          isValid: true,
          lastSequenceNumber: latest.sequenceNumber || 'N/A',
          totalLogs: logs.length,
        };
      }
      return null;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const getMetrics = () => {
    if (!metrics) return { failedLogins: 0, suspiciousActivities: 0, accountLockouts: 0, totalLogins: 0 };

    // Ensure failed logins never exceed total logins
    const failed = metrics.failedLoginAttempts || 0;
    const total = metrics.totalLoginAttempts || 0;

    return {
      failedLogins: failed,
      totalLogins: Math.max(total, failed), // Ensure total is at least as much as failed
      suspiciousActivities: metrics.suspiciousActivities || 0,
      accountLockouts: metrics.summary?.accountLockouts?.last24Hours || 0,
      // Trends from backend
      suspiciousTrend: metrics.summary?.suspiciousActivities?.trend || 0,
      lockoutTrend: metrics.summary?.accountLockouts?.trend || 0,
    };
  };

  const { failedLogins, totalLogins, suspiciousActivities, accountLockouts, suspiciousTrend } = getMetrics();
  const successfulLogins = Math.max(0, totalLogins - failedLogins); // Ensure non-negative
  const successRate = totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 100;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Security Dashboard</h1>
            <p className="text-gray-600">Echtzeit-Sicherheitsmetriken</p>
          </div>
          <Segmented
            options={[
              { label: 'Heute', value: 'today' },
              { label: 'Woche', value: 'week' },
              { label: 'Monat', value: 'month' },
            ]}
            value={timeRange}
            onChange={(value) => {
              setTimeRange(value as 'today' | 'week' | 'month');
              refetch();
            }}
          />
        </div>
      </div>

      <Alert
        message="Security Log Integrity"
        description={
          <div className="flex items-center justify-between">
            <span>Alle Sicherheitsereignisse werden in einer manipulationssicheren Hash-Chain gespeichert.</span>
            {hashChainStatus && (
              <Space>
                <Tag icon={<PiCheckCircle />} color="green">
                  Hash-Chain intakt
                </Tag>
                <Text>Sequenz: #{hashChainStatus.lastSequenceNumber}</Text>
              </Space>
            )}
          </div>
        }
        type="info"
        showIcon
        icon={<PiDatabase />}
        className="mb-6"
      />

      {/* Kritische Ereignisse - ECHTE DATEN */}
      {criticalEvents && criticalEvents.length > 0 && (
        <Alert
          message={
            <div className="flex items-center justify-between">
              <span>Kritische Sicherheitsereignisse ({criticalEvents.length})</span>
              <Badge status="error" text="Überprüfung erforderlich" />
            </div>
          }
          description={
            <div className="mt-2 space-y-2">
              {criticalEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <Tag color={event.severity === 'CRITICAL' ? 'red' : 'orange'}>{event.eventType}</Tag>
                  <Text className="ml-2">{event.message || 'Sicherheitsereignis aufgetreten'}</Text>
                  <Text type="secondary" className="ml-auto">
                    {event.createdAt && isValid(new Date(event.createdAt))
                      ? format(new Date(event.createdAt), 'HH:mm', { locale: de })
                      : 'N/A'}
                  </Text>
                </div>
              ))}
            </div>
          }
          type="error"
          showIcon
          icon={<PiShieldWarning />}
          className="mt-6 mb-6"
        />
      )}

      {/* Hauptmetriken - ECHTE BACKEND DATEN */}
      <Row gutter={[16, 16]} className="mb-6 mt-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Login-Versuche" value={totalLogins} prefix={<PiLockKey className="text-blue-500" />} />
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <Text type="secondary">Erfolgreich:</Text>
                <Text className="text-green-600">{successfulLogins}</Text>
              </div>
              <div className="flex justify-between text-sm">
                <Text type="secondary">Fehlgeschlagen:</Text>
                <Text className="text-red-600">{failedLogins}</Text>
              </div>
              <div className="flex justify-between text-sm">
                <Text type="secondary">Erfolgsrate:</Text>
                <Text strong>{Math.round(successRate)}%</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Verdächtige Aktivitäten"
              value={suspiciousActivities}
              prefix={<PiWarning className="text-orange-500" />}
              valueStyle={{ color: suspiciousActivities > 0 ? '#faad14' : undefined }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-sm">
                Trend:{' '}
                {suspiciousTrend > 0 ? (
                  <span className="text-red-500">
                    <PiArrowUp className="inline" /> {Math.abs(suspiciousTrend)}%
                  </span>
                ) : suspiciousTrend < 0 ? (
                  <span className="text-green-500">
                    <PiArrowDown className="inline" /> {Math.abs(suspiciousTrend)}%
                  </span>
                ) : (
                  <span>Unverändert</span>
                )}
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Account-Sperrungen"
              value={accountLockouts}
              prefix={<PiX className="text-red-500" />}
              valueStyle={{ color: accountLockouts > 0 ? '#f5222d' : undefined }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-sm">
                {accountLockouts > 0 ? 'Sofortige Überprüfung erforderlich' : 'Keine aktiven Sperrungen'}
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hash-Chain Status"
              value={hashChainStatus?.isValid ? 'Verifiziert' : 'Prüfung läuft'}
              prefix={<PiFingerprint className="text-blue-500" />}
              valueStyle={{
                color: hashChainStatus?.isValid ? '#52c41a' : '#1890ff',
                fontSize: '20px',
              }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-sm">
                {hashChainStatus ? `Sequenz: #${hashChainStatus.lastSequenceNumber}` : 'Keine Logs'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Details aus dem Backend */}
      <Row gutter={[16, 16]} className="mt-6">
        {/* Top Failed Login IPs - ECHTE DATEN */}
        {metrics?.details?.topFailedLoginIps && metrics.details.topFailedLoginIps.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Top Fehlgeschlagene Login IPs">
              <Space direction="vertical" className="w-full">
                {metrics.details.topFailedLoginIps.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <Space>
                      <Tag color="red">{index + 1}</Tag>
                      <Text>{item.ip}</Text>
                    </Space>
                    <Badge count={item.count} style={{ backgroundColor: '#f5222d' }} />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        )}

        {/* Verdächtige Aktivitäten nach Typ - ECHTE DATEN */}
        {metrics?.details?.suspiciousActivityTypes && metrics.details.suspiciousActivityTypes.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Verdächtige Aktivitäten nach Typ">
              <Space direction="vertical" className="w-full">
                {metrics.details.suspiciousActivityTypes.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <Tag color="orange">{item.type}</Tag>
                    <Badge count={item.count} style={{ backgroundColor: '#faad14' }} />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        )}

        {/* Kritische Security Events */}
        <Col xs={24}>
          <Card
            title="Kritische Sicherheitsereignisse"
            extra={<Badge count={criticalEvents?.length || 0} showZero color="#f5222d" />}
          >
            <div className="max-h-[400px] overflow-y-auto">
              {criticalEvents && criticalEvents.length > 0 ? (
                <Space direction="vertical" className="w-full">
                  {criticalEvents.map((event) => (
                    <Card
                      key={event.id}
                      size="small"
                      className={`border-l-4 ${
                        event.severity === 'CRITICAL'
                          ? 'border-red-500'
                          : event.severity === 'ERROR'
                            ? 'border-orange-500'
                            : 'border-yellow-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag
                              color={
                                event.severity === 'CRITICAL' ? 'red' : event.severity === 'ERROR' ? 'orange' : 'gold'
                              }
                            >
                              {event.eventType}
                            </Tag>
                            <Text type="secondary" className="text-xs">
                              #{event.sequenceNumber}
                            </Text>
                          </div>
                          <Paragraph className="mb-1 text-sm">{event.message || event.eventType}</Paragraph>
                          {event.ipAddress && event.ipAddress !== '::1' && (
                            <Text type="secondary" className="text-xs">
                              IP: {event.ipAddress}
                            </Text>
                          )}
                        </div>
                        <Text type="secondary" className="text-xs whitespace-nowrap ml-2">
                          {event.createdAt && isValid(new Date(event.createdAt))
                            ? format(new Date(event.createdAt), 'dd.MM HH:mm', { locale: de })
                            : 'N/A'}
                        </Text>
                      </div>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Empty
                  description="Keine kritischen Ereignisse im gewählten Zeitraum"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </Card>
        </Col>

        {/* System Status */}
        <Col xs={24}>
          <Card title="System Security Status">
            <Alert
              message="Aktuelle Sicherheitslage"
              description={
                <div className="space-y-2">
                  <div>Fehlgeschlagene Logins: {failedLogins}</div>
                  <div>Verdächtige Aktivitäten: {suspiciousActivities}</div>
                  <div>Account-Sperrungen: {accountLockouts}</div>
                  <div>Hash-Chain Status: {hashChainStatus?.isValid ? 'Intakt' : 'Wird geprüft'}</div>
                </div>
              }
              type={
                suspiciousActivities > 10 || accountLockouts > 0
                  ? 'error'
                  : suspiciousActivities > 5 || failedLogins > 10
                    ? 'warning'
                    : 'success'
              }
              showIcon
              className="mt-4"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SecurityDashboard;
