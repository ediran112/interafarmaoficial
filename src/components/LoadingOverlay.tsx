import React, { useEffect, useState } from 'react';
import { Pill, Check } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  drugs?: string[];
  mode?: 'interactions' | 'monograph' | 'rewrite';
}

const MODE_TITLES: Record<string, { title: string; subtitle: string }> = {
  interactions: {
    title: 'Análise em curso',
    subtitle: 'Consultando bases científicas de referência farmacológica',
  },
  monograph: {
    title: 'Gerando monografia',
    subtitle: 'Compilando dados clínicos e farmacocinéticos',
  },
  rewrite: {
    title: 'Recompondo prescrição',
    subtitle: 'Buscando alternativa segura e reorganizando cronograma',
  },
};

const STEPS_BY_MODE: Record<string, string[]> = {
  interactions: [
    'Preparando consulta',
    'Consultando bases científicas',
    'Analisando interações par-a-par',
    'Estruturando resposta clínica',
  ],
  monograph: [
    'Preparando consulta',
    'Consultando bulários e diretrizes',
    'Compilando farmacocinética',
    'Estruturando monografia',
  ],
  rewrite: [
    'Analisando prescrição atual',
    'Buscando alternativas seguras',
    'Verificando via metabólica',
    'Organizando cronograma final',
  ],
};

const STEP_DURATIONS = [1400, 1800, 2200, 3000]; // ms — o último "trava" na etapa final

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  drugs = [],
  mode = 'interactions',
}) => {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setElapsed(0);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    for (let i = 0; i < STEP_DURATIONS.length - 1; i++) {
      cumulative += STEP_DURATIONS[i];
      timers.push(setTimeout(() => setStep(i + 1), cumulative));
    }
    const interval = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { title, subtitle } = MODE_TITLES[mode] || MODE_TITLES.interactions;
  const steps = STEPS_BY_MODE[mode] || STEPS_BY_MODE.interactions;

  const elapsedSec = (elapsed / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-950/85 backdrop-blur-md print:hidden animate-[fadeIn_0.2s_ease]">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-hidden">
        {/* Ambient background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-lime-50/50 via-white to-emerald-50/40 pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-lime-300/25 blur-[100px] rounded-full pointer-events-none animate-[pulse_3s_ease-in-out_infinite]" />

        {/* Animation area — molecular / orbital */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* Concentric pulse rings */}
          <div
            className="absolute inset-0 rounded-full border-2 border-lime-400/25 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"
          />
          <div
            className="absolute inset-3 rounded-full border-2 border-lime-400/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"
            style={{ animationDelay: '0.6s' }}
          />
          <div
            className="absolute inset-6 rounded-full border-2 border-lime-400/60 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"
            style={{ animationDelay: '1.2s' }}
          />

          {/* Orbiting particles — SVG with counter-rotating groups for organic feel */}
          <svg
            className="absolute inset-0 w-full h-full animate-[spin_4s_linear_infinite]"
            viewBox="0 0 128 128"
            aria-hidden
          >
            <defs>
              <radialGradient id="particle-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="1" />
                <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="64" cy="8" r="8" fill="url(#particle-glow)" />
            <circle cx="64" cy="8" r="3" fill="#65a30d" />
          </svg>

          <svg
            className="absolute inset-0 w-full h-full animate-[spin_6s_linear_infinite_reverse]"
            viewBox="0 0 128 128"
            aria-hidden
          >
            <circle cx="120" cy="64" r="6" fill="url(#particle-glow)" />
            <circle cx="120" cy="64" r="2.5" fill="#84cc16" opacity="0.9" />
          </svg>

          <svg
            className="absolute inset-0 w-full h-full animate-[spin_5s_linear_infinite]"
            viewBox="0 0 128 128"
            aria-hidden
          >
            <circle cx="20" cy="100" r="7" fill="url(#particle-glow)" />
            <circle cx="20" cy="100" r="2.5" fill="#4d7c0f" opacity="0.8" />
          </svg>

          {/* Central atom (nucleus) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-lime-400 blur-lg opacity-40 rounded-2xl" />
              <div className="relative w-14 h-14 bg-slate-900 text-lime-400 rounded-2xl flex items-center justify-center shadow-lg">
                <Pill className="w-7 h-7 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>

        {/* Title + subtitle */}
        <h3 className="relative text-center font-serif text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-slate-900 mb-1.5">
          {title}
        </h3>
        <p className="relative text-center text-[13px] text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Steps */}
        <ol className="relative space-y-2.5 mb-5">
          {steps.map((label, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <li
                key={i}
                className="flex items-center gap-3 text-[13px] transition-opacity"
                style={{ opacity: step < i ? 0.4 : 1 }}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    done
                      ? 'bg-emerald-500 text-white scale-100'
                      : active
                      ? 'bg-lime-400 text-slate-900 scale-110 shadow-[0_0_0_4px_rgba(163,230,53,0.25)]'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {done ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : active ? (
                    <span className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  )}
                </span>
                <span
                  className={`transition-colors ${
                    done
                      ? 'text-slate-700 font-medium'
                      : active
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="inline-flex ml-1.5 gap-0.5 align-baseline">
                      <span className="w-0.5 h-0.5 bg-slate-900 rounded-full animate-[bounce_1s_infinite]" />
                      <span
                        className="w-0.5 h-0.5 bg-slate-900 rounded-full animate-[bounce_1s_infinite]"
                        style={{ animationDelay: '0.15s' }}
                      />
                      <span
                        className="w-0.5 h-0.5 bg-slate-900 rounded-full animate-[bounce_1s_infinite]"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Drugs being analyzed */}
        {drugs.length > 0 && (
          <div className="relative pt-4 border-t border-slate-200">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2 text-center">
              {drugs.length === 1
                ? 'Fármaco em análise'
                : `${drugs.length} fármacos em análise`}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto">
              {drugs.map((d, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[12px] font-serif font-medium shadow-2xs"
                >
                  <Pill className="w-3 h-3 text-lime-600" />
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Elapsed timer */}
        <div className="relative text-center mt-4 text-[10px] font-mono text-slate-400">
          {elapsedSec}s decorrido{elapsed > 8000 && ' · quase pronto…'}
        </div>
      </div>
    </div>
  );
};
