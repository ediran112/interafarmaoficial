import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Layers, 
  Save, 
  Pill,
  ArrowRight,
  RefreshCw,
  FileText,
  Search
} from 'lucide-react';
import { DrugInteraction } from '../types';
import { findInteractionsForDrugList } from '../services/interactionService';

interface CombinationCheckerProps {
  allInteractions: DrugInteraction[];
  allDrugNames: string[];
  onSaveCheck: (drugs: string[], interactionsCount: number, maxSeverity: any) => void;
  onAskAIAdvice: (drugA: string, drugB: string) => void;
}

export const CombinationChecker: React.FC<CombinationCheckerProps> = ({
  allInteractions,
  allDrugNames,
  onSaveCheck,
  onAskAIAdvice
}) => {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(['Warfarina', 'Aspirina (Ácido Acetilsalicílico)']);
  const [inputDrug, setInputDrug] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddDrug = (drugName: string) => {
    const trimmed = drugName.trim();
    if (trimmed && !selectedDrugs.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedDrugs([...selectedDrugs, trimmed]);
      setInputDrug('');
    }
  };

  const handleRemoveDrug = (index: number) => {
    setSelectedDrugs(selectedDrugs.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedDrugs([]);
  };

  // Find interactions between any pairs in selectedDrugs
  const foundInteractions = findInteractionsForDrugList(allInteractions, selectedDrugs);

  // Compute highest severity
  let maxSeverity: 'Grave' | 'Moderada' | 'Leve' | 'Nenhuma' = 'Nenhuma';
  if (foundInteractions.some(i => i.severity === 'Grave')) {
    maxSeverity = 'Grave';
  } else if (foundInteractions.some(i => i.severity === 'Moderada')) {
    maxSeverity = 'Moderada';
  } else if (foundInteractions.some(i => i.severity === 'Leve')) {
    maxSeverity = 'Leve';
  }

  // Calculate Risk Score Index (0 to 100)
  const riskScoreIndex = Math.min(
    100,
    foundInteractions.reduce((acc, curr) => acc + (curr.riskScore || 5) * 10, 0)
  );

  const handleSave = () => {
    onSaveCheck(selectedDrugs, foundInteractions.length, maxSeverity);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* HEADER TITLE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 mb-8 border-2 border-slate-200 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-lime-300/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-100 border border-lime-300 text-lime-800 text-xs font-bold uppercase mb-3 shadow-2xs">
            <Layers className="w-4 h-4 text-lime-600" />
            <span>Verificador Multi-Drogas</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Verificação de <span className="bg-lime-400 text-slate-950 px-2 py-0.5 rounded-xl">Combinação Terapêutica</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl font-medium">
            Adicione 2 ou mais medicamentos que o paciente utiliza simultaneamente para analisar de forma cruzada todas as possíveis interações e riscos associados.
          </p>
        </div>
      </div>

      {/* DRUG INPUT & PILLBOX SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Column: Drug Selector Box */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <Pill className="w-5 h-5 text-lime-600" />
              Montar Lista de Medicamentos
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Digite o nome ou selecione dos medicamentos cadastrados:
            </p>

            {/* Input with datalist autocomplete */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleAddDrug(inputDrug);
              }}
              className="space-y-3"
            >
              <div className="relative">
                <input
                  type="text"
                  list="drug-suggestions"
                  value={inputDrug}
                  onChange={(e) => setInputDrug(e.target.value)}
                  placeholder="Nome do remédio..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-lime-500 focus:ring-2 focus:ring-lime-400/30 text-sm text-slate-900 font-semibold focus:outline-none"
                />
                <datalist id="drug-suggestions">
                  {allDrugNames.map((name, i) => (
                    <option key={i} value={name} />
                  ))}
                </datalist>
              </div>

              <button
                type="submit"
                disabled={!inputDrug.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-slate-950 font-black text-sm transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Adicionar à Lista</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div className="mt-6">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                Sugestões Rápidas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Warfarina', 'Aspirina', 'Sinvastatina', 'Claritromicina', 'Paracetamol', 'Enalapril'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAddDrug(preset)}
                    className="px-3 py-1 rounded-full bg-slate-100 hover:bg-lime-400 hover:text-slate-950 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear all button */}
          {selectedDrugs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors py-2 border-t border-slate-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar Lista ({selectedDrugs.length})
            </button>
          )}
        </div>

        {/* Right Column: Selected Pills & Analysis Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-lime-600" />
                Medicamentos Selecionados ({selectedDrugs.length})
              </h3>

              {selectedDrugs.length >= 2 && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                >
                  <Save className="w-4 h-4 text-lime-400" />
                  {saveSuccess ? 'Consulta Salva!' : 'Salvar Verificação'}
                </button>
              )}
            </div>

            {/* List of active chips & Pesquisar Button */}
            {selectedDrugs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500">
                <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Nenhum medicamento adicionado ainda.</p>
                <p className="text-xs text-slate-400">Adicione 2 ou mais remédios no painel ao lado e clique em Pesquisar Interações.</p>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {selectedDrugs.map((drug, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-lime-100/80 border border-lime-300 text-slate-950 font-bold text-sm shadow-2xs"
                    >
                      <span>{drug}</span>
                      <button
                        onClick={() => handleRemoveDrug(index)}
                        className="p-0.5 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* EXPLICIT PESQUISAR INTERAÇÕES BUTTON FOR MULTI-DRUG COMBINATION */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById('combination-results');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={selectedDrugs.length < 2}
                    className="w-full py-3.5 px-6 rounded-2xl bg-lime-400 hover:bg-lime-300 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Search className="w-5 h-5 stroke-[3]" />
                    <span>Pesquisar Interações Entre Medicamentos ({selectedDrugs.length})</span>
                  </button>
                  {selectedDrugs.length < 2 && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-1.5 text-center">
                      * Adicione pelo menos mais 1 medicamento para realizar a pesquisa cruzada.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* OVERALL RISK BANNER */}
            {selectedDrugs.length >= 2 && (
              <div className={`p-5 rounded-2xl border-2 transition-all ${
                maxSeverity === 'Grave'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : maxSeverity === 'Moderada'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : maxSeverity === 'Leve'
                  ? 'bg-sky-50 border-sky-300 text-sky-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {maxSeverity === 'Grave' && <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />}
                    {maxSeverity === 'Moderada' && <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />}
                    {maxSeverity === 'Leve' && <ShieldAlert className="w-8 h-8 text-sky-600 shrink-0" />}
                    {maxSeverity === 'Nenhuma' && <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />}

                    <div>
                      <h4 className="text-lg font-black tracking-tight">
                        {maxSeverity === 'Nenhuma'
                          ? 'Nenhuma Interação Conhecida Detectada'
                          : `Risco Detectado: Nível de Gravidade ${maxSeverity.toUpperCase()}`}
                      </h4>
                      <p className="text-xs sm:text-sm font-medium mt-0.5 opacity-90">
                        {foundInteractions.length === 0
                          ? 'Nenhuma interação direta encontrada em nosso banco entre os remédios informados. Sempre confirme com seu médico.'
                          : `Encontrada(s) ${foundInteractions.length} interação(ões) direta(s) entre a combinação escolhida.`}
                      </p>
                    </div>
                  </div>

                  {/* Risk Index Percentage Gauge */}
                  <div className="text-center px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Índice de Risco</span>
                    <span className={`text-xl font-black ${
                      riskScoreIndex > 50 ? 'text-rose-600' : riskScoreIndex > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {riskScoreIndex}%
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* DETAILED PAIRWISE INTERACTIONS LIST IN RUNNING TEXT (TEXTO CORRIDO) */}
      {selectedDrugs.length >= 2 && foundInteractions.length > 0 && (
        <div id="combination-results" className="space-y-4 mt-8 scroll-mt-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-lime-600" />
            Análise e Interações Encontradas na Combinação ({foundInteractions.length})
          </h3>

          <div className="space-y-4">
            {foundInteractions.map((item) => (
              <div 
                key={item.id}
                className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-lg">
                    <span className="text-slate-900">{item.drugA}</span>
                    <span className="text-lime-600 font-black">+</span>
                    <span className="text-slate-900">{item.drugB}</span>
                  </div>

                  <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    item.severity === 'Grave' ? 'bg-rose-500 text-white' : item.severity === 'Moderada' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'
                  }`}>
                    Gravidade {item.severity}
                  </span>
                </div>

                {/* RUNNING TEXT (TEXTO CORRIDO) NARRATIVE */}
                <div className="mt-4 space-y-2.5 text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                  <p>
                    <strong className="font-extrabold text-slate-900">Efeito Clínico e Risco: </strong>
                    {item.effect}
                  </p>

                  <p>
                    <strong className="font-extrabold text-slate-900">Mecanismo Farmacológico: </strong>
                    {item.mechanism}
                  </p>

                  <p className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-emerald-950 font-medium">
                    <strong className="font-black text-emerald-950">Conduta e Recomendação: </strong>
                    {item.recommendation}
                  </p>

                  {item.alternatives && (
                    <p>
                      <strong className="font-extrabold text-slate-900">Alternativas Sugeridas: </strong>
                      {item.alternatives}
                    </p>
                  )}

                  {item.foodInteractions && (
                    <p>
                      <strong className="font-extrabold text-slate-900">Interação com Alimentos/Bebidas: </strong>
                      {item.foodInteractions}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => onAskAIAdvice(item.drugA, item.drugB)}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-slate-950 bg-lime-400 hover:bg-lime-300 px-4 py-2 rounded-full transition-all cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                    Obter Orientação IA Completa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
