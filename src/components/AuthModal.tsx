import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ShieldCheck, Chrome } from 'lucide-react';
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  signInWithGooglePopup
} from '../firebase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithGooglePopup();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google ile giriş yapılamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Lütfen adınızı veya geliştirici takma adınızı giriniz.');
        }
        await registerWithEmailPassword(email, password, displayName);
        setNotice(
          'Hesabınız oluşturuldu! APK gönderebilmek için e-posta kutunuza gelen doğrulama bağlantısını onaylayın.'
        );
        if (onSuccess) onSuccess();
      } else {
        await loginWithEmailPassword(email, password);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#01040f]/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#05102b] border border-blue-500/40 kenix-neon-frame-inner p-6 sm:p-7 space-y-5 shadow-[0_24px_60px_rgba(2,6,23,0.9)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-3.5 right-3.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-blue-950/70"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-950/80 border border-blue-400/45 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <ShieldCheck className="w-6 h-6 text-blue-300" />
          </div>
          <h2 id="auth-modal-title" className="text-xl font-extrabold text-white">
            {mode === 'login' ? 'KENİX Hesabına Giriş Yap' : 'Yeni KENİX Hesabı Oluştur'}
          </h2>
          <p className="text-xs text-slate-300">
            Uygulama göndermek, KS cüzdanınızı senkronize etmek ve profilinizi yönetmek için giriş yapın.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogleSignIn}
          className="w-full min-h-[46px] px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm inline-flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
        >
          <Chrome className="w-4 h-4 text-blue-600" />
          <span>Google ile Devam Et</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-blue-500/20" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            veya E-posta ile
          </span>
          <div className="h-px flex-1 bg-blue-500/20" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#020718] border border-blue-500/25">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
              mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
              mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="block text-xs font-semibold text-blue-200">
                Ad / Geliştirici Adı
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Örn: Kenix Geliştirici"
                  className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email" className="block text-xs font-semibold text-blue-200">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-password" className="block text-xs font-semibold text-blue-200">
              Şifre
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-200 bg-rose-950/50 border border-rose-500/40 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          {notice && (
            <p role="status" className="text-xs font-medium text-emerald-200 bg-emerald-950/45 border border-emerald-500/40 rounded-xl px-3.5 py-2.5">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold shadow-[0_0_18px_rgba(37,99,235,0.5)] transition-all"
          >
            {busy ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
      </div>
    </div>
  );
};
