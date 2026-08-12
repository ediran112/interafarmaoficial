import React from 'react';
import {
  BookmarkCheck,
  Trash2,
  Clock,
  Pill,
  ArrowRight,
  User,
  AlertTriangle,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { SavedCheck, UserProfile } from '../types';

interface SavedChecksProps {
  currentUser: UserProfile | null;
  savedChecks: SavedCheck[];
  onDeleteCheck: (id: string) => void;
  onOpenAuth: () => void;
  onLoadCheckDrugs: (drugs: string[]) => void;
}

export const SavedChecks: React.FC<SavedChecksProps> = ({
  currentUser,
  savedChecks,
  onDeleteCheck,
  onOpenAuth,
  onLoadCheckDrugs,
}) => {
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
        <div className="w-14 h-14 bg-lime-50 text-lime-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-100">
          <User className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          Entre para acessar seu histórico
        </h3>
        <p className="text-[14px] text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
          Ao criar uma conta, cada consulta que você fizer é salva automaticamente e
          fica disponível pra revisão posterior.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="h-11 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13.5px] transition-colors cursor-pointer"
        >
          Entrar ou cadastrar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2">
            <BookmarkCheck className="w-3 h-3" />
            Meu histórico
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Consultas salvas
          </h2>
          <p className="text-[12.5px] text-slate-500 mt-0.5">
            Registrado para{' '}
            <span className="font-serif italic text-slate-800">
              {currentUser.displayName || currentUser.email}
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Total
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900">
            {savedChecks.length}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {savedChecks.length === 0 ? (
        <div className="bg-white p-10 sm:p-14 text-center rounded-2xl border border-dashed border-slate-300">
          <BookmarkCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-serif text-lg font-semibold text-slate-900 mb-1">
            Nenhuma consulta salva ainda
          </h4>
          <p className="text-[13px] text-slate-500 max-w-sm mx-auto">
            Toda vez que você fizer uma busca de interações medicamentosas, ela é
            salva aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedChecks.map((check) => (
            <SavedCard
              key={check.id}
              check={check}
              onDelete={onDeleteCheck}
              onReopen={onLoadCheckDrugs}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SavedCardProps {
  check: SavedCheck;
  onDelete: (id: string) => void;
  onReopen: (drugs: string[]) => void;
}

const SavedCard: React.FC<SavedCardProps> = ({ check, onDelete, onReopen }) => {
  const date = new Date(check.createdAt);
  const ts = date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sev = check.maxSeverity;
  const sevBadge =
    sev === 'Grave'
      ? { bg: 'bg-rose-600 text-white', icon: <AlertTriangle className="w-3 h-3" /> }
      : sev === 'Moderada'
      ? { bg: 'bg-amber-500 text-white', icon: <ShieldAlert className="w-3 h-3" /> }
      : sev === 'Leve'
      ? { bg: 'bg-sky-500 text-white', icon: <Info className="w-3 h-3" /> }
      : { bg: 'bg-emerald-500 text-white', icon: <Info className="w-3 h-3" /> };

  const counts = check.countsBySeverity;

  return (
    <article className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-[0.08em] ${sevBadge.bg}`}
          >
            {sevBadge.icon}
            {sev}
          </span>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 font-mono">
            <Clock className="w-3 h-3" />
            {ts}
          </span>
        </div>
        {check.id && (
          <button
            type="button"
            onClick={() => onDelete(check.id!)}
            title="Excluir do histórico"
            aria-label="Excluir"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {check.queryText && (
        <div className="mb-2 text-[13px] text-slate-600 leading-relaxed">
          <span className="text-slate-400 uppercase tracking-[0.1em] text-[9.5px] font-semibold mr-1">
            Consulta
          </span>
          <span className="font-serif italic text-slate-800">"{check.queryText}"</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {check.drugs.map((d, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-serif font-medium"
          >
            <Pill className="w-3 h-3 text-lime-600" />
            {d}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <div className="text-[12px] text-slate-600 flex items-center gap-3 flex-wrap">
          <span>
            <span className="font-mono font-bold text-slate-900">
              {check.foundInteractionsCount}
            </span>{' '}
            interaç{check.foundInteractionsCount === 1 ? 'ão' : 'ões'}
          </span>
          {counts && (counts.grave + counts.moderada + counts.leve > 0) && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
              {counts.grave > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> {counts.grave}
                </span>
              )}
              {counts.moderada > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />{' '}
                  {counts.moderada}
                </span>
              )}
              {counts.leve > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> {counts.leve}
                </span>
              )}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onReopen(check.drugs)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold transition-colors cursor-pointer"
        >
          <span>Reabrir consulta</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </article>
  );
};
