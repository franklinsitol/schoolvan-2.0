// Push Notification & Browser Alert Utility for SchoolVan
import { RouteIncident } from '../types';

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Erro ao solicitar permissão de notificação push:', error);
    return Notification.permission;
  }
}

// Web Audio API synthesized urgent chime / broadcast alert
export function playIncidentAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play a distinctive two-tone attention sound: 880Hz -> 1174Hz (A5 -> D6)
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2 (higher, alert pitch)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.18);
    gain2.gain.setValueAtTime(0.35, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.65);

    // Tone 3 (third confirming chime)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1479.98, now + 0.4);
    gain3.gain.setValueAtTime(0.4, now + 0.4);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.4);
    osc3.stop(now + 0.95);
  } catch (e) {
    console.warn('Audio chime could not be played:', e);
  }
}

// Dispatch native web push notification to device
export function showIncidentPushNotification(incident: RouteIncident) {
  // 1. Play synthesized alert audio chime
  playIncidentAlertChime();

  // 2. Vibrate mobile device if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 150, 300, 150, 500]);
    } catch (e) {
      // ignore
    }
  }

  // 3. Trigger Browser Web Notification
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const iconUrl = '/schoolvan_app_icon_1786622663458.jpg';
    const typeTitle = 
      incident.incidentType === 'pneu' ? '🛞 Pneu Furado / Mecânico' :
      incident.incidentType === 'transito' ? '🚦 Trânsito Intenso' :
      incident.incidentType === 'chuva' ? '🌧️ Chuva Forte' :
      incident.incidentType === 'emergencia' ? '🚨 Emergência Operacional' :
      '⚠️ Comunicado Importante';

    const title = `SchoolVan: ${typeTitle}`;
    const delayText = incident.estimatedDelay ? `\n⏱️ Previsão de atraso: +${incident.estimatedDelay} min` : '';
    const body = `${incident.message}${delayText}`;

    // Try service worker registration first if available (better PWA support)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag: `incident-${incident.id || Date.now()}`,
          renotify: true,
          requireInteraction: true,
          data: {
            url: window.location.href,
            incidentId: incident.id
          }
        } as NotificationOptions & { renotify?: boolean });
      }).catch(() => {
        // Fallback to standard Notification constructor
        const notif = new Notification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag: `incident-${incident.id || Date.now()}`,
          requireInteraction: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      });
    } else {
      const notif = new Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        tag: `incident-${incident.id || Date.now()}`,
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Não foi possível exibir a notificação push:', err);
  }
}
