import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Code, ShieldCheck, Bell, Zap, Terminal, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface PWAShellDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAShellDocsModal({ isOpen, onClose }: PWAShellDocsModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const appHtmlSnippet = `<!-- /public/app.html ou /Site/app.html -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>PWA Shell App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0b0f17">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="manifest.json">

  <style>
    :root { --primary: #f59e0b; --bg: #0b0f17; }
    body { margin:0; padding:0; background: var(--bg); overflow: hidden; font-family: system-ui; }
    #app-frame { position: absolute; top:0; left:0; width:100%; height:100%; border:0; z-index:1; }
    #pwa-banner { position: fixed; bottom:20px; left:50%; transform: translateX(-50%); z-index:99; background: rgba(20,25,35,0.95); border: 1px solid rgba(245,158,11,0.4); padding: 10px 16px; border-radius: 99px; display:flex; gap:12px; align-items:center; }
  </style>
</head>
<body>
  <iframe id="app-frame" src="/" allow="geolocation; camera; microphone; clipboard-write;"></iframe>

  <script>
    // 1. Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }

    // 2. Transmita Sessão para Iframe
    window.addEventListener('load', () => {
      const sess = sessionStorage.getItem('pwa_session');
      if (sess) {
        const data = JSON.parse(sess);
        document.getElementById('app-frame').src = '/?email=' + encodeURIComponent(data.email) + '&token=' + encodeURIComponent(data.token);
      }
    });

    // 3. PostMessage Logout Listener
    window.addEventListener('message', (evt) => {
      if (evt.data && evt.data.action === 'logout') {
        sessionStorage.removeItem('pwa_session');
        document.getElementById('app-frame').src = '/';
      }
    });

    // 4. Soft Polling Push Token
    let pushToken = 'pwa_token_' + Math.random().toString(36).substring(2);
    setInterval(() => {
      const frame = document.getElementById('app-frame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ action: 'pushToken', token: pushToken }, '*');
      }
    }, 5000);
  </script>
</body>
</html>`;

  const childAppSnippet = `// Código para rodar DENTRO da Aplicação Remota (Iframe / Google Apps Script / Node)
// 1. Capturar o Push Token enviado pelo Shell PWA
window.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'pushToken') {
    const pushToken = event.data.token;
    console.log('Push Token Recebido da Casca PWA:', pushToken);

    // Salve o token no seu banco de dados (ex: Google Sheets, Firestore, PostgreSQL)
    fetch('/api/save-push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pushToken })
    });

    // Avise o Shell que o token foi recebido com sucesso
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'pushTokenReceived' }, '*');
    }
  }
});

// 2. Quando o usuário clica em "Sair / Logout" dentro da aplicação remota:
function executeLogout() {
  // Limpe os cookies/localStorage locais
  localStorage.clear();
  sessionStorage.clear();

  // Avise a "casca" PWA Shell para ser resetada
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ action: 'logout' }, '*');
  } else {
    window.location.reload();
  }
}`;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 text-white rounded-[32px] max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-gray-800 relative my-8 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 w-max mb-2">
              <Layers size={14} /> Arquitetura PWA Shell com Iframe
            </span>
            <h2 className="text-2xl font-black text-white">
              Guia Completo de Integração
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Todos os arquivos <code className="text-yellow-400">/public/app.html</code>, <code className="text-yellow-400">/public/Site/app.html</code>, <code className="text-yellow-400">sw.js</code> e <code className="text-yellow-400">manifest.json</code> já foram criados e configurados na aplicação!
            </p>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700/60 space-y-1">
              <div className="text-yellow-400 font-extrabold text-xs flex items-center gap-1">
                <Smartphone size={14} /> PWA Shell Ultrafast
              </div>
              <p className="text-[11px] text-gray-400">
                Carrega em milissegundos, com botões animados e instalação nativa PWA.
              </p>
            </div>

            <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700/60 space-y-1">
              <div className="text-yellow-400 font-extrabold text-xs flex items-center gap-1">
                <Bell size={14} /> Push Token Polling
              </div>
              <p className="text-[11px] text-gray-400">
                Soft polling a cada 5s enviando o token Push para dentro do Iframe.
              </p>
            </div>

            <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700/60 space-y-1">
              <div className="text-yellow-400 font-extrabold text-xs flex items-center gap-1">
                <ShieldCheck size={14} /> Reset via postMessage
              </div>
              <p className="text-[11px] text-gray-400">
                O evento de logout reseta a casca PWA e limpa os dados de sessão.
              </p>
            </div>
          </div>

          {/* Code Snippet 1: Remote App Implementation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-yellow-400 tracking-wider flex items-center gap-1.5">
                <Code size={14} /> 1. Como a Aplicação Remota (Iframe) deve agir:
              </h3>
              <button
                onClick={() => copyCode(childAppSnippet, 'child')}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold border border-gray-700"
              >
                {copiedSection === 'child' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copiedSection === 'child' ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
            <pre className="bg-black/80 p-4 rounded-2xl text-[11px] text-green-400 font-mono overflow-x-auto border border-gray-800 leading-relaxed">
              {childAppSnippet}
            </pre>
          </div>

          {/* Code Snippet 2: Shell app.html */}
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-yellow-400 tracking-wider flex items-center gap-1.5">
                <Terminal size={14} /> 2. Código do PWA Shell (/public/app.html):
              </h3>
              <button
                onClick={() => copyCode(appHtmlSnippet, 'shell')}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold border border-gray-700"
              >
                {copiedSection === 'shell' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copiedSection === 'shell' ? 'Copiado!' : 'Copiar Shell HTML'}</span>
              </button>
            </div>
            <pre className="bg-black/80 p-4 rounded-2xl text-[11px] text-yellow-200/90 font-mono overflow-x-auto border border-gray-800 leading-relaxed">
              {appHtmlSnippet}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
