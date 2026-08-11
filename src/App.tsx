import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { DrugInteraction, SavedCheck, UserProfile, DrugMonograph as DrugMonographType } from './types';
import { 
  seedInitialInteractionsIfNeeded, 
  searchInteractions, 
  getAllUniqueDrugNames,
  saveUserCheck,
  getUserSavedChecks,
  deleteSavedCheck
} from './services/interactionService';
import { Navbar } from './components/Navbar';
import { SearchHero } from './components/SearchHero';
import { InteractionCard } from './components/InteractionCard';
import { CombinationChecker } from './components/CombinationChecker';
import { AuthModal } from './components/AuthModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { SavedChecks } from './components/SavedChecks';
import { SafetyGuide } from './components/SafetyGuide';
import { DrugMonograph } from './components/DrugMonograph';
import { Pill, AlertCircle, RefreshCw, Search, Zap } from 'lucide-react';

export default function App() {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchExecutedTerm, setSearchExecutedTerm] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('Todos');
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Monograph state — only fetched when the query is a single drug
  const [monograph, setMonograph] = useState<DrugMonographType | null>(null);
  const [isMonographLoading, setIsMonographLoading] = useState(false);
  const monographAbortRef = useRef<AbortController | null>(null);
  const [monographTab, setMonographTab] = useState<'interactions' | 'monograph'>('monograph');

  const fetchMonograph = async (drug: string) => {
    if (monographAbortRef.current) monographAbortRef.current.abort();
    const controller = new AbortController();
    monographAbortRef.current = controller;
    setMonograph(null);
    setIsMonographLoading(true);
    try {
      const res = await fetch('/api/drug-monograph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.monograph) setMonograph(data.monograph);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.warn('Monograph fetch failed:', err);
    } finally {
      if (monographAbortRef.current === controller) {
        setIsMonographLoading(false);
        monographAbortRef.current = null;
      }
    }
  };

  // Heuristic: query is a single drug when either drugs.length === 1
  // OR the free text has no separators, no question marks, and <= 3 words
  const shouldFetchMonograph = (drugs: string[] | undefined, term: string): string | null => {
    if (drugs && drugs.length === 1) return drugs[0];
    if (drugs && drugs.length > 1) return null;
    const t = term.trim();
    if (!t) return null;
    if (/[,;?]/.test(t)) return null;
    if (t.split(/\s+/).length > 3) return null;
    return t;
  };

  // Trigger search with loading and real-time backend AI query
  const handleExecuteSearch = async (payload: { term: string; drugs?: string[] }) => {
    const term = payload.term;
    const drugs = payload.drugs && payload.drugs.length > 0 ? payload.drugs : undefined;

    // Cancel any in-flight request from a previous keystroke
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearchExecutedTerm(term);
    setIsSearchLoading(true);

    // Fire monograph fetch in parallel when the query looks like a single drug
    const monoDrug = shouldFetchMonograph(drugs, term);
    if (monoDrug) {
      setMonographTab('monograph');
      fetchMonograph(monoDrug);
    } else {
      if (monographAbortRef.current) monographAbortRef.current.abort();
      setMonograph(null);
      setIsMonographLoading(false);
      setMonographTab('interactions');
    }

    const startTime = Date.now();

    try {
      const response = await fetch('/api/search-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drugs ? { drugs, searchTerm: term } : { searchTerm: term }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        setLastResponseMs(Date.now() - startTime);
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          setInteractions((prev) => {
            const incoming: DrugInteraction[] = data.results.map((item: any, idx: number) => ({
              id: item.id || `ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              ...item,
            }));
            const existingIds = new Set(prev.map((it) => it.id));
            const newItems = incoming.filter((it) => !existingIds.has(it.id));
            return [...newItems, ...prev];
          });
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // superseded by newer keystroke
      console.warn('Real-time AI search fallback to local dataset:', error);
    } finally {
      if (searchAbortRef.current === controller) {
        setIsSearchLoading(false);
        searchAbortRef.current = null;
      }
    }
  };
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'search' | 'checker' | 'guide' | 'saved'>('search');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Saved checks
  const [savedChecks, setSavedChecks] = useState<SavedCheck[]>([]);

  // AI Modal state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInitialDrugA, setAiInitialDrugA] = useState('');
  const [aiInitialDrugB, setAiInitialDrugB] = useState('');

  // 1. Load initial 30 interactions from Firestore/Local
  useEffect(() => {
    async function loadInteractions() {
      setLoadingData(true);
      try {
        const data = await seedInitialInteractionsIfNeeded();
        setInteractions(data);
      } catch (err) {
        console.error('Failed loading interactions:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadInteractions();
  }, []);

  // 2. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          createdAt: new Date().toISOString()
        };
        setCurrentUser(profile);
        // Load user's saved checks from Firestore
        const checks = await getUserSavedChecks(user.uid);
        setSavedChecks(checks);
      } else {
        // If not logged in with Firebase, retain guest if any, else null
        if (currentUser?.uid.startsWith('demo-')) {
          // keep demo user
        } else {
          setCurrentUser(null);
          setSavedChecks([]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load saved checks when user changes
  useEffect(() => {
    if (currentUser && !currentUser.uid.startsWith('demo-')) {
      getUserSavedChecks(currentUser.uid).then(setSavedChecks);
    }
  }, [currentUser]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setSavedChecks([]);
  };

  // Filtered interactions for search tab based on executed search
  const filteredInteractions = searchInteractions(interactions, searchExecutedTerm, severityFilter);
  const allDrugNames = getAllUniqueDrugNames(interactions);

  // Handle saving a check from CombinationChecker
  const handleSaveCheck = async (drugs: string[], interactionsCount: number, maxSeverity: any) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const newSaved = await saveUserCheck(
      currentUser.uid,
      drugs,
      interactionsCount,
      maxSeverity,
      `Consulta em ${new Date().toLocaleDateString('pt-BR')}`
    );

    setSavedChecks([newSaved, ...savedChecks]);
  };

  // Handle deleting a check
  const handleDeleteCheck = async (id: string) => {
    await deleteSavedCheck(id);
    setSavedChecks(savedChecks.filter(c => c.id !== id));
  };

  // Handle opening AI Advisor
  const handleOpenAI = (drugA: string = '', drugB: string = '') => {
    setAiInitialDrugA(drugA);
    setAiInitialDrugB(drugB);
    setIsAIModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-lime-300 selection:text-slate-950">
      
      {/* NAVBAR */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAIModal={() => handleOpenAI()}
        savedCount={savedChecks.length}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pb-16">
        
        {/* TAB 1: BUSCA DE INTERAÇÕES (CENTER SEARCH HERO + CARDS) */}
        {activeTab === 'search' && (
          <div>
            <SearchHero
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              allDrugNames={allDrugNames}
              onExecuteSearch={handleExecuteSearch}
              isSearchLoading={isSearchLoading}
            />

            {/* Top-level toggle Monografia / Interações (only when we have a monograph context) */}
            {searchExecutedTerm && (isMonographLoading || monograph) && (
              <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
                <div
                  role="tablist"
                  aria-label="Modo de visualização"
                  className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-2xs"
                >
                  <button
                    role="tab"
                    aria-selected={monographTab === 'monograph'}
                    type="button"
                    onClick={() => setMonographTab('monograph')}
                    className={`h-9 px-4 rounded-full text-[12.5px] font-semibold transition-colors cursor-pointer ${
                      monographTab === 'monograph'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monografia
                  </button>
                  <button
                    role="tab"
                    aria-selected={monographTab === 'interactions'}
                    type="button"
                    onClick={() => setMonographTab('interactions')}
                    className={`h-9 px-4 rounded-full text-[12.5px] font-semibold transition-colors cursor-pointer ${
                      monographTab === 'interactions'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Interações
                  </button>
                </div>
              </div>
            )}

            {/* CARDS LIST CONTAINER / REAL-TIME LOADING */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-6">
              {/* Monograph panel */}
              {searchExecutedTerm && monographTab === 'monograph' && (isMonographLoading || monograph) && (
                <>
                  {isMonographLoading && !monograph ? (
                    <DrugMonograph
                      loading
                      monograph={{
                        drug: '',
                        dosage: {
                          therapeuticClass: '',
                          regulatoryClass: '',
                          presentations: [],
                          adultStandard: [],
                          maxDailyDose: '',
                        },
                        adjustment: { renal: [], hepatic: '', pregnancy: '', lactation: '' },
                        pharmacokinetics: {
                          onsetByRoute: [],
                          halfLife: '',
                          duration: '',
                          metabolism: '',
                          proteinBinding: '',
                          excretion: '',
                        },
                        administration: { routes: [], dilution: [], oralCare: '', stability: '' },
                      }}
                    />
                  ) : monograph ? (
                    <DrugMonograph monograph={monograph} />
                  ) : null}
                </>
              )}

              {/* Interactions panel — shown when the toggle is 'interactions' OR when there's no monograph context */}
              {(!searchExecutedTerm || monographTab === 'interactions' || (!isMonographLoading && !monograph)) && (
                <>
              {loadingData ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 text-lime-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium">Carregando banco de interações...</p>
                </div>
              ) : isSearchLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between px-1 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-lime-600 animate-spin" />
                      Consultando{' '}
                      <span className="font-serif text-slate-900 italic">
                        "{searchExecutedTerm}"
                      </span>
                    </span>
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 overflow-hidden relative"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2.5 min-w-0">
                          <div className="h-4 w-2/3 rounded-md bg-slate-200 animate-pulse" />
                          <div className="h-3 w-1/3 rounded-md bg-slate-100 animate-pulse" />
                          <div className="pt-2 space-y-1.5">
                            <div className="h-3 w-full rounded-md bg-slate-100 animate-pulse" />
                            <div className="h-3 w-11/12 rounded-md bg-slate-100 animate-pulse" />
                            <div className="h-3 w-9/12 rounded-md bg-slate-100 animate-pulse" />
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-[pulse_1.4s_ease-in-out_infinite]" />
                    </div>
                  ))}
                </div>
              ) : !searchExecutedTerm ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 max-w-xl mx-auto my-8">
                  <div className="w-12 h-12 bg-lime-50 text-lime-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-100">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 mb-2">
                    Pronto para consultar
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                    Digite um medicamento no campo acima. As interações aparecem em
                    tempo real conforme você escreve.
                  </p>
                </div>
              ) : filteredInteractions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-slate-200 max-w-xl mx-auto my-8">
                  <AlertCircle className="w-9 h-9 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-serif text-xl font-semibold text-slate-900">
                    Nada encontrado para{' '}
                    <span className="italic">"{searchExecutedTerm}"</span>
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                    Verifique a grafia ou tente Warfarina, Sinvastatina, Ibuprofeno,
                    Fluoxetina, Aspirina.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSearchExecutedTerm('');
                    }}
                    className="mt-4 h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-full transition-colors cursor-pointer"
                  >
                    Limpar consulta
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span>Resultado para</span>
                      <span className="font-serif italic text-slate-900">
                        "{searchExecutedTerm}"
                      </span>
                      {lastResponseMs !== null && (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[11px] ml-1">
                          <Zap className="w-3 h-3 text-lime-600" />
                          {(lastResponseMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {filteredInteractions.length}{' '}
                      {filteredInteractions.length === 1 ? 'interação' : 'interações'}
                    </span>
                  </div>

                  {filteredInteractions.map((item) => (
                    <InteractionCard
                      key={item.id}
                      interaction={item}
                      onAskAIAdvice={handleOpenAI}
                      onSaveInteraction={(interactionItem) => {
                        handleSaveCheck(
                          [interactionItem.drugA, interactionItem.drugB],
                          1,
                          interactionItem.severity
                        );
                      }}
                    />
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: VERIFICADOR MULTI-DROGAS */}
        {activeTab === 'checker' && (
          <CombinationChecker
            allInteractions={interactions}
            allDrugNames={allDrugNames}
            onSaveCheck={handleSaveCheck}
            onAskAIAdvice={handleOpenAI}
          />
        )}

        {/* TAB 3: GUIA DE SEGURANÇA */}
        {activeTab === 'guide' && <SafetyGuide />}

        {/* TAB 4: MEUS MEDICAMENTOS E SALVOS */}
        {activeTab === 'saved' && (
          <SavedChecks
            currentUser={currentUser}
            savedChecks={savedChecks}
            onDeleteCheck={handleDeleteCheck}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLoadCheckDrugs={(drugs) => {
              setActiveTab('checker');
            }}
          />
        )}

      </main>

      <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 mt-auto pb-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center">
                <Pill className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <div>
                <span className="block font-serif text-lg font-semibold tracking-tight text-white">
                  Interafarma
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  Interações medicamentosas
                </span>
              </div>
            </div>

            <p className="max-w-md text-[12px] leading-relaxed text-slate-400">
              <span className="text-slate-200 font-semibold">Aviso clínico.</span>{' '}
              As informações desta plataforma têm fins educacionais e de apoio à
              decisão clínica. Não substituem avaliação e prescrição por médico ou
              farmacêutico habilitado.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Interafarma. Todos os direitos reservados.</span>
            <span className="font-mono text-slate-600">v1.0</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      <AIAdvisorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        initialDrugA={aiInitialDrugA}
        initialDrugB={aiInitialDrugB}
        allDrugNames={allDrugNames}
      />

    </div>
  );
}
