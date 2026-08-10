import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export function usePWAShellIntegration() {
  const { user, profile } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isInsidePWAShell, setIsInsidePWAShell] = useState<boolean>(false);

  useEffect(() => {
    // Detect if running inside iframe (PWA Shell)
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInsidePWAShell(inIframe);

    // Message event listener from PWA Shell
    const handleShellMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // Capture pushToken sent by Shell
      if (data.action === 'pushToken' && data.token) {
        console.log('📱 [Iframe App] Push token recebido da Casca PWA Shell:', data.token);
        setPushToken(data.token);
        localStorage.setItem('pwa_shell_push_token', data.token);

        // Acknowledge receipt back to Shell
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'pushTokenReceived', token: data.token }, '*');
        }

        // Save token to Firestore profile if user is logged in
        if (user?.uid) {
          try {
            const driverRef = doc(db, 'drivers', user.uid);
            await updateDoc(driverRef, { 
              pushToken: data.token,
              lastPushTokenUpdate: new Date().toISOString()
            });
          } catch (err) {
            console.warn('[Iframe App] Não foi possível salvar pushToken no Firestore:', err);
          }
        }
      }
    };

    window.addEventListener('message', handleShellMessage);

    return () => {
      window.removeEventListener('message', handleShellMessage);
    };
  }, [user]);

  // Function to notify PWA Shell when user logs out
  const triggerShellLogout = () => {
    console.log('🚪 [Iframe App] Notificando PWA Shell sobre Logout...');
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'logout' }, '*');
    }
  };

  return {
    pushToken,
    isInsidePWAShell,
    triggerShellLogout
  };
}
