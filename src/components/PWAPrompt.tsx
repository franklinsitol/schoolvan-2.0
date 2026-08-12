import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Bus } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    // 1. Detect if running inside preview iframe
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);

    // 2. Detect if already installed & running in standalone window
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 4. Capture native browser PWA installation event (Chrome, Android, Edge, Brave)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ Native PWA beforeinstallprompt event captured.');
    };

    const handleCustomOpenInstall = () => {
      handleInstallPWA();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleCustomOpenInstall);

    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setInstalling(false);
      toast.success('🎉 SchoolVan foi instalado no seu dispositivo como aplicativo standalone!', { duration: 5000 });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleCustomOpenInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    // A) If inside an iframe (like AI Studio preview), open top window directly so the browser releases the native PWA prompt
    if (isInIframe && typeof window !== 'undefined') {
      toast('Abrindo em janela dedicada para autorizar o download nativo do aplicativo...', { icon: '🚀', duration: 3000 });
      window.open(window.location.origin, '_blank');
      return;
    }

    // B) iOS Safari (Apple does not support native beforeinstallprompt API)
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // C) Direct Native OS Install Dialog (Chrome, Android, Edge, Brave)
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted native PWA install dialog');
          setIsStandalone(true);
          toast.success('Instalando o aplicativo no seu dispositivo...');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Erro ao chamar o prompt nativo do PWA:', err);
      } finally {
        setInstalling(false);
      }
      return;
    }

    // D) Browser hasn't emitted beforeinstallprompt yet or prompt unavailable
    toast('Aguardando acionamento do instalador nativo do seu navegador...', { icon: '📲', duration: 3000 });
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* 1. Modal para iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-100 animate-scale-up relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl mx-auto flex items-center justify-center mb-3">
                <Share size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">Instalar no iPhone (Safari)</h3>
              <p className="text-xs text-slate-400 mt-1">Siga estes 2 passos no Safari do seu iPhone:</p>
            </div>

            <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl text-xs text-slate-300 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> <Share size={14} className="inline text-blue-400" /> na barra do Safari.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare size={14} className="inline text-slate-200" />.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-2xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* 2. Botão Flutuante (INSTALAR APP) */}
      <div className="fixed bottom-22 right-6 z-40 animate-fade-in">
        <button
          onClick={handleInstallPWA}
          disabled={installing}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-gray-950 font-bold px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-amber-500/40 border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-75"
          title="Instalar aplicativo SchoolVan no dispositivo"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-900 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-950"></span>
          </span>

          <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-950/20 p-0.5 shadow-inner shrink-0 flex items-center justify-center">
            {!imgError ? (
              <img 
                src="/icon-192.png" 
                alt="SchoolVan" 
                className="w-full h-full object-cover rounded-md" 
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <Bus size={18} className="text-slate-950 stroke-[2.5]" />
            )}
          </div>

          <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
            {installing ? 'Instalando...' : 'Instalar App'}
          </span>

          <Download size={18} className="stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </>
  );
}
