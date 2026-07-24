import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Bell, Share, CheckCircle2, Monitor, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as a real installed standalone PWA app
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

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setShowGuideModal(false);
      setIsStandalone(true);
      toast.success('🎉 SchoolVan instalado com sucesso! Acesse direto do ícone na sua tela inicial.', { duration: 5000 });
    });

    // Auto display banner after 2 seconds if not installed
    if (!standalone) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowBanner(false);
          setShowGuideModal(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
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
            body: 'Tudo pronto! Você receberá atualizações das vans e faltas direto no seu celular.',
            icon: '/icon.png',
            badge: '/favicon.png'
          });
        }
      } else {
        toast.error('Permissão de notificação foi negada no navegador.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar permissão de notificações.');
    }
  };

  // If already running in standalone mode, show a small subtle indicator in developer mode or stay hidden
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* 📱 STANDALONE INSTALLATION GUIDE MODAL */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-900 text-white p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-5 border border-yellow-400/40 relative shadow-2xl">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <img src="/icon.png" alt="SchoolVan Icon" className="w-14 h-14 rounded-2xl shadow-lg border border-yellow-400/30" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2.5 py-0.5 rounded-full border border-yellow-400/20">
                  PWA Nativo
                </span>
                <h3 className="text-xl font-black text-white">Instalar App SchoolVan</h3>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
              Transforme este site em um <strong className="text-yellow-400">Aplicativo Nativo em Tela Cheia</strong>, com ícone próprio na tela de início, carregamento veloz e suporte offline.
            </p>

            {isIOS ? (
              <div className="space-y-3 bg-gray-800/80 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 text-yellow-400 font-extrabold text-sm">
                  <Share size={18} /> Passos para iPhone / iPad (Safari):
                </div>
                <ol className="text-xs text-gray-200 space-y-2 list-decimal list-inside">
                  <li>Toque no botão <strong className="text-white">Compartilhar</strong> (ícone de quadrado com seta no rodapé do Safari).</li>
                  <li>Role a lista para baixo e clique em <strong className="text-yellow-400">"Adicionar à Tela de Início"</strong>.</li>
                  <li>Clique em <strong className="text-white">"Adicionar"</strong> no canto superior direito.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 bg-gray-800/80 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 text-yellow-400 font-extrabold text-sm">
                  <Smartphone size={18} /> Passos para Android (Chrome / Edge / Samsung):
                </div>
                <ol className="text-xs text-gray-200 space-y-2 list-decimal list-inside">
                  <li>Toque no menu de <strong className="text-white">Três Pontinhos (⋮)</strong> no canto superior direito do navegador.</li>
                  <li>Selecione a opção <strong className="text-yellow-400">"Instalar aplicativo"</strong> ou <strong className="text-yellow-400">"Adicionar à tela inicial"</strong>.</li>
                  <li>Confirme a instalação para abrir o app em tela cheia sem barras de navegador.</li>
                </ol>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={18} /> INSTALAR AGORA AUTOMATICAMENTE
                </button>
              )}
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Entendi, vou instalar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 BOTTOM FLOATING PWA BANNER */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-900 text-white p-4 rounded-3xl shadow-2xl z-40 border border-yellow-400/40 flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="SchoolVan" className="w-11 h-11 rounded-2xl shrink-0 border border-yellow-400/40 shadow-md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-yellow-400 truncate">App SchoolVan</h4>
                <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.2 rounded font-bold">PWA</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">
                Instale em 1 clique para abrir em tela cheia e receber notificações.
              </p>
            </div>

            <button
              onClick={() => setShowBanner(false)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
              title="Fechar aviso"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 bg-yellow-400 text-gray-950 font-black rounded-xl text-xs hover:bg-yellow-300 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download size={15} /> Instalar App
            </button>

            {!pushEnabled ? (
              <button
                onClick={handleEnablePush}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell size={14} className="text-yellow-400" /> Ativar Push
              </button>
            ) : (
              <span className="px-3 py-2 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-xl flex items-center gap-1 border border-green-500/30">
                <CheckCircle2 size={12} /> Push Ativo
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}


