import React from 'react';
import { BookmarkCheck, Trash2, Calendar, FileText, Pill, ShieldAlert, AlertTriangle, ArrowRight, User } from 'lucide-react';
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
  onLoadCheckDrugs
}) => {
  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-lime-100 text-lime-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-lime-300">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">
          Entre ou Cadastre-se para Salvar Consultas
        </h3>
        <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
          Ao criar uma conta no Interafarma, você pode armazenar suas verificações de medicação, listas de remédios da família e observações farmacêuticas.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm shadow-md transition-all cursor-pointer"
        >
          Acessar Sistema de Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-lime-100 text-slate-950 text-xs font-bold uppercase mb-2 shadow-2xs">
            <BookmarkCheck className="w-3.5 h-3.5 text-lime-700" />
            <span>Meus Medicamentos & Salvos</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Consultas e Combinações Salvas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Histórico registrado para <strong className="text-slate-800">{currentUser.displayName || currentUser.email}</strong>
          </p>
        </div>

        <div className="bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-extrabold text-slate-500 block">Total de Registros</span>
          <span className="text-xl font-black text-slate-900">{savedChecks.length}</span>
        </div>
      </div>

      {/* List */}
      {savedChecks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-500">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-extrabold text-slate-800">Nenhum registro salvo ainda</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Utilize o "Verificador Multi-Drogas" ou a "Busca de Interações" para salvar combinações de medicamentos aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedChecks.map((check) => (
            <div 
              key={check.id}
              className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm hover:border-lime-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-lime-600" />
                    {new Date(check.createdAt).toLocaleDateString('pt-BR')} às {new Date(check.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    check.maxSeverity === 'Grave'
                      ? 'bg-rose-600 text-white'
                      : check.maxSeverity === 'Moderada'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {check.maxSeverity}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {check.drugs.map((drug, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-lime-100 text-slate-950 font-bold text-xs"
                    >
                      {drug}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  Interações encontradas: <strong className="text-slate-900">{check.foundInteractionsCount}</strong>
                </p>

                {check.notes && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-700 italic border border-slate-200">
                    "{check.notes}"
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <button
                  onClick={() => onLoadCheckDrugs(check.drugs)}
                  className="text-lime-700 hover:text-lime-900 flex items-center gap-1 hover:underline"
                >
                  <span>Reabrir no Verificador</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {check.id && (
                  <button
                    onClick={() => onDeleteCheck(check.id!)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
