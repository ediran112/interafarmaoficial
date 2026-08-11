import React, { useState, useEffect } from 'react';
import { X, Send, ShieldCheck, AlertCircle, RefreshCw, BookOpen, Pill } from 'lucide-react';
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
  allDrugNames,
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
        body: JSON.stringify({ drugs: selectedDrugs, question: customQuestion }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao consultar a orientação.');
      }
      const data: AIAdviceResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao conectar com o serviço de orientação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white sm:rounded-2xl rounded-t-3xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden relative max-h-[92vh] sm:max-h-[88vh] flex flex-col pb-safe">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-lime-50 border border-lime-200 text-lime-800 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2">
              <Pill className="w-3 h-3" />
              Orientação farmacêutica
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Parecer clínico personalizado
            </h3>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
              Análise baseada em evidências para esclarecer dúvidas sobre os
              medicamentos selecionados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 -m-1 p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-2">
              Medicamentos em análise
            </label>
            <div className="flex flex-wrap gap-1.5">
              {selectedDrugs.map((drug, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 font-serif text-[14px] font-semibold rounded-lg"
                >
                  {drug}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDrugs(selectedDrugs.filter((_, i) => i !== idx))
                    }
                    className="ml-0.5 p-0.5 rounded-md hover:bg-emerald-100 cursor-pointer text-emerald-700"
                    aria-label={`Remover ${drug}`}
                  >
                    <X className="w-3.5 h-3.5" />
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
                  className="h-9 pl-3 pr-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[13px] focus:outline-none focus:border-lime-500 cursor-pointer"
                >
                  <option value="">+ Adicionar…</option>
                  {allDrugNames.map((name, i) => (
                    <option key={i} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-2">
              Dúvida específica (opcional)
            </label>
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ex.: Posso tomar no café da manhã? Quais horários ideais?"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-[14px] text-slate-900 placeholder-slate-400 font-medium focus:border-lime-500 focus:outline-none focus:ring-4 focus:ring-lime-400/15"
            />
          </div>

          <button
            type="button"
            onClick={handleFetchAdvice}
            disabled={loading || selectedDrugs.length === 0}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-[14px] transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Consultando literatura clínica…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gerar parecer</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {response && (
            <div className="mt-2 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Parecer orientativo
                </span>
              </div>

              <div className="text-[14.5px] text-slate-800 leading-[1.7] whitespace-pre-line font-serif">
                {response.answer}
              </div>

              {response.sources && response.sources.length > 0 && (
                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Fontes: {response.sources.join(' · ')}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11.5px] leading-relaxed">
                {response.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
