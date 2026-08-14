import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { X, User, Lock, Mail, AlertCircle, Sparkle, Pill } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  gateMessage?: string; // mensagem contextual quando o modal foi aberto por auth gate
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  gateMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(gateMessage ? 'register' : 'login');
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
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
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
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'users', user.uid), profile);
        } catch (dbErr) {
          console.warn('Perfil não salvo no Firestore (regras ou config):', dbErr);
        }

        onAuthSuccess(profile);
        onClose();
      } else {
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
          createdAt: new Date().toISOString(),
        };

        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Sem conexão. Verifique sua internet.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(
          'Autenticação por e-mail não está habilitada. Contate o administrador.'
        );
      } else {
        setError('Falha na autenticação: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white sm:rounded-2xl rounded-t-3xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden relative pb-safe">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-lime-50 border border-lime-200 text-lime-800 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2">
              <Pill className="w-3 h-3" />
              Área do usuário
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              {mode === 'login' ? 'Entrar na conta' : 'Criar nova conta'}
            </h3>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
              {mode === 'login'
                ? 'Acesse seu histórico de consultas salvas.'
                : 'Salve consultas e mantenha histórico das análises.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 -m-1 p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-center transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-slate-900 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-center transition-colors ${
              mode === 'register'
                ? 'border-b-2 border-slate-900 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Gate message — quando o modal foi aberto por tentativa de consulta */}
        {gateMessage && (
          <div className="px-5 sm:px-6 pt-4">
            <div className="p-3 rounded-xl bg-lime-50 border border-lime-200 text-lime-900 text-[13px] font-medium flex items-start gap-2">
              <Sparkle className="w-4 h-4 text-lime-700 shrink-0 mt-0.5" />
              <span>{gateMessage}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13px] font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-1.5">
                Nome completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dr. João Silva"
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 text-[14px] font-medium text-slate-900 placeholder-slate-400 focus:border-lime-500 focus:outline-none focus:ring-4 focus:ring-lime-400/15"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 text-[14px] font-medium text-slate-900 placeholder-slate-400 focus:border-lime-500 focus:outline-none focus:ring-4 focus:ring-lime-400/15"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-1.5">
              Senha {mode === 'register' && <span className="text-slate-400 normal-case font-normal tracking-normal">(mín. 6 caracteres)</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 text-[14px] font-medium text-slate-900 placeholder-slate-400 focus:border-lime-500 focus:outline-none focus:ring-4 focus:ring-lime-400/15"
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-[14px] transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Sparkle className="w-4 h-4 animate-pulse" />
                <span>Processando…</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
            )}
          </button>

          <div className="pt-1 text-center">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className="text-[12px] text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Ainda não tem conta?{' '}
                <span className="font-semibold underline underline-offset-2">
                  Cadastre-se
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="text-[12px] text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Já tem conta?{' '}
                <span className="font-semibold underline underline-offset-2">
                  Faça login
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
