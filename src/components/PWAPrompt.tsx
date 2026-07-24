import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2 } from 'lucide-react';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-900 text-white p-4 rounded-3xl shadow-2xl z-50 border border-yellow-400/30 flex items-center gap-4 animate-bounce-short">
      <div className="w-12 h-12 bg-yellow-400 text-gray-900 rounded-2xl flex items-center justify-center shrink-0">
        <Smartphone size={24} />
      </div>

      <div className="flex-1">
        <h4 className="font-bold text-sm text-yellow-400">Instale o App SchoolVan</h4>
        <p className="text-xs text-gray-300">
          Acesse sem precisar baixar da PlayStore. Direto na sua tela inicial!
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-2 bg-yellow-400 text-gray-900 font-bold rounded-xl text-xs hover:bg-yellow-300 transition-all shadow flex items-center gap-1"
        >
          <Download size={14} /> Instalar
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
