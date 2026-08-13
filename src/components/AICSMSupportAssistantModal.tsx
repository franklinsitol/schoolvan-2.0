import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  MessageSquare, 
  HelpCircle, 
  Zap, 
  ChevronRight, 
  Copy, 
  Check, 
  RefreshCw,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface AICSMSupportAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal: () => void;
}

export function AICSMSupportAssistantModal({ 
  isOpen, 
  onClose,
  onOpenUpgradeModal
}: AICSMSupportAssistantModalProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá ${profile?.name || 'Motorista'}! Sou o **Assistente de Sucesso do SchoolVan (IA)**. 🚌\n\nComo posso te ajudar hoje com suas rotas, cobranças Pix, dúvidas sobre o PWA ou dicas para captar mais alunos?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    '💡 Como cadastrar minha chave Pix e receber dos pais?',
    '📱 Como os pais instalam o app no iPhone/Android?',
    '🚌 Como organizar as rotas por escola no GPS?',
    '🚀 Quais as vantagens do Plano Pro (R$ 79/mês)?',
    '🧾 Dicas para diminuir a inadimplência das mensalidades'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      let aiReply = '';
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = `Você é o CSM Digital (Gerente de Sucesso de Cliente com IA) do SchoolVan, a maior plataforma PWA de gestão de vans e transporte escolar do Brasil.
        Você atende motoristas e monitores de transporte escolar de forma extremamente cordial, prática, direta e motivadora.
        Seu objetivo é ajudar o motorista a configurar o perfil, chave Pix, cadastrar alunos, organizar rotas e orientar como utilizar o PWA no celular dos pais.
        Responda em tom profissional e amigável em português do Brasil. Use formatação em Markdown com tópicos simples.
        Nome do motorista: ${profile?.name || 'Motorista'}. Plano atual: ${profile?.plan || 'Gratuito'}.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemPrompt}\n\nPergunta do Motorista: ${query}`,
        });

        aiReply = response.text || 'Desculpe, tive um pequeno problema ao processar sua pergunta. Como posso te ajudar?';
      } else {
        // High quality contextual fallback knowledge base engine
        const qLower = query.toLowerCase();
        if (qLower.includes('pix') || qLower.includes('receber') || qLower.includes('cobrança')) {
          aiReply = `Para cadastrar e usar sua **Chave Pix** no SchoolVan:\n\n1. Vá em **Perfil** no menu lateral.\n2. Insira sua chave Pix (CPF, celular, e-mail ou aleatória) e salve.\n3. No menu **Financeiro**, clique em **Falar no WhatsApp** ao lado da fatura do aluno.\n4. O app gera automaticamente uma mensagem personalizada formatada com o valor e sua chave Pix em 1 clique!`;
        } else if (qLower.includes('instalar') || qLower.includes('pwa') || qLower.includes('iphone') || qLower.includes('android')) {
          aiReply = `Para os pais ou para você instalarem o **SchoolVan como App Nativo**:\n\n* **No Android (Chrome):** Clique no banner "Instalar Aplicativo" no topo ou vá no menu do navegador (3 pontinhos) -> **Adicionar à tela inicial**.\n* **No iPhone (Safari):** Abra o link do app, toque no ícone de **Compartilhar** (quadrado com seta para cima) -> **Adicionar à Tela de Início**.\n\nPronto! O app funcionará em janela dedicada como um aplicativo baixado da loja!`;
        } else if (qLower.includes('rota') || qLower.includes('gps') || qLower.includes('ordem') || qLower.includes('escola')) {
          aiReply = `Para organizar sua **Rota e GPS**:\n\n1. Acesse a aba **Rotas & GPS** no menu lateral.\n2. Escolha o turno (Manhã, Tarde ou Noite) e o veículo.\n3. Clique em **Reordenar por Escola** para agrupar as paradas por proximidade do horário escolar.\n4. Clique em **Navegar Rota no Google Maps** para abrir todas as paradas sequenciais no seu mapa GPS!`;
        } else if (qLower.includes('pro') || qLower.includes('vantagens') || qLower.includes('plano')) {
          aiReply = `As vantagens do **Plano Pro (R$ 79/mês)** incluem:\n\n* **Alunos Ilimitados:** Remova a trava de 25 alunos.\n* **Web Push PWA para Pais:** Notificações em tempo real diretamente na tela do celular do responsável.\n* **Gestão de Monitores:** Acessos individuais para sua equipe.\n* **Sem Fidelidade:** Cancele a qualquer momento com liberação via Pix imediata!`;
        } else if (qLower.includes('inadimplência') || qLower.includes('atraso') || qLower.includes('pagamento')) {
          aiReply = `Dicas de ouro para reduzir inadimplência no transporte escolar:\n\n1. **Envie o lembrete 3 dias antes do vencimento** pelo WhatsApp usando o gerador de mensagem do SchoolVan.\n2. **Ofereça desconto para pagamento até o dia 5**.\n3. **Use o status em tempo real:** Pais informados valorizam o serviço e priorizam o pagamento!`;
        } else {
          aiReply = `Entendi sua dúvida sobre **"${query}"**! Como seu Assistente de Sucesso do SchoolVan, estou aqui para garantir que sua frota rode com máxima eficiência. Você pode acessar os módulos pelo menu lateral ou clicar abaixo para falar direto com o nosso suporte via WhatsApp.`;
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o Assistente IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-end p-0 sm:p-4">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md h-full sm:h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col border-l sm:border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white p-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center font-bold shadow">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm">CSM Assistente IA</h3>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <p className="text-[11px] text-gray-400">Suporte Inteligente 24/7 • SchoolVan</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenUpgradeModal}
              className="px-2.5 py-1 bg-yellow-400 text-gray-950 font-black rounded-xl text-[10px] uppercase hover:bg-yellow-300 transition-all flex items-center gap-1"
            >
              <Zap size={12} /> Upgrade Pro
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-950/40">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-yellow-400 text-gray-950 font-medium rounded-tr-none' 
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700/60 rounded-tl-none whitespace-pre-wrap'
              }`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-2xl w-fit shadow-sm">
              <RefreshCw size={14} className="animate-spin text-yellow-500" />
              <span>Pensando e consultando a base do SchoolVan...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Pills */}
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-500" /> Dúvidas Frequentes
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-gray-700 dark:text-gray-300 hover:text-gray-950 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua dúvida aqui..."
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            className="p-2.5 bg-yellow-400 text-gray-950 hover:bg-yellow-300 font-bold rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow"
          >
            <Send size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
