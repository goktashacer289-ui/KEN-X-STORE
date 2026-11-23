import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Coins,
  Store,
  Bot,
  Gamepad2,
  Crown,
  Shield,
  Gift,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

export type NavTab = 'store' | 'official' | 'community' | 'wallet' | 'studio' | 'admin';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: UserProfile | null;
  onClaimDaily: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  user,
  onClaimDaily
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isDailyClaimed = user?.lastDailyRewardDate === todayStr;
  const isPlusActive = user?.studioPlan === 'plus' && user?.plusExpiry && new Date(user.plusExpiry).getTime() > Date.now();

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => handleNavClick('store')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          {/* Logo Icon */}
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="font-mono font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                K
              </span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-wider text-white">
                KENIX
              </span>
              <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                STORE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest block uppercase">
              Uygulama & Oyun Mağazası
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => handleNavClick('store')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
              currentTab === 'store'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Store size={15} />
            <span>Mağaza</span>
          </button>

          <button
            onClick={() => handleNavClick('official')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
              currentTab === 'official'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bot size={15} />
            <span>KenixAI Ekosistemi</span>
          </button>

          <button
            onClick={() => handleNavClick('community')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
              currentTab === 'community'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Gamepad2 size={15} />
            <span>Studio Oyunları</span>
          </button>

          <button
            onClick={() => handleNavClick('wallet')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
              currentTab === 'wallet'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Coins size={15} />
            <span>KS Cüzdan & Ödüller</span>
          </button>

          <button
            onClick={() => handleNavClick('studio')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
              currentTab === 'studio'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Crown size={15} />
            <span>Kenix Studio</span>
          </button>

          <button
            onClick={() => handleNavClick('admin')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              currentTab === 'admin'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Yönetici Paneli"
          >
            <Shield size={14} />
            <span>Yönetim</span>
          </button>
        </nav>

        {/* Right side: User KS Wallet pill & Actions */}
        <div className="flex items-center gap-3">
          {/* Daily reward alert badge if not claimed */}
          {!isDailyClaimed && (
            <button
              onClick={() => handleNavClick('wallet')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-bounce hover:bg-amber-500/30 transition"
              title="Bugünkü 20 KS günlük ödülünüz hazır!"
            >
              <Gift size={14} />
              <span>+20 KS Hazır!</span>
            </button>
          )}

          {/* User KS Balance Button */}
          {user && (
            <button
              onClick={() => handleNavClick('wallet')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/40 border border-amber-500/40 hover:border-amber-400 text-amber-300 transition shadow-md shadow-amber-500/10 group cursor-pointer"
              title="Kenix Coin Cüzdanı"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:rotate-12 transition">
                <Coins size={14} />
              </div>
              <div className="text-left font-mono">
                <span className="text-xs font-extrabold text-amber-400 tracking-tight">
                  {user.kcBalance.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-500/80 font-bold ml-1">KS</span>
              </div>
            </button>
          )}

          {/* Studio Plan Badge */}
          <div
            onClick={() => handleNavClick('studio')}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black cursor-pointer border ${
              isPlusActive
                ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Kenix Studio Üyelik Durumu"
          >
            {isPlusActive ? (
              <>
                <Crown size={13} className="text-amber-400" />
                <span>PLUS</span>
              </>
            ) : (
              <span>STANDART</span>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-2 animate-fadeIn text-xs font-bold">
          <button
            onClick={() => handleNavClick('store')}
            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 ${
              currentTab === 'store' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Store size={16} /> Mağaza Vitrini
          </button>
          <button
            onClick={() => handleNavClick('official')}
            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 ${
              currentTab === 'official' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Bot size={16} /> KenixAI Ekosistemi
          </button>
          <button
            onClick={() => handleNavClick('community')}
            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 ${
              currentTab === 'community' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'
            }`}
          >
            <Gamepad2 size={16} /> Kenix Studio Kullanıcı Oyunları
          </button>
          <button
            onClick={() => handleNavClick('wallet')}
            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 ${
              currentTab === 'wallet' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300'
            }`}
          >
            <Coins size={16} /> KS Cüzdan & Ödüller ({user?.kcBalance} KS)
          </button>
          <button
            onClick={() => handleNavClick('studio')}
            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 ${
              currentTab === 'studio' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300'
            }`}
          >
            <Crown size={16} /> Kenix Studio & Üyelikler
          </button>
          <button
            onClick={() => handleNavClick('admin')}
            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 ${
              currentTab === 'admin' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            <Shield size={16} /> Yönetim Paneli
          </button>
        </div>
      )}
    </header>
  );
};
