import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  ChevronRight,
  Clock,
  Zap,
  Loader2,
  Command,
  Plus,
  Layers,
  Pill,
  Sparkle,
} from 'lucide-react';

export interface SearchPayload {
  term: string;
  drugs?: string[];
}

interface SearchHeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allDrugNames: string[];
  onExecuteSearch: (payload: SearchPayload) => void;
  isSearchLoading?: boolean;
}

const RECENT_KEY = 'interafarma:recent-searches';
const AUTO_KEY = 'interafarma:auto-search';
const DEBOUNCE_MS = 650;
const MIN_CHARS_AUTO = 3;

const POPULAR_SINGLE: { label: string; term: string }[] = [
  { label: 'Warfarina', term: 'Warfarina' },
  { label: 'Fluoxetina', term: 'Fluoxetina' },
  { label: 'Sinvastatina', term: 'Sinvastatina' },
  { label: 'Dipirona', term: 'Dipirona' },
  { label: 'Omeprazol', term: 'Omeprazol' },
];

const POPULAR_COMBOS: { label: string; drugs: string[] }[] = [
  { label: 'Warfarina + Aspirina', drugs: ['Warfarina', 'Aspirina'] },
  { label: 'Fluoxetina + Tramadol', drugs: ['Fluoxetina', 'Tramadol'] },
  { label: 'Sinvastatina + Amiodarona', drugs: ['Sinvastatina', 'Amiodarona'] },
  { label: 'Omeprazol + Clopidogrel', drugs: ['Omeprazol', 'Clopidogrel'] },
];

function loadRecent(): { term: string; drugs?: string[] }[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: { term: string; drugs?: string[] }) {
  try {
    const cur = loadRecent();
    const filtered = cur.filter((t) => t.term.toLowerCase() !== entry.term.toLowerCase());
    const next = [entry, ...filtered].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function uniquePush(list: string[], item: string): string[] {
  const t = titleCase(item.trim());
  if (!t) return list;
  if (list.some((x) => x.toLowerCase() === t.toLowerCase())) return list;
  return [...list, t];
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchTerm,
  setSearchTerm,
  allDrugNames,
  onExecuteSearch,
  isSearchLoading = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [recent, setRecent] = useState<{ term: string; drugs?: string[] }[]>([]);
  const [autoSearch, setAutoSearch] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExecutedRef = useRef<string>('');

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, autoSearch ? 'true' : 'false');
    } catch {}
  }, [autoSearch]);

  const executeWith = useCallback(
    (drugs: string[], freeText: string) => {
      const t = freeText.trim();
      const list = drugs.filter(Boolean);
      const label = list.length > 0 ? list.join(', ') : t;
      if (!label) return;
      const key =
        list.length > 0
          ? `L:${list.map((x) => x.toLowerCase()).sort().join('|')}`
          : `T:${t.toLowerCase()}`;
      if (key === lastExecutedRef.current) return;
      lastExecutedRef.current = key;
      const entry = list.length > 0 ? { term: label, drugs: list } : { term: t };
      saveRecent(entry);
      setRecent(loadRecent());
      setIsFocused(false);
      onExecuteSearch({ term: label, drugs: list.length > 0 ? list : undefined });
    },
    [onExecuteSearch]
  );

  useEffect(() => {
    if (!autoSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = searchTerm.trim();
    if (chips.length === 0 && t.length < MIN_CHARS_AUTO) return;
    if (chips.length >= 1 && chips.length < 2 && t.length === 0) return;
    debounceRef.current = setTimeout(() => {
      const isLikelyQuestion = /\?/.test(t);
      let effectiveChips = chips;
      if (chips.length > 0 && t && !isLikelyQuestion) {
        effectiveChips = uniquePush(chips, t);
      }
      executeWith(effectiveChips, t);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, chips, autoSearch, executeWith]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addChip = (raw: string) => {
    const val = raw.replace(/[,;]$/g, '').trim();
    if (!val) return;
    setChips((prev) => uniquePush(prev, val));
    setSearchTerm('');
  };

  const removeChip = (name: string) => {
    setChips((prev) => prev.filter((c) => c.toLowerCase() !== name.toLowerCase()));
  };

  const clearAll = () => {
    setChips([]);
    setSearchTerm('');
    lastExecutedRef.current = '';
    inputRef.current?.focus();
  };

  const handleInputChange = (v: string) => {
    if (/[,;]$/.test(v)) {
      addChip(v.slice(0, -1));
    } else {
      setSearchTerm(v);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && searchTerm.trim() && chips.length > 0 && !e.shiftKey) {
      e.preventDefault();
      addChip(searchTerm);
    } else if (e.key === 'Backspace' && !searchTerm && chips.length > 0) {
      const last = chips[chips.length - 1];
      setChips((prev) => prev.slice(0, -1));
      setSearchTerm(last);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let finalChips = chips;
    const t = searchTerm.trim();
    if (t && chips.length > 0) {
      finalChips = uniquePush(chips, t);
      setChips(finalChips);
      setSearchTerm('');
    }
    executeWith(finalChips, t);
  };

  const suggestions =
    searchTerm.trim().length >= 2
      ? allDrugNames
          .filter(
            (name) =>
              name.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !chips.some((c) => c.toLowerCase() === name.toLowerCase())
          )
          .slice(0, 6)
      : [];

  const matrixMode = chips.length >= 2;
  const canSearch = chips.length > 0 || searchTerm.trim().length > 0;

  return (
    <section className="relative overflow-hidden bg-white border-b border-slate-200 pt-8 sm:pt-14 pb-8 sm:pb-12 px-4 sm:px-6">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-lime-200/25 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-600 mb-5">
          <Sparkle className="w-3 h-3 text-lime-600" />
          <span>Análise Clínica em Tempo Real</span>
        </div>

        <h1 className="font-serif text-fluid-display font-semibold tracking-tight text-slate-900 mb-4">
          Interações medicamentosas,{' '}
          <span className="italic text-lime-700">analisadas</span> por par.
        </h1>

        <p className="text-fluid-lead text-slate-600 max-w-xl mx-auto mb-8 font-normal">
          Digite um ou mais medicamentos, separados por vírgula, para consultar
          mecanismo, evidência científica, monitorização e conduta clínica.
        </p>

        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`relative flex flex-wrap items-center gap-1.5 bg-white rounded-2xl transition-all border p-1.5 pl-3 min-h-[52px] ${
              isFocused
                ? 'border-lime-500 shadow-[0_0_0_4px_rgba(163,230,53,0.15)]'
                : 'border-slate-300 hover:border-slate-400 shadow-2xs'
            }`}
          >
            <div className="text-slate-400 shrink-0">
              {isSearchLoading ? (
                <Loader2 className="w-5 h-5 text-lime-600 animate-spin" />
              ) : matrixMode ? (
                <Layers className="w-5 h-5 text-emerald-600" />
              ) : (
                <Search className="w-5 h-5 text-slate-500" />
              )}
            </div>

            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 font-serif text-[15px] font-semibold rounded-lg"
              >
                <Pill className="w-3.5 h-3.5 opacity-70" />
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => removeChip(c)}
                  className="ml-0.5 p-0.5 rounded-md hover:bg-emerald-100 cursor-pointer"
                  aria-label={`Remover ${c}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={
                chips.length === 0
                  ? 'Warfarina, Aspirina, Ibuprofeno…'
                  : 'Adicionar medicamento…'
              }
              className="flex-1 min-w-[140px] py-2.5 px-2 text-slate-900 placeholder-slate-400 font-medium rounded-xl focus:outline-none bg-transparent"
              aria-label="Termo de busca de interação medicamentosa"
              autoCapitalize="words"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => addChip(searchTerm)}
                className="p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer shrink-0"
                title="Adicionar como medicamento"
                aria-label="Adicionar medicamento"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {(chips.length > 0 || searchTerm) && (
              <button
                type="button"
                onClick={clearAll}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0"
                title="Limpar tudo"
                aria-label="Limpar tudo"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1 px-2 mr-1 text-[10px] font-mono text-slate-400 border border-slate-200 rounded-md py-1 select-none shrink-0">
              <Command className="w-3 h-3" />
              <span>/</span>
            </div>

            <button
              type="submit"
              disabled={!canSearch || isSearchLoading}
              className="h-11 px-4 sm:px-5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              {isSearchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Consultando</span>
                </>
              ) : matrixMode ? (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Analisar matriz</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Consultar</span>
                </>
              )}
            </button>
          </div>

          {isFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-lg border border-slate-200 z-50 text-left overflow-hidden divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.14em]">
                Sugestões do banco
              </div>
              {suggestions.map((name, idx) => (
                <button
                  type="button"
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addChip(name);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 hover:text-slate-950 transition-colors font-serif text-[15px] font-medium cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    {name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </form>

        {matrixMode && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full">
            <Layers className="w-3 h-3" />
            Matriz — {chips.length} fármacos · {(chips.length * (chips.length - 1)) / 2} par(es)
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 text-[12px] text-slate-500">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={autoSearch}
                onChange={(e) => setAutoSearch(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-lime-500 transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-lime-600" />
              Consulta automática
            </span>
          </label>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">,</kbd>
            adiciona chip
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">/</kbd>
            foca campo
          </span>
        </div>

        <div className="mt-8">
          <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.14em] mb-3">
            Combinações frequentes
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {POPULAR_COMBOS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setChips(q.drugs);
                  setSearchTerm('');
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  executeWith(q.drugs, '');
                }}
                className="px-3 py-1.5 text-[12.5px] font-serif font-medium rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            {POPULAR_SINGLE.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setChips([]);
                  setSearchTerm('');
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  executeWith([q.term], q.term);
                }}
                className="px-2.5 py-1 text-[11.5px] font-mono font-medium rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-2 mb-2 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.14em]">
              <Clock className="w-3 h-3" />
              <span>Buscas recentes</span>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {}
                  setRecent([]);
                }}
                className="ml-1 text-[10px] font-normal normal-case tracking-normal text-slate-400 hover:text-rose-500 underline underline-offset-2 cursor-pointer"
              >
                limpar
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {recent.map((r) => (
                <button
                  key={r.term}
                  type="button"
                  onClick={() => {
                    if (r.drugs && r.drugs.length > 0) {
                      setChips(r.drugs);
                      setSearchTerm('');
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      executeWith(r.drugs, '');
                    } else {
                      setChips([]);
                      setSearchTerm(r.term);
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      executeWith([], r.term);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {r.drugs && r.drugs.length > 1 && (
                    <Layers className="w-3 h-3 text-emerald-600" />
                  )}
                  {r.term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
