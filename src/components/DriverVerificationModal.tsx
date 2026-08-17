import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Award, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Info,
  Calendar,
  Lock,
  FileCheck
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Driver } from '../types';
import { isFreePlan, isProPlan, isFrotaPlan, getPlanTier } from '../lib/plans';
import toast from 'react-hot-toast';

interface DriverVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  onOpenUpgradeModal?: (reason: string) => void;
}

export function DriverVerificationModal({
  isOpen,
  onClose,
  driver,
  onOpenUpgradeModal
}: DriverVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [cnhCategory, setCnhCategory] = useState(driver.cnhCategory || 'D');
  const [cnhNumber, setCnhNumber] = useState(driver.cnhNumber || '');
  const [cnhValidUntil, setCnhValidUntil] = useState(driver.cnhValidUntil || '');
  const [cnhEar, setCnhEar] = useState(driver.cnhEar ?? true);
  const [schoolCourseNumber, setSchoolCourseNumber] = useState(driver.schoolCourseNumber || '');
  const [schoolCourseValidUntil, setSchoolCourseValidUntil] = useState(driver.schoolCourseValidUntil || '');
  const [municipalLicenseNumber, setMunicipalLicenseNumber] = useState(driver.municipalLicenseNumber || '');
  const [municipalLicenseValidUntil, setMunicipalLicenseValidUntil] = useState(driver.municipalLicenseValidUntil || '');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ type: 'cnh' | 'course' | 'alvara' | 'other'; name: string; date: string }>>(
    driver.documentFiles || [
      { type: 'cnh', name: 'CNH_Digital_Categoria_D.pdf', date: new Date().toISOString() },
      { type: 'course', name: 'Certificado_Curso_Condutor_Escolar_CONTRAN.pdf', date: new Date().toISOString() }
    ]
  );
  const [uploadFileName, setUploadFileName] = useState('');

  if (!isOpen) return null;

  const currentPlan = getPlanTier(driver);
  const isFree = isFreePlan(driver);
  const verificationStatus = driver.verificationStatus || 'nao_enviado';

  const handleAddFile = (type: 'cnh' | 'course' | 'alvara' | 'other') => {
    const defaultNames: Record<string, string> = {
      cnh: 'Foto_CNH_Frente_Verso.pdf',
      course: 'Certificado_Curso_Escolar_Detran.pdf',
      alvara: 'Alvara_Autorizacao_Municipal.pdf',
      other: 'Comprovante_Documento.pdf'
    };
    const name = uploadFileName.trim() || defaultNames[type];
    setAttachedFiles(prev => [...prev, { type, name, date: new Date().toISOString() }]);
    setUploadFileName('');
    toast.success(`Documento "${name}" anexado para envio.`);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFree) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('verified_badge');
      }
      return;
    }

    if (!cnhNumber.trim()) {
      toast.error('Informe o número de registro da sua CNH.');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'drivers', driver.id), {
        verificationStatus: 'em_analise',
        verificationSubmittedAt: new Date().toISOString(),
        cnhCategory,
        cnhNumber,
        cnhValidUntil,
        cnhEar,
        schoolCourseNumber,
        schoolCourseValidUntil,
        municipalLicenseNumber,
        municipalLicenseValidUntil,
        documentFiles: attachedFiles,
      });

      toast.success('Documentação enviada para análise! SLA de 3 a 5 dias úteis.');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar documentos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-gray-950 text-white flex items-center justify-between shrink-0 border-b border-yellow-400/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-lg">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 px-2 py-0.5 rounded-full">
                  Conformidade CTB & CONTRAN
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  Plano {currentPlan}
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5">Selo de Condutor Verificado Pro</h3>
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
          
          {/* Plan Pro Gate Notice if Free Plan */}
          {isFree && (
            <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-gray-950 flex items-center justify-center font-black shrink-0">
                  <Zap size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-amber-950">
                    Recurso Exclusivo a partir do Plano Pro
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    A verificação jurídica com selo dourado no perfil e marketplace, além da auditoria de documentos (CNH EAR + Curso de Transporte Escolar), é um benefício para assinantes dos <strong>Planos Pro e Frota</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenUpgradeModal) onOpenUpgradeModal('verified_badge');
                  }}
                  className="px-5 py-2.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Zap size={14} /> Fazer Upgrade para o Plano Pro
                </button>
              </div>
            </div>
          )}

          {/* Status Banners */}
          {verificationStatus === 'verificado' && (
            <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-3xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                <Award size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-emerald-950">
                    Condutor Verificado com Sucesso! 🛡️✨
                  </h4>
                  <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    Ativo
                  </span>
                </div>
                <p className="text-xs text-emerald-900 mt-0.5">
                  Seus documentos foram auditados e aprovados. O selo está visível para todas as famílias no Marketplace e no seu Perfil.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === 'em_analise' && (
            <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-3xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                <Clock size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-blue-950">
                    Documentação em Análise por Nossa Equipe
                  </h4>
                  <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    SLA: 3 a 5 dias úteis
                  </span>
                </div>
                <p className="text-xs text-blue-900 mt-0.5">
                  Recebemos seus dados em {driver.verificationSubmittedAt ? new Date(driver.verificationSubmittedAt).toLocaleDateString('pt-BR') : 'recente'}. Estamos validando os registros perante os órgãos de trânsito.
                </p>
              </div>
            </div>
          )}

          {/* Explanatory Rules Info */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900">
              <Info size={16} className="text-yellow-600 shrink-0" />
              <span>Por que obter o Selo de Verificado?</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
              <li><strong>Mais confiança dos pais:</strong> Destaque na busca pública de vans no SchoolVan.</li>
              <li><strong>Conformidade com o CTB (Art. 138):</strong> Validação de habilitação Categoria D/E e anotação EAR.</li>
              <li><strong>Curso CONTRAN:</strong> Comprovação de curso especializado para transporte escolar.</li>
            </ul>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Section 1: CNH Especial */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <FileText size={15} className="text-yellow-500" /> 1. Carteira Nacional de Habilitação (CNH)
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Exigência CTB Art. 138
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Categoria CNH</label>
                  <select
                    value={cnhCategory}
                    onChange={(e) => setCnhCategory(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  >
                    <option value="D">Categoria D (Padrão Transporte Escolar)</option>
                    <option value="E">Categoria E (Veículos Articulados)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Nº Registro CNH</label>
                  <input
                    type="text"
                    placeholder="Ex: 01234567890"
                    value={cnhNumber}
                    onChange={(e) => setCnhNumber(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Validade da CNH</label>
                  <input
                    type="date"
                    value={cnhValidUntil}
                    onChange={(e) => setCnhValidUntil(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cnhEar"
                  checked={cnhEar}
                  onChange={(e) => setCnhEar(e.target.checked)}
                  disabled={isFree}
                  className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                />
                <label htmlFor="cnhEar" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Minha CNH possui a anotação <strong>"EAR" (Exerce Atividade Remunerada)</strong>
                </label>
              </div>
            </div>

            {/* Section 2: Curso Especializado CONTRAN */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <Award size={15} className="text-yellow-500" /> 2. Curso de Condutor de Transporte Escolar (CONTRAN)
                </span>
                <span className="text-[11px] font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-md">
                  Válido por 5 anos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Nº do Certificado / Credencial</label>
                  <input
                    type="text"
                    placeholder="Ex: CERT-2026-SP-9821"
                    value={schoolCourseNumber}
                    onChange={(e) => setSchoolCourseNumber(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Validade do Curso</label>
                  <input
                    type="date"
                    value={schoolCourseValidUntil}
                    onChange={(e) => setSchoolCourseValidUntil(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Alvará / Autorização Municipal */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <FileCheck size={15} className="text-yellow-500" /> 3. Alvará / Licença Municipal (Prefeitura / Órgão Gestor)
                </span>
                <span className="text-[11px] font-bold text-gray-500">
                  Opcional / Municipal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Nº do Alvará / Registro Municipal</label>
                  <input
                    type="text"
                    placeholder="Ex: ALV-2026-98124-PMSP"
                    value={municipalLicenseNumber}
                    onChange={(e) => setMunicipalLicenseNumber(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Validade da Autorização</label>
                  <input
                    type="date"
                    value={municipalLicenseValidUntil}
                    onChange={(e) => setMunicipalLicenseValidUntil(e.target.value)}
                    disabled={isFree}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Document Upload Simulation */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <UploadCloud size={15} className="text-yellow-500" /> 4. Arquivos & Comprovantes Anexados
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do arquivo ou documento (ex: CNH_Digital.pdf)"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  disabled={isFree}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddFile('other')}
                  disabled={isFree}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Anexar
                </button>
              </div>

              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={14} className="text-yellow-600 shrink-0" />
                        <span className="font-bold text-gray-800 truncate">{file.name}</span>
                        <span className="text-[10px] text-gray-400 uppercase">({file.type})</span>
                      </div>
                      {!isFree && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SLA Commitment */}
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-yellow-400 shrink-0" />
                <span>
                  <strong>SLA de Análise:</strong> Avaliação em até <strong>3 a 5 dias úteis</strong> por nossos analistas.
                </span>
              </div>
              <span className="bg-yellow-400 text-gray-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase shrink-0">
                Auditoria Pro
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="submit"
                disabled={loading || isFree}
                className="px-7 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando para Auditoria...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>{verificationStatus === 'em_analise' ? 'Atualizar Documentos' : 'Enviar para Análise (SLA 3-5 Dias)'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
