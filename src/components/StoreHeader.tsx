import React from 'react';
import { ShieldCheck, Lock, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

export type StoreNavView =
  | 'discover'
  | 'popular'
  | 'new'
  | 'favorites'
  | 'submit'
  | 'profile'
  | 'privacy'
  | 'ceo';

interface StoreHeaderProps {
  activeView: StoreNavView;
  onSelectView: (view: StoreNavView) => void;
  favoritesCount: number;
  isCeoAuthenticated: boolean;
  firebaseUser: User | null;
  onOpenAuth: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  activeView,
  onSelectView,
  favoritesCount,
  isCeoAuthenticated,
  firebaseUser,
  onOpenAuth
}) => {
  const navItems: Array<{ id: StoreNavView; label: string; mobileLabel: string }> = [
    { id: 'discover', label: 'Keşfet', mobileLabel: 'Keşfet' },
    { id: 'popular', label: 'Popüler', mobileLabel: 'Popüler' },
    { id: 'new', label: 'Yeni Eklenenler', mobileLabel: 'Yeni Eklenenler' },
    {
      id: 'favorites',
      label: favoritesCount > 0 ? `Favoriler (${favoritesCount})` : 'Favoriler',
      mobileLabel: favoritesCount > 0 ? `Favoriler (${favoritesCount})` : 'Favoriler'
    },
    { id: 'submit', label: 'APK Gönder', mobileLabel: 'APK Gönder' }
  ];

  const userDisplay = firebaseUser
    ? firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Profil'
    : null;

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-blue-500/25 bg-[#020617]/90 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Logo (Preserved KENİX✓ STORE identity) */}
        <button
          type="button"
          onClick={() => onSelectView('discover')}
          className="flex items-center gap-2 select-none min-h-[44px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg shrink-0"
          aria-label="KENİX STORE Ana Sayfa"
        >
          <span className="text-lg sm:text-xl font-black tracking-[0.14em] kenix-text-neon-primary">
            KENİX
          </span>
          <svg
            viewBox="0 0 36 36"
            fill="none"
            className="w-5 h-5 kenix-text-neon-check shrink-0 -ml-1"
            aria-hidden="true"
          >
            <path
              d="M7 19.5L14.5 27L29.5 10"
              stroke="currentColor"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm sm:text-base font-extrabold tracking-[0.28em] kenix-text-neon-secondary ml-0.5">
            STORE
          </span>
        </button>

        {/* Zone 2: Desktop Primary Navigation */}
        <nav aria-label="Mağaza Bölümleri" className="hidden md:flex items-center gap-5 lg:gap-6">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative min-h-[44px] px-1 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-blue-300'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.95)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: User Profile & CEO Panel Access */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (firebaseUser ? onSelectView('profile') : onOpenAuth())}
            className={`hidden sm:inline-flex min-h-[42px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap items-center gap-2 border transition-all ${
              activeView === 'profile'
                ? 'bg-blue-600/25 border-blue-400 text-blue-100'
                : 'bg-[#071333]/80 border-blue-500/30 text-slate-200 hover:border-blue-400/70'
            }`}
          >
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={userDisplay || 'Profil'}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-md object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-blue-300 shrink-0" />
            )}
            <span className="max-w-[110px] truncate">{userDisplay || 'Giriş Yap'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('ceo')}
            className={`min-h-[42px] px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all border ${
              activeView === 'ceo'
                ? 'bg-blue-600/25 border-blue-400 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.45)]'
                : 'bg-[#071333]/80 border-blue-500/35 text-blue-200 hover:border-blue-400/70 hover:bg-blue-950/70'
            }`}
          >
            {isCeoAuthenticated ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>CEO Paneli</span>
          </button>
        </div>
      </div>

      {/* Mobile Secondary Strip (Yeni Eklenenler & Gizlilik — primary tabs live in BottomNav) */}
      <nav
        aria-label="Hızlı Bağlantılar"
        className="md:hidden border-t border-blue-500/15 px-3 flex items-center gap-4 overflow-x-auto no-scrollbar"
      >
        {[
          { id: 'new' as StoreNavView, label: 'Yeni Eklenenler' },
          { id: 'privacy' as StoreNavView, label: 'Gizlilik Politikası' }
        ].map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`relative min-h-[38px] px-1 text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                isActive ? 'text-blue-300' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
