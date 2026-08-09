import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Bell, CheckCircle2, Share } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone PWA app
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }

    const dismissed = localStorage.getItem('schoolvan_pwa_dismissed') === 'true';

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setShowIosGuide(false);
      setIsStandalone(true);
      toast.success('🎉 SchoolVan instalado como App nativo com sucesso!', { duration: 5000 });
    });

    if (!standalone && !dismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('schoolvan_pwa_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    // 1. Check if we are inside an iframe (preview environment)
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (isInIframe) {
      toast.success('Abrindo em nova aba para acionar a instalação nativa do seu navegador...', { duration: 4000 });
      window.open(window.location.href, '_blank');
      return;
    }

    // 2. Real Native PWA Prompt invocation
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowBanner(false);
          setShowIosGuide(false);
          toast.success('Instalando SchoolVan no seu dispositivo...');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install error:', err);
      }
    } else if (isIOS) {
      setShowIosGuide(true);
    } else {
      toast('Aguardando prompt de instalação do navegador...', { icon: '📲' });
    }
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      toast.error('Notificações não são suportadas neste navegador.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        toast.success('Notificações Push Ativadas!');
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('SchoolVan Conectado 🚌', {
            body: 'Você receberá atualizações em tempo real das vans escolares.',
            icon: '/icon.png',
            badge: '/favicon.png'
          });
        }
      } else {
        toast.error('Permissão de notificação foi negada.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ativar notificações.');
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* iOS Direct Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-900 text-white p-6 rounded-3xl max-w-sm w-full space-y-4 border border-yellow-400/40 relative shadow-2xl">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <img src="/icon.png" alt="SchoolVan" className="w-12 h-12 rounded-2xl border border-yellow-400/30 object-cover" referrerPolicy="no-referrer" />
              <div>
                <h3 className="text-lg font-black text-yellow-400">Instalar no iPhone / iPad</h3>
                <p className="text-xs text-gray-300">Aplicativo PWA Oficial</p>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 text-xs text-gray-200">
              <div className="flex items-center gap-2 font-bold text-yellow-400">
                <Share size={16} /> Instalação Nativa Safari:
              </div>
              <p>1. Toque no ícone de <strong className="text-white">Compartilhar</strong> (quadrado com seta abaixo).</p>
              <p>2. Clique em <strong className="text-yellow-400">"Adicionar à Tela de Início"</strong>.</p>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-yellow-400 text-gray-950 font-black rounded-xl text-xs hover:bg-yellow-300 transition-all cursor-pointer shadow"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Top Right Floating PWA Banner (Below header, far from bottom FAB) */}
      {showBanner && (
        <div className="fixed top-16 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-88 bg-gray-900 text-white p-3.5 rounded-2xl shadow-2xl z-30 border border-yellow-400/50 flex flex-col gap-2.5 animate-fade-in">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="SchoolVan" className="w-10 h-10 rounded-xl shrink-0 border border-yellow-400/40 shadow-md object-cover" referrerPolicy="no-referrer" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-xs text-yellow-400 truncate">App SchoolVan</h4>
                <span className="text-[9px] bg-yellow-400 text-gray-950 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">PWA Nativo</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">
                Instale como app na tela inicial.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 bg-yellow-400 text-gray-950 font-black rounded-xl text-xs hover:bg-yellow-300 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download size={14} /> Instalar
            </button>

            {!pushEnabled ? (
              <button
                onClick={handleEnablePush}
                className="py-2 px-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Bell size={13} className="text-yellow-400" /> Push
              </button>
            ) : (
              <span className="px-2 py-1.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-xl flex items-center gap-1 border border-green-500/30">
                <CheckCircle2 size={11} /> Ativo
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}




