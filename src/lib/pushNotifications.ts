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

// Web Audio API synthesized status chime (boarding, school drop-off, arrival at home)
export function playStudentStatusChime(status: 'Casa' | 'Van' | 'Escola' | 'A CAMINHO' | 'NÃO VAI' | string) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (status === 'Van') {
      // Cheerful boarding chord (F4 -> A4 -> C5)
      [349.23, 440, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } else if (status === 'Escola') {
      // Harmonic bell (E5 -> G5 -> C6)
      [659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.3, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
      });
    } else if (status === 'A CAMINHO') {
      // Double horn beep chime (520Hz double pulse)
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } else if (status === 'Casa') {
      // Warm welcoming chime (C5 -> G4 -> C4)
      [523.25, 392.00, 261.63].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.3, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.55);
      });
    }
  } catch (e) {
    console.warn('Audio status chime could not be played:', e);
  }
}

// Web Audio API synthesized urgent chime / broadcast alert
export function playIncidentAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
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

// Dispatch native web push notification when student boarding status updates
export function showStudentStatusPushNotification(params: {
  studentName: string;
  status: 'Casa' | 'Van' | 'Escola' | 'A CAMINHO' | 'NÃO VAI' | string;
  driverName?: string;
  schoolName?: string;
  studentId?: string;
}) {
  const { studentName, status, driverName = 'Motorista', schoolName, studentId } = params;

  // 1. Play synthesized status audio chime
  playStudentStatusChime(status);

  // 2. Vibrate mobile device if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (status === 'Van' || status === 'Escola') {
        navigator.vibrate([150, 80, 200]);
      } else if (status === 'A CAMINHO') {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
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
    let title = `SchoolVan: ${studentName}`;
    let body = '';

    if (status === 'Van') {
      title = `🚐 Embarque Confirmado: ${studentName}`;
      body = `${studentName} acabou de embarcar na van escolar do(a) ${driverName}! Está a caminho em segurança.`;
    } else if (status === 'Escola') {
      title = `🏫 Chegou na Escola: ${studentName}`;
      body = `${studentName} foi entregue com segurança na escola ${schoolName ? `(${schoolName})` : ''}!`;
    } else if (status === 'Casa') {
      title = `🏠 Chegou em Casa: ${studentName}`;
      body = `${studentName} acabou de desembarcar e está em casa em segurança!`;
    } else if (status === 'A CAMINHO') {
      title = `🚐 Van a Caminho da sua Casa!`;
      body = `A van do(a) ${driverName} está a caminho para buscar ${studentName}. Deixe o passageiro preparado!`;
    } else if (status === 'NÃO VAI') {
      title = `🚫 Falta Registrada: ${studentName}`;
      body = `A ausência de ${studentName} foi registrada para a chamada de hoje.`;
    } else {
      title = `🚐 Status de ${studentName} atualizado`;
      body = `Status alterado para ${status}.`;
    }

    const tag = `status-${studentId || studentName}-${Date.now()}`;

    // Try service worker registration first if available (better PWA support)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag,
          renotify: true,
          requireInteraction: false,
          data: {
            url: window.location.href,
            studentName,
            status
          }
        } as NotificationOptions & { renotify?: boolean });
      }).catch(() => {
        const notif = new Notification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag
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
        tag
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Não foi possível exibir a notificação push de status do aluno:', err);
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
