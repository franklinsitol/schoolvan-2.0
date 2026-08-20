import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Users, ArrowRight, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { Student, Vehicle } from '../types';
import { playBusHornSound } from '../lib/sound';
import toast from 'react-hot-toast';

interface ParsedStudentRow {
  id: string;
  name: string;
  schoolName: string;
  shift: 'Manhã' | 'Tarde' | 'Integral';
  parentName: string;
  parentPhone: string;
  studentAddress: string;
  value: number;
  paymentDay: number;
  vehicleId: string;
  isValid: boolean;
  validationError?: string;
}

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  vehicles: Vehicle[];
  onSuccess?: (count: number) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export function BulkStudentUploadModal({
  isOpen,
  onClose,
  driverId,
  vehicles,
  onSuccess,
  onOpenUpgradeModal
}: BulkStudentUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'preview'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download CSV Model Template
  const handleDownloadTemplate = () => {
    const csvHeader = "Nome do Aluno;Escola;Turno;Nome do Responsável;WhatsApp (com DDD);Endereço Residencial;Valor Mensalidade;Dia Vencimento\n";
    const sampleRows = 
      "Lucas Gabriel Souza;Colégio Objetivo;Manhã;Mariana Souza;11998765432;Rua das Flores 123;450.00;10\n" +
      "Sophia Lima Silva;Escola Estadual Santos;Tarde;Carlos Silva;11987654321;Av Paulista 1000 apto 42;420.00;05\n" +
      "Pedro Henrique Costa;Colégio Adventista;Integral;Renata Costa;11976543210;Rua Augusta 500;650.00;15\n";
    
    const blob = new Blob(["\uFEFF" + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_alunos_schoolvan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Modelo baixado! Preencha e suba de volta.');
  };

  // Parse raw text (CSV or pasted table from Excel)
  const parseRawContent = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      toast.error('Nenhum dado encontrado no arquivo ou texto.');
      return;
    }

    const rows: ParsedStudentRow[] = [];
    const defaultVehicleId = vehicles[0]?.id || '';

    // Check if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const startIndex = (firstLineLower.includes('nome') || firstLineLower.includes('aluno') || firstLineLower.includes('escola')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by semicolon, comma, or tab
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes(';')) {
        cols = line.split(';');
      } else {
        cols = line.split(',');
      }

      cols = cols.map(c => c.replace(/^["']|["']$/g, '').trim());

      const rawName = cols[0] || '';
      const rawSchool = cols[1] || 'Escola Principal';
      let rawShift: 'Manhã' | 'Tarde' | 'Integral' = 'Manhã';
      const shiftStr = (cols[2] || '').toLowerCase();
      if (shiftStr.includes('tarde') || shiftStr.includes('vesp')) rawShift = 'Tarde';
      else if (shiftStr.includes('integ')) rawShift = 'Integral';

      const rawParent = cols[3] || 'Responsável';
      const rawPhone = (cols[4] || '').replace(/\D/g, '');
      const rawAddress = cols[5] || 'Ponto combinado';
      
      let rawValue = 350;
      if (cols[6]) {
        const cleanVal = cols[6].replace(/[R$\s]/g, '').replace(',', '.');
        const parsed = parseFloat(cleanVal);
        if (!isNaN(parsed) && parsed > 0) rawValue = parsed;
      }

      let rawDay = 10;
      if (cols[7]) {
        const parsed = parseInt(cols[7].replace(/\D/g, ''), 10);
        if (parsed >= 1 && parsed <= 31) rawDay = parsed;
      }

      const isValid = rawName.length >= 2;
      const validationError = !isValid ? 'Nome do aluno é obrigatório' : undefined;

      rows.push({
        id: `row-${i}-${Date.now()}`,
        name: rawName,
        schoolName: rawSchool,
        shift: rawShift,
        parentName: rawParent,
        parentPhone: rawPhone,
        studentAddress: rawAddress,
        value: rawValue,
        paymentDay: rawDay,
        vehicleId: defaultVehicleId,
        isValid,
        validationError
      });
    }

    if (rows.length === 0) {
      toast.error('Nenhum aluno identificado nas linhas.');
      return;
    }

    setParsedRows(rows);
    setActiveTab('preview');
    toast.success(`${rows.length} alunos identificados! Confira abaixo.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) parseRawContent(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) {
      toast.error('Cole os dados na caixa de texto primeiro.');
      return;
    }
    parseRawContent(pasteText);
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== id));
  };

  const handleImportAll = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('Nenhum aluno válido para importar.');
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      let importedCount = 0;
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        const newStudentData = {
          name: row.name,
          schoolName: row.schoolName,
          grade: row.shift,
          studentAddress: row.studentAddress,
          parentName: row.parentName,
          parentPhone: row.parentPhone,
          tel1: row.parentPhone,
          value: row.value,
          paymentDay: row.paymentDay,
          vehicleId: row.vehicleId || vehicles[0]?.id || '',
          status: 'Ativo',
          boardingStatus: 'Casa',
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'drivers', driverId, 'students'), newStudentData);

        // Create finance entry
        await setDoc(doc(db, 'drivers', driverId, 'finance', docRef.id), {
          studentId: docRef.id,
          studentName: row.name,
          parentPhone: row.parentPhone,
          value: row.value,
          type: 'Receita',
          status: 'Em Dia',
          paymentDay: row.paymentDay,
          dueDate: `${row.paymentDay}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
          createdAt: new Date().toISOString()
        });

        importedCount++;
        setProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      playBusHornSound();
      toast.success(`🎉 ${importedCount} alunos cadastrados com sucesso!`, { duration: 5000 });
      if (onSuccess) onSuccess(importedCount);
      onClose();
    } catch (err) {
      console.error('Erro na importação em massa:', err);
      toast.error('Erro ao importar alguns alunos.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-between border-b border-yellow-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-md">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                Importação de Alunos em Massa
              </h2>
              <p className="text-xs text-gray-400">Suba planilha Excel/CSV ou cole a lista direto da sua planilha</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-yellow-400 text-gray-950 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700'
            }`}
          >
            <Upload size={16} /> Subir Arquivo CSV
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-yellow-400 text-gray-950 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700'
            }`}
          >
            <FileSpreadsheet size={16} /> Copiar & Colar
          </button>
          {parsedRows.length > 0 && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-yellow-400 text-gray-950 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700'
              }`}
            >
              <Users size={16} /> Prévia ({parsedRows.length})
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Card */}
              <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/40 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Download className="text-yellow-600 dark:text-yellow-400 shrink-0" size={24} />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Ainda não tem a planilha no formato certo?</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Baixe nosso arquivo modelo com as colunas certinhas para preencher no Excel.</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download size={14} /> Baixar Modelo CSV
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-400 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-800/30 hover:bg-yellow-50/30 group"
              >
                <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Clique para selecionar o arquivo CSV
                </h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Formatos suportados: .csv (separado por vírgula ou ponto e vírgula).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Copie as linhas do Excel ou Bloco de Notas e cole aqui:
                </label>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-xs text-yellow-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Download size={12} /> Ver ordem das colunas
                </button>
              </div>

              <textarea
                rows={8}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={`Exemplo de linhas:\nLucas Gabriel;Objetivo;Manhã;Mariana;11998765432;Rua das Flores 123;450;10\nSophia Lima;Estadual;Tarde;Carlos;11987654321;Av Paulista 1000;420;05`}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
              />

              <button
                onClick={handlePasteProcess}
                className="w-full py-3.5 bg-gray-950 text-yellow-400 font-black rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs"
              >
                <ArrowRight size={16} /> PROCESSAR LINHAS E VER PRÉVIA
              </button>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">
                    Total: <strong className="text-gray-900 dark:text-white">{parsedRows.length} alunos</strong>
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {parsedRows.filter(r => r.isValid).length} válidos
                  </span>
                </div>

                <button
                  onClick={() => { setParsedRows([]); setActiveTab('upload'); }}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Trash2 size={12} /> Limpar lista
                </button>
              </div>

              {/* Table Preview */}
              <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="p-3 font-bold text-gray-500">Aluno</th>
                      <th className="p-3 font-bold text-gray-500">Escola / Turno</th>
                      <th className="p-3 font-bold text-gray-500">Responsável / Zap</th>
                      <th className="p-3 font-bold text-gray-500">Mensalidade</th>
                      <th className="p-3 font-bold text-gray-500 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {parsedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="p-3">
                          <div className="font-bold text-gray-900 dark:text-gray-100">{row.name}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{row.studentAddress}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-800 dark:text-gray-200">{row.schoolName}</div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-950 text-gray-950 dark:text-yellow-400 rounded">
                            {row.shift}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-800 dark:text-gray-200">{row.parentName}</div>
                          <div className="text-[10px] text-gray-500">{row.parentPhone || 'Sem tel'}</div>
                        </td>
                        <td className="p-3 font-bold text-gray-900 dark:text-gray-100">
                          R$ {row.value.toFixed(2)}
                          <div className="text-[10px] text-gray-400 font-normal">Dia {row.paymentDay}</div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                            title="Remover da lista"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Progress Bar while importing */}
              {importing && (
                <div className="space-y-2 bg-yellow-50 dark:bg-yellow-950/40 p-4 rounded-2xl border border-yellow-200">
                  <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                    <span>Importando alunos para o sistema...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>

          {parsedRows.length > 0 && activeTab === 'preview' && (
            <button
              onClick={handleImportAll}
              disabled={importing || parsedRows.filter(r => r.isValid).length === 0}
              className="px-6 py-3 bg-gray-950 text-yellow-400 font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all flex items-center gap-2 text-xs cursor-pointer disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  IMPORTANDO...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> CONFIRMAR E IMPORTAR {parsedRows.filter(r => r.isValid).length} ALUNOS
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
