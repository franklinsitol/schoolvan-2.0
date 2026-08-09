import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Bell, CheckCircle2, Share } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showMiniFooter, setShowMiniFooter] = useState(false);
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

    const dismissed = localStorage.getItem('schoolvan_pwa_dismissed') === 'true';

    // 4. Capture native browser PWA installation trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !dismissed) {
        setShowMiniFooter(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setShowMiniFooter(false);
      setIsStandalone(true);
      toast.success('🎉 SchoolVan instalado na sua Tela Inicial com sucesso!', { duration: 5000 });
    });

    // Automatically display mini footer if not dismissed or inside preview
    if (!standalone && !dismissed) {
      const timer = setTimeout(() => {
        setShowMiniFooter(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setShowMiniFooter(false);
    localStorage.setItem('schoolvan_pwa_dismissed', 'true');
  };

  const installPWA = async () => {
    // If running in an iframe (AI Studio preview box), open in top window to trigger browser's native PWA engine
    if (isInIframe) {
      toast('Abrindo em nova aba para liberar a instalação em 1 clique...', { icon: '🚀', duration: 3000 });
      window.open(window.location.href, '_blank');
      return;
    }

    // Direct 1-Click Native OS Install Dialog
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowMiniFooter(false);
          toast.success('Instalando SchoolVan no seu dispositivo...');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Erro ao acionar prompt PWA:', err);
      }
    } else if (isIOS) {
      toast('No Safari do iPhone: Toque em Compartilhar e "Adicionar à Tela de Início"', {
        icon: '📲',
        duration: 5000,
      });
    } else {
      toast.success('Abra este link no navegador do celular para instalar em 1 clique!', {
        duration: 4000,
      });
    }
  };

  if (isStandalone || !showMiniFooter) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white px-4 py-2.5 rounded-full shadow-2xl border border-yellow-400/40 backdrop-blur-md flex items-center gap-3 whitespace-nowrap animate-fade-in max-w-[92vw] sm:max-w-md">
      <div className="flex items-center gap-2">
        <img 
          src="/icon.png" 
          alt="SchoolVan Logo" 
          className="w-7 h-7 rounded-lg border border-yellow-400/40 object-cover shrink-0" 
          referrerPolicy="no-referrer"
        />
        <span className="text-xs font-bold text-gray-200 hidden sm:inline">
          App SchoolVan
        </span>
      </div>

      <button
        onClick={installPWA}
        className="bg-yellow-400 text-gray-950 px-4 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-yellow-300 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 animate-pulse"
      >
        <Download size={14} className="stroke-[3]" />
        Baixar o App
      </button>

      <button
        onClick={handleDismiss}
        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
        title="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
}





