import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { DrugInteraction, SavedCheck, UserProfile } from './types';
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
import { Pill, ShieldCheck, Heart, Sparkles, AlertCircle, RefreshCw, Search, Zap, Database, Bot } from 'lucide-react';

export default function App() {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchExecutedTerm, setSearchExecutedTerm] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('Todos');
  const [aiStatus, setAiStatus] = useState<{
    openaiConfigured: boolean;
    geminiConfigured: boolean;
    activeProvider: string;
    openaiKeySnippet: string | null;
  } | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Check AI Status from backend on mount
  useEffect(() => {
    fetch('/api/ai-status')
      .then((res) => res.json())
      .then((data) => {
        setAiStatus(data);
      })
      .catch((err) => {
        console.warn('Could not fetch AI status:', err);
      });
  }, []);

  // Trigger search with loading and real-time backend AI query
  const handleExecuteSearch = async (term: string) => {
    // Cancel any in-flight request from a previous keystroke
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearchTerm(term);
    setSearchExecutedTerm(term);
    setIsSearchLoading(true);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/search-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: term }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.provider) {
          setLastProvider(data.provider);
        }
        setLastResponseMs(Date.now() - startTime);
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          setInteractions((prev) => {
            const formattedResults = data.results.map((item: any, idx: number) => ({
              id: item.id || `ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              drugA: item.drugA || term,
              drugB: item.drugB || 'Medicamento',
              synonymsA: item.synonymsA || [term],
              synonymsB: item.synonymsB || [],
              severity: item.severity || 'Grave',
              category: item.category || 'Farmacologia Clínica',
              effect: item.effect || 'Efeito e risco em análise.',
              mechanism: item.mechanism || 'Mecanismo farmacológico.',
              recommendation: item.recommendation || 'Consulte seu médico ou farmacêutico.',
              alternatives: item.alternatives || 'Consulte um profissional para alternativas.',
              foodInteractions: item.foodInteractions || 'Não ingerir com bebidas alcoólicas.',
              affectedOrgans: item.affectedOrgans || ['Fígado']
            }));

            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = formattedResults.filter((item: any) => !existingIds.has(item.id));
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
              aiStatus={aiStatus}
            />

            {/* CARDS LIST CONTAINER / REAL-TIME LOADING */}
            <div className="max-w-5xl mx-auto px-4 mt-8">
              
              {loadingData ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 text-lime-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold">Carregando banco de interações do Interafarma...</p>
                </div>
              ) : isSearchLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-bold">
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-lime-600 animate-spin" />
                      Pesquisando <strong className="text-slate-900">"{searchExecutedTerm}"</strong> em tempo real...
                    </span>
                    <span className="hidden sm:inline">Consultando fonte farmacológica</span>
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm overflow-hidden relative"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-slate-200 animate-pulse" />
                        <div className="flex-1 space-y-2.5">
                          <div className="h-4 w-2/3 rounded-md bg-slate-200 animate-pulse" />
                          <div className="h-3 w-1/3 rounded-md bg-slate-100 animate-pulse" />
                          <div className="pt-2 space-y-1.5">
                            <div className="h-3 w-full rounded-md bg-slate-100 animate-pulse" />
                            <div className="h-3 w-11/12 rounded-md bg-slate-100 animate-pulse" />
                            <div className="h-3 w-9/12 rounded-md bg-slate-100 animate-pulse" />
                          </div>
                        </div>
                        <div className="w-16 h-6 rounded-full bg-slate-200 animate-pulse hidden sm:block" />
                      </div>
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-[pulse_1.4s_ease-in-out_infinite]" />
                    </div>
                  ))}
                </div>
              ) : !searchExecutedTerm ? (
                /* INITIAL PROMPT STATE - NO RESULTS SHOWN UNTIL USER SEARCHES */
                <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border-2 border-slate-200 shadow-sm max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 bg-lime-100 text-lime-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-200 shadow-2xs">
                    <Search className="w-8 h-8 text-lime-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                    Buscador de Interações em Tempo Real
                  </h3>
                  <p className="text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                    Digite o nome de um medicamento no campo de busca acima e clique em <strong className="text-slate-900">Pesquisar</strong> para consultar interações e riscos clínicos.
                  </p>
                </div>
              ) : filteredInteractions.length === 0 ? (
                /* NO RESULTS FOUND FOR EXECUTED SEARCH */
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-slate-200 shadow-sm max-w-2xl mx-auto my-6">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-xl font-extrabold text-slate-900">Nenhuma interação encontrada para "{searchExecutedTerm}"</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                    Verifique a grafia do remédio ou tente pesquisar por outro medicamento (ex: Warfarina, Sinvastatina, Ibuprofeno, Fluoxetina, Aspirina).
                  </p>
                  <button
                    onClick={() => { setSearchTerm(''); setSearchExecutedTerm(''); }}
                    className="mt-5 px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs rounded-full shadow-sm transition-all cursor-pointer"
                  >
                    Limpar Pesquisa
                  </button>
                </div>
              ) : (
                /* RESULTS FOUND FOR EXECUTED SEARCH */
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500 font-bold">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Resultado da pesquisa para <span className="text-slate-900">"{searchExecutedTerm}"</span></span>
                      {lastProvider && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                            lastProvider === 'openai'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : lastProvider === 'gemini'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {lastProvider === 'openai' ? (
                            <>
                              <Bot className="w-3 h-3" /> via OpenAI ChatGPT
                            </>
                          ) : lastProvider === 'gemini' ? (
                            <>
                              <Bot className="w-3 h-3" /> via Google Gemini
                            </>
                          ) : (
                            <>
                              <Database className="w-3 h-3" /> Base local
                            </>
                          )}
                        </span>
                      )}
                      {lastResponseMs !== null && (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-semibold">
                          <Zap className="w-3 h-3 text-lime-600" />
                          {(lastResponseMs / 1000).toFixed(2)} s
                        </span>
                      )}
                    </div>
                    <span>{filteredInteractions.length} interação(ões) encontrada(s)</span>
                  </div>

                  {filteredInteractions.map((item) => (
                    <InteractionCard
                      key={item.id}
                      interaction={item}
                      onAskAIAdvice={handleOpenAI}
                      onSaveInteraction={(interactionItem) => {
                        handleSaveCheck([interactionItem.drugA, interactionItem.drugB], 1, interactionItem.severity);
                      }}
                    />
                  ))}
                </div>
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

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 py-10 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs text-slate-400">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
              <Pill className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight">
                Intera<span className="text-lime-400">farma</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Plataforma Médica & Farmacológica de Interações Medicamentosas
              </p>
            </div>
          </div>

          <p className="max-w-lg text-[11px] leading-relaxed">
            <strong>Aviso de Isenção de Responsabilidade Médica:</strong> As informações contidas nesta plataforma destina-se a fins educacionais e de apoio à decisão clínica. Não substitui a avaliação e prescrissão por médico ou farmacêutico habilitado.
          </p>

          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} Interafarma. Todos os direitos reservados.
          </p>

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
