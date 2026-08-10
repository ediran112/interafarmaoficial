import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  Utensils, 
  Pill, 
  Activity, 
  Sparkles, 
  Bookmark, 
  Share2, 
  ChevronDown, 
  ChevronUp,
  Stethoscope,
  Copy,
  Printer
} from 'lucide-react';
import { DrugInteraction } from '../types';

interface InteractionCardProps {
  interaction: DrugInteraction;
  onSaveInteraction?: (interaction: DrugInteraction) => void;
  onAskAIAdvice: (drugA: string, drugB: string) => void;
  isSaved?: boolean;
}

export const InteractionCard: React.FC<InteractionCardProps> = ({
  interaction,
  onSaveInteraction,
  onAskAIAdvice,
  isSaved = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Severity style configuration
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Grave':
        return {
          bg: 'bg-rose-50/70',
          badge: 'bg-rose-500 text-white',
          border: 'border-rose-200 hover:border-rose-300',
          icon: <AlertTriangle className="w-4 h-4 text-white" />,
          titleText: 'text-rose-950'
        };
      case 'Moderada':
        return {
          bg: 'bg-amber-50/70',
          badge: 'bg-amber-500 text-white',
          border: 'border-amber-200 hover:border-amber-300',
          icon: <ShieldAlert className="w-4 h-4 text-white" />,
          titleText: 'text-amber-950'
        };
      case 'Leve':
      default:
        return {
          bg: 'bg-sky-50/70',
          badge: 'bg-sky-500 text-white',
          border: 'border-sky-200 hover:border-sky-300',
          icon: <Info className="w-4 h-4 text-white" />,
          titleText: 'text-sky-950'
        };
    }
  };

  const style = getSeverityStyle(interaction.severity);

  const handleCopy = () => {
    const text = `Interafarma - Interação Medicamentosa:
${interaction.drugA} + ${interaction.drugB}
Gravidade: ${interaction.severity}
Mecanismo: ${interaction.mechanism}
Efeito: ${interaction.effect}
Recomendação: ${interaction.recommendation}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`bg-white rounded-3xl border-2 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${style.bg} ${style.border}`}>
      
      {/* CARD HEADER BAR */}
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          
          {/* Severity & Category Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${style.badge}`}>
              {style.icon}
              Gravidade {interaction.severity}
            </span>

            <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs">
              {interaction.category}
            </span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              title="Copiar resumo da interação"
              className="p-2 rounded-full bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>

            {onSaveInteraction && (
              <button
                onClick={() => onSaveInteraction(interaction)}
                title={isSaved ? 'Interação salva' : 'Salvar interação'}
                className={`p-2 rounded-full border transition-colors shadow-2xs cursor-pointer ${
                  isSaved
                    ? 'bg-lime-400 text-slate-950 border-lime-500 font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-slate-950' : ''}`} />
              </button>
            )}

            <button
              onClick={() => onAskAIAdvice(interaction.drugA, interaction.drugB)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Consultar IA</span>
            </button>
          </div>
        </div>

        {/* DRUG PAIR DISPLAY */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              <Pill className="w-5 h-5 text-lime-600" />
              {interaction.drugA}
            </span>
            <span className="text-lime-600 font-black text-lg">+</span>
            <span className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              <Pill className="w-5 h-5 text-emerald-600" />
              {interaction.drugB}
            </span>
          </div>

          {(interaction.synonymsA?.length || interaction.synonymsB?.length) ? (
            <div className="text-xs text-slate-500 font-medium">
              Nomes comerciais: <span className="font-semibold text-slate-700">{[...(interaction.synonymsA || []), ...(interaction.synonymsB || [])].join(', ')}</span>
            </div>
          ) : null}
        </div>

        {/* MAIN TEXTO CORRIDO (RUNNING TEXT PARAGRAPHS) */}
        <div className="mt-4 space-y-3 text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
          <p>
            <strong className="font-black text-slate-900">Efeito Clínico e Risco Principal: </strong>
            {interaction.effect}
          </p>

          <p>
            <strong className="font-extrabold text-slate-900">Mecanismo Farmacológico: </strong>
            {interaction.mechanism}
          </p>

          <p className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-emerald-950 font-medium">
            <strong className="font-black text-emerald-950">Recomendação e Conduta Médica: </strong>
            {interaction.recommendation}
          </p>
        </div>

      </div>

      {/* EXPANDABLE SECTION FOR EXTRA INFORMATION IN RUNNING TEXT */}
      <div className="border-t border-slate-200/80 bg-slate-50/50 px-5 sm:px-6 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-lime-600" />
            {expanded ? 'Ocultar Informações Adicionais' : 'Ver Mais Informações (Alternativas, Alimentos e Sistemas Afetados)'}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 pt-2 text-xs sm:text-sm text-slate-800 leading-relaxed border-t border-slate-200">
            <p>
              <strong className="font-bold text-slate-900">Alternativas Terapêuticas: </strong>
              {interaction.alternatives}
            </p>

            {interaction.foodInteractions && (
              <p>
                <strong className="font-bold text-slate-900">Interações Alimentares e Bebidas: </strong>
                {interaction.foodInteractions}
              </p>
            )}

            {interaction.affectedOrgans && interaction.affectedOrgans.length > 0 && (
              <p>
                <strong className="font-bold text-slate-900">Sistemas Orgânicos Afetados: </strong>
                {interaction.affectedOrgans.join(', ')}.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
