import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Bell, Share, CheckCircle2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    if (Notification && Notification.permission === 'granted') {
      setPushEnabled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      toast.success('SchoolVan instalado com sucesso!');
    });

    // Show prompt automatically after 2 seconds if not standalone
    if (!isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosGuide(true);
    } else {
      toast('Para instalar, clique no menu do navegador (⋮) e selecione "Adicionar à Tela Inicial".', {
        icon: '📱',
        duration: 6000
      });
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
        toast.success('Notificações Push Ativadas! Você receberá avisos em tempo real.');
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('SchoolVan Conectado', {
            body: 'As notificações do transporte escolar estão funcionando no seu aparelho!',
            icon: '/icon.png'
          });
        }
      } else {
        toast.error('Permissão de notificação negada.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar permissão de notificações.');
    }
  };

  if (!showPrompt && !showIosGuide) return null;

  return (
    <>
      {/* iOS Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 text-white p-6 rounded-3xl max-w-sm w-full space-y-4 border border-yellow-400/30 relative">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-yellow-400 text-gray-900 rounded-2xl flex items-center justify-center mx-auto">
              <Share size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-yellow-400">Instalar no iPhone / iPad</h3>
            <ol className="text-xs space-y-3 text-gray-300 list-decimal list-inside bg-white/5 p-4 rounded-2xl">
              <li>Toque no ícone de <strong className="text-white">Compartilhar</strong> (quadrado com seta no navegador Safari).</li>
              <li>Role para baixo no menu e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>.</li>
              <li>Confirme clicando em <strong className="text-yellow-400">"Adicionar"</strong> no canto superior direito.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-xl text-xs hover:bg-yellow-300 transition-all cursor-pointer"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}

      {/* Floating PWA & Push Notification Banner */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-900 text-white p-4 rounded-3xl shadow-2xl z-50 border border-yellow-400/30 flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-gray-900 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
              <Smartphone size={22} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-yellow-400 truncate">App SchoolVan Nativo</h4>
              <p className="text-[11px] text-gray-300 leading-tight">
                Instale no seu celular e receba alertas sem PlayStore.
              </p>
            </div>

            <button
              onClick={() => setShowPrompt(false)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 bg-yellow-400 text-gray-900 font-extrabold rounded-xl text-xs hover:bg-yellow-300 transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download size={15} /> Instalar App
            </button>

            {!pushEnabled ? (
              <button
                onClick={handleEnablePush}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                title="Ativar Notificações Push Gratuitas"
              >
                <Bell size={15} className="text-yellow-400" /> Ativar Push
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

