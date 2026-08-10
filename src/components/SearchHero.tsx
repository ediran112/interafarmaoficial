import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ShieldAlert, Sparkles, Filter, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SeverityLevel } from '../types';

interface SearchHeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allDrugNames: string[];
  onExecuteSearch: (drugName: string) => void;
  aiStatus?: {
    openaiConfigured: boolean;
    geminiConfigured: boolean;
    activeProvider: string;
    openaiKeySnippet: string | null;
  } | null;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchTerm,
  setSearchTerm,
  allDrugNames,
  onExecuteSearch,
  aiStatus
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on typed search term
  const suggestions = searchTerm.trim().length >= 2
    ? allDrugNames.filter(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSearchSubmit = (term: string) => {
    if (!term.trim()) return;
    setIsFocused(false);
    onExecuteSearch(term.trim());
  };

  return (
    <section className="relative overflow-hidden bg-slate-50 text-slate-900 pt-10 pb-12 px-4 sm:px-6 border-b border-slate-200">
      
      {/* Decorative Geometry Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime-300/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-72 h-72 bg-emerald-200/20 blur-2xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* Header Badge */}
        {aiStatus?.openaiConfigured ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
            <span>IA Ativa: OpenAI ChatGPT (gpt-4o-mini)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime-100 border border-lime-300 text-lime-800 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Base de Dados Farmacológica Oficial Interafarma</span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-3">
          Pesquisa de <span className="bg-lime-400 text-slate-950 px-3 py-0.5 rounded-xl inline-block mt-1 sm:mt-0">Interações Medicamentosas</span>
        </h1>
        
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
          Digite o nome de um medicamento para verificar com o que ele interage, riscos clínicos, mecanismos de ação e recomendações de segurança.
        </p>

        {/* CENTRAL SEARCH BOX WITH EXPLICIT PESQUISAR BUTTON */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit(searchTerm);
          }}
          className="relative max-w-2xl mx-auto"
        >
          <div className={`relative flex items-center bg-white rounded-2xl shadow-md transition-all border-2 p-1.5 ${
            isFocused ? 'border-lime-500 ring-4 ring-lime-400/30' : 'border-slate-200 hover:border-lime-400'
          }`}>
            <div className="pl-3.5 text-slate-400">
              <Search className="w-5 h-5 text-lime-600" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Digite o nome do remédio (ex: Warfarina, Aspirina...)"
              className="w-full py-3 pl-3 pr-2 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold rounded-xl focus:outline-none"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* EXPLICIT PESQUISAR BUTTON */}
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 stroke-[3]" />
              <span>Pesquisar</span>
            </button>
          </div>

          {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
          {isFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 text-left overflow-hidden divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sugestões no Banco de Dados
              </div>
              {suggestions.map((name, idx) => (
                <button
                  type="button"
                  key={idx}
                  onMouseDown={() => {
                    setSearchTerm(name);
                    handleSearchSubmit(name);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-lime-100 hover:text-slate-950 transition-colors text-sm font-bold cursor-pointer"
                >
                  <span>{name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </form>

        {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}

      </div>
    </section>
  );
};
