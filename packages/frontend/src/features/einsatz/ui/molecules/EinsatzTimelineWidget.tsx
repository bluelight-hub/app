import { cn } from '@/shared/ui/cn';
import { formatNatoDateTime } from '@/shared/lib/dateFormatter';
import { PiCheckCircle, PiClock, PiMapPin, PiRadio, PiSiren, PiTruck } from 'react-icons/pi';

interface TimelineEvent {
  id: string;
  time: Date;
  title: string;
  description?: string;
  type: 'alarm' | 'arrival' | 'action' | 'info' | 'success';
  icon?: React.ReactNode;
}

interface EinsatzTimelineWidgetProps {
  events: TimelineEvent[];
  className?: string;
}

export function EinsatzTimelineWidget({ events, className }: EinsatzTimelineWidgetProps) {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'alarm':
        return <PiSiren className="h-4 w-4" />;
      case 'arrival':
        return <PiTruck className="h-4 w-4" />;
      case 'action':
        return <PiRadio className="h-4 w-4" />;
      case 'info':
        return <PiMapPin className="h-4 w-4" />;
      case 'success':
        return <PiCheckCircle className="h-4 w-4" />;
      default:
        return <PiClock className="h-4 w-4" />;
    }
  };

  const getEventColors = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'alarm':
        return 'bg-status-danger-surface text-status-danger-text';
      case 'arrival':
        return 'bg-status-info-surface text-status-info-text';
      case 'action':
        return 'bg-action-secondary text-action-primary';
      case 'info':
        return 'bg-surface-raised text-text-secondary';
      case 'success':
        return 'bg-status-success-surface text-status-success-text';
      default:
        return 'bg-surface-raised text-text-secondary';
    }
  };

  return (
    <div className={cn('rounded-lg bg-surface-panel p-6 shadow-sm', className)}>
      <h3 className="mb-4 text-lg font-semibold text-text-primary">Einsatzverlauf</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-8 bottom-0 left-5 w-0.5 bg-border-subtle" />

        {/* Timeline events */}
        <div className="space-y-4">
          {events.map((event, _index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon circle */}
              <div className={cn('relative z-10 flex h-10 w-10 items-center justify-center rounded-full', getEventColors(event.type))}>{event.icon || getEventIcon(event.type)}</div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{event.title}</p>
                    {event.description && <p className="mt-1 text-body-sm text-text-secondary">{event.description}</p>}
                  </div>
                  <time className="text-body-xs text-text-muted">{formatNatoDateTime(event.time)}</time>
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="py-8 text-center text-text-secondary">
            <PiClock className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="text-body-sm">Noch keine Ereignisse vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}
