import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, Check, X, Info } from 'lucide-react';
import {
  getPushPermission,
  pushSupported,
  subscribeUser,
  unsubscribeUser,
  type PushPermission,
} from '../lib/push';

interface NotificationsToggleProps {
  userId: string | null;
  onFlash?: (msg: string) => void;
}

export const NotificationsToggle: React.FC<NotificationsToggleProps> = ({
  userId,
  onFlash,
}) => {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPermission(getPushPermission());
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!pushSupported() || !userId) return null;

  const handleEnable = async () => {
    if (!userId) return;
    setLoading(true);
    const result = await subscribeUser(userId);
    setLoading(false);
    setPermission(getPushPermission());
    setOpen(false);
    if (result === 'granted') {
      onFlash?.('Notificações ativadas neste dispositivo');
    } else if (result === 'denied') {
      onFlash?.('Permissão negada — libere nas configurações do navegador');
    } else if (result === 'unsupported') {
      onFlash?.('Este dispositivo não suporta notificações');
    } else {
      onFlash?.('Erro ao ativar notificações');
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    const ok = await unsubscribeUser();
    setLoading(false);
    setPermission(getPushPermission());
    setOpen(false);
    if (ok) onFlash?.('Notificações desativadas');
  };

  const iconState =
    permission === 'granted'
      ? 'active'
      : permission === 'denied'
      ? 'blocked'
      : 'inactive';

  const buttonStyle =
    iconState === 'active'
      ? 'bg-lime-50 border-lime-300 text-lime-700 hover:bg-lime-100'
      : iconState === 'blocked'
      ? 'bg-slate-50 border-slate-200 text-slate-400'
      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={
          iconState === 'active'
            ? 'Notificações ativas'
            : iconState === 'blocked'
            ? 'Notificações bloqueadas'
            : 'Ativar notificações'
        }
        aria-label="Notificações"
        className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors cursor-pointer ${buttonStyle}`}
      >
        {iconState === 'active' ? (
          <BellRing className="w-4 h-4" />
        ) : iconState === 'blocked' ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
            <Bell className="w-3 h-3" />
            Notificações push
          </div>

          {iconState === 'active' && (
            <>
              <div className="flex items-start gap-2 text-[13px] text-slate-700 mb-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold text-slate-900">Ativas.</span> Você
                  receberá alertas de atualizações da plataforma e novos recursos neste
                  dispositivo.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading}
                className="w-full h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Desativando…' : 'Desativar neste dispositivo'}
              </button>
            </>
          )}

          {iconState === 'inactive' && (
            <>
              <p className="text-[13px] text-slate-700 mb-3 leading-relaxed">
                Ative para receber avisos de novas versões, alertas Anvisa e melhorias
                da ferramenta em tempo real.
              </p>
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  'Ativando…'
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5" />
                    Ativar notificações
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed inline-flex items-start gap-1">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  No iPhone/iPad, é necessário primeiro instalar o app na tela inicial
                  para receber notificações.
                </span>
              </p>
            </>
          )}

          {iconState === 'blocked' && (
            <>
              <div className="flex items-start gap-2 text-[13px] text-slate-700 mb-3">
                <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold text-slate-900">Bloqueadas.</span> Você
                  negou permissão anteriormente. Para reativar, abra as configurações do
                  navegador → Permissões do site → Notificações → Permitir.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
