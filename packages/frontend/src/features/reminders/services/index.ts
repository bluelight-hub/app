/**
 * Reminders Services Module
 *
 * Exportiert alle Services für das Erinnerungen-Feature.
 */

export { SoundService, soundService, type SoundLevel } from './sound.service';

export {
  NotificationService,
  notificationService,
  checkNotificationPermission,
  requestNotificationPermission,
  sendNotification,
  sendErinnerungNotification,
  sendIntensifiedNotification,
  sendCriticalNotification,
  isNotificationSupported,
  type NotificationPermissionStatus,
  type SendNotificationOptions,
  type NotificationResult,
  type CriticalNotificationOptions,
} from './notification.service';

export { TimerService, timerService, type OnTriggerCallback } from './timer.service';

export {
  notificationSetupService,
  initializeNotificationSetup,
  setNotificationNavigateCallback,
  setNotificationNavigateBefehlCallback,
  setNotificationNavigateCriticalCallback,
  ERINNERUNG_CHANNEL_ID,
  ERINNERUNG_ACTION_TYPE_ID,
  ERINNERUNG_ACTION_OPEN_ID,
  BEFEHL_CHANNEL_ID,
  BEFEHL_ACTION_TYPE_ID,
  BEFEHL_ACTION_OPEN_ID,
  CRITICAL_CHANNEL_ID,
  CRITICAL_ACTION_TYPE_ID,
  CRITICAL_ACTION_OPEN_ID,
  type NavigateToErinnerungCallback,
  type NavigateToBefehlCallback,
  type NavigateToCriticalCallback,
} from './notification-setup.service';

export { TrayService, trayService, type TrayResult } from './tray.service';

export { IntensificationService, intensificationService, type IntensificationCallback } from './intensification.service';
