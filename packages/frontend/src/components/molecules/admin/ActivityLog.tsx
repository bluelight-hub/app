import React from 'react';
import { Timeline, Tag, Tooltip, Empty, Spin } from 'antd';
import {
  PiUser,
  PiUsersThree,
  PiGear,
  PiShieldCheck,
  PiWarning,
  PiTrash,
  PiPencil,
  PiPlus,
  PiSignIn,
  PiSignOut,
} from 'react-icons/pi';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { adminApi, type Activity } from '@/api/admin.helpers';

const ActivityLog: React.FC = () => {
  const {
    data: activities = [],
    isLoading,
    error,
  } = useQuery<Activity[]>({
    queryKey: ['admin-activities'],
    queryFn: () => adminApi.getActivities(20),
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
    retry: 1,
  });

  const getIcon = (activity: Activity) => {
    const iconProps = { className: 'text-lg' };

    switch (activity.action) {
      case 'login':
        return <PiSignIn {...iconProps} />;
      case 'logout':
        return <PiSignOut {...iconProps} />;
      case 'create':
        return <PiPlus {...iconProps} />;
      case 'update':
        return <PiPencil {...iconProps} />;
      case 'delete':
        return <PiTrash {...iconProps} />;
      case 'security_alert':
        return <PiShieldCheck {...iconProps} />;
      case 'warning':
        return <PiWarning {...iconProps} />;
      default:
        switch (activity.entityType) {
          case 'user':
            return <PiUser {...iconProps} />;
          case 'organization':
            return <PiUsersThree {...iconProps} />;
          case 'system':
            return <PiGear {...iconProps} />;
          case 'security':
            return <PiShieldCheck {...iconProps} />;
          default:
            return <PiGear {...iconProps} />;
        }
    }
  };

  const getActionText = (activity: Activity) => {
    const actionMap: Record<string, string> = {
      login: 'hat sich angemeldet',
      logout: 'hat sich abgemeldet',
      create: 'hat erstellt',
      update: 'hat aktualisiert',
      delete: 'hat gelöscht',
      security_alert: 'Sicherheitswarnung',
      warning: 'Systemwarnung',
    };

    return actionMap[activity.action] || activity.action;
  };

  const getSeverityColor = (severity: Activity['severity']) => {
    switch (severity) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      case 'success':
        return 'green';
      default:
        return 'blue';
    }
  };

  const getEntityTypeLabel = (type: Activity['entityType']) => {
    const labels: Record<Activity['entityType'], string> = {
      user: 'Benutzer',
      organization: 'Organisation',
      system: 'System',
      security: 'Sicherheit',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spin />
      </div>
    );
  }

  if (error) {
    return <Empty description="Aktivitäten konnten nicht geladen werden" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  if (!activities || activities.length === 0) {
    return <Empty description="Keine Aktivitäten vorhanden" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <Timeline
      mode="left"
      className="mt-4"
      items={activities.map((activity) => ({
        dot: getIcon(activity),
        color: getSeverityColor(activity.severity),
        children: (
          <div className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{activity.userName}</span>
              <span className="text-gray-500">{getActionText(activity)}</span>
              {activity.entityName && (
                <>
                  <Tag color={getSeverityColor(activity.severity)}>{getEntityTypeLabel(activity.entityType)}</Tag>
                  <span className="font-medium">{activity.entityName}</span>
                </>
              )}
            </div>
            <Tooltip title={new Date(activity.timestamp).toLocaleString('de-DE')}>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
            </Tooltip>
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {Object.entries(activity.metadata).map(([key, value]) => (
                  <div key={key}>
                    {key}: {JSON.stringify(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      }))}
    />
  );
};

export default ActivityLog;
