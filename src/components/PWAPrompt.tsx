import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    // 1. Detect iframe environment
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);

    // 2. Detect standalone display mode (already installed app)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 4. Capture native browser PWA installation event (Chrome, Edge, Android, Opera, Brave)
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
      setShowIOSModal(false);
      setShowManualModal(false);
      toast.success('🎉 SchoolVan foi instalado no seu dispositivo com sucesso!', { duration: 5000 });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleCustomOpenInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    // A) If inside an iframe (like preview), open top window directly so the browser releases the native PWA prompt
    if (isInIframe) {
      toast('Abrindo o aplicativo em uma janela dedicada para autorizar o download nativo...', { icon: '🚀', duration: 4000 });
      window.open(window.location.href, '_blank');
      return;
    }

    // B) iOS Safari (Apple does not support native beforeinstallprompt API)
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // C) Direct Native OS Install Dialog (Chrome, Android, Edge)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
          toast.success('Instalando SchoolVan no seu dispositivo...');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Erro ao chamar o prompt nativo do PWA:', err);
      }
      return;
    }

    // D) Browser hasn't emitted beforeinstallprompt yet or prompt unavailable
    setShowManualModal(true);
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* 1. Modal para iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-800 animate-scale-up relative border border-slate-100">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                <Share size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instalar no iPhone (Safari)</h3>
              <p className="text-xs text-slate-500 mt-1">Siga estes 2 passos no Safari do seu iPhone:</p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> <Share size={14} className="inline text-blue-500" /> na barra inferior do Safari.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0">2</span>
                <span>Role as opções e toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare size={14} className="inline text-slate-700" />.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal Informativo para quando o navegador ainda não disparou a caixa nativa */}
      {showManualModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 text-slate-800 animate-scale-up relative">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Instalação Nativa</h3>
                <p className="text-xs text-slate-500">SchoolVan PWA</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              Para instalar o aplicativo diretamente no seu dispositivo através do navegador:
            </p>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-700 space-y-2">
              <p>1. Abra o menu do seu navegador (três pontos <strong>⋮</strong> no canto superior direito).</p>
              <p>2. Clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.</p>
            </div>

            <button
              onClick={() => setShowManualModal(false)}
              className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* 3. Botão Flutuante (INSTALAR APP) - Localizado no canto inferior direito, acima do Checklist */}
      <div className="fixed bottom-22 right-6 z-40 animate-fade-in">
        <button
          onClick={handleInstallPWA}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-gray-950 font-bold px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-amber-500/40 border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Instalar aplicativo SchoolVan no dispositivo"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-900 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-950"></span>
          </span>

          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/30 p-0.5 shadow-inner shrink-0 flex items-center justify-center">
            <img 
              src="/icon.png" 
              alt="SchoolVan" 
              className="w-full h-full object-cover rounded-md" 
              referrerPolicy="no-referrer"
            />
          </div>

          <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
            Instalar App
          </span>

          <Download size={18} className="stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </>
  );
}

