import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Layers,
  ChevronDown,
  Users,
} from 'lucide-react';
import type { DrugInteraction, SeverityLevel } from '../types';

interface PolypharmacySummaryProps {
  drugs: string[];              // fármacos consultados
  interactions: DrugInteraction[]; // interações filtradas
}

interface PairKey {
  a: string;
  b: string;
  severity?: SeverityLevel;
}

const SEV_COLORS: Record<SeverityLevel, { bg: string; text: string; ring: string; dot: string }> = {
  Grave: {
    bg: 'bg-rose-600',
    text: 'text-white',
    ring: 'ring-rose-200',
    dot: 'bg-rose-500',
  },
  Moderada: {
    bg: 'bg-amber-500',
    text: 'text-white',
    ring: 'ring-amber-200',
    dot: 'bg-amber-500',
  },
  Leve: {
    bg: 'bg-sky-500',
    text: 'text-white',
    ring: 'ring-sky-200',
    dot: 'bg-sky-500',
  },
};

/** Simple normalizer to match drug names loosely (accents, case, extra spaces) */
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matches(needle: string, haystack: string): boolean {
  const n = norm(needle);
  const h = norm(haystack);
  return h.includes(n) || n.includes(h);
}

export const PolypharmacySummary: React.FC<PolypharmacySummaryProps> = ({
  drugs,
  interactions,
}) => {
  const [matrixOpen, setMatrixOpen] = useState(false);

  if (drugs.length < 2) return null;

  // Build unique pair list (upper triangle)
  const pairs: PairKey[] = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      pairs.push({ a: drugs[i], b: drugs[j] });
    }
  }

  // Attach severity from returned interactions when the pair matches
  const enrichedPairs: PairKey[] = pairs.map((p) => {
    const found = interactions.find(
      (it) =>
        (matches(p.a, it.drugA) && matches(p.b, it.drugB)) ||
        (matches(p.a, it.drugB) && matches(p.b, it.drugA))
    );
    return { ...p, severity: found?.severity };
  });

  const counts: Record<SeverityLevel, number> = {
    Grave: 0,
    Moderada: 0,
    Leve: 0,
  };
  enrichedPairs.forEach((p) => {
    if (p.severity) counts[p.severity]++;
  });
  const totalPairs = pairs.length;
  const identifiedPairs = counts.Grave + counts.Moderada + counts.Leve;

  // Global risk classification — clinical heuristic
  let globalRisk: { label: string; badge: string; description: string };
  if (counts.Grave > 0) {
    globalRisk = {
      label: 'Elevado',
      badge: 'bg-rose-600 text-white',
      description: `${counts.Grave} interação${counts.Grave > 1 ? 'ões' : ''} de gravidade alta identificada${counts.Grave > 1 ? 's' : ''} — considerar reconciliação medicamentosa.`,
    };
  } else if (counts.Moderada >= 2) {
    globalRisk = {
      label: 'Moderado',
      badge: 'bg-amber-500 text-white',
      description: `${counts.Moderada} interações moderadas — monitorização recomendada.`,
    };
  } else if (counts.Moderada === 1) {
    globalRisk = {
      label: 'Moderado',
      badge: 'bg-amber-500 text-white',
      description: '1 interação moderada — monitorização pontual.',
    };
  } else if (counts.Leve > 0) {
    globalRisk = {
      label: 'Baixo',
      badge: 'bg-sky-500 text-white',
      description: 'Apenas interações leves — baixo impacto clínico esperado.',
    };
  } else {
    globalRisk = {
      label: 'Sem interações identificadas',
      badge: 'bg-emerald-500 text-white',
      description: 'Combinação sem interações clinicamente relevantes nas bases consultadas.',
    };
  }

  const drugLabels = drugs.map((d) => ({
    full: d,
    short: d.split(/\s+/)[0].substring(0, 8),
  }));

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4 print-card">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2">
              <Users className="w-3 h-3" />
              Análise de polifarmácia
            </div>
            <h2 className="font-serif text-[20px] sm:text-[22px] font-semibold tracking-tight text-slate-900">
              {drugs.length} medicamentos · {totalPairs} par
              {totalPairs > 1 ? 'es' : ''} analisado{totalPairs > 1 ? 's' : ''}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5 font-mono truncate">
              {drugs.join(' · ')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
              Risco global
            </div>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] ${globalRisk.badge}`}
            >
              <AlertTriangle className="w-3 h-3" />
              {globalRisk.label}
            </span>
          </div>
        </div>

        {/* Severity counts */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <SeverityCount
            label="Graves"
            count={counts.Grave}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            color="rose"
          />
          <SeverityCount
            label="Moderadas"
            count={counts.Moderada}
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            color="amber"
          />
          <SeverityCount
            label="Leves"
            count={counts.Leve}
            icon={<Info className="w-3.5 h-3.5" />}
            color="sky"
          />
        </div>

        {/* Risk description */}
        <div className="text-[13px] text-slate-700 leading-relaxed mb-3">
          {globalRisk.description}
          {identifiedPairs < totalPairs && (
            <span className="text-slate-500">
              {' '}
              ({totalPairs - identifiedPairs} par
              {totalPairs - identifiedPairs > 1 ? 'es' : ''} sem interação relevante
              identificada)
            </span>
          )}
        </div>

        {/* Matrix toggle */}
        <button
          type="button"
          onClick={() => setMatrixOpen(!matrixOpen)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer print:hidden"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {matrixOpen ? 'Ocultar matriz visual' : 'Ver matriz visual de interações'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              matrixOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Matrix visualization — expandable in-app, always visible in print */}
      <div className={`border-t border-slate-100 bg-slate-50/60 ${matrixOpen ? 'block' : 'hidden print:block'}`}>
        <div className="p-4 sm:p-5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
            Matriz par-a-par
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11.5px] border-collapse">
              <thead>
                <tr>
                  <th className="p-1.5 text-left font-semibold text-slate-500"></th>
                  {drugLabels.map((d, i) => (
                    <th
                      key={i}
                      className="p-1.5 text-center font-serif font-semibold text-slate-800 border-b border-slate-200"
                      title={d.full}
                    >
                      <div className="rotate-[-40deg] origin-bottom-left translate-y-1 whitespace-nowrap">
                        {d.short}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drugs.map((rowDrug, i) => (
                  <tr key={i}>
                    <td className="p-1.5 font-serif font-semibold text-slate-800 whitespace-nowrap border-r border-slate-200">
                      {rowDrug}
                    </td>
                    {drugs.map((colDrug, j) => {
                      if (i === j) {
                        return (
                          <td key={j} className="p-1.5 text-center text-slate-300">
                            —
                          </td>
                        );
                      }
                      if (i > j) {
                        // lower triangle — leave blank (mirror of upper)
                        return (
                          <td key={j} className="p-1.5 text-center text-slate-200">
                            ·
                          </td>
                        );
                      }
                      const pair = enrichedPairs.find(
                        (p) =>
                          (matches(rowDrug, p.a) && matches(colDrug, p.b)) ||
                          (matches(rowDrug, p.b) && matches(colDrug, p.a))
                      );
                      if (!pair?.severity) {
                        return (
                          <td key={j} className="p-1.5 text-center">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200"
                              title="Sem interação identificada"
                            />
                          </td>
                        );
                      }
                      const c = SEV_COLORS[pair.severity];
                      return (
                        <td key={j} className="p-1.5 text-center">
                          <span
                            className={`inline-block w-4 h-4 rounded-full ring-2 ${c.dot} ${c.ring}`}
                            title={`${rowDrug} × ${colDrug}: ${pair.severity}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <span className="font-semibold uppercase tracking-[0.1em] text-[10px] text-slate-500">
              Legenda:
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-rose-500" />
              Grave
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
              Moderada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-sky-500" />
              Leve
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200" />
              Sem interação
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

function SeverityCount({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: 'rose' | 'amber' | 'sky';
}) {
  const bg =
    color === 'rose'
      ? 'bg-rose-50 border-rose-200 text-rose-800'
      : color === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-sky-50 border-sky-200 text-sky-800';
  const active = count > 0;
  return (
    <div
      className={`rounded-lg border p-2.5 text-center ${
        active ? bg : 'bg-slate-50 border-slate-200 text-slate-400'
      }`}
    >
      <div className="flex items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] mb-0.5">
        {icon}
        {label}
      </div>
      <div className="font-mono text-[20px] font-bold leading-none">{count}</div>
    </div>
  );
}
