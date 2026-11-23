import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, StoreItem, GameDraft } from '../types';
import { STUDIO_FEATURES, StudioFeature } from '../data/studioFeatures';
import {
  Gamepad2,
  Crown,
  Check,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Upload,
  Coins,
  Cpu,
  Zap,
  ExternalLink,
  Lock,
  Play,
  RotateCcw,
  Save,
  Trash2,
  Edit3,
  Search,
  Filter,
  Volume2,
  MapPin,
  Flame,
  Award,
  BookOpen,
  FolderGit2,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface KenixStudioSectionProps {
  user: UserProfile;
  drafts: GameDraft[];
  myPublishedGames: StoreItem[];
  onEnterStudio: () => Promise<{ success: boolean; isPlus: boolean; fee: number; qualityMultiplier: number; message: string }>;
  onBuyPlus: () => Promise<void>;
  onPublishGame: (gameData: {
    title: string;
    category: string;
    description: string;
    icon: string;
    banner: string;
    developerName: string;
    ageRating: '3+' | '7+' | '12+' | '16+' | '18+';
    gameplayUrl?: string;
  }) => Promise<StoreItem>;
  onSaveDraft: (draftData: Partial<GameDraft>) => Promise<GameDraft>;
  onDeleteDraft: (draftId: string) => Promise<void>;
  onUpdateGame: (gameId: string, updateData: { title?: string; description?: string; notes?: string; ageRating?: any }) => Promise<StoreItem>;
  onViewGameInStore: (game: StoreItem) => void;
  onNavigateToWallet: () => void;
}

export const KenixStudioSection: React.FC<KenixStudioSectionProps> = ({
  user,
  drafts,
  myPublishedGames,
  onEnterStudio,
  onBuyPlus,
  onPublishGame,
  onSaveDraft,
  onDeleteDraft,
  onUpdateGame,
  onViewGameInStore,
  onNavigateToWallet
}) => {
  const [isInWorkspace, setIsInWorkspace] = useState(false);
  const [activeQuality, setActiveQuality] = useState<number>(1);
  const [isEntering, setIsEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  // Buy PLUS state
  const [isBuyingPlus, setIsBuyingPlus] = useState(false);
  const [buyPlusError, setBuyPlusError] = useState<string | null>(null);
  const [buyPlusSuccess, setBuyPlusSuccess] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeaturePrompt, setUpgradeFeaturePrompt] = useState<string | null>(null);

  // Workspace sub-tabs
  const [workspaceTab, setWorkspaceTab] = useState<'editor' | 'test' | 'features' | 'drafts' | 'my_games' | 'publish'>('editor');

  // Game Configuration State
  const [gameTitle, setGameTitle] = useState('');
  const [gameCategory, setGameCategory] = useState('Platform (Özellik 3)');
  const [gameType2d3d, setGameType2d3d] = useState<'2d' | '3d'>('2d');
  const [gameDeveloper, setGameDeveloper] = useState(user.username);
  const [gameDescription, setGameDescription] = useState('');
  const [gameIcon, setGameIcon] = useState('Gamepad2');
  const [gameBanner, setGameBanner] = useState('');
  const [gameAgeRating, setGameAgeRating] = useState<'3+' | '7+' | '12+' | '16+' | '18+'>('7+');

  // Game engine mechanics settings
  const [playerSpeed, setPlayerSpeed] = useState(6);
  const [playerJump, setPlayerJump] = useState(13);
  const [gravity, setGravity] = useState(0.65);
  const [flyingUnlocked, setFlyingUnlocked] = useState(false);
  const [musicTrack, setMusicTrack] = useState('');
  const [dayNight, setDayNight] = useState(true);
  const [weather, setWeather] = useState('Güneşli');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Draft save & load feedback
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftStatusMsg, setDraftStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedGame, setPublishedGame] = useState<StoreItem | null>(null);

  // Game Updating State (PLUS only)
  const [updatingGameId, setUpdatingGameId] = useState<string | null>(null);
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdatingGame, setIsUpdatingGame] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Feature list search
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState('all');

  const isPlusActive = user.studioPlan === 'plus' && user.plusExpiry && new Date(user.plusExpiry).getTime() > Date.now();
  const plusRemainingDays = isPlusActive
    ? Math.ceil((new Date(user.plusExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleEnterClick = async () => {
    if (isEntering) return;
    setIsEntering(true);
    setEnterError(null);

    try {
      const res = await onEnterStudio();
      setActiveQuality(res.qualityMultiplier);
      setIsInWorkspace(true);
    } catch (err: any) {
      setEnterError(err.message || 'Stüdyoya giriş yapılamadı.');
    } finally {
      setIsEntering(false);
    }
  };

  const handleBuyPlusClick = async () => {
    if (isBuyingPlus) return;
    setIsBuyingPlus(true);
    setBuyPlusError(null);
    setBuyPlusSuccess(null);

    try {
      await onBuyPlus();
      setBuyPlusSuccess('Kenix Studio PLUS üyeliğiniz başarıyla aktif edildi! Tüm 100 özelliğin kilidi açıldı.');
      setShowUpgradeModal(false);
    } catch (err: any) {
      setBuyPlusError(err.message || 'PLUS üyelik alınırken hata oluştu.');
    } finally {
      setIsBuyingPlus(false);
    }
  };

  const promptUpgrade = (featureName: string) => {
    setUpgradeFeaturePrompt(featureName);
    setShowUpgradeModal(true);
  };

  // Draft Save Handler
  const handleSaveDraft = async () => {
    if (!isPlusActive) {
      promptUpgrade('Oyun taslaklarını buluta kaydetme (Özellik 72)');
      return;
    }

    setIsSavingDraft(true);
    setDraftStatusMsg(null);
    try {
      const draft = await onSaveDraft({
        id: currentDraftId || undefined,
        title: gameTitle,
        category: gameCategory,
        type2d3d: gameType2d3d,
        description: gameDescription,
        icon: gameIcon,
        banner: gameBanner,
        ageRating: gameAgeRating,
        gameData: {
          speed: playerSpeed,
          jumpHeight: playerJump,
          hasGravity: gravity > 0,
          weather,
          dayNightCycle: dayNight,
          musicTrack
        }
      });
      setCurrentDraftId(draft.id);
      setDraftStatusMsg({ text: `✓ "${draft.title}" taslağı güvenle buluta kaydedildi!` });
    } catch (err: any) {
      setDraftStatusMsg({ text: err.message || 'Taslak kaydedilemedi.', isError: true });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Load a Draft into workspace
  const handleLoadDraft = (draft: GameDraft) => {
    setCurrentDraftId(draft.id);
    setGameTitle(draft.title);
    setGameCategory(draft.category);
    setGameType2d3d(draft.type2d3d);
    setGameDescription(draft.description);
    setGameIcon(draft.icon || 'Gamepad2');
    setGameBanner(draft.banner || '');
    setGameAgeRating(draft.ageRating || '7+');
    if (draft.gameData) {
      if (draft.gameData.speed) setPlayerSpeed(draft.gameData.speed);
      if (draft.gameData.jumpHeight) setPlayerJump(draft.gameData.jumpHeight);
      if (draft.gameData.weather) setWeather(draft.gameData.weather);
      if (draft.gameData.dayNightCycle !== undefined) setDayNight(draft.gameData.dayNightCycle);
    }
    setWorkspaceTab('editor');
    setDraftStatusMsg({ text: `"${draft.title}" taslağı editöre yüklendi.` });
  };

  // Publishing Pre-flight Checks (Feature 79)
  const validatePrePublish = () => {
    if (!gameTitle.trim()) return 'Oyun adı boş bırakılamaz.';
    if (gameTitle.trim().length < 2) return 'Oyun adı en az 2 karakter olmalıdır.';
    if (!gameDescription.trim()) return 'Oyun açıklaması boş bırakılamaz.';
    if (gameDescription.trim().length < 10) return 'Oyun açıklaması en az 10 karakter olmalıdır.';
    if (!gameCategory) return 'Lütfen bir oyun kategorisi seçin.';
    if (!gameAgeRating) return 'Lütfen yaş sınırı belirleyin.';
    if (user.kcBalance < 50) {
      return `Yetersiz bakiye! Kenix STORE'a yayınlama ücreti 50 KS'dir. Mevcut bakiyeniz: ${user.kcBalance} KS.`;
    }
    return null;
  };

  // Publish Game
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishing) return;
    setPublishError(null);

    const validationError = validatePrePublish();
    if (validationError) {
      setPublishError(validationError);
      return;
    }

    setIsPublishing(true);
    try {
      const newGame = await onPublishGame({
        title: gameTitle.trim(),
        category: gameCategory,
        description: gameDescription.trim(),
        developerName: gameDeveloper.trim() || user.username,
        icon: gameIcon,
        banner: gameBanner,
        ageRating: gameAgeRating
      });
      setPublishedGame(newGame);
    } catch (err: any) {
      setPublishError(err.message || 'Oyun yayınlanırken hata oluştu.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Update Game (Feature 73 & 74 - PLUS only)
  const handleUpdateGameSubmit = async (gameId: string) => {
    if (!isPlusActive) {
      promptUpgrade('Oyunu güncelleme ve sürüm geçmişi yönetimi (Özellik 73 & 74)');
      return;
    }

    setIsUpdatingGame(true);
    setUpdateMsg(null);
    try {
      await onUpdateGame(gameId, {
        title: gameTitle,
        description: gameDescription,
        notes: updateNotes || 'Yeni optimizasyonlar ve bölüm güncellemeleri yayınlandı.',
        ageRating: gameAgeRating
      });
      setUpdateMsg({ text: '✓ Oyun başarıyla güncellendi ve sürüm numarası artırıldı!' });
      setUpdatingGameId(null);
      setUpdateNotes('');
    } catch (err: any) {
      setUpdateMsg({ text: err.message || 'Oyun güncellenemedi.', isError: true });
    } finally {
      setIsUpdatingGame(false);
    }
  };

  // Procedural Map Generation helper (Feature 63)
  const handleGenerateProceduralMap = async () => {
    try {
      const res = await fetch('/api/studio/procedural/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: gameCategory, theme: '' })
      });
      const data = await res.json();
      if (data.mapData) {
        setDraftStatusMsg({ text: `✓ Prosedürel harita motoru yeni 16x10 seviye planını oluşturdu!` });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Procedural Quest Generator helper (Feature 64)
  const handleGenerateQuest = async () => {
    try {
      const res = await fetch('/api/studio/procedural/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: gameCategory, title: gameTitle })
      });
      const data = await res.json();
      if (data.quest) {
        setGameDescription((prev) => `${prev}\n\n[Aktif Görev: ${data.quest.questTitle}] - ${data.quest.objective}`);
        setDraftStatusMsg({ text: `✓ Görev motoru: "${data.quest.questTitle}" görevi oyuna eklendi!` });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter 100 features
  const filteredFeatures = STUDIO_FEATURES.filter((feat) => {
    const matchesSearch =
      feat.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
      feat.description.toLowerCase().includes(featureSearch.toLowerCase()) ||
      feat.id.toString() === featureSearch.trim();
    const matchesCat = featureCategoryFilter === 'all' || feat.category === featureCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const featureCategories = Array.from(new Set(STUDIO_FEATURES.map((f) => f.category)));

  // If inside Workspace
  if (isInWorkspace) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Workspace Header */}
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400">
              <Gamepad2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Kenix Studio Çalışma Alanı</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isPlusActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isPlusActive ? 'PLUS Üye (2X Kalite Motoru)' : 'NORMAL Üye (1X Standart Motor)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Geliştirici: <strong>{user.username}</strong> • Kenix STORE Oyun Yayınlama Ücreti: <strong>50 KS</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block">Kullanılabilir Bakiye:</span>
              <span className="font-mono text-sm font-extrabold text-amber-400">{user.kcBalance} KS</span>
            </div>

            <button
              onClick={() => setIsInWorkspace(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
            >
              Stüdyodan Çık
            </button>
          </div>
        </div>

        {/* Workspace Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold border-b border-slate-800">
          <button
            onClick={() => setWorkspaceTab('editor')}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 shrink-0 ${
              workspaceTab === 'editor'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 size={15} />
            <span>Oyun Editörü & Ayarlar</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('test')}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 shrink-0 ${
              workspaceTab === 'test'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-black'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Play size={15} fill="currentColor" />
            <span>Canlı Oyun Test Alanı (Oyna)</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('features')}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 shrink-0 ${
              workspaceTab === 'features'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen size={15} />
            <span>100 Özellik Rehberi</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('drafts')}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 shrink-0 ${
              workspaceTab === 'drafts'
                ? 'bg-slate-800 text-amber-300 border-amber-500/50 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Save size={15} />
            <span>Taslaklarım ({drafts.length})</span>
            {!isPlusActive && <Lock size={12} className="text-amber-400 ml-1" />}
          </button>

          <button
            onClick={() => setWorkspaceTab('my_games')}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 shrink-0 ${
              workspaceTab === 'my_games'
                ? 'bg-slate-800 text-white border-slate-700 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={15} />
            <span>Yayınlanan Oyunlarım ({myPublishedGames.length})</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('publish')}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 shrink-0 ${
              workspaceTab === 'publish'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md font-black'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Upload size={15} />
            <span>Kenix STORE'a Yayınla (50 KS)</span>
          </button>
        </div>

        {/* Status message */}
        {draftStatusMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              draftStatusMsg.isError
                ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
            }`}
          >
            <span>{draftStatusMsg.text}</span>
            <button onClick={() => setDraftStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* TAB 1: GAME EDITOR & SETTINGS */}
        {workspaceTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Game Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="text-purple-400" size={18} />
                  Temel Oyun Ayarları (Özellik 1–10)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Oyun Adı</label>
                    <input
                      type="text"
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                      placeholder="Oyun adını giriniz"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Oyun Boyutu & Motor</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGameType2d3d('2d')}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          gameType2d3d === '2d'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        2D Oyun (Özellik 1)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGameType2d3d('3d')}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          gameType2d3d === '3d'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        3D Oyun (Özellik 2)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Oyun Türü / Şablonu</label>
                    <select
                      value={gameCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Açık Dünya (Özellik 10)' && !isPlusActive) {
                          promptUpgrade('Açık dünya oyunu oluşturma (Özellik 10)');
                          return;
                        }
                        setGameCategory(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="Platform (Özellik 3)">Platform Oyunu (NORMAL)</option>
                      <option value="Yarış (Özellik 4)">Yarış Oyunu (NORMAL)</option>
                      <option value="Korku (Özellik 5)">Korku Oyunu (NORMAL)</option>
                      <option value="Macera (Özellik 6)">Macera Oyunu (NORMAL)</option>
                      <option value="Simülasyon (Özellik 7)">Simülasyon Oyunu (NORMAL)</option>
                      <option value="Bulmaca (Özellik 8)">Bulmaca Oyunu (NORMAL)</option>
                      <option value="Savaş & Arena (Özellik 9)">Savaş Oyunu (NORMAL)</option>
                      <option value="Açık Dünya (Özellik 10)">
                        Açık Dünya (PLUS 👑)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yaş Sınırı (Özellik 78)</label>
                    <select
                      value={gameAgeRating}
                      onChange={(e) => setGameAgeRating(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="3+">3+ (Genel İzleyici)</option>
                      <option value="7+">7+ (Temel Şiddet İçermeyen)</option>
                      <option value="12+">12+ (Hafif Fantezi Şiddeti)</option>
                      <option value="16+">16+ (Gelişmiş Dövüş / Korku)</option>
                      <option value="18+">18+ (Yetişkin Oyuncular)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Oyun Açıklaması (Özellik 76)</label>
                  <textarea
                    rows={3}
                    value={gameDescription}
                    onChange={(e) => setGameDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Character & Mechanics Config */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="text-cyan-400" size={18} />
                  Karakter & Hareket Fiziği (Özellik 21–30, 41–50)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Yürüme Hızı: {playerSpeed}</span>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      value={playerSpeed}
                      onChange={(e) => setPlayerSpeed(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Zıplama Kuvveti: {playerJump}</span>
                    <input
                      type="range"
                      min="8"
                      max="20"
                      value={playerJump}
                      onChange={(e) => setPlayerJump(Number(e.target.value))}
                      className="w-full accent-purple-400"
                    />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Yerçekimi: {gravity} G</span>
                    <input
                      type="range"
                      min="0.3"
                      max="1.2"
                      step="0.05"
                      value={gravity}
                      onChange={(e) => setGravity(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                {/* PLUS Features Control Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlusActive) {
                        promptUpgrade('Karakter Uçma Sistemi (Özellik 24)');
                        return;
                      }
                      setFlyingUnlocked(!flyingUnlocked);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                      flyingUnlocked && isPlusActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Uçma Sistemi (Özellik 24)</span>
                    {!isPlusActive ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] flex items-center gap-1">
                        <Lock size={10} /> PLUS
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {flyingUnlocked ? 'Açık' : 'Kapalı'}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlusActive) {
                        promptUpgrade('Hava Durumu Simülasyonu (Özellik 35)');
                        return;
                      }
                      setWeather(weather === 'Güneşli' ? 'Siber Yağmur' : 'Güneşli');
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                      weather !== 'Güneşli' && isPlusActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Hava Durumu: {weather} (Özellik 35)</span>
                    {!isPlusActive && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] flex items-center gap-1">
                        <Lock size={10} /> PLUS
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Tools & Procedural Engines */}
            <div className="space-y-6">
              {/* Procedural Generation Helpers (Feature 63 & 64) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="text-purple-400" size={16} />
                  Prosedürel Üretim Motorları
                </h4>

                <p className="text-[11px] text-slate-400">
                  Gerçek algoritmik seviye ve görev üreticisi (NORMAL üyelere açık).
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleGenerateProceduralMap}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-between"
                  >
                    <span>Harita Taslağı Üret (Özellik 63)</span>
                    <Sparkles size={14} className="text-cyan-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateQuest}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-between"
                  >
                    <span>Dinamik Görev Yaz (Özellik 64)</span>
                    <Sparkles size={14} className="text-purple-400" />
                  </button>
                </div>
              </div>

              {/* Action Cards */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <h4 className="text-sm font-bold text-white">İşlemler</h4>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition border border-amber-500/40 flex items-center justify-center gap-2"
                >
                  <Save size={15} />
                  {isSavingDraft ? 'Kaydediliyor...' : 'Taslağı Kaydet (Özellik 72 - PLUS)'}
                  {!isPlusActive && <Lock size={12} />}
                </button>

                <button
                  type="button"
                  onClick={() => setWorkspaceTab('test')}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Play size={15} fill="currentColor" />
                  Oyunu Hemen Test Et
                </button>

                <button
                  type="button"
                  onClick={() => setWorkspaceTab('publish')}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Upload size={15} />
                  Mağazada Yayınla (50 KS)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE PLAYABLE GAME SANDBOX (REAL PLAYABLE ENGINE) */}
        {workspaceTab === 'test' && (
          <StudioInteractivePlayable
            title={gameTitle}
            playerSpeed={playerSpeed}
            playerJump={playerJump}
            gravity={gravity}
            isFlying={Boolean(flyingUnlocked && isPlusActive)}
            weather={weather}
            onBack={() => setWorkspaceTab('editor')}
          />
        )}

        {/* TAB 3: 100 FEATURES DIRECTORY */}
        {workspaceTab === 'features' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="text-cyan-400" size={20} />
                  Kenix Studio 100 Özellik Rehberi
                </h3>
                <p className="text-xs text-slate-400">
                  Talimatlarda tanımlanan 100 özelliğin tamamının üyelik dağılımı ve erişim durumları
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  placeholder="Özellik ara (örn: uçma, 3D...)"
                  className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                />

                <select
                  value={featureCategoryFilter}
                  onChange={(e) => setFeatureCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {featureCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredFeatures.map((feat) => {
                const isUnlocked = feat.tier === 'NORMAL' || isPlusActive;
                return (
                  <div
                    key={feat.id}
                    onClick={() => {
                      if (!isUnlocked) promptUpgrade(`${feat.id}. ${feat.name}`);
                    }}
                    className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                      !isUnlocked ? 'cursor-pointer' : ''
                    } ${
                      feat.tier === 'PLUS'
                        ? isPlusActive
                          ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-amber-500/50'
                        : 'bg-slate-950 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">#{feat.id}</span>
                        <h4 className="text-xs font-bold text-white">{feat.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{feat.description}</p>
                      <span className="text-[10px] text-slate-500 font-medium">{feat.category}</span>
                    </div>

                    <div className="shrink-0">
                      {feat.tier === 'PLUS' ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 ${
                            isPlusActive
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-amber-400 border border-slate-700'
                          }`}
                        >
                          {!isPlusActive && <Lock size={10} />} PLUS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          NORMAL
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SAVED DRAFTS (Feature 72) */}
        {workspaceTab === 'drafts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Save className="text-amber-400" size={20} />
                  Kayıtlı Oyun Taslakları (Özellik 72)
                </h3>
                <p className="text-xs text-slate-400">
                  Sunucu bulutunda saklanan taslaklarınız (Kullanıcıya özel kalıcı veri)
                </p>
              </div>

              {isPlusActive ? (
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  {isSavingDraft ? 'Kaydediliyor...' : 'Mevcut Durumu Kaydet'}
                </button>
              ) : (
                <button
                  onClick={() => promptUpgrade('Oyun taslaklarını buluta kaydetme (Özellik 72)')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5"
                >
                  <Lock size={12} /> PLUS ile Taslak Kaydetmeyi Aç
                </button>
              )}
            </div>

            {drafts.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs space-y-2">
                <p>Henüz kayıtlı taslağınız bulunmuyor.</p>
                {isPlusActive ? (
                  <p className="text-slate-400">Editördeki çalışmanızı "Taslağı Kaydet" butonu ile kaydedebilirsiniz.</p>
                ) : (
                  <p className="text-amber-400">Taslak kaydetme özelliği PLUS üyelere açıktır.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{draft.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {draft.type2d3d.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{draft.description}</p>
                      <div className="text-[10px] text-slate-500 mt-2">
                        Kategori: {draft.category} • Yaş: {draft.ageRating}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleLoadDraft(draft)}
                        className="flex-1 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
                      >
                        Yükle & Düzenle
                      </button>
                      <button
                        onClick={() => onDeleteDraft(draft.id)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition"
                        title="Taslağı Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MY PUBLISHED GAMES & VERSION MANAGEMENT */}
        {workspaceTab === 'my_games' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="text-purple-400" size={20} />
                Yayınlanan Oyunlarım & Sürüm Geçmişi (Özellik 73, 74, 80)
              </h3>
              <p className="text-xs text-slate-400">
                Kenix STORE vitrininde yayınladığınız oyunların istatistikleri ve sürüm güncellemeleri
              </p>
            </div>

            {updateMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  updateMsg.isError ? 'bg-rose-950/40 text-rose-300' : 'bg-emerald-950/40 text-emerald-300'
                }`}
              >
                {updateMsg.text}
              </div>
            )}

            {myPublishedGames.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs space-y-3">
                <p>Henüz Kenix STORE'da yayınladığınız bir oyun bulunmuyor.</p>
                <button
                  onClick={() => setWorkspaceTab('publish')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  İlk Oyununu 50 KS ile Yayınla
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myPublishedGames.map((game) => (
                  <div
                    key={game.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{game.title}</h4>
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                          {game.version}
                        </span>
                        <span className="text-xs text-slate-400">• Yaş Sınırı: {game.ageRating || '7+'}</span>
                      </div>
                      <p className="text-xs text-slate-400">{game.shortDescription}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                        <span className="text-emerald-400">👍 {game.likes} Beğeni</span>
                        <span className="text-rose-400">👎 {game.dislikes} Beğenmeme</span>
                        <span>{game.downloads.toLocaleString()} Yükleme</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        onClick={() => onViewGameInStore(game)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        Mağazada Aç <ExternalLink size={13} />
                      </button>

                      {isPlusActive ? (
                        <button
                          onClick={() => {
                            setUpdatingGameId(updatingGameId === game.id ? null : game.id);
                            setGameTitle(game.title);
                            setGameDescription(game.fullDescription);
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Edit3 size={13} /> Oyunu Güncelle (PLUS)
                        </button>
                      ) : (
                        <button
                          onClick={() => promptUpgrade('Oyunu güncelleme & sürüm yönetimi (Özellik 73 & 74)')}
                          className="px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Lock size={12} /> Güncelleme (PLUS)
                        </button>
                      )}
                    </div>

                    {/* Update drawer */}
                    {updatingGameId === game.id && isPlusActive && (
                      <div className="w-full mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <h5 className="text-xs font-bold text-white">Yeni Sürüm Güncellemesi Gönder</h5>
                        <input
                          type="text"
                          value={updateNotes}
                          onChange={(e) => setUpdateNotes(e.target.value)}
                          placeholder="Bu sürümdeki yenilikler (Örn: Hata düzeltmeleri, yeni bölüm eklendi)"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                        <button
                          onClick={() => handleUpdateGameSubmit(game.id)}
                          disabled={isUpdatingGame}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                        >
                          {isUpdatingGame ? 'Güncelleniyor...' : 'Yeni Sürümü Onayla'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PUBLISH TO KENIX STORE (50 KS) */}
        {workspaceTab === 'publish' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {publishedGame ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <ShieldCheck size={36} />
                </div>
                <h3 className="text-2xl font-black text-white">Oyun Başarıyla Yayınlandı!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  "<span className="text-emerald-400 font-bold">{publishedGame.title}</span>" 50 KS karşılığında Kenix STORE vitrinine eklendi.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => onViewGameInStore(publishedGame)}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition"
                  >
                    Mağazada Görüntüle ➔
                  </button>
                  <button
                    onClick={() => setPublishedGame(null)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
                  >
                    Yeni Oyun Hazırla
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePublishSubmit} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Upload className="text-emerald-400" size={20} />
                    Kenix STORE'a Oyun Yayınlama (Özellik 71)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Yayınlama ücreti <strong className="text-amber-400">50 KS</strong>'dir (NORMAL ve PLUS kullanıcıları için aynıdır).
                  </p>
                </div>

                {/* Pre-flight Checklist Card (Feature 79) */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 block mb-1">Yayın Öncesi Denetim (Özellik 79):</span>
                  <div className="flex items-center gap-2 text-slate-400">
                    {gameTitle.trim().length >= 2 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-rose-400" />}
                    <span>Oyun Adı: {gameTitle.trim().length >= 2 ? gameTitle : 'Eksik veya çok kısa'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    {gameDescription.trim().length >= 10 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-rose-400" />}
                    <span>Açıklama: {gameDescription.trim().length >= 10 ? 'Yeterli' : 'En az 10 karakter olmalı'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Yaş Sınırı: {gameAgeRating}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    {user.kcBalance >= 50 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-rose-400" />}
                    <span>Bakiye: {user.kcBalance} KS / Gerekli: 50 KS {user.kcBalance < 50 && '(Yetersiz!)'}</span>
                  </div>
                </div>

                {publishError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={15} />
                    <span>{publishError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Kesilecek Tutar: <strong className="text-amber-400 font-mono">50 KS</strong> (Başarısız işlemde kesilmez)
                  </span>

                  <button
                    type="submit"
                    disabled={isPublishing || user.kcBalance < 50}
                    className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                  >
                    <Upload size={16} />
                    {isPublishing ? 'Yayınlanıyor...' : '50 KS Karşılığı Mağazada Yayınla'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <Crown size={28} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-black text-white">PLUS Üyelik Gerekli</h3>
                {upgradeFeaturePrompt && (
                  <p className="text-xs text-amber-400 font-medium">"{upgradeFeaturePrompt}"</p>
                )}
                <p className="text-xs text-slate-300 mt-2">
                  Bu özellik ve diğer 40+ gelişmiş araç Kenix Studio PLUS üyelerine özeldir.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span>Aylık Fiyat:</span>
                  <span className="font-mono text-amber-400">5.000 KS (30 Gün)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span>Mevcut Bakiyeniz:</span>
                  <span className="font-mono text-white">{user.kcBalance} KS</span>
                </div>
              </div>

              {buyPlusError && (
                <div className="text-rose-400 text-xs bg-rose-950/40 border border-rose-800 p-2.5 rounded-xl text-center">
                  {buyPlusError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={handleBuyPlusClick}
                  disabled={isBuyingPlus}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/25"
                >
                  {isBuyingPlus ? 'İşleniyor...' : '5.000 KS ile PLUS Al'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not in Workspace: Gate & Membership comparison
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Studio Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1.5">
            <Gamepad2 size={14} /> Kenix Studio Bağımsız Oyun Motoru
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Kendi Oyununu Tasarla, Test Et & Mağazada Yayınla
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Kenix Studio; 100 farklı geliştirme aracı, prosedürel üretim motorları ve canlı oynanabilir test alanı içeren profesyonel oyun yapma stüdyosudur.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={handleEnterClick}
              disabled={isEntering}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm transition shadow-xl shadow-purple-600/30 flex items-center gap-2"
            >
              <Gamepad2 size={18} />
              {isEntering ? 'Giriş Yapılıyor...' : isPlusActive ? 'Studio Workspace\'e Gir (PLUS - 0 KS)' : 'Studio Workspace\'e Gir (500 KS)'}
            </button>

            {enterError && (
              <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/60 border border-rose-800 px-4 py-2.5 rounded-xl">
                <AlertTriangle size={15} />
                <span>{enterError}</span>
                <button onClick={onNavigateToWallet} className="underline ml-2 text-amber-400 font-bold">
                  KS Kazan ➔
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Membership Plans Comparison (NORMAL vs PLUS) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Crown className="text-amber-400" size={22} />
            Kenix Studio Üyelik Sistemi
          </h3>
          <p className="text-xs text-slate-400">
            NORMAL ve PLUS üyelik hakları sunucu tarafında doğrulanır.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NORMAL PLAN */}
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-white">NORMAL Üyelik</h4>
                  <span className="text-xs text-slate-400">Giriş Başına Ödeme</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {!isPlusActive ? 'Mevcut Planınız' : 'Standart'}
                </span>
              </div>

              <div className="text-3xl font-black text-white font-mono">
                500 KS <span className="text-xs font-sans text-slate-400 font-normal">/ her girişte</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <span>Studio'ya her girişte <strong>500 KS</strong> ödenir.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <span>Kullanıcı Studio'dan çıkıp tekrar girdiğinde yeniden 500 KS kesilir.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <span>NORMAL özellikleri (1–9, 12, 13, 16, 21–23, 31, 32 vb.) kullanılabilir.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <span>Kenix STORE'a 50 KS karşılığı oyun yayınlayabilme.</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleEnterClick}
              disabled={isEntering}
              className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
            >
              500 KS ile Giriş Yap
            </button>
          </div>

          {/* PLUS PLAN */}
          <div className="relative bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    PLUS Üyelik <Crown size={18} className="text-amber-400" />
                  </h4>
                  <span className="text-xs text-amber-400 font-medium">Aylık VIP Geliştirici Paketi</span>
                </div>
                {isPlusActive && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Aktif ({plusRemainingDays} Gün Kaldı)
                  </span>
                )}
              </div>

              <div className="text-3xl font-black text-amber-400 font-mono">
                5.000 KS <span className="text-xs font-sans text-slate-400 font-normal">/ 30 Gün (Aylık)</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>PLUS aktifken Studio'ya tekrar giriş ücreti ödenmez (0 KS)!</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Tüm NORMAL ve PLUS özelliklerine tam erişim (100 özelliğin tamamı).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Oyun taslaklarını buluta kaydetme (Özellik 72) ve sürüm geçmişi (Özellik 74).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Süre bitince NORMAL sisteme geçer; yenilenebilir.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {buyPlusError && (
                <div className="text-rose-400 text-xs bg-rose-950/40 border border-rose-800 p-2.5 rounded-xl text-center">
                  {buyPlusError}
                </div>
              )}
              {buyPlusSuccess && (
                <div className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800 p-2.5 rounded-xl text-center">
                  {buyPlusSuccess}
                </div>
              )}

              <button
                onClick={handleBuyPlusClick}
                disabled={isBuyingPlus}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Crown size={16} />
                {isBuyingPlus
                  ? 'İşleniyor...'
                  : isPlusActive
                  ? 'Üyeliği 30 Gün Uzat (5.000 KS)'
                  : 'PLUS Satın Al (5.000 KS / 30 Gün)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Real Interactive HTML5 Canvas Game Engine for Sandbox Testing
function StudioInteractivePlayable({
  title,
  playerSpeed,
  playerJump,
  gravity,
  isFlying,
  weather,
  onBack
}: {
  title: string;
  playerSpeed: number;
  playerJump: number;
  gravity: number;
  isFlying: boolean;
  weather: string;
  onBack: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let active = true;

    // Player state
    let px = 60;
    let py = 250;
    const pw = 28;
    const ph = 36;
    let vx = 0;
    let vy = 0;
    let onGround = false;

    // Platforms
    const platforms = [
      { x: 0, y: 340, w: 700, h: 40 }, // Ground
      { x: 130, y: 260, w: 100, h: 16 },
      { x: 280, y: 200, w: 120, h: 16 },
      { x: 440, y: 150, w: 90, h: 16 },
      { x: 570, y: 100, w: 100, h: 16 }
    ];

    // Collectible Coins
    let coins = [
      { x: 170, y: 220, collected: false },
      { x: 330, y: 160, collected: false },
      { x: 480, y: 110, collected: false },
      { x: 610, y: 60, collected: false }
    ];

    // Goal Flag
    const goal = { x: 630, y: 55, w: 25, h: 45 };

    // Hazard spikes
    const spikes = [
      { x: 240, y: 325, w: 30, h: 15 },
      { x: 410, y: 325, w: 30, h: 15 }
    ];

    const keys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true;
      if (['ArrowUp', ' ', 'w', 'W'].includes(e.key)) {
        if (isFlying) {
          vy = -playerJump * 0.7;
        } else if (onGround) {
          vy = -playerJump;
          onGround = false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function gameLoop() {
      if (!active) return;

      // Handle horizontal input
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        vx = -playerSpeed;
      } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        vx = playerSpeed;
      } else {
        vx = 0;
      }

      // Flying control if PLUS feature
      if (isFlying) {
        if (keys['ArrowUp'] || keys['w'] || keys['W']) vy = -playerSpeed * 0.8;
        else if (keys['ArrowDown'] || keys['s'] || keys['S']) vy = playerSpeed * 0.8;
        else vy *= 0.85;
      } else {
        // Normal Gravity
        vy += gravity;
      }

      // Update position
      px += vx;
      py += vy;

      // Wall boundaries
      if (px < 0) px = 0;
      if (px + pw > 700) px = 700 - pw;

      // Platform collision
      onGround = false;
      for (const plat of platforms) {
        if (
          px + pw > plat.x &&
          px < plat.x + plat.w &&
          py + ph > plat.y &&
          py + ph < plat.y + plat.h + vy + 1 &&
          vy >= 0
        ) {
          py = plat.y - ph;
          vy = 0;
          onGround = true;
        }
      }

      // Coin collection
      for (const c of coins) {
        if (!c.collected && px + pw > c.x && px < c.x + 16 && py + ph > c.y && py < c.y + 16) {
          c.collected = true;
          setCoinsCollected((prev) => prev + 1);
          setScore((prev) => prev + 100);
        }
      }

      // Spike hazard collision
      for (const sp of spikes) {
        if (px + pw > sp.x && px < sp.x + sp.w && py + ph > sp.y && py < sp.y + sp.h) {
          active = false;
          setIsGameOver(true);
          return;
        }
      }

      // Goal detection
      if (px + pw > goal.x && px < goal.x + goal.w && py + ph > goal.y && py < goal.y + goal.h) {
        active = false;
        setHasWon(true);
        setScore((prev) => prev + 500);
        return;
      }

      // Pit fall
      if (py > 420) {
        active = false;
        setIsGameOver(true);
        return;
      }

      // Rendering
      ctx!.fillStyle = '#090d16';
      ctx!.fillRect(0, 0, 700, 380);

      // Background grid lines
      ctx!.strokeStyle = '#1e293b';
      ctx!.lineWidth = 1;
      for (let x = 0; x < 700; x += 40) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, 380);
        ctx!.stroke();
      }

      // Weather effect (Cyber Rain)
      if (weather.includes('Yağmur')) {
        ctx!.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx!.lineWidth = 1.5;
        for (let i = 0; i < 20; i++) {
          const rx = (Date.now() / 2 + i * 35) % 700;
          const ry = (Date.now() + i * 20) % 380;
          ctx!.beginPath();
          ctx!.moveTo(rx, ry);
          ctx!.lineTo(rx - 4, ry + 12);
          ctx!.stroke();
        }
      }

      // Draw Platforms
      ctx!.fillStyle = '#1e293b';
      ctx!.strokeStyle = '#8b5cf6';
      ctx!.lineWidth = 2;
      for (const plat of platforms) {
        ctx!.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx!.strokeRect(plat.x, plat.y, plat.w, plat.h);
      }

      // Draw Spikes
      ctx!.fillStyle = '#ef4444';
      for (const sp of spikes) {
        ctx!.beginPath();
        ctx!.moveTo(sp.x, sp.y + sp.h);
        ctx!.lineTo(sp.x + sp.w / 2, sp.y);
        ctx!.lineTo(sp.x + sp.w, sp.y + sp.h);
        ctx!.fill();
      }

      // Draw Coins
      for (const c of coins) {
        if (!c.collected) {
          ctx!.fillStyle = '#f59e0b';
          ctx!.beginPath();
          ctx!.arc(c.x + 8, c.y + 8, 7, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.strokeStyle = '#fef08a';
          ctx!.stroke();
        }
      }

      // Draw Goal Flag
      ctx!.fillStyle = '#10b981';
      ctx!.fillRect(goal.x, goal.y, 4, goal.h);
      ctx!.fillRect(goal.x + 4, goal.y, 18, 12);

      // Draw Player
      ctx!.fillStyle = '#00f0ff';
      ctx!.shadowColor = '#00f0ff';
      ctx!.shadowBlur = 10;
      ctx!.fillRect(px, py, pw, ph);
      ctx!.shadowBlur = 0;

      // Player eyes/face
      ctx!.fillStyle = '#090d16';
      ctx!.fillRect(px + (vx >= 0 ? 16 : 4), py + 8, 6, 6);

      // Jetpack flame if flying
      if (isFlying && keys['ArrowUp']) {
        ctx!.fillStyle = '#f97316';
        ctx!.fillRect(px + 4, py + ph, pw - 8, 8);
      }

      animId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      active = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGameOver, hasWon, playerSpeed, playerJump, gravity, isFlying, weather]);

  return (
    <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 flex flex-col items-center gap-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-2xl gap-3">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Canlı Sandbox Test Motoru
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Hız: {playerSpeed} • Zıplama: {playerJump} • Yerçekimi: {gravity} • {isFlying ? 'Uçma Açık (PLUS)' : 'Standart Zıplama'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-amber-400 font-bold">Skor: {score}</span>
          <span className="text-cyan-400 font-bold">Altın: {coinsCollected}/4</span>
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-bold"
          >
            Editöre Dön
          </button>
        </div>
      </div>

      <div className="relative border-2 border-cyan-500/50 rounded-2xl overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={700} height={380} className="bg-slate-950 block max-w-full" />

        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
            <span className="text-rose-400 font-extrabold text-2xl">BÖLÜM BAŞARISIZ!</span>
            <p className="text-xs text-slate-300">Tuzaklara veya boşluğa düştünüz.</p>
            <button
              onClick={() => {
                setScore(0);
                setCoinsCollected(0);
                setIsGameOver(false);
              }}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2"
            >
              <RotateCcw size={14} /> Tekrar Dene
            </button>
          </div>
        )}

        {hasWon && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
            <span className="text-emerald-400 font-extrabold text-2xl">HEDEFE ULAŞILDI!</span>
            <p className="text-xs text-slate-300">Tebrikler! Seviye başarıyla tamamlandı. Toplam Skor: {score}</p>
            <button
              onClick={() => {
                setScore(0);
                setCoinsCollected(0);
                setHasWon(false);
              }}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
            >
              <RotateCcw size={14} /> Yeniden Oyna
            </button>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-400 flex items-center gap-4">
        <span>Kontroller: <strong>A / D veya ◀ / ▶</strong> (Yürüme)</span>
        <span>•</span>
        <span><strong>Space veya ▲</strong> (Zıplama / Uçma)</span>
      </div>
    </div>
  );
}
