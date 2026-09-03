import React from 'react';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  Zap,
  WifiOff,
  ShieldCheck,
  Share,
  PlusSquare,
  Pill,
} from 'lucide-react';
import { useInstallPrompt } from '../lib/pwa';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { platform, install, markPrompted } = useInstallPrompt();

  if (!isOpen) return null;

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === 'accepted' || outcome === 'dismissed') {
      onClose();
    }
  };

  const handleDismiss = () => {
    markPrompted(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/75 backdrop-blur-md print:hidden animate-[fadeIn_0.2s_ease]">
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden pb-safe">
        {/* Ambient background */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-lime-200/25 blur-[80px] rounded-full pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative p-6 sm:p-8">
          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-lime-400 blur-lg opacity-40 rounded-2xl" />
              <div className="relative w-14 h-14 bg-slate-900 text-lime-400 rounded-2xl flex items-center justify-center shadow-lg">
                <Pill className="w-7 h-7 stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-lime-50 border border-lime-200 text-lime-800 text-[10px] font-semibold uppercase tracking-[0.12em] mb-1">
                <Download className="w-3 h-3" />
                Instalar aplicativo
              </div>
              <h3 className="font-serif text-xl sm:text-[1.65rem] font-semibold tracking-tight text-slate-900 leading-tight">
                Interafarma no seu dispositivo
              </h3>
            </div>
          </div>

          <p className="text-[13.5px] text-slate-600 leading-relaxed mb-5">
            Instale o Interafarma como aplicativo para acesso rápido, sem barra do
            navegador e com ícone dedicado na tela inicial.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Benefit
              icon={<Zap className="w-3.5 h-3.5 text-lime-600" />}
              text="Abertura instantânea"
            />
            <Benefit
              icon={<Smartphone className="w-3.5 h-3.5 text-sky-600" />}
              text="Ícone na tela inicial"
            />
            <Benefit
              icon={<WifiOff className="w-3.5 h-3.5 text-emerald-600" />}
              text="Funciona offline (shell)"
            />
            <Benefit
              icon={<ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
              text="Sem barra do navegador"
            />
          </div>

          {/* Platform-specific CTA */}
          {platform === 'installable' && (
            <>
              <button
                type="button"
                onClick={handleInstall}
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[14px] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Interafarma</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full mt-2 text-center text-[12.5px] text-slate-500 hover:text-slate-800 py-2 cursor-pointer"
              >
                Talvez mais tarde
              </button>
            </>
          )}

          {platform === 'ios' && <IOSInstructions onDismiss={handleDismiss} />}

          {platform === 'installed' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[13px] font-medium text-center">
              ✓ O aplicativo já está instalado neste dispositivo.
            </div>
          )}

          {platform === 'unsupported' && (
            <UnsupportedInstructions onDismiss={handleDismiss} />
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------- */

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
      <span className="shrink-0">{icon}</span>
      <span className="text-[12px] font-medium text-slate-700 leading-tight">{text}</span>
    </div>
  );
}

function IOSInstructions({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          No iPhone / iPad
        </div>

        <ol className="space-y-2.5 text-[13px] text-slate-800">
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <span>
              Toque no ícone de compartilhamento{' '}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-medium">
                <Share className="w-3 h-3" />
              </span>{' '}
              na barra inferior do Safari.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Role a lista e toque em{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-semibold">
                <PlusSquare className="w-3 h-3" />
                Adicionar à Tela de Início
              </span>
              .
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Toque em <span className="font-semibold">Adicionar</span> no canto superior
              direito.
            </span>
          </li>
        </ol>

        <p className="text-[11.5px] text-slate-500 pt-2 border-t border-slate-200">
          O ícone do Interafarma aparecerá na sua tela inicial como um app nativo.
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="w-full mt-3 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13.5px] transition-colors cursor-pointer"
      >
        Entendi
      </button>
    </div>
  );
}

function UnsupportedInstructions({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5" />
          No computador
        </div>

        <ol className="space-y-2.5 text-[13px] text-slate-800">
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <span>
              Abra o Interafarma no <span className="font-semibold">Google Chrome</span> ou{' '}
              <span className="font-semibold">Microsoft Edge</span>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Clique no ícone de instalação{' '}
              <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] font-medium">
                ⊕
              </span>{' '}
              na barra de endereço (canto direito da URL) ou no menu do navegador →
              &quot;Instalar Interafarma&quot;.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <span>Confirme a instalação. O ícone aparecerá no menu iniciar / dock.</span>
          </li>
        </ol>

        <p className="text-[11.5px] text-slate-500 pt-2 border-t border-slate-200">
          Firefox e Safari desktop ainda não suportam instalação de PWA — use Chrome ou
          Edge.
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="w-full mt-3 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13.5px] transition-colors cursor-pointer"
      >
        Entendi
      </button>
    </div>
  );
}
