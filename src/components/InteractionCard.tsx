import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Utensils,
  Activity,
  Bookmark,
  ChevronDown,
  Stethoscope,
  Copy,
  Check,
  Timer,
  Gauge,
  Ban,
  UserRound,
  ClipboardList,
  BookOpen,
  Beaker,
  Sparkle,
  MessageCircle,
} from 'lucide-react';
import { DrugInteraction } from '../types';

interface InteractionCardProps {
  interaction: DrugInteraction;
  onSaveInteraction?: (interaction: DrugInteraction) => void;
  onAskAIAdvice: (drugA: string, drugB: string) => void;
  isSaved?: boolean;
}

const SEVERITY_STYLE: Record<
  string,
  { label: string; badge: string; bar: string; icon: React.ReactNode }
> = {
  Grave: {
    label: 'Grave',
    badge: 'bg-rose-600 text-white',
    bar: 'bg-rose-500',
    icon: <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />,
  },
  Moderada: {
    label: 'Moderada',
    badge: 'bg-amber-500 text-white',
    bar: 'bg-amber-500',
    icon: <ShieldAlert className="w-3 h-3" strokeWidth={2.5} />,
  },
  Leve: {
    label: 'Leve',
    badge: 'bg-sky-500 text-white',
    bar: 'bg-sky-500',
    icon: <Info className="w-3 h-3" strokeWidth={2.5} />,
  },
};

const EVIDENCE_STYLE: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  B: 'bg-lime-50 text-lime-800 border-lime-200',
  C: 'bg-amber-50 text-amber-800 border-amber-200',
  D: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const InteractionCard: React.FC<InteractionCardProps> = ({
  interaction,
  onSaveInteraction,
  onAskAIAdvice,
  isSaved = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const severity = SEVERITY_STYLE[interaction.severity] || SEVERITY_STYLE.Leve;

  const handleCopy = () => {
    const text = `Interafarma — ${interaction.drugA} + ${interaction.drugB}
Gravidade: ${interaction.severity}${interaction.evidenceLevel ? ` | Evidência: ${interaction.evidenceLevel}` : ''}
Mecanismo: ${interaction.mechanism}
Efeito: ${interaction.effect}
Recomendação: ${interaction.recommendation}`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
      {/* Severity accent bar */}
      <div className={`h-0.5 w-full ${severity.bar}`} />

      <div className="p-5 sm:p-6">
        {/* Meta row: severity + evidence + category */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-[0.08em] ${severity.badge}`}
          >
            {severity.icon}
            {severity.label}
          </span>

          {interaction.evidenceLevel && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-[0.08em] border ${
                EVIDENCE_STYLE[interaction.evidenceLevel] || EVIDENCE_STYLE.D
              }`}
              title="Nível de evidência científica"
            >
              <Gauge className="w-3 h-3" />
              Evidência {interaction.evidenceLevel}
            </span>
          )}

          {interaction.onset && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium text-slate-500 bg-slate-50 border border-slate-200">
              <Timer className="w-3 h-3" />
              {interaction.onset}
            </span>
          )}

          <span className="ml-auto text-[11px] text-slate-400 font-mono truncate max-w-[45%]">
            {interaction.category}
          </span>
        </div>

        {/* Drug pair — the editorial focal point */}
        <h3 className="font-serif text-[22px] sm:text-[26px] font-semibold tracking-tight text-slate-900 leading-tight mb-1">
          {interaction.drugA}{' '}
          <span className="text-slate-300 mx-0.5 font-normal">×</span>{' '}
          {interaction.drugB}
        </h3>

        {(interaction.synonymsA?.length || interaction.synonymsB?.length) ? (
          <p className="text-[12px] text-slate-500 mb-4">
            {[...(interaction.synonymsA || []), ...(interaction.synonymsB || [])].join(' · ')}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {/* Primary clinical text — running paragraphs */}
        <div className="space-y-3 text-[14.5px] text-slate-700 leading-[1.65]">
          <p>
            <span className="font-semibold text-slate-900">Efeito clínico. </span>
            {interaction.effect}
          </p>

          <p>
            <span className="font-semibold text-slate-900">Mecanismo. </span>
            <span className="font-serif italic text-slate-700">
              {interaction.mechanism}
            </span>
          </p>

          <div className="mt-4 border-l-2 border-lime-400 bg-lime-50/50 pl-4 py-2 rounded-r-md">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-lime-800 mb-1">
              Conduta
            </div>
            <p className="text-[14px] text-slate-800 leading-relaxed">
              {interaction.recommendation}
            </p>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
          >
            <Stethoscope className="w-4 h-4 text-slate-500" />
            <span>{expanded ? 'Recolher detalhamento' : 'Detalhamento clínico'}</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar resumo"
              aria-label="Copiar resumo"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {onSaveInteraction && (
              <button
                type="button"
                onClick={() => onSaveInteraction(interaction)}
                title={isSaved ? 'Salvo' : 'Salvar'}
                aria-label={isSaved ? 'Salvo' : 'Salvar'}
                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isSaved
                    ? 'text-lime-700 bg-lime-50'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={() => onAskAIAdvice(interaction.drugA, interaction.drugB)}
              className="ml-1 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[12.5px] font-semibold transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Orientação</span>
              <span className="sm:hidden">Orient.</span>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 sm:px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {interaction.clinicalManagement && (
              <ClinicalField
                icon={<ClipboardList className="w-4 h-4 text-emerald-600" />}
                label="Manejo clínico"
                text={interaction.clinicalManagement}
                span2
              />
            )}
            {interaction.monitoring && (
              <ClinicalField
                icon={<Activity className="w-4 h-4 text-rose-600" />}
                label="Monitorização"
                text={interaction.monitoring}
              />
            )}
            {interaction.doseAdjustment && (
              <ClinicalField
                icon={<Beaker className="w-4 h-4 text-sky-600" />}
                label="Ajuste posológico"
                text={interaction.doseAdjustment}
              />
            )}
            {interaction.contraindications && (
              <ClinicalField
                icon={<Ban className="w-4 h-4 text-rose-700" />}
                label="Contraindicações"
                text={interaction.contraindications}
              />
            )}
            {interaction.specialPopulations && (
              <ClinicalField
                icon={<UserRound className="w-4 h-4 text-indigo-600" />}
                label="Populações especiais"
                text={interaction.specialPopulations}
              />
            )}
            {interaction.alternatives && (
              <ClinicalField
                icon={<Sparkle className="w-4 h-4 text-lime-600" />}
                label="Alternativas terapêuticas"
                text={interaction.alternatives}
              />
            )}
            {interaction.foodInteractions && (
              <ClinicalField
                icon={<Utensils className="w-4 h-4 text-amber-600" />}
                label="Alimentos e bebidas"
                text={interaction.foodInteractions}
              />
            )}
            {interaction.affectedOrgans && interaction.affectedOrgans.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 md:col-span-2">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                  Sistemas afetados
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {interaction.affectedOrgans.map((o) => (
                    <span
                      key={o}
                      className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11.5px] font-medium border border-slate-200"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {interaction.references && interaction.references.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 md:col-span-2">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  Referências
                </div>
                <ul className="text-[12.5px] text-slate-600 space-y-0.5 font-serif italic">
                  {interaction.references.map((r) => (
                    <li key={r}>— {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

function ClinicalField({
  icon,
  label,
  text,
  span2 = false,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  span2?: boolean;
}) {
  return (
    <div
      className={`bg-white p-3.5 rounded-xl border border-slate-200 ${
        span2 ? 'md:col-span-2' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
        {icon}
        {label}
      </div>
      <p className="text-[13.5px] text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}
