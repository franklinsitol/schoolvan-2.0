import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Lock, 
  UserCheck, 
  CheckCircle2, 
  Scale, 
  Smartphone, 
  Eye, 
  Trash2, 
  Download, 
  Printer, 
  Info,
  Server,
  KeyRound,
  Baby,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'adhesion' | 'privacy' | 'security' | 'rights';
}

export function LegalTermsModal({ isOpen, onClose, defaultTab = 'adhesion' }: LegalTermsModalProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'adhesion' | 'privacy' | 'security' | 'rights'>(defaultTab);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportText = () => {
    const text = `SCHOOLVAN - TERMOS DE ADESÃO, PRIVACIDADE (LGPD) E SEGURANÇA DA INFORMAÇÃO\nVersão: 2026.1 (Em conformidade com a Lei Geral de Proteção de Dados - Lei nº 13.709/2018 e ECA - Lei nº 8.069/1990)\n\nConsulte o documento completo diretamente na plataforma SchoolVan.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SchoolVan_Termos_Privacidade_Seguranca_2026.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Documento exportado com sucesso!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gray-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck size={24} className="fill-gray-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Termos de Adesão, Privacidade & Segurança
                </h2>
                <span className="text-[10px] font-black bg-yellow-400 text-gray-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  LGPD 100% Conforme
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Em conformidade com a Lei nº 13.709/2018 (LGPD), Marco Civil da Internet e ECA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Imprimir Termos"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer hidden sm:flex items-center justify-center"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-50 border-b border-gray-200 px-4 sm:px-6 pt-2.5 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('adhesion')}
            className={cn(
              "pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
              activeTab === 'adhesion'
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            <FileText size={15} />
            <span>1. Termos de Adesão & Uso</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={cn(
              "pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
              activeTab === 'privacy'
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            <Eye size={15} />
            <span>2. Privacidade & LGPD (Menores)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              "pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
              activeTab === 'security'
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            <Lock size={15} />
            <span>3. Segurança da Informação</span>
          </button>

          <button
            onClick={() => setActiveTab('rights')}
            className={cn(
              "pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
              activeTab === 'rights'
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            <Scale size={15} />
            <span>4. Direitos do Titular & Exclusão</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-gray-800 text-xs sm:text-sm leading-relaxed">
          
          {/* TAB 1: TERMOS DE ADESÃO */}
          {activeTab === 'adhesion' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-start gap-3">
                <Info size={20} className="text-yellow-700 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-950 font-medium leading-relaxed">
                  Estes Termos regulam o licenciamento da plataforma de software como serviço (SaaS) <strong>SchoolVan</strong> para transportadores escolares autônomos/empresas de transporte e o acesso dos responsáveis pelos passageiros.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">1</span>
                  Objeto do Software & Autonomia Profissional
                </h3>
                <p className="text-gray-700">
                  O <strong>SchoolVan</strong> é uma plataforma tecnológica de gestão de rotas, chamada digital de embarque, controle financeiro e mensageria WhatsApp automatizada. <strong>O SchoolVan NÃO presta serviço direto de transporte escolar nem é empregador dos motoristas</strong>, atuando exclusivamente como provedor de software (SaaS) que conecta motoristas aos responsáveis.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">2</span>
                  Responsabilidades do Motorista / Transportador
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
                  <li>Manter a documentação do veículo, CNH e licenças municipais/estaduais de transporte escolar devidamente regularizadas junto aos órgãos competentes (Detran, Prefeituras).</li>
                  <li>Inserir informações cadastrais verídicas sobre capacidade de passageiros, escolas atendidas e rotas.</li>
                  <li>Realizar a cobrança e o recebimento das mensalidades de seus passageiros de forma direta através de sua chave Pix cadastrada.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">3</span>
                  Ciclo de Faturamento da Assinatura SaaS
                </h3>
                <p className="text-gray-700">
                  O plano de assinatura do software tem vencimento unificado todo <strong>dia 10 de cada mês</strong>. Novas contratações e adesões ao plano Pro ou Frota contam com liberação imediata de todos os recursos de software com cobrança pró-rata proporcional cobrada apenas no próximo ciclo de faturamento.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">4</span>
                  Política de Cancelamento Sem Fidelidade
                </h3>
                <p className="text-gray-700">
                  Não há fidelidade contratual nem multas de rescisão. O usuário pode alterar ou solicitar o encerramento de sua assinatura a qualquer momento através do menu de Suporte ou Gerenciador de Planos.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: PRIVACIDADE & LGPD */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                <Baby size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                    Proteção Especial a Dados de Crianças e Adolescentes (Art. 14 da LGPD)
                  </h4>
                  <p className="text-xs text-emerald-900 mt-1 font-medium leading-relaxed">
                    O tratamento de dados pessoais de crianças e adolescentes é realizado estritamente no seu melhor interesse, com a finalidade exclusiva de garantir a segurança física no transporte, comunicação de presença aos responsáveis e embarque seguro.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">1</span>
                  Dados Pessoais Coletados e Finalidade Específica
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                    <p className="font-bold text-gray-900">Dados do Passageiro (Aluno):</p>
                    <p className="text-gray-600 mt-1">Nome, escola, turno escolar, endereço de embarque/desembarque e status de chamada em tempo real (Casa / Van / Escola / Ausente).</p>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                    <p className="font-bold text-gray-900">Dados do Responsável:</p>
                    <p className="text-gray-600 mt-1">Nome, telefone de contato WhatsApp, e-mail e dados necessários para envio de avisos de chegada e lembretes financeiros.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">2</span>
                  Bases Legais de Tratamento (Art. 7º e 11º da LGPD)
                </h3>
                <p className="text-gray-700">
                  Os dados são tratados com base na <strong>Execução de Contrato e Procedimentos Preliminares (Art. 7º, V)</strong>, <strong>Legítimo Interesse para Segurança Física do Passageiro (Art. 7º, IX)</strong> e <strong>Consentimento Específico do Responsável Legal (Art. 14, §1º)</strong> fornecido no momento do cadastro.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gray-900 text-yellow-400 flex items-center justify-center text-xs font-bold">3</span>
                  Não Comercialização de Dados
                </h3>
                <p className="text-gray-700">
                  <strong>O SchoolVan NUNCA vende, aluga ou compartilha dados pessoais de alunos, responsáveis ou motoristas com terceiros para fins de publicidade ou marketing comportamental.</strong> O compartilhamento de dados ocorre exclusivamente entre o motorista contratado e os respectivos pais vinculados ao veículo.
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: SEGURANÇA DA INFORMAÇÃO */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
                <Server size={20} className="text-blue-700 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-950 font-medium leading-relaxed">
                  A infraestrutura do SchoolVan é hospedada em centros de dados com certificações internacionais de segurança (ISO/IEC 27001, SOC 1/2/3 e PCI-DSS), garantindo máxima disponibilidade e proteção contra acessos não autorizados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center mx-auto">
                    <Lock size={18} />
                  </div>
                  <h4 className="font-bold text-gray-950 text-xs">Criptografia Ponta a Ponta</h4>
                  <p className="text-[11px] text-gray-600">Tráfego 100% criptografado via TLS/HTTPS 256-bit em repouso e trânsito.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center mx-auto">
                    <KeyRound size={18} />
                  </div>
                  <h4 className="font-bold text-gray-950 text-xs">Segregação por Motorista</h4>
                  <p className="text-[11px] text-gray-600">Regras de segurança no banco de dados (Firestore Security Rules) isolam os dados de cada van.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center mx-auto">
                    <Server size={18} />
                  </div>
                  <h4 className="font-bold text-gray-950 text-xs">Backups Automatizados</h4>
                  <p className="text-[11px] text-gray-600">Cópias de segurança contínuas na nuvem garantem integridade e recuperação rápida.</p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950">
                  Armazenamento Local Seguro & PWA
                </h3>
                <p className="text-gray-700">
                  Os tokens de autenticação local no dispositivo do usuário são armazenados com persistência segura do navegador. Ao clicar em "Desconectar / Sair", todas as credenciais ativas na sessão são imediatamente revogadas.
                </p>
              </section>
            </div>
          )}

          {/* TAB 4: DIREITOS DO TITULAR & EXCLUSÃO */}
          {activeTab === 'rights' && (
            <div className="space-y-6">
              <div className="bg-gray-950 text-white p-5 rounded-2xl border border-yellow-400/30 space-y-2">
                <h4 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                  <Scale size={18} /> Seus Direitos Garantidos pelo Artigo 18 da LGPD
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Como titular dos dados pessoais (ou representante legal do menor), você possui o direito inalienável de solicitar a qualquer tempo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Confirmação da existência de tratamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Acesso fácil e exportação dos dados cadastrados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Correção de dados incompletos ou desatualizados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Exclusão e anonimização de dados pessoais</span>
                  </div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                  <Trash2 size={18} className="text-red-600" />
                  Procedimento para Exclusão Definitiva de Conta e Dados
                </h3>
                <p className="text-gray-700">
                  Para solicitar a exclusão integral de sua conta e de todos os dados vinculados a passageiros e rotas, basta abrir um chamado diretamente na aba de <strong>Suporte</strong> selecionando o assunto <em>"Privacidade / Exclusão de Dados (LGPD)"</em> ou enviar solicitação formal para o canal de privacidade. Seus dados serão expurgados de forma definitiva em até 48 horas úteis, ressalvadas as obrigações legais de guarda fiscal.
                </p>
              </section>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-950 text-xs">Encarregado de Proteção de Dados (DPO / LGPD)</p>
                  <p className="text-xs text-gray-600">Canal direto de atendimento a titulares e autoridades competentes.</p>
                </div>
                <button
                  onClick={handleExportText}
                  className="px-4 py-2 bg-gray-900 text-yellow-400 hover:bg-gray-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Download size={14} />
                  <span>Exportar Documento (TXT)</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500 font-semibold">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Documento oficial v2026.1 • Registrado sob a legislação brasileira.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs transition-all shadow cursor-pointer text-center"
            >
              Compreendi e Concordo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
