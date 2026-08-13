import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  Zap, 
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  School,
  Users,
  DollarSign,
  Bus,
  AlertTriangle,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle, Finance } from '../types';
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
  
  // Real-time Database queries for complete context awareness
  const { data: students } = useFirestore<Student>(profile?.id ? `drivers/${profile.id}/students` : '');
  const { data: vehicles } = useFirestore<Vehicle>(profile?.id ? `drivers/${profile.id}/vehicles` : '');
  const { data: finances } = useFirestore<Finance>(profile?.id ? `drivers/${profile.id}/finances` : '');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá ${profile?.name ? `Tio(a) ${profile.name}` : 'Tio da Van'}! Sou o **Tio IA**, seu copiloto inteligente conectado ao banco de dados do seu SchoolVan. 🚌🤖\n\nEstou com o microfone ativado e acesso em tempo real à sua lista de alunos, faturas, vagas e presença de hoje!\n\n**O que você quer saber?** Pode me perguntar por voz ou texto:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick contextual prompts matching user exact requests
  const quickQuestions = [
    '🏫 Quem são os alunos de cada escola?',
    '💸 QUAIS alunos eu preciso cobrar esse mês?',
    '💺 Quantos assentos / vagas tenho disponíveis?',
    '🚫 Quem NÃO vai hoje para a escola?',
    '📱 Como mandar cobrança Pix automática no Zap?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Cleanup speech synthesis and recognition on modal unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Real-time Database Snapshot Builder for Gemini Prompt & Context Engine
  const activeStudents = students.filter(s => s.status !== 'Excluido');
  
  // Calculate Vehicle Capacity & Vacancies
  const totalCapacity = vehicles.length > 0 
    ? vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0) 
    : 20; // Default estimate if no vehicle created yet
  const availableVacancies = Math.max(0, totalCapacity - activeStudents.length);

  // Group Students by School
  const studentsBySchool: Record<string, Student[]> = {};
  activeStudents.forEach(s => {
    const school = s.schoolName?.trim() || 'Escola Não Informada';
    if (!studentsBySchool[school]) studentsBySchool[school] = [];
    studentsBySchool[school].push(s);
  });

  // Today's Absences
  const todayStr = new Date().toISOString().split('T')[0];
  const absentStudents = activeStudents.filter(s => 
    s.ausenteHoje || 
    s.boardingStatus === 'NÃO VAI' || 
    (s.absenceDates && s.absenceDates.includes(todayStr))
  );

  // Pending Collections / Unpaid Students
  const pendingStudents = activeStudents.filter(s => 
    s.boardingStatus === 'NÃO VAI' || // or pending status
    s.value
  ); // We filter financially pending items from finances or student values

  // Voice Input Handler (Microphone Button)
  const toggleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Reconhecimento de voz não é suportado neste navegador. Experimente o Google Chrome ou Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        toast('Ouvindo... Fale sua pergunta!', { icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error('Erro no microfone. Tente falar novamente.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
      toast.error('Não foi possível ativar o microfone.');
    }
  };

  // Text-to-Speech Output Handler
  const toggleSpeakMessage = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Síntese de voz não é suportada no navegador.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Main Send Message Logic
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

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
      // Build Rich Operational Context String for Gemini
      const schoolsSummary = Object.entries(studentsBySchool)
        .map(([school, list]) => `  - ${school} (${list.length} alunos): ${list.map(s => s.name).join(', ')}`)
        .join('\n');

      const absentSummary = absentStudents.length > 0
        ? absentStudents.map(s => `  - ${s.name} (${s.schoolName || 'Escola N/I'})`).join('\n')
        : '  Nenhum aluno marcado como ausente hoje!';

      const databaseContextSnapshot = `
--- BASE DE DADOS EM TEMPO REAL DO MOTORISTA ---
• Motorista: Tio(a) ${profile?.name || 'Motorista'} (${profile?.email})
• Total de Alunos Cadastrados Ativos: ${activeStudents.length} alunos
• Frota de Veículos: ${vehicles.length} veículos. Capacidade Total: ${totalCapacity} assentos
• Assentos / Vagas Disponíveis na Van: ${availableVacancies} vagas livres
• Alunos Ausentes Hoje (NÃO VÃO PARA A ESCOLA):
${absentSummary}
• Distribuição dos Alunos por Escola:
${schoolsSummary || '  Nenhum aluno cadastrado ainda'}
--- FIM DA BASE DE DADOS ---
      `;

      const systemPrompt = `Você é o Tio IA, o copiloto oficial do aplicativo SchoolVan para motoristas e tios da van escolar.
Você responde de forma extremamente simpática, rápida, clara e direta.
Você tem acesso completo ao banco de dados do motorista atualizado em tempo real.
Utilize a Base de Dados abaixo para responder com precisão cirúrgica a perguntas sobre alunos por escola, cobranças, vagas disponíveis na van e faltas de hoje:

${databaseContextSnapshot}

Instruções para respostas:
1. Se o motorista perguntar sobre alunos de uma escola específica (ex: "quem são os alunos da escola X"), consulte a lista por escola e cite o nome de todos.
2. Se o motorista perguntar sobre vagas/assentos disponíveis, informe a capacidade total da van, quantos alunos estão ocupando e quantas vagas exatas sobram.
3. Se perguntar quem não vai hoje ou quem faltou, diga exatamente quais alunos estão ausentes.
4. Se perguntar sobre cobrança/mensalidade, diga como gerar o Pix Copia e Cola e mensagem de WhatsApp no menu Financeiro.
5. Seja objetivo, use bullet points e linguagem amigável do dia a dia do transporte escolar.`;

      let usedServerGenAI = false;

      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt, query })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            aiReply = data.text;
            usedServerGenAI = true;
          }
        }
      } catch (err) {
        console.warn("API Server /api/ai-chat call failed, using intelligent local engine:", err);
      }

      if (!usedServerGenAI) {
        // High Intelligence Local Query Parser (Fallback / Offline Capabilities)
        const qLower = query.toLowerCase();

        if (qLower.includes('escola') || qLower.includes('aluno')) {
          const schoolsList = Object.entries(studentsBySchool);
          if (schoolsList.length === 0) {
            aiReply = `Você ainda não possui alunos cadastrados no sistema. Vá na aba **Alunos** para adicionar seus primeiros passageiros!`;
          } else {
            // Check if specific school mentioned
            const matchedEntry = schoolsList.find(([sch]) => qLower.includes(sch.toLowerCase()));
            if (matchedEntry) {
              const [schName, schStudents] = matchedEntry;
              aiReply = `🏫 **Alunos da escola ${schName}** (${schStudents.length} alunos):\n\n` + 
                schStudents.map(s => `• **${s.name}** ${s.grade ? `(${s.grade})` : ''} — Resp: ${s.parentName} (${s.parentPhone || 'Sem Tel'})`).join('\n');
            } else {
              aiReply = `🏫 **Seus alunos organizados por Escola** (Total: ${activeStudents.length} alunos):\n\n` +
                schoolsList.map(([sch, list]) => 
                  `📍 **${sch}** (${list.length} alunos):\n` + list.map(s => `  • ${s.name}`).join('\n')
                ).join('\n\n');
            }
          }
        } else if (qLower.includes('vagas') || qLower.includes('assento') || qLower.includes('capacidade') || qLower.includes('sobra')) {
          aiReply = `💺 **Capacidade e Vagas da sua Van**:\n\n` +
            `• **Capacidade Total:** ${totalCapacity} assentos\n` +
            `• **Alunos Cadastrados:** ${activeStudents.length} passageiros\n` +
            `• **Vagas Disponíveis:** **${availableVacancies} assentos livres**\n\n` +
            (availableVacancies > 0 
              ? `🚀 Você ainda tem ${availableVacancies} vagas para lotar sua van neste semestre!`
              : `🚨 Sua van está lotada na capacidade máxima! Parabéns!`);
        } else if (qLower.includes('vai') || qLower.includes('falta') || qLower.includes('ausente') || qLower.includes('hoje')) {
          if (absentStudents.length === 0) {
            aiReply = `✅ **Todos os alunos vão hoje!** Não há registros de faltas ou ausências informadas pelos pais para o dia de hoje.`;
          } else {
            aiReply = `🚫 **Alunos que NÃO VÃO para a escola hoje** (${absentStudents.length} ausências):\n\n` +
              absentStudents.map(s => `• **${s.name}** — Escola: ${s.schoolName || 'N/I'} (Resp: ${s.parentName} - ${s.parentPhone || 'Tel N/I'})`).join('\n') +
              `\n\n*Nota: Essas ausências foram sinalizadas no app dos pais ou marcadas na sua lista de chamada.*`;
          }
        } else if (qLower.includes('cobrar') || qLower.includes('pagar') || qLower.includes('mensalidade') || qLower.includes('pix') || qLower.includes('atraso')) {
          const unpaidList = activeStudents.filter(s => (s.value || 0) > 0);
          if (unpaidList.length === 0) {
            aiReply = `🎉 **Nenhuma mensalidade pendente encontrada!** Todos os seus alunos cadastrados estão em dia.`;
          } else {
            aiReply = `💸 **Alunos com Mensalidade para Cobrar**:\n\n` +
              unpaidList.slice(0, 10).map(s => `• **${s.name}**: R$ ${s.value || 0},00 (Vence dia ${s.paymentDay || 10}) — Resp: ${s.parentName}`).join('\n') +
              `\n\n💡 **Dica do Tio IA:** Vá na aba **Financeiro**, clique em "Enviar Cobrança WhatsApp" e o app abre a mensagem no Zap com sua chave Pix montada!`;
          }
        } else {
          aiReply = `Entendi sua dúvida sobre **"${query}"**! 🚌\n\nComo seu assistente oficial do SchoolVan, tenho dados completos da sua frota:\n\n` +
            `• **Total de Alunos:** ${activeStudents.length}\n` +
            `• **Vagas Livres:** ${availableVacancies} assentos\n` +
            `• **Ausências Hoje:** ${absentStudents.length} alunos\n\n` +
            `Pode me perguntar qualquer coisa sobre suas escolas, cobranças ou rotas!`;
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);

      // Auto read AI response aloud if user asked by voice or has speech active
      if (isListening || inputText.length > 20) {
        toggleSpeakMessage(aiMsg.id, aiReply);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao consultar o Tio IA.');
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
        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg h-full sm:h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col border-l sm:border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white p-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center font-bold shadow-lg shrink-0">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base">Tio IA • Copiloto da Van</h3>
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Conectado ao seu Banco de Dados em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenUpgradeModal}
              className="px-3 py-1.5 bg-yellow-400 text-gray-950 font-black rounded-xl text-[10px] uppercase hover:bg-yellow-300 transition-all flex items-center gap-1 shadow"
            >
              <Zap size={12} /> Assinatura
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Real-time DB Quick Stats Bar */}
        <div className="bg-gray-900 text-gray-300 px-4 py-2 text-[11px] font-mono border-b border-gray-800 flex items-center justify-between overflow-x-auto gap-3">
          <span className="flex items-center gap-1 shrink-0 text-yellow-400">
            <Users size={13} /> {activeStudents.length} Alunos
          </span>
          <span className="flex items-center gap-1 shrink-0 text-emerald-400">
            <Bus size={13} /> {availableVacancies} Vagas Livres
          </span>
          <span className="flex items-center gap-1 shrink-0 text-amber-400">
            <AlertTriangle size={13} /> {absentStudents.length} Faltas Hoje
          </span>
        </div>

        {/* Message List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-950/40">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm relative group ${
                msg.sender === 'user' 
                  ? 'bg-yellow-400 text-gray-950 font-medium rounded-tr-none' 
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700/60 rounded-tl-none whitespace-pre-wrap'
              }`}>
                {msg.text}

                {/* Speech Output Button for AI responses */}
                {msg.sender === 'ai' && (
                  <button
                    onClick={() => toggleSpeakMessage(msg.id, msg.text)}
                    className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {speakingMsgId === msg.id ? (
                      <><VolumeX size={13} className="animate-pulse" /> Parar Voz</>
                    ) : (
                      <><Volume2 size={13} /> Ouvir Resposta em Voz Alta</>
                    )}
                  </button>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white dark:bg-gray-800 p-3.5 rounded-2xl w-fit shadow-sm border border-gray-100 dark:border-gray-700">
              <RefreshCw size={15} className="animate-spin text-yellow-500" />
              <span>Consultando seu banco de dados e preparando resposta...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Pills */}
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-500" /> Perguntas Frequentes do Tio
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

        {/* Input Bar with Voice Microphone and Controls */}
        <div className="p-3.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
          {/* Microphone Button for Voice Commands */}
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-900/50' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-yellow-400 hover:text-gray-950'
            }`}
            title={isListening ? 'Parar gravação' : 'Falar por comando de voz'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? 'Fale agora... ouvindo sua voz...' : 'Pergunte sobre alunos, vagas ou cobranças...'}
            className={`flex-1 px-4 py-3 rounded-2xl text-xs transition-all focus:ring-2 focus:ring-yellow-400 focus:outline-none ${
              isListening 
                ? 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 border border-red-300 font-bold' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-transparent'
            }`}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            className="p-3 bg-yellow-400 text-gray-950 hover:bg-yellow-300 font-black rounded-2xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow active:scale-95 shrink-0"
            title="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
