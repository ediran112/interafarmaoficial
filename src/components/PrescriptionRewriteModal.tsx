import React, { useEffect, useState } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  ArrowRight,
  Pill,
  Clock,
  ShieldCheck,
  Sparkle,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import type { PrescriptionRewrite } from '../types';

interface PrescriptionRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  drugs: string[];
  conflictingPair: [string, string] | null;
  indication?: string;
}

export const PrescriptionRewriteModal: React.FC<PrescriptionRewriteModalProps> = ({
  isOpen,
  onClose,
  drugs,
  conflictingPair,
  indication,
}) => {
  const [loading, setLoading] = useState(false);
  const [rewrite, setRewrite] = useState<PrescriptionRewrite | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !conflictingPair) return;
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError('');
      setRewrite(null);
      try {
        const res = await fetch('/api/prescription-rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drugs, conflictingPair, indication }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Erro ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled && data.rewrite) {
          setRewrite(data.rewrite);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (!cancelled) setError(err?.message || 'Falha ao gerar prescrição alternativa.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, drugs, conflictingPair, indication]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white sm:rounded-2xl rounded-t-3xl max-w-4xl w-full border border-slate-200 shadow-xl overflow-hidden relative max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between shrink-0 bg-white">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-lime-50 border border-lime-200 text-lime-800 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2">
              <Sparkle className="w-3 h-3" />
              Reconciliação medicamentosa
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Prescrição alternativa segura
            </h3>
            {conflictingPair && (
              <p className="text-[13px] text-slate-500 mt-1">
                Conflito grave:{' '}
                <span className="font-serif italic text-rose-700">
                  {conflictingPair[0]} × {conflictingPair[1]}
                </span>
              </p>
            )}
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
          {loading && !rewrite && <LoadingState />}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13px] font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Não foi possível gerar a prescrição.</div>
                <div className="text-rose-700">{error}</div>
              </div>
            </div>
          )}

          {rewrite && !loading && (
            <>
              {/* Reasoning summary */}
              {rewrite.reasoning && (
                <div className="border-l-2 border-lime-400 bg-lime-50/70 pl-4 py-3 rounded-r-md">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-lime-800 mb-1">
                    Racional da recomposição
                  </div>
                  <p className="text-[14px] text-slate-800 leading-relaxed">
                    {rewrite.reasoning}
                  </p>
                </div>
              )}

              {/* Substitutions */}
              {rewrite.substitutions.length > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Substituição
                  </div>
                  <div className="space-y-3">
                    {rewrite.substitutions.map((s, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-rose-600 mb-0.5">
                              Remover
                            </div>
                            <div className="font-serif text-[16px] font-semibold text-slate-900 line-through decoration-rose-400/70">
                              {s.removed}
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-700 mb-0.5">
                              Adicionar
                            </div>
                            <div className="font-serif text-[16px] font-semibold text-slate-900">
                              {s.added}
                            </div>
                          </div>
                        </div>
                        {s.therapeuticClass && (
                          <div className="text-[11px] font-mono text-slate-500 sm:whitespace-nowrap">
                            {s.therapeuticClass}
                          </div>
                        )}
                        {s.reason && (
                          <div className="text-[13px] text-slate-700 leading-relaxed sm:basis-full sm:pt-1 sm:border-t sm:border-slate-100">
                            {s.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {rewrite.substitutions.length === 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Não foi identificada alternativa segura nas bases científicas
                    consultadas para este cenário. Recomenda-se avaliação médica presencial.
                  </span>
                </div>
              )}

              {/* Before / After lists */}
              {(rewrite.original.length > 0 || rewrite.suggested.length > 0) && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <PrescriptionList
                    label="Prescrição atual"
                    accent="rose"
                    items={rewrite.original}
                    conflictingPair={conflictingPair}
                  />
                  <PrescriptionList
                    label="Prescrição sugerida"
                    accent="emerald"
                    items={rewrite.suggested}
                    conflictingPair={null}
                  />
                </section>
              )}

              {/* Integrated schedule */}
              {rewrite.schedule.length > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    Cronograma integrado
                  </div>
                  <div className="space-y-2">
                    {rewrite.schedule.map((slot, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="font-mono text-[14px] font-semibold text-slate-900 w-16 shrink-0">
                          {slot.time}
                        </div>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {slot.drugs.map((d, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium"
                            >
                              <Pill className="w-3 h-3 text-lime-600" />
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Warnings */}
              {rewrite.warnings.length > 0 && (
                <section className="bg-amber-50/70 rounded-xl border border-amber-200 p-4">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Precauções residuais
                  </div>
                  <ul className="space-y-1 text-[13px] text-amber-950 leading-relaxed">
                    {rewrite.warnings.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-600 shrink-0">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Fontes + validação */}
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11.5px] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-700 mb-0.5">
                    Fontes consultadas
                  </div>
                  <p>
                    Sugestão baseada em buscas nas bases científicas de referência
                    farmacológica —{' '}
                    <span className="font-mono text-slate-700">
                      Micromedex · Stockley Drug Interactions · SciELO · PubMed · Anvisa
                      Bulário Eletrônico · FDA Label · DrugBank
                    </span>
                    . Toda modificação de prescrição deve ser validada pelo médico
                    prescritor ou farmacêutico clínico antes de qualquer alteração
                    terapêutica.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------- */

function LoadingState() {
  return (
    <div className="py-10 text-center">
      <Loader2 className="w-6 h-6 text-lime-600 animate-spin mx-auto mb-3" />
      <div className="font-serif text-[16px] font-semibold text-slate-900 mb-1">
        Recompondo prescrição…
      </div>
      <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed">
        Consultando bases científicas de referência farmacológica para identificar
        uma alternativa da mesma classe terapêutica com via metabólica distinta e
        reorganizar o cronograma.
      </p>
    </div>
  );
}

function PrescriptionList({
  label,
  items,
  accent,
  conflictingPair,
}: {
  label: string;
  items: import('../types').PrescriptionItem[];
  accent: 'rose' | 'emerald';
  conflictingPair: [string, string] | null;
}) {
  const accentClass =
    accent === 'rose'
      ? 'border-rose-200 bg-rose-50/40'
      : 'border-emerald-200 bg-emerald-50/40';
  const labelClass = accent === 'rose' ? 'text-rose-700' : 'text-emerald-700';

  const isConflicting = (drug: string): boolean => {
    if (!conflictingPair) return false;
    const l = drug.toLowerCase();
    return conflictingPair.some((c) => l.includes(c.toLowerCase()));
  };

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${accentClass}`}>
      <div className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] mb-3 ${labelClass}`}>
        {label}
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => {
          const conflict = isConflicting(it.drug);
          return (
            <li
              key={i}
              className={`bg-white rounded-lg border p-3 ${
                conflict
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : it.isReplacement
                  ? 'border-emerald-300 ring-1 ring-emerald-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-serif text-[15px] font-semibold text-slate-900 min-w-0">
                  {it.drug}
                  {it.isReplacement && it.originalDrug && (
                    <span className="ml-2 inline-block text-[10.5px] font-mono font-normal text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      substitui {it.originalDrug}
                    </span>
                  )}
                  {conflict && (
                    <span className="ml-2 inline-block text-[10.5px] font-mono font-normal text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      conflito
                    </span>
                  )}
                </div>
              </div>
              {it.dose && (
                <div className="text-[12.5px] font-mono text-slate-700 mt-0.5">{it.dose}</div>
              )}
              {it.schedule && (
                <div className="text-[12px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {it.schedule}
                </div>
              )}
              {it.indication && (
                <div className="text-[12.5px] text-slate-600 mt-1 italic font-serif">
                  {it.indication}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
