// Notification Store & History Manager for SchoolVan
export interface AppNotification {
  id: string;
  type: 'proximity' | 'boarding' | 'payment' | 'incident' | 'system';
  title: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  targetUserEmail?: string;
  studentId?: string;
  studentName?: string;
  driverName?: string;
  actionUrl?: string;
  actionType?: 'finance' | 'routes' | 'incident' | 'whatsapp';
  actionData?: Record<string, any>;
}

const STORAGE_KEY = 'schoolvan_notifications_history_v1';

type Listener = (notifications: AppNotification[]) => void;
const listeners: Set<Listener> = new Set();

export function getStoredNotifications(userEmail?: string): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: AppNotification[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      return list.filter(n => !n.targetUserEmail || n.targetUserEmail.trim().toLowerCase() === cleanEmail);
    }
    return list;
  } catch (e) {
    console.warn('Erro ao carregar notificações do localStorage:', e);
    return [];
  }
}

export function saveStoredNotifications(notifications: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 100))); // Keep last 100
    listeners.forEach(fn => fn(notifications));
  } catch (e) {
    console.warn('Erro ao salvar notificações no localStorage:', e);
  }
}

export function addAppNotification(params: {
  type: AppNotification['type'];
  title: string;
  message: string;
  targetUserEmail?: string;
  studentId?: string;
  studentName?: string;
  driverName?: string;
  actionType?: AppNotification['actionType'];
  actionData?: Record<string, any>;
}): AppNotification {
  const current = getStoredNotifications();
  
  // Prevent duplicate exact notification in last 10 seconds
  const tenSecsAgo = Date.now() - 10000;
  const isDuplicate = current.some(n => 
    n.title === params.title && 
    n.message === params.message && 
    new Date(n.timestamp).getTime() > tenSecsAgo
  );

  if (isDuplicate) {
    return current[0];
  }

  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: params.type,
    title: params.title,
    message: params.message,
    timestamp: new Date().toISOString(),
    read: false,
    targetUserEmail: params.targetUserEmail,
    studentId: params.studentId,
    studentName: params.studentName,
    driverName: params.driverName,
    actionType: params.actionType,
    actionData: params.actionData
  };

  const updated = [newNotif, ...current];
  saveStoredNotifications(updated);
  return newNotif;
}

export function markNotificationAsRead(id: string) {
  const current = getStoredNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
  saveStoredNotifications(updated);
}

export function markAllNotificationsAsRead(userEmail?: string) {
  const current = getStoredNotifications();
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  const updated = current.map(n => {
    if (!cleanEmail || !n.targetUserEmail || n.targetUserEmail.trim().toLowerCase() === cleanEmail) {
      return { ...n, read: true };
    }
    return n;
  });
  saveStoredNotifications(updated);
}

export function deleteNotification(id: string) {
  const current = getStoredNotifications();
  const updated = current.filter(n => n.id !== id);
  saveStoredNotifications(updated);
}

export function clearAllNotifications(userEmail?: string) {
  const current = getStoredNotifications();
  if (userEmail) {
    const cleanEmail = userEmail.trim().toLowerCase();
    const updated = current.filter(n => n.targetUserEmail && n.targetUserEmail.trim().toLowerCase() !== cleanEmail);
    saveStoredNotifications(updated);
  } else {
    saveStoredNotifications([]);
  }
}

export function subscribeNotificationStore(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
