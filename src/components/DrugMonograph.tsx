import React, { useState } from 'react';
import {
  Pill,
  Scale,
  Activity,
  Beaker,
  Syringe,
  AlertTriangle,
  Baby,
  UserRound,
  Heart,
  Droplet,
  Clock,
  Package,
  ShieldCheck,
} from 'lucide-react';
import type { DrugMonograph as DrugMonographType } from '../types';

type TabId = 'dosage' | 'adjustment' | 'pk' | 'admin';

interface DrugMonographProps {
  monograph: DrugMonographType;
  loading?: boolean;
}

const TABS: { id: TabId; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'dosage', label: 'Posologia & Doses', short: 'Posologia', icon: <Scale className="w-4 h-4" /> },
  { id: 'adjustment', label: 'Ajuste Renal / Hepático', short: 'Ajuste', icon: <Droplet className="w-4 h-4" /> },
  { id: 'pk', label: 'Farmacocinética', short: 'PK', icon: <Activity className="w-4 h-4" /> },
  { id: 'admin', label: 'Diluição & Administração', short: 'Adm.', icon: <Syringe className="w-4 h-4" /> },
];

export const DrugMonograph: React.FC<DrugMonographProps> = ({ monograph, loading = false }) => {
  const [tab, setTab] = useState<TabId>('dosage');

  if (loading) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <div className="h-4 w-32 bg-slate-100 rounded-md animate-pulse mb-2" />
          <div className="h-8 w-64 bg-slate-200 rounded-md animate-pulse" />
        </div>
        <div className="p-5 sm:p-6 space-y-3">
          <div className="h-3 w-full bg-slate-100 rounded-md animate-pulse" />
          <div className="h-3 w-11/12 bg-slate-100 rounded-md animate-pulse" />
          <div className="h-3 w-9/12 bg-slate-100 rounded-md animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-lime-50 border border-lime-200 text-lime-800 text-[10px] font-semibold uppercase tracking-[0.12em] mb-3">
          <Pill className="w-3 h-3" />
          Monografia técnica
        </div>
        <h2 className="font-serif text-[26px] sm:text-[32px] font-semibold tracking-tight text-slate-900 leading-tight">
          {monograph.drug}
        </h2>
        {monograph.synonyms && monograph.synonyms.length > 0 && (
          <p className="text-[12.5px] text-slate-500 mt-1 font-mono">
            {monograph.synonyms.join(' · ')}
          </p>
        )}

        {/* Class + regulatory quick badges */}
        {(monograph.dosage.therapeuticClass || monograph.dosage.regulatoryClass) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {monograph.dosage.therapeuticClass && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                {monograph.dosage.therapeuticClass}
              </span>
            )}
            {monograph.dosage.regulatoryClass && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {monograph.dosage.regulatoryClass}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Seções da monografia"
        className="flex items-center gap-0.5 px-2 sm:px-3 border-b border-slate-100 overflow-x-auto scrollbar-thin"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 h-11 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              tab === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 sm:p-6">
        {tab === 'dosage' && <DosageTab data={monograph.dosage} />}
        {tab === 'adjustment' && <AdjustmentTab data={monograph.adjustment} />}
        {tab === 'pk' && <PkTab data={monograph.pharmacokinetics} />}
        {tab === 'admin' && <AdminTab data={monograph.administration} />}
      </div>
    </section>
  );
};

/* ============================================================================
   TAB PANELS
   ========================================================================== */

function SectionCard({
  icon,
  label,
  children,
  span2 = false,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={`bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 ${span2 ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
        {icon}
        {label}
      </div>
      <div className="text-[13.5px] text-slate-800 leading-relaxed">{children}</div>
    </div>
  );
}

function EmptyValue() {
  return <span className="text-slate-400 italic">não especificado</span>;
}

function DosageTab({ data }: { data: DrugMonographType['dosage'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.presentations.length > 0 && (
        <SectionCard icon={<Package className="w-3.5 h-3.5 text-sky-600" />} label="Apresentações" span2>
          <ul className="flex flex-wrap gap-1.5">
            {data.presentations.map((p) => (
              <li
                key={p}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[12.5px] font-medium text-slate-700"
              >
                {p}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {data.adultStandard.length > 0 && (
        <SectionCard icon={<Scale className="w-3.5 h-3.5 text-slate-700" />} label="Posologia adulto" span2>
          <ul className="space-y-2">
            {data.adultStandard.map((row, i) => (
              <li key={i} className="pb-2 border-b border-slate-200 last:border-0 last:pb-0">
                <div className="font-serif text-[14.5px] font-semibold text-slate-900">
                  {row.indication || 'Indicação padrão'}
                </div>
                <div className="text-[13px] text-slate-700 mt-0.5">{row.dose || <EmptyValue />}</div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {data.pediatric && (
        <SectionCard icon={<Baby className="w-3.5 h-3.5 text-pink-600" />} label="Pediatria">
          {data.pediatric}
        </SectionCard>
      )}

      {data.geriatric && (
        <SectionCard icon={<UserRound className="w-3.5 h-3.5 text-indigo-600" />} label="Geriatria (> 65a)">
          {data.geriatric}
        </SectionCard>
      )}

      {data.maxDailyDose && (
        <SectionCard icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />} label="Dose máxima diária" span2>
          <span className="font-mono text-[14px] font-semibold text-slate-900">{data.maxDailyDose}</span>
        </SectionCard>
      )}
    </div>
  );
}

function AdjustmentTab({ data }: { data: DrugMonographType['adjustment'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.renal.length > 0 && (
        <SectionCard icon={<Droplet className="w-3.5 h-3.5 text-sky-600" />} label="Ajuste renal (ClCr)" span2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500 border-b border-slate-200">
                  <th className="px-2 py-1.5 font-mono">Clearance</th>
                  <th className="px-2 py-1.5">Conduta</th>
                </tr>
              </thead>
              <tbody>
                {data.renal.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2 font-mono text-slate-700 whitespace-nowrap">{r.crcl}</td>
                    <td className="px-2 py-2 text-slate-800">{r.adjustment || <EmptyValue />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {data.hepatic && (
        <SectionCard icon={<Beaker className="w-3.5 h-3.5 text-amber-600" />} label="Ajuste hepático" span2>
          {data.hepatic}
        </SectionCard>
      )}

      {data.pregnancy && (
        <SectionCard icon={<Baby className="w-3.5 h-3.5 text-pink-600" />} label="Gestação">
          {data.pregnancy}
        </SectionCard>
      )}

      {data.lactation && (
        <SectionCard icon={<Heart className="w-3.5 h-3.5 text-rose-500" />} label="Lactação">
          {data.lactation}
        </SectionCard>
      )}
    </div>
  );
}

function PkTab({ data }: { data: DrugMonographType['pharmacokinetics'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.onsetByRoute.length > 0 && (
        <SectionCard icon={<Clock className="w-3.5 h-3.5 text-emerald-600" />} label="Início por via" span2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.onsetByRoute.map((r, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {r.route}
                </div>
                <div className="font-mono text-[13.5px] font-semibold text-slate-900 mt-0.5">
                  {r.onset || <EmptyValue />}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {data.halfLife && (
        <SectionCard icon={<Clock className="w-3.5 h-3.5 text-slate-700" />} label="Meia-vida (t½)">
          <span className="font-mono text-[13.5px] text-slate-900">{data.halfLife}</span>
        </SectionCard>
      )}

      {data.duration && (
        <SectionCard icon={<Clock className="w-3.5 h-3.5 text-slate-700" />} label="Duração de efeito">
          <span className="font-mono text-[13.5px] text-slate-900">{data.duration}</span>
        </SectionCard>
      )}

      {data.metabolism && (
        <SectionCard icon={<Beaker className="w-3.5 h-3.5 text-purple-600" />} label="Metabolismo" span2>
          {data.metabolism}
        </SectionCard>
      )}

      {data.proteinBinding && (
        <SectionCard icon={<Activity className="w-3.5 h-3.5 text-rose-600" />} label="Ligação a proteínas">
          <span className="font-mono text-[13.5px] text-slate-900">{data.proteinBinding}</span>
        </SectionCard>
      )}

      {data.excretion && (
        <SectionCard icon={<Droplet className="w-3.5 h-3.5 text-sky-600" />} label="Excreção">
          <span className="font-mono text-[13.5px] text-slate-900">{data.excretion}</span>
        </SectionCard>
      )}
    </div>
  );
}

function AdminTab({ data }: { data: DrugMonographType['administration'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.routes.length > 0 && (
        <SectionCard icon={<Syringe className="w-3.5 h-3.5 text-emerald-600" />} label="Vias de administração" span2>
          <div className="flex flex-wrap gap-1.5">
            {data.routes.map((r) => (
              <span
                key={r}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[12.5px] font-mono font-semibold text-slate-800"
              >
                {r}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {data.dilution.length > 0 && (
        <SectionCard icon={<Beaker className="w-3.5 h-3.5 text-sky-600" />} label="Diluição (injetáveis)" span2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500 border-b border-slate-200">
                  <th className="px-2 py-1.5">Solução</th>
                  <th className="px-2 py-1.5 font-mono">Volume</th>
                  <th className="px-2 py-1.5 font-mono">Concentração</th>
                </tr>
              </thead>
              <tbody>
                {data.dilution.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2 text-slate-800">{d.solution || <EmptyValue />}</td>
                    <td className="px-2 py-2 font-mono text-slate-700 whitespace-nowrap">{d.volume}</td>
                    <td className="px-2 py-2 font-mono text-slate-700 whitespace-nowrap">{d.finalConcentration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {data.oralCare && (
        <SectionCard icon={<Pill className="w-3.5 h-3.5 text-amber-600" />} label="Administração oral / SNE" span2>
          {data.oralCare}
        </SectionCard>
      )}

      {data.stability && (
        <SectionCard icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />} label="Estabilidade e conservação" span2>
          {data.stability}
        </SectionCard>
      )}
    </div>
  );
}
