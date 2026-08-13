// Helper for Tio IA real-time notification read/unread states
const STORAGE_KEY = 'schoolvan_tioia_read_notifs';

export function getReadNotifications(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function markNotificationAsRead(notifId: string): string[] {
  try {
    const current = getReadNotifications();
    if (!current.includes(notifId)) {
      const updated = [...current, notifId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      // Dispatch custom event for real-time update across components
      window.dispatchEvent(new Event('tioia_notifications_updated'));
      return updated;
    }
    return current;
  } catch (e) {
    return [];
  }
}

export function clearReadNotifications(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('tioia_notifications_updated'));
  } catch (e) {
    console.warn(e);
  }
}
