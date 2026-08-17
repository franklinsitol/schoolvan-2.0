import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Send, 
  Copy, 
  Phone, 
  Check, 
  MessageCircle, 
  Clock, 
  Bot, 
  Sparkles, 
  ShieldAlert, 
  Users, 
  PhoneCall,
  Volume2
} from 'lucide-react';
import { Student } from '../types';
import { playBusHornSound, speakTiaPrompt } from '../lib/sound';
import toast from 'react-hot-toast';

export type IncidentType = 'pneu' | 'transito' | 'chuva' | 'emergencia';

interface RouteIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: IncidentType;
  students: Student[];
  onOpenTioIAWithPrompt?: (prompt: string) => void;
}

export function RouteIncidentModal({
  isOpen,
  onClose,
  initialType = 'pneu',
  students,
  onOpenTioIAWithPrompt
}: RouteIncidentModalProps) {
  const [incidentType, setIncidentType] = useState<IncidentType>(initialType);
  const [estimatedDelay, setEstimatedDelay] = useState('20');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync initialType when opened
  useEffect(() => {
    setIncidentType(initialType);
  }, [initialType]);

  // Generate message based on type and delay
  useEffect(() => {
    switch (incidentType) {
      case 'pneu':
        setCustomMessage(
          `🚌💛 *Comunicado SchoolVan - Imprevisto Mecânico*\n\n` +
          `Olá pais e responsáveis! Informamos que tivemos um imprevisto mecânico/pneu furado com a van durante a rota.\n\n` +
          `✅ *Todos os alunos estão em total segurança e bem acomodados dentro do veículo.*\n` +
          `⏱️ *Previsão de Atraso:* Cerca de ${estimatedDelay} a ${parseInt(estimatedDelay, 10) + 10} minutos enquanto realizamos o reparo.\n\n` +
          `Manteremos todos informados a cada etapa! Qualquer dúvida estamos à disposição.`
        );
        break;

      case 'transito':
        setCustomMessage(
          `🚦🚌 *Comunicado SchoolVan - Trânsito Intenso*\n\n` +
          `Olá famílias! Informamos que o trânsito está bastante congestionado e lento na região da rota neste momento.\n\n` +
          `✅ *As crianças estão tranquilas na van em deslocamento seguro.*\n` +
          `⏱️ *Previsão de Atraso:* Aproximadamente ${estimatedDelay} minutos na chegada.\n\n` +
          `Obrigado pela compreensão!`
        );
        break;

      case 'chuva':
        setCustomMessage(
          `🌧️🚌 *Comunicado SchoolVan - Chuva Forte e Trânsito Lento*\n\n` +
          `Olá pais e responsáveis! Devido à chuva intensa e pontos de lentidão, estamos dirigindo em velocidade reduzida prezando 100% pela segurança das crianças.\n\n` +
          `⏱️ *Previsão de Atraso:* Cerca de ${estimatedDelay} minutos.\n` +
          `Agradecemos a confiança de sempre!`
        );
        break;

      case 'emergencia':
        setCustomMessage(
          `🚨 *ALERTA DE EMERGÊNCIA OPERACIONAL - TRANSPORTE ESCOLAR*\n\n` +
          `Atenção: A van escolar necessitou de parada de suporte emergencial. As autoridades competentes e equipe de apoio já foram acionadas. Todos os alunos estão assistidos.`
        );
        break;
    }
  }, [incidentType, estimatedDelay]);

  if (!isOpen) return null;

  const validStudents = students.filter(s => s.status !== 'Excluido' && (s.parentPhone || s.tel1 || s.tel2));

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    toast.success('Mensagem do alerta copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone) {
      toast.error('Telefone do responsável não cadastrado.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
  };

  const handleAskTioIA = () => {
    playBusHornSound();
    const prompt = `Avisar todos os pais da rota sobre: ${incidentType === 'pneu' ? 'Pneu Furado / Imprevisto Mecânico' : incidentType === 'transito' ? 'Trânsito Intenso' : incidentType === 'chuva' ? 'Chuva Forte' : 'Emergência'}. Mensagem gerada: "${customMessage}"`;
    
    speakTiaPrompt("Tio, já preparei o comunicado de imprevisto pra avisar os pais no WhatsApp agora mesmo!");

    if (onOpenTioIAWithPrompt) {
      onClose();
      onOpenTioIAWithPrompt(prompt);
    } else {
      handleCopyMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200">
        
        {/* Header */}
        <div className={`p-6 text-white flex items-center justify-between shrink-0 ${
          incidentType === 'emergencia' 
            ? 'bg-gradient-to-r from-red-700 via-rose-800 to-red-950' 
            : 'bg-gradient-to-r from-gray-950 via-slate-900 to-gray-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg ${
              incidentType === 'emergencia' ? 'bg-white text-red-700' : 'bg-yellow-400 text-gray-950'
            }`}>
              <AlertTriangle size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Alertas Rápidos em Rota
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">
                {incidentType === 'emergencia' ? 'Central de Emergência & Apoio' : 'Avisar Pais sobre Imprevisto'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          
          {/* Incident Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setIncidentType('pneu')}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-black text-xs flex flex-col items-center gap-1.5 ${
                incidentType === 'pneu'
                  ? 'bg-yellow-400 text-gray-950 border-yellow-500 shadow-md scale-102'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">🛞</span>
              <span>Pneu Furado</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentType('transito')}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-black text-xs flex flex-col items-center gap-1.5 ${
                incidentType === 'transito'
                  ? 'bg-yellow-400 text-gray-950 border-yellow-500 shadow-md scale-102'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">🚦</span>
              <span>Trânsito Intenso</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentType('chuva')}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-black text-xs flex flex-col items-center gap-1.5 ${
                incidentType === 'chuva'
                  ? 'bg-yellow-400 text-gray-950 border-yellow-500 shadow-md scale-102'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">🌧️</span>
              <span>Chuva Forte</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentType('emergencia')}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-black text-xs flex flex-col items-center gap-1.5 ${
                incidentType === 'emergencia'
                  ? 'bg-red-600 text-white border-red-700 shadow-md scale-102 animate-pulse'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">🚨</span>
              <span>Emergência</span>
            </button>
          </div>

          {/* Emergency Fast Dial Bar if emergency selected */}
          {incidentType === 'emergencia' && (
            <div className="bg-red-50 border-2 border-red-200 p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-red-950 font-black text-xs uppercase tracking-wider">
                <ShieldAlert size={18} className="text-red-600" />
                <span>Discagem Imediata para Serviços Públicos de Emergência</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href="tel:190"
                  className="p-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <PhoneCall size={18} />
                  <span>190 - Polícia Militar</span>
                </a>

                <a
                  href="tel:192"
                  className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <PhoneCall size={18} />
                  <span>192 - SAMU</span>
                </a>

                <a
                  href="tel:193"
                  className="p-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <PhoneCall size={18} />
                  <span>193 - Bombeiros</span>
                </a>
              </div>
            </div>
          )}

          {/* Delay Setting if not emergency */}
          {incidentType !== 'emergencia' && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-yellow-600 shrink-0" />
                <span className="text-xs font-bold text-gray-800">Estimativa de Atraso:</span>
              </div>

              <div className="flex items-center gap-2">
                {['10', '20', '30', '45'].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEstimatedDelay(mins)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      estimatedDelay === mins
                        ? 'bg-yellow-400 text-gray-950 shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    +{mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editable Message Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                Texto do Comunicado para os Pais
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs font-bold text-yellow-700 hover:text-yellow-900 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none leading-relaxed"
            />
          </div>

          {/* T.IA Assistant Quick Action Banner */}
          <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-transparent border-2 border-yellow-400/50 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-gray-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-600" /> Copiloto T.IA de Bordo
                </h4>
                <p className="text-xs text-gray-700 mt-0.5">
                  A T.IA pode redigir e enviar as mensagens de alerta diretamente no viva-voz.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAskTioIA}
              className="px-4 py-2.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Bot size={14} />
              <span>Pedir à T.IA para avisar</span>
            </button>
          </div>

          {/* List of Active Parents to Message directly */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Users size={15} className="text-yellow-500" /> Responsáveis na Rota ({validStudents.length})
              </span>
              <span className="text-[11px] text-gray-500 font-semibold">
                Disparo individual com 1 toque
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {validStudents.map((st) => {
                const phone = st.parentPhone || st.tel1 || st.tel2;
                return (
                  <div 
                    key={st.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs"
                  >
                    <div>
                      <h5 className="font-extrabold text-gray-950">{st.name}</h5>
                      <p className="text-[11px] text-gray-600 font-medium">
                        Resp: {st.parentName || 'Responsável'} {phone ? `• ${phone}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(phone)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <MessageCircle size={13} />
                      <span>Enviar no Zap</span>
                    </button>
                  </div>
                );
              })}

              {validStudents.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl">
                  Nenhum aluno ativo com telefone de responsável cadastrado nesta rota.
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Copy size={16} />
              <span>Copiar Comunicado</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
