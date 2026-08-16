import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share, 
  PlusSquare, 
  X, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  MoreVertical, 
  Compass, 
  ExternalLink,
  Zap,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SchoolVanLogo } from './SchoolVanLogo';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>('android');

  useEffect(() => {
    // 1. Detect if running inside preview iframe
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);

    // 2. Detect if already installed & running in standalone window
    const standalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
    setIsStandalone(Boolean(standalone));

    // 3. Detect OS / Device
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isApple);
    if (isApple) {
      setActiveTab('ios');
    } else if (isAndroidDevice) {
      setActiveTab('android');
    } else {
      setActiveTab('android');
    }

    // 4. Capture native browser PWA installation event (Chrome, Android, Edge, Brave, Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ Native PWA beforeinstallprompt event captured.');
    };

    const handleCustomOpenInstall = () => {
      handleOpenInstallModal();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleCustomOpenInstall);

    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setInstalling(false);
      setShowInstallModal(false);
      toast.success('🎉 SchoolVan foi instalado com sucesso no seu dispositivo!', { duration: 5000 });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleCustomOpenInstall);
    };
  }, []);

  const handleOpenInstallModal = () => {
    // If inside an iframe (like AI Studio preview), notify and open top window
    if (isInIframe && typeof window !== 'undefined') {
      toast('Abrindo em nova aba para autorizar o instalador nativo do seu celular...', { icon: '🚀', duration: 3000 });
      window.open(window.location.origin, '_blank');
      return;
    }

    // Direct Native OS prompt if already prepared by browser
    if (deferredPrompt) {
      tryDirectInstall();
      return;
    }

    // Always open the visual installation guide modal with steps for their device
    setShowInstallModal(true);
  };

  const tryDirectInstall = async () => {
    if (!deferredPrompt) {
      setShowInstallModal(true);
      return;
    }

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted native PWA install dialog');
        setIsStandalone(true);
        setShowInstallModal(false);
        toast.success('Instalando o SchoolVan no seu celular...');
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Erro ao chamar o prompt nativo:', err);
      setShowInstallModal(true);
    } finally {
      setInstalling(false);
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* 1. Modal Completo e Interativo de Instalação / Download PWA */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl text-slate-100 animate-scale-up relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-all cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-yellow-400 text-slate-950 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-yellow-400/20">
                <SchoolVanLogo size={36} />
              </div>
              <span className="inline-flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 px-3 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider mb-1.5">
                <Sparkles size={12} /> App Oficial SchoolVan
              </span>
              <h3 className="text-xl font-black text-white">Baixar / Instalar o App</h3>
              <p className="text-xs text-slate-300 mt-1">
                Instale no seu celular em segundos. <strong>Não ocupa espaço</strong> de memória e funciona offline!
              </p>
            </div>

            {/* If deferred prompt is available, show 1-click install button */}
            {deferredPrompt && (
              <div className="mb-5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-4 rounded-2xl text-slate-950 text-center space-y-2 shadow-xl">
                <p className="text-xs font-black uppercase tracking-wider">Seu navegador suporta instalação instantânea!</p>
                <button
                  onClick={tryDirectInstall}
                  disabled={installing}
                  className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-yellow-400 font-black rounded-xl text-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <span>{installing ? 'Instalando...' : 'INSTALAR AGORA EM 1 CLIQUE'}</span>
                </button>
              </div>
            )}

            {/* Device Switcher Tabs */}
            <div className="flex border-b border-slate-800 pb-2.5 mb-4 gap-1">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-yellow-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
              >
                <Smartphone size={15} />
                <span>Android / Chrome</span>
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-yellow-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
              >
                <Share size={14} />
                <span>iPhone (Safari)</span>
              </button>
            </div>

            {/* TAB: ANDROID / CHROME / SAMSUNG */}
            {activeTab === 'android' && (
              <div className="space-y-3 bg-slate-800/90 p-4 rounded-2xl text-xs text-slate-200 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                    1
                  </div>
                  <div>
                    <strong className="text-white block text-sm">Toque nos 3 pontinhos (⋮)</strong>
                    <span className="text-slate-300">
                      No canto superior direito da tela do seu navegador (Google Chrome, Samsung ou Brave).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                    2
                  </div>
                  <div>
                    <strong className="text-white block text-sm">Selecione "Instalar aplicativo"</strong>
                    <span className="text-slate-300">
                      Ou toque em <strong>"Adicionar à tela inicial"</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-emerald-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                    ✓
                  </div>
                  <div>
                    <strong className="text-emerald-300 block text-sm">Pronto! Ícone criado</strong>
                    <span className="text-slate-300">
                      O ícone do SchoolVan aparecerá na tela do seu celular com abertura instantânea!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: IPHONE / SAFARI */}
            {activeTab === 'ios' && (
              <div className="space-y-3 bg-slate-800/90 p-4 rounded-2xl text-xs text-slate-200 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                    1
                  </div>
                  <div>
                    <strong className="text-white block text-sm">Toque em Compartilhar <Share size={14} className="inline text-blue-400 ml-1" /></strong>
                    <span className="text-slate-300">
                      Toque no botão de compartilhar (quadrado com seta para cima) na barra inferior do Safari.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                    2
                  </div>
                  <div>
                    <strong className="text-white block text-sm">Toque em "Adicionar à Tela de Início" <PlusSquare size={14} className="inline text-yellow-400 ml-1" /></strong>
                    <span className="text-slate-300">
                      Role o menu do Safari para baixo e selecione esta opção.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-emerald-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                    ✓
                  </div>
                  <div>
                    <strong className="text-emerald-300 block text-sm">Toque em "Adicionar" no topo</strong>
                    <span className="text-slate-300">
                      O aplicativo SchoolVan abrirá em tela cheia sem barras de navegador.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits Badges */}
            <div className="grid grid-cols-2 gap-2 my-4 text-[11px] font-bold text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                <CheckCircle2 size={14} className="text-yellow-400 shrink-0" />
                <span>Zero MB de download</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                <CheckCircle2 size={14} className="text-yellow-400 shrink-0" />
                <span>Notificações em tempo real</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                ENTENDI, VOU INSTALAR PELO NAVEGADOR
              </button>

              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Continuar usando no navegador sem instalar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Botão Flutuante de Alta Acessibilidade (BAIXAR / INSTALAR APP) */}
      <div className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-40 animate-fade-in">
        <button
          onClick={handleOpenInstallModal}
          disabled={installing}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 font-black px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-yellow-400/40 border-2 border-slate-950 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-75"
          title="Baixar ou instalar aplicativo SchoolVan no celular"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
          </span>

          <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-950 p-0.5 shadow-inner shrink-0 flex items-center justify-center">
            <SchoolVanLogo size={22} />
          </div>

          <span className="text-xs sm:text-sm font-black tracking-wide uppercase">
            {installing ? 'Instalando...' : 'Baixar App'}
          </span>

          <Download size={18} className="stroke-[2.5] group-hover:translate-y-0.5 transition-transform text-slate-950" />
        </button>
      </div>
    </>
  );
}
