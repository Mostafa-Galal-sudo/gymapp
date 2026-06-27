import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const WATER_NOTIFICATION_CHANNEL = 'water_reminders';
const WATER_NOTIF_IDS = Array.from({ length: 16 }, (_, i) => 1000 + i);

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleWaterReminders(remainingMl: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Cancel existing water reminders first
    await cancelWaterReminders();

    const now = new Date();
    const startHour = 7;  // 7 AM
    const endHour = 22;   // 10 PM

    const notifications = [];
    let notifIndex = 0;

    for (let hour = startHour; hour <= endHour; hour++) {
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, 0, 0, 0);

      // Skip hours that have already passed today
      if (scheduledTime <= now) continue;

      if (notifIndex >= 16) break;

      notifications.push({
        id: WATER_NOTIF_IDS[notifIndex],
        title: '💧 اشرب ماء!',
        body: `هدفك ${remainingMl}ml باقي. جسمك محتاج ماء دلوقتي! 🥤`,
        schedule: { at: scheduledTime },
        channelId: WATER_NOTIFICATION_CHANNEL,
        smallIcon: 'ic_stat_water',
        actionTypeId: '',
        extra: { type: 'water_reminder' },
      });

      notifIndex++;
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (err) {
    console.warn('Failed to schedule water reminders:', err);
  }
}

export async function cancelWaterReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const waterNotifs = pending.notifications.filter(n =>
      WATER_NOTIF_IDS.includes(n.id)
    );
    if (waterNotifs.length > 0) {
      await LocalNotifications.cancel({ notifications: waterNotifs });
    }
  } catch (err) {
    console.warn('Failed to cancel water reminders:', err);
  }
}

export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}
