import React from 'react';
import { Pill, User, LogOut, BookmarkCheck, Download } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'search' | 'checker' | 'guide' | 'saved';
  setActiveTab: (tab: 'search' | 'checker' | 'guide' | 'saved') => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAIModal: () => void;
  onOpenInstall?: () => void;
  showInstallButton?: boolean;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenInstall,
  showInstallButton = false,
  savedCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 safe-top">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center shadow-2xs group-hover:bg-slate-800 transition-colors">
              <Pill className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div className="text-left leading-none">
              <span className="block font-serif text-[1.35rem] sm:text-[1.5rem] font-semibold tracking-tight text-slate-900">
                Interafarma
              </span>
              <span className="hidden sm:block text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 mt-0.5">
                Interações medicamentosas
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {showInstallButton && onOpenInstall && (
              <button
                type="button"
                onClick={onOpenInstall}
                title="Instalar aplicativo"
                aria-label="Instalar aplicativo"
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-[13px] font-semibold bg-lime-400 hover:bg-lime-300 text-slate-950 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}

            {currentUser && (
              <button
                type="button"
                onClick={() =>
                  setActiveTab(activeTab === 'saved' ? 'search' : 'saved')
                }
                title={activeTab === 'saved' ? 'Voltar às consultas' : 'Meu histórico'}
                className={`relative inline-flex items-center gap-1.5 h-10 px-3 sm:px-3.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {activeTab === 'saved' ? 'Buscar' : 'Histórico'}
                </span>
                {activeTab !== 'saved' && savedCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-lime-400 text-slate-950 text-[10px] font-bold font-mono">
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2.5 pr-1 py-1 rounded-full">
                <div className="w-6 h-6 rounded-full bg-lime-400 text-slate-950 font-bold flex items-center justify-center text-[11px] shrink-0">
                  {currentUser.displayName
                    ? currentUser.displayName[0].toUpperCase()
                    : currentUser.email[0].toUpperCase()}
                </div>
                <span className="hidden md:inline text-xs font-medium text-slate-700 truncate max-w-[140px]">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair"
                  aria-label="Sair"
                  className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
