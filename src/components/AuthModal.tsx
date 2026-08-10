import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { X, User, Lock, Mail, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!email || !password || !displayName) {
          setError('Preencha todos os campos obrigatórios.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (displayName) {
          await updateProfile(user, { displayName });
        }

        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName: displayName || email.split('@')[0],
          role: 'patient',
          createdAt: new Date().toISOString()
        };

        // Save profile in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), profile);
        } catch (dbErr) {
          console.warn('Could not save user profile to firestore:', dbErr);
        }

        onAuthSuccess(profile);
        onClose();
      } else {
        // Login mode
        if (!email || !password) {
          setError('Preencha e-mail e senha.');
          setLoading(false);
          return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          role: 'patient',
          createdAt: new Date().toISOString()
        };

        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado no Interafarma.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro na autenticação: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoGuest = () => {
    const demoProfile: UserProfile = {
      uid: `demo-${Date.now()}`,
      email: 'farmaceutico.demo@interafarma.com.br',
      displayName: 'Dr. Farmacêutico (Demonstração)',
      role: 'pharmacist',
      createdAt: new Date().toISOString()
    };
    onAuthSuccess(demoProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 font-black flex items-center justify-center text-sm">
              IF
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Intera<span className="text-lime-400">farma</span>
            </span>
          </div>

          <h3 className="text-lg font-bold">
            {mode === 'login' ? 'Acessar Conta de Usuário' : 'Cadastro de Novo Usuário'}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'login' 
              ? 'Entre com suas credenciais para salvar histórico e prescrições.' 
              : 'Crie sua conta para armazenar listas de remédios com segurança.'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-center transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-lime-500 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sistema de Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-center transition-colors ${
              mode === 'register'
                ? 'border-b-2 border-lime-500 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cadastro de Usuário
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nome Completo / Apelido:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Dra. Juliana Santos"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-lime-500 focus:outline-none"
                  required={mode === 'register'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              E-mail:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-lime-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Senha de Acesso:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-lime-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processando...' : mode === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleDemoGuest}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-600" />
              Entrar como Usuário Demonstrativo (Acesso Rápido)
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
