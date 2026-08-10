import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Bot, ShieldCheck, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import { AIAdviceResponse } from '../types';

interface AIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDrugA?: string;
  initialDrugB?: string;
  allDrugNames: string[];
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({
  isOpen,
  onClose,
  initialDrugA = '',
  initialDrugB = '',
  allDrugNames
}) => {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIAdviceResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initial: string[] = [];
      if (initialDrugA) initial.push(initialDrugA);
      if (initialDrugB) initial.push(initialDrugB);
      if (initial.length === 0) initial.push('Warfarina', 'Aspirina (Ácido Acetilsalicílico)');
      setSelectedDrugs(initial);
      setResponse(null);
      setError('');
    }
  }, [isOpen, initialDrugA, initialDrugB]);

  if (!isOpen) return null;

  const handleFetchAdvice = async () => {
    if (selectedDrugs.length === 0) {
      setError('Selecione pelo menos um medicamento.');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch('/api/ai-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugs: selectedDrugs,
          question: customQuestion
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao consultar a orientação.');
      }

      const data: AIAdviceResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      console.error('AI Advice Error:', err);
      setError(err.message || 'Falha ao conectar com o serviço de orientação IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-400 text-slate-950 font-black shadow-md">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-lime-400">
              Orientação Farmacêutica Inteligente
            </span>
          </div>

          <h3 className="text-xl font-black">
            Assistente Virtual Interafarma
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Gere uma análise detalhada baseada em evidências clínicas para esclarecer dúvidas sobre os medicamentos pesquisados.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Active Drugs Selection Chips */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-2">
              Medicamentos em Análise:
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedDrugs.map((drug, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-lime-100 border border-lime-300 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {drug}
                  <button
                    onClick={() => setSelectedDrugs(selectedDrugs.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-rose-600 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}

              <div className="relative inline-block">
                <select
                  onChange={(e) => {
                    if (e.target.value && !selectedDrugs.includes(e.target.value)) {
                      setSelectedDrugs([...selectedDrugs, e.target.value]);
                    }
                    e.target.value = '';
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="">+ Adicionar medicamento...</option>
                  {allDrugNames.map((name, i) => (
                    <option key={i} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Custom Question Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
              Dúvida Específica (Opcional):
            </label>
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ex: Posso tomar junto no café da manhã? Quais os horários ideais?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:border-lime-500 focus:outline-none"
            />
          </div>

          {/* Action Submit Button */}
          <button
            onClick={handleFetchAdvice}
            disabled={loading || selectedDrugs.length === 0}
            className="w-full py-3.5 rounded-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analisando literatura e gerando parecer...</span>
              </>
            ) : (
              <>
                <Bot className="w-5 h-5" />
                <span>Gerar Parecer Farmacêutico IA</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Response Output Display */}
          {response && (
            <div className="mt-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm pb-2 border-b border-slate-200">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Parecer Orientativo Gerado:</span>
              </div>

              <div className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal space-y-2">
                {response.answer}
              </div>

              {/* Sources */}
              {response.sources && response.sources.length > 0 && (
                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-lime-600" />
                  <span>Fontes de referência: {response.sources.join(' • ')}</span>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium leading-normal">
                {response.disclaimer}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
