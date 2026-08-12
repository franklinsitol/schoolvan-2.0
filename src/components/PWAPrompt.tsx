import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detect iframe preview environment
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);

    // 2. Detect standalone display mode (already installed app)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 4. Capture native browser PWA installation trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setShowModal(true);
      }
    };

    // 5. Custom event trigger from any button in the app
    const handleCustomOpenInstall = () => {
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleCustomOpenInstall);

    window.addEventListener('appinstalled', () => {
      setShowModal(false);
      setIsStandalone(true);
      toast.success('🎉 SchoolVan instalado com sucesso na sua Tela Inicial!', { duration: 5000 });
    });

    // Auto-display modal after 1.5s if not already standalone
    if (!standalone) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleCustomOpenInstall);
    };
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const installPWA = async () => {
    // If running in an iframe (e.g. preview environment), open top window for native PWA installation
    if (isInIframe) {
      toast('Abrindo em aba principal para liberar a instalação no dispositivo...', { icon: '🚀', duration: 3000 });
      window.open(window.location.href, '_blank');
      return;
    }

    // Direct Native OS Install Dialog
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowModal(false);
          setIsStandalone(true);
          toast.success('Instalando SchoolVan no seu dispositivo...');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Erro ao acionar prompt PWA:', err);
      }
    } else if (isIOS) {
      toast('No Safari do iPhone: toque no ícone Compartilhar 📤 e em "Adicionar à Tela de Início" ➕', {
        icon: '📲',
        duration: 6000,
      });
    } else {
      toast.success('Pronto! Adicione à sua Tela Inicial através do menu do seu navegador.', {
        duration: 5000,
      });
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* 1. Modal "Instale o app" */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[28px] p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 text-gray-900 animate-scale-up relative">
            {/* Close Button Top Right */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 tracking-tight pr-8">
              Instale o app
            </h3>

            {/* App Card Info */}
            <div className="flex items-center gap-4 py-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-400 p-0.5 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
                <img 
                  src="/icon.png" 
                  alt="SchoolVan Logo" 
                  className="w-full h-full object-cover rounded-xl" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <h4 className="font-semibold text-gray-900 text-base sm:text-lg leading-snug truncate">
                  SchoolVan - Gestão de Transporte Escolar
                </h4>
                <span className="text-sm text-gray-500 font-normal mt-0.5 truncate">
                  schoolvan.com.br
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={installPWA}
                className="bg-[#e8def8] hover:bg-[#decbf7] text-[#1d192b] font-semibold px-7 py-2.5 rounded-full text-sm sm:text-base transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Download size={18} />
                Instalar
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="bg-[#4a3e5c] hover:bg-[#3d324d] text-white font-medium px-7 py-2.5 rounded-full text-sm sm:text-base border border-[#63537c] transition-all active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Action Button (Positioned above the Checklist button on the bottom right) */}
      {!showModal && (
        <div className="fixed bottom-22 right-6 z-40 animate-fade-in">
          <button
            onClick={() => setShowModal(true)}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-gray-950 font-bold px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-amber-500/40 border-2 border-white/80 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
      )}
    </>
  );
}
