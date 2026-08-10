import React from 'react';
import { BookOpen, ShieldAlert, AlertTriangle, Stethoscope, HeartPulse, CheckCircle2, Flame, Info } from 'lucide-react';

export const SafetyGuide: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-lime-300/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-100 border border-lime-300 text-lime-800 text-xs font-bold uppercase mb-3 shadow-2xs">
          <BookOpen className="w-4 h-4 text-lime-600" />
          <span>Manual de Segurança Terapêutica</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
          Guia de Prevenção e <span className="bg-lime-400 text-slate-950 px-2 py-0.5 rounded-xl">Classificação de Riscos</span>
        </h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed font-medium">
          Compreenda os níveis de severidade das interações medicamentosas, os principais sintomas de alerta e as boas práticas de conservação e administração de remédios.
        </p>
      </div>

      {/* SEVERITY LEVEL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GRAVE */}
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider">
              Gravidade Grave
            </span>
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-base mb-2">
            Risco de Vida / Hospitalização
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            Interações altamente perigosas ou formalmente contraindicadas. Podem resultar em eventos fatais (ex: sangramento massivo, arritmia fatal, parada respiratória).
          </p>
          <div className="mt-4 pt-3 border-t border-rose-200 text-[11px] font-bold text-rose-900">
            Ação: Evitar uso concomitante ou ajustar posologia com monitoramento intensivo.
          </div>
        </div>

        {/* MODERADA */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-black text-xs uppercase tracking-wider">
              Gravidade Moderada
            </span>
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-base mb-2">
            Alteração no Efeito Terapêutico
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            Pode exacerbar efeitos colaterais ou reduzir a eficácia do medicamento. Exige reavaliação médica, espaçamento de horários ou substituição.
          </p>
          <div className="mt-4 pt-3 border-t border-amber-200 text-[11px] font-bold text-amber-900">
            Ação: Espaçar horários de tomada em 2h a 4h ou trocar por alternativa.
          </div>
        </div>

        {/* LEVE */}
        <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full bg-sky-500 text-white font-black text-xs uppercase tracking-wider">
              Gravidade Leve
            </span>
            <Info className="w-6 h-6 text-sky-600" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-base mb-2">
            Impacto Clínico Mínimo
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            Efeitos fisiológicos de pequena relevância clínica. Geralmente não requerem alteração no esquema do tratamento habitual.
          </p>
          <div className="mt-4 pt-3 border-t border-sky-200 text-[11px] font-bold text-sky-900">
            Ação: Apenas acompanhamento de rotina.
          </div>
        </div>

      </div>

      {/* RED FLAGS SINDROMES */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-lime-600" />
          Síndromes e Sinais de Alerta Críticos (Sintomas de Emergência)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="font-extrabold text-slate-900 mb-1 text-xs uppercase tracking-wider text-rose-700">
              1. Síndrome Serotoninérgica
            </h5>
            <p className="text-slate-700 leading-relaxed">
              <strong>Sintomas:</strong> Agitação, confusão, rigidez muscular, tremores intempestivos, febre e pupilas dilatadas.<br/>
              <strong>Causa típica:</strong> Combinação de antidepressivos (Fluoxetina, Sertralina) com Tramadol ou Erva de São João.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="font-extrabold text-slate-900 mb-1 text-xs uppercase tracking-wider text-rose-700">
              2. Rabdomiólise (Lesão Muscular Aguda)
            </h5>
            <p className="text-slate-700 leading-relaxed">
              <strong>Sintomas:</strong> Dores musculares profundas, fraqueza severa nas pernas e urina na cor escura (cor de chá ou café).<br/>
              <strong>Causa típica:</strong> Estatinas (Sinvastatina) associadas a macrolídeos (Claritromicina).
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="font-extrabold text-slate-900 mb-1 text-xs uppercase tracking-wider text-rose-700">
              3. Prolongamento do Intervalo QTc
            </h5>
            <p className="text-slate-700 leading-relaxed">
              <strong>Sintomas:</strong> Palpitações aceleradas, tontura repentina, visão turva e desmaios sem causa aparente.<br/>
              <strong>Causa típica:</strong> Antibióticos (Azitromicina/Cipro) com antipsicóticos (Haloperidol) ou antiarrítmicos.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="font-extrabold text-slate-900 mb-1 text-xs uppercase tracking-wider text-rose-700">
              4. Acidose Láctica
            </h5>
            <p className="text-slate-700 leading-relaxed">
              <strong>Sintomas:</strong> Respiração rápida e profunda, náusea intensa, dor abdominal e sonolência.<br/>
              <strong>Causa típica:</strong> Metformina em pacientes expostos a contraste iodado ou com disfunção renal.
            </p>
          </div>
        </div>
      </div>

      {/* BEST PRACTICES */}
      <div className="bg-lime-50 rounded-2xl p-6 border-2 border-lime-300">
        <h3 className="text-lg font-black text-slate-950 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-lime-700" />
          Regras de Ouro para Utilização Segura de Medicamentos
        </h3>
        <ul className="space-y-2 text-xs sm:text-sm text-slate-900 font-medium">
          <li className="flex items-start gap-2">
            <span className="text-lime-700 font-bold">•</span>
            <span><strong>Respeite os horários de tomada:</strong> Mediações como a Levotiroxina devem ser administradas rigorosamente em jejum, 30 a 60 minutos antes da primeira refeição.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lime-700 font-bold">•</span>
            <span><strong>Cuidado com antiácidos e leite:</strong> Leite, iogurte e antiácidos à base de alumínio/magnésio sequestram antibióticos como Ciprofloxacino e Tetraciclina. Espaçar em 2 horas.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lime-700 font-bold">•</span>
            <span><strong>Atenção às bebidas alcoólicas:</strong> Álcool com calmantes (benzodiazepínicos) desliga os centros respiratórios centrais. Com Paracetamol, multiplica o risco de hepatite medicamentosa.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lime-700 font-bold">•</span>
            <span><strong>Nunca interrompa por conta própria:</strong> A suspensão abrupta de anti-hipertensivos ou corticoides pode causar efeito rebote grave.</span>
          </li>
        </ul>
      </div>

    </div>
  );
};
