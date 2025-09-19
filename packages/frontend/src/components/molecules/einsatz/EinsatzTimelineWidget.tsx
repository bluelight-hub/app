import { cn } from '@/utils/cn';
import { formatNatoDateTime } from '@/utils/dateFormatter';
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
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'arrival':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'action':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'info':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'success':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className={cn('rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800', className)}>
      <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">Einsatzverlauf</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-8 bottom-0 left-5 w-0.5 bg-gray-200 dark:bg-gray-700" />

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
                    <p className="font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                    {event.description && <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">{event.description}</p>}
                  </div>
                  <time className="text-gray-500 text-xs dark:text-gray-400">{formatNatoDateTime(event.time)}</time>
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <PiClock className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Noch keine Ereignisse vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}
