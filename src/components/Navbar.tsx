import React from 'react';
import { Pill, User, LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'search' | 'checker' | 'guide' | 'saved';
  setActiveTab: (tab: 'search' | 'checker' | 'guide' | 'saved') => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAIModal: () => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenAIModal,
  savedCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('search')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-lime-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              <Pill className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                INTERA<span className="text-lime-500">FARMA</span>
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
                <div className="w-6 h-6 rounded-full bg-lime-400 text-slate-950 font-black flex items-center justify-center text-xs">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email[0].toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                <button
                  onClick={onLogout}
                  title="Sair"
                  className="p-1 hover:text-rose-600 text-slate-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
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
