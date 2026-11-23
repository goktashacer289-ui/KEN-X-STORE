import React from 'react';
import { Compass, Flame, UploadCloud, Heart, User as UserIcon } from 'lucide-react';
import { StoreNavView } from './StoreHeader';

interface BottomNavProps {
  activeView: StoreNavView;
  onSelectView: (view: StoreNavView) => void;
  favoritesCount: number;
  isSignedIn: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onSelectView,
  favoritesCount,
  isSignedIn
}) => {
  const tabs: Array<{
    id: StoreNavView;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'discover', label: 'Keşfet', icon: Compass },
    { id: 'popular', label: 'Popüler', icon: Flame },
    { id: 'submit', label: 'Gönder', icon: UploadCloud },
    {
      id: 'favorites',
      label: 'Favoriler',
      icon: Heart,
      badge: favoritesCount > 0 ? favoritesCount : undefined
    },
    { id: 'profile', label: isSignedIn ? 'Profil' : 'Giriş', icon: UserIcon }
  ];

  return (
    <nav
      aria-label="Mobil Alt Menü"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#020617]/95 backdrop-blur-lg border-t border-blue-500/30 shadow-[0_-10px_30px_rgba(2,6,23,0.85)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors ${
                isActive ? 'text-blue-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.95)]"
                />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
