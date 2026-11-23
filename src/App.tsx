/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Layers,
  Flame,
  Clock,
  Heart,
  Lock,
  ExternalLink,
  ShieldCheck,
  FileText,
  UploadCloud
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { SplashScreen } from './components/SplashScreen';
import { StoreHeader, StoreNavView } from './components/StoreHeader';
import { BottomNav } from './components/BottomNav';
import { StoreAppCard } from './components/StoreAppCard';
import { AppDetailView } from './components/AppDetailView';
import { LaunchAnimationModal } from './components/LaunchAnimationModal';
import { CeoPanel } from './components/CeoPanel';
import { PlusMembershipSection } from './components/PlusMembershipSection';
import { AuthModal } from './components/AuthModal';
import { SubmitAppView } from './components/SubmitAppView';
import { ProfileView } from './components/ProfileView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { AppSubmission, StoreBootstrapResponse, StoreItem, UserProfile } from './types';
import { auth, ensureFirestoreUserDoc, subscribePublishedApps } from './firebase';

const USER_STORAGE_KEY = 'kenix_store_user_id';
const CEO_TOKEN_STORAGE_KEY = 'kenix_ceo_token';

function getOrCreateLocalUserId(): string {
  try {
    const existing = window.localStorage.getItem(USER_STORAGE_KEY);
    if (existing && existing.trim()) return existing;
    const generated = `usr_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(USER_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `usr_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const hasTransitionedRef = useRef(false);

  const [userId] = useState<string>(() => getOrCreateLocalUserId());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [isServerAdmin, setIsServerAdmin] = useState(false);

  const [serverItems, setServerItems] = useState<StoreItem[]>([]);
  const [cloudItems, setCloudItems] = useState<StoreItem[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  const [ceoToken, setCeoTokenState] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem(CEO_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<StoreNavView>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [launchingItem, setLaunchingItem] = useState<StoreItem | null>(null);
  const [showStudioSoon, setShowStudioSoon] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [localSubmissions, setLocalSubmissions] = useState<AppSubmission[]>([]);

  const handleSplashComplete = useCallback(() => {
    if (hasTransitionedRef.current) return;
    hasTransitionedRef.current = true;
    setIsSplashVisible(false);
    if (Capacitor.isNativePlatform()) {
      void CapacitorSplashScreen.hide().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void CapacitorSplashScreen.hide().catch(() => {});
    }
    const failsafeTimer = window.setTimeout(() => {
      handleSplashComplete();
    }, 5100);

    return () => {
      window.clearTimeout(failsafeTimer);
    };
  }, [handleSplashComplete]);

  const setCeoToken = useCallback((nextToken: string | null) => {
    setCeoTokenState(nextToken);
    try {
      if (nextToken) {
        window.sessionStorage.setItem(CEO_TOKEN_STORAGE_KEY, nextToken);
      } else {
        window.sessionStorage.removeItem(CEO_TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadStoreBootstrap = useCallback(async () => {
    try {
      const res = await fetch(`/api/store/bootstrap?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data: StoreBootstrapResponse = await res.json();
      setUser(data.user);
      setServerItems(data.items || []);
    } catch {
      // Non-fatal network error: Firestore items continue serving if available
    } finally {
      setIsLoadingStore(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadStoreBootstrap();
  }, [loadStoreBootstrap]);

  const refreshServerAdminStatus = useCallback(async (fbUser: User | null) => {
    if (!fbUser) {
      setIsServerAdmin(false);
      return;
    }
    try {
      const idToken = await fbUser.getIdToken();
      const res = await fetch('/api/auth/admin-status', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) {
        setIsServerAdmin(false);
        return;
      }
      const data = await res.json();
      setIsServerAdmin(Boolean(data.isAdmin));
    } catch {
      setIsServerAdmin(false);
    }
  }, []);

  useEffect(() => {
    const unsubApps = subscribePublishedApps(
      (firestoreApps) => {
        setCloudItems(firestoreApps);
        setIsLoadingStore(false);
      },
      () => {
        // Fallback smoothly to serverItems if Firestore quota or rules reject
      }
    );

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.emailVerified) {
        void ensureFirestoreUserDoc(fbUser).catch(() => {});
      }
      void refreshServerAdminStatus(fbUser);
    });

    return () => {
      unsubApps();
      unsubAuth();
    };
  }, [refreshServerAdminStatus]);

  // Android hardware back button support inside Capacitor
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    void CapacitorApp.addListener('backButton', () => {
      if (showAuthModal) {
        setShowAuthModal(false);
      } else if (launchingItem) {
        setLaunchingItem(null);
      } else if (selectedDetailId) {
        setSelectedDetailId(null);
      } else if (activeView !== 'discover') {
        setActiveView('discover');
      } else {
        void CapacitorApp.exitApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        void listenerHandle.remove().catch(() => {});
      }
    };
  }, [showAuthModal, launchingItem, selectedDetailId, activeView]);

  const items = useMemo(() => {
    const map = new Map<string, StoreItem>();
    for (const item of serverItems) {
      map.set(item.id, item);
    }
    for (const cloud of cloudItems) {
      const prev = map.get(cloud.id);
      if (!prev) {
        map.set(cloud.id, cloud);
      } else {
        const prevTs = new Date(prev.updatedAt || prev.publishedAt || 0).getTime();
        const cloudTs = new Date(cloud.updatedAt || cloud.publishedAt || 0).getTime();
        const base = cloudTs >= prevTs ? cloud : prev;
        map.set(cloud.id, {
          ...base,
          likes: Math.max(prev.likes || 0, cloud.likes || 0),
          dislikes: Math.max(prev.dislikes || 0, cloud.dislikes || 0),
          downloads: Math.max(prev.downloads || 0, cloud.downloads || 0),
          opens: Math.max(prev.opens || 0, cloud.opens || 0)
        });
      }
    }
    return Array.from(map.values());
  }, [cloudItems, serverItems]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  }, [items]);

  // Verify existing CEO session token on startup
  useEffect(() => {
    if (!ceoToken) return;
    fetch('/api/ceo/session', {
      headers: { Authorization: `Bearer ${ceoToken}` }
    })
      .then((res) => {
        if (!res.ok) {
          setCeoToken(null);
        }
      })
      .catch(() => {
        // ignore transient errors
      });
  }, [ceoToken, setCeoToken]);

  const handleSelectView = useCallback((view: StoreNavView) => {
    setActiveView(view);
    setSelectedDetailId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleVote = useCallback(
    async (itemId: string, voteType: 'like' | 'dislike') => {
      try {
        const res = await fetch('/api/items/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, userId, voteType })
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.item) {
          setServerItems((prev) => prev.map((it) => (it.id === itemId ? data.item : it)));
        }
        setUser((prev) => {
          if (!prev) return prev;
          const nextVotes = { ...(prev.votes || {}) };
          if (data.userVote) {
            nextVotes[itemId] = data.userVote;
          } else {
            delete nextVotes[itemId];
          }
          return { ...prev, votes: nextVotes };
        });
      } catch {
        // ignore network errors
      }
    },
    [userId]
  );

  const handleToggleFavorite = useCallback(
    async (itemId: string) => {
      try {
        const res = await fetch('/api/user/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, itemId })
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.favorites)) {
          setUser((prev) => (prev ? { ...prev, favorites: data.favorites } : prev));
        }
      } catch {
        // ignore network errors
      }
    },
    [userId]
  );

  const handleTrackedLaunch = useCallback((updatedItem: StoreItem) => {
    setServerItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
    setCloudItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
  }, []);

  const favoritesList = user?.favorites || [];
  const favoriteSet = useMemo(() => new Set(favoritesList), [favoritesList]);
  const activeFavoritesCount = useMemo(
    () => items.filter((it) => favoriteSet.has(it.id)).length,
    [items, favoriteSet]
  );

  const selectedDetailItem = useMemo(
    () => (selectedDetailId ? items.find((it) => it.id === selectedDetailId) || null : null),
    [items, selectedDetailId]
  );

  const popularSorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const scoreA = (a.opens || 0) + (a.downloads || 0) + (a.likes || 0) * 2;
      const scoreB = (b.opens || 0) + (b.downloads || 0) + (b.likes || 0) * 2;
      return scoreB - scoreA;
    });
  }, [items]);

  const newestSorted = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    let base = items;
    if (activeView === 'popular') {
      base = popularSorted;
    } else if (activeView === 'new') {
      base = newestSorted;
    } else if (activeView === 'favorites') {
      base = items.filter((it) => favoriteSet.has(it.id));
    }

    if (selectedCategory !== 'Tümü') {
      base = base.filter((it) => it.category === selectedCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.shortDescription.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.developer.toLowerCase().includes(q) ||
          (it.packageName || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [items, activeView, popularSorted, newestSorted, favoriteSet, selectedCategory, searchQuery]);

  const studioApp = useMemo(() => {
    return (
      items.find((it) => {
        const titleLower = it.title.toLowerCase();
        const catLower = it.category.toLowerCase();
        const hasUrl = Boolean((it.appUrl || it.gameplayUrl || '').trim());
        return (
          hasUrl &&
          (titleLower.includes('studio') ||
            titleLower.includes('stüdyo') ||
            catLower.includes('studio') ||
            catLower.includes('stüdyo'))
        );
      }) || null
    );
  }, [items]);

  const handleOpenStudio = useCallback(() => {
    if (studioApp) {
      setShowStudioSoon(false);
      setLaunchingItem(studioApp);
    } else {
      setShowStudioSoon(true);
    }
  }, [studioApp]);

  if (isSplashVisible) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'Tümü';
  const showDiscoverSections = activeView === 'discover' && !isFiltering && !selectedDetailItem;

  return (
    <main
      id="home-screen"
      aria-label="KENİX STORE Ana Ekran"
      className="min-h-[100dvh] w-full kenix-navy-canvas text-slate-100 flex flex-col overflow-x-hidden pb-24 md:pb-8"
    >
      <StoreHeader
        activeView={activeView}
        onSelectView={handleSelectView}
        favoritesCount={activeFavoritesCount}
        isCeoAuthenticated={Boolean(ceoToken) || isServerAdmin}
        firebaseUser={firebaseUser}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      <section className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
        {activeView === 'ceo' ? (
          <CeoPanel
            token={ceoToken}
            isServerAdmin={isServerAdmin}
            onTokenChange={setCeoToken}
            onStoreChanged={() => {
              void loadStoreBootstrap();
              void refreshServerAdminStatus(auth.currentUser);
            }}
          />
        ) : activeView === 'submit' ? (
          <SubmitAppView
            firebaseUser={firebaseUser}
            onOpenAuth={() => setShowAuthModal(true)}
            onSubmitted={(submission) => {
              setLocalSubmissions((prev) => [submission, ...prev]);
            }}
          />
        ) : activeView === 'profile' ? (
          <ProfileView
            firebaseUser={firebaseUser}
            storeUser={user}
            isServerAdmin={isServerAdmin}
            favoritesCount={activeFavoritesCount}
            localSubmissions={localSubmissions}
            onOpenAuth={() => setShowAuthModal(true)}
            onNavigate={handleSelectView}
          />
        ) : activeView === 'privacy' ? (
          <PrivacyPolicyView onBack={() => handleSelectView('discover')} />
        ) : selectedDetailItem ? (
          <AppDetailView
            item={selectedDetailItem}
            userVote={user?.votes?.[selectedDetailItem.id]}
            isFavorite={favoriteSet.has(selectedDetailItem.id)}
            onBack={() => setSelectedDetailId(null)}
            onLaunch={(item) => setLaunchingItem(item)}
            onVote={handleVote}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <>
            {activeView === 'discover' && (
              <section
                id="studio-section"
                aria-label="STÜDYO"
                className="relative z-10 scroll-mt-24 overflow-hidden rounded-3xl bg-[#040d26]/95 border border-blue-500/40 kenix-neon-frame-inner px-6 py-7 sm:px-10 sm:py-9 text-center"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.22)_0%,rgba(29,78,216,0.08)_48%,transparent_75%)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-blue-400/75 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 inset-x-16 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
                />
                <div className="relative z-10 flex flex-col items-center justify-center gap-3.5">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-[0.22em] kenix-text-neon-primary">
                    STÜDYO
                  </h2>

                  <button
                    type="button"
                    onClick={handleOpenStudio}
                    className="min-h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-extrabold tracking-wide inline-flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(37,99,235,0.55)] transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span>STUDIO'YU AÇ</span>
                  </button>

                  {showStudioSoon && !studioApp && (
                    <p
                      role="status"
                      className="text-xs sm:text-sm font-extrabold tracking-[0.28em] kenix-text-neon-secondary pt-0.5"
                    >
                      YAKINDA...
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Search & Category Filter Toolbar */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-blue-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Uygulama, paket adı, kategori veya geliştirici ara..."
                  aria-label="Uygulama ara"
                  className="w-full min-h-[48px] pl-11 pr-11 rounded-2xl bg-[#05102b]/90 border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white placeholder:text-slate-400 shadow-[0_0_24px_rgba(2,6,23,0.45)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Aramayı temizle"
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {categories.length > 0 && (
                <div
                  role="group"
                  aria-label="Kategori Filtreleri"
                  className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
                >
                  {['Tümü', ...categories].map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`min-h-[40px] px-4 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap border transition-all shrink-0 ${
                          active
                            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_16px_rgba(37,99,235,0.45)]'
                            : 'bg-[#05102b]/80 border-blue-500/25 text-slate-300 hover:border-blue-400/60 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isLoadingStore ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-72 rounded-2xl bg-[#05102b]/60 border border-blue-500/15 animate-pulse"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              /* Honest Empty Storefront State */
              <div className="rounded-3xl bg-[#05102b]/90 border border-blue-500/30 kenix-neon-frame-inner p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-950/80 border border-blue-400/40 flex items-center justify-center shadow-[0_0_24px_rgba(59,130,246,0.3)]">
                  <Layers className="w-6 h-6 text-blue-300" />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Henüz Yayında Uygulama Bulunmuyor
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  KENİX STORE mağazasında şu an yayına alınmış bir uygulama yok. CEO Paneli veya APK Gönder ekranından gerçek uygulamalar ekleyebilirsiniz.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectView('submit')}
                    className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>APK Gönder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectView('ceo')}
                    className="min-h-[44px] px-5 rounded-xl bg-[#030a1e] border border-blue-500/35 text-blue-200 hover:text-white text-sm font-semibold inline-flex items-center gap-2 transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    <span>CEO Panelini Aç</span>
                  </button>
                </div>
              </div>
            ) : showDiscoverSections ? (
              <div className="space-y-10">
                {/* Popular Apps Section */}
                <section aria-labelledby="section-popular" className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-5 h-5 text-blue-400 shrink-0" />
                      <h2 id="section-popular" className="text-lg sm:text-xl font-extrabold text-white">
                        Popüler Uygulamalar
                      </h2>
                    </div>
                    {popularSorted.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleSelectView('popular')}
                        className="text-xs sm:text-sm font-semibold text-blue-300 hover:text-blue-200 min-h-[40px] px-2"
                      >
                        Tümünü Gör
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {popularSorted.slice(0, 6).map((item) => (
                      <StoreAppCard
                        key={`pop-${item.id}`}
                        item={item}
                        userVote={user?.votes?.[item.id]}
                        isFavorite={favoriteSet.has(item.id)}
                        onOpenDetail={(it) => setSelectedDetailId(it.id)}
                        onLaunch={(it) => setLaunchingItem(it)}
                        onVote={handleVote}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </section>

                {/* Newly Added Apps Section */}
                <section aria-labelledby="section-new" className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                      <h2 id="section-new" className="text-lg sm:text-xl font-extrabold text-white">
                        Yeni Eklenenler
                      </h2>
                    </div>
                    {newestSorted.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleSelectView('new')}
                        className="text-xs sm:text-sm font-semibold text-blue-300 hover:text-blue-200 min-h-[40px] px-2"
                      >
                        Tümünü Gör
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {newestSorted.slice(0, 6).map((item) => (
                      <StoreAppCard
                        key={`new-${item.id}`}
                        item={item}
                        userVote={user?.votes?.[item.id]}
                        isFavorite={favoriteSet.has(item.id)}
                        onOpenDetail={(it) => setSelectedDetailId(it.id)}
                        onLaunch={(it) => setLaunchingItem(it)}
                        onVote={handleVote}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              /* Filtered / Tab Grid */
              <section aria-labelledby="section-filtered" className="space-y-4">
                <div className="flex items-center gap-2.5">
                  {activeView === 'favorites' ? (
                    <Heart className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : activeView === 'popular' ? (
                    <Flame className="w-5 h-5 text-blue-400 shrink-0" />
                  ) : activeView === 'new' ? (
                    <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                  ) : (
                    <Layers className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <h2 id="section-filtered" className="text-lg sm:text-xl font-extrabold text-white">
                    {activeView === 'favorites'
                      ? 'Favori Uygulamalarım'
                      : activeView === 'popular'
                      ? 'Popüler Uygulamalar'
                      : activeView === 'new'
                      ? 'Yeni Eklenenler'
                      : isFiltering
                      ? 'Filtrelenen Uygulamalar'
                      : 'Tüm Uygulamalar'}
                  </h2>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="rounded-2xl bg-[#05102b]/85 border border-blue-500/25 p-8 text-center space-y-3">
                    <p className="text-base font-semibold text-white">
                      {activeView === 'favorites'
                        ? 'Henüz favori uygulamanız yok'
                        : 'Aramanızla eşleşen uygulama bulunamadı'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {activeView === 'favorites'
                        ? 'Beğendiğiniz uygulamaların kartındaki kalp simgesine basarak favorilerinize ekleyebilirsiniz.'
                        : 'Farklı bir arama terimi veya kategori filtresi deneyebilirsiniz.'}
                    </p>
                    {isFiltering && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('Tümü');
                        }}
                        className="min-h-[44px] px-4 rounded-xl bg-blue-950 border border-blue-500/35 text-blue-200 text-xs font-semibold"
                      >
                        Filtreleri Temizle
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredItems.map((item) => (
                      <StoreAppCard
                        key={item.id}
                        item={item}
                        userVote={user?.votes?.[item.id]}
                        isFavorite={favoriteSet.has(item.id)}
                        onOpenDetail={(it) => setSelectedDetailId(it.id)}
                        onLaunch={(it) => setLaunchingItem(it)}
                        onVote={handleVote}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <PlusMembershipSection
              userId={userId}
              user={user}
              onUserUpdated={(updatedUser) => setUser(updatedUser)}
            />
          </>
        )}
      </section>

      {/* Store Footer with Privacy Policy & APK Submission Links */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-6 border-t border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>© 2026 KENİX STORE · Android Uyumlu Güvenli Uygulama Mağazası</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => handleSelectView('privacy')}
            className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white font-semibold transition-colors min-h-[36px]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Gizlilik Politikası</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectView('submit')}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold transition-colors min-h-[36px]"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>APK Gönder</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectView('ceo')}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-semibold transition-colors min-h-[36px]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>CEO Paneli</span>
          </button>
        </div>
      </footer>

      <BottomNav
        activeView={activeView}
        onSelectView={handleSelectView}
        favoritesCount={activeFavoritesCount}
        isSignedIn={Boolean(firebaseUser)}
      />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            void refreshServerAdminStatus(auth.currentUser);
          }}
        />
      )}

      {launchingItem && (
        <LaunchAnimationModal
          item={launchingItem}
          userId={userId}
          onClose={() => setLaunchingItem(null)}
          onTracked={handleTrackedLaunch}
          onUserUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </main>
  );
}
