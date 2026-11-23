import React, { useState } from 'react';
import { StoreItem, SponsorshipSubmission } from '../types';
import {
  Shield,
  KeyRound,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlusCircle,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Award
} from 'lucide-react';

interface AdminPanelProps {
  onAddOfficialApp: (appData: {
    title: string;
    type: 'app' | 'game';
    category: string;
    shortDescription: string;
    fullDescription: string;
    icon: string;
    banner: string;
    tags: string[];
  }) => Promise<void>;
  onReviewSponsorship: (submissionId: string, action: 'approve' | 'reject' | 'revoke', notes?: string) => Promise<void>;
  allItems: StoreItem[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onAddOfficialApp,
  onReviewSponsorship,
  allItems
}) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<'sponsorships' | 'add_app' | 'inventory'>('sponsorships');
  const [allSponsorships, setAllSponsorships] = useState<SponsorshipSubmission[]>([]);

  // Add App Form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'app' | 'game'>('app');
  const [newCategory, setNewCategory] = useState('KenixAI Ekosistem');
  const [newShortDesc, setNewShortDesc] = useState('');
  const [newFullDesc, setNewFullDesc] = useState('');
  const [newIcon, setNewIcon] = useState('Sparkles');
  const [newBanner, setNewBanner] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('Kenix Resmi, Yapay Zeka, Ekosistem');
  const [isAddingApp, setIsAddingApp] = useState(false);
  const [addAppSuccess, setAddAppSuccess] = useState<string | null>(null);
  const [addAppError, setAddAppError] = useState<string | null>(null);

  // Review state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Geçersiz PIN');
      }
      setIsAuthenticated(true);
      setAllSponsorships(data.allSponsorships || []);
    } catch (err: any) {
      setAuthError(err.message || 'Yetkilendirme hatası');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReviewAction = async (subId: string, action: 'approve' | 'reject' | 'revoke') => {
    setProcessingId(subId);
    setActionSuccess(null);
    try {
      await onReviewSponsorship(subId, action);
      // Refresh local list
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();
      if (data.allSponsorships) {
        setAllSponsorships(data.allSponsorships);
      }
      setActionSuccess(
        action === 'approve'
          ? 'Video onaylandı ve kullanıcıya 50 KS aktarıldı.'
          : action === 'revoke'
          ? 'Video silinme/ihlal tespiti yapıldı: Kullanıcıdan 50 KS geri alındı.'
          : 'Başvuru reddedildi.'
      );
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAppError(null);
    setAddAppSuccess(null);

    if (!newTitle.trim() || !newShortDesc.trim()) {
      setAddAppError('Lütfen uygulama başlığı ve açıklamasını giriniz.');
      return;
    }

    setIsAddingApp(true);
    try {
      const tags = newTagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onAddOfficialApp({
        title: newTitle.trim(),
        type: newType,
        category: newCategory,
        shortDescription: newShortDesc.trim(),
        fullDescription: newFullDesc.trim() || newShortDesc.trim(),
        icon: newIcon,
        banner: newBanner,
        tags
      });

      setAddAppSuccess(`"${newTitle}" resmi KenixAI uygulaması başarıyla eklendi ve mağaza vitrinine yerleştirildi.`);
      setNewTitle('');
      setNewShortDesc('');
      setNewFullDesc('');
    } catch (err: any) {
      setAddAppError(err.message || 'Uygulama eklenirken hata oluştu.');
    } finally {
      setIsAddingApp(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-fadeIn">
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mx-auto shadow-lg">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">Kenix Yönetim Paneli</h2>
          <p className="text-xs text-slate-400">
            Resmi uygulama ekleme ve sponsorluk video onayları için yetkili yönetici girişi
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound size={14} className="text-cyan-400" /> Yönetici PIN Kodu:
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Varsayılan: KENIX2026"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono tracking-widest text-center"
              required
            />
          </div>

          {authError && (
            <div className="text-rose-400 text-xs bg-rose-950/40 border border-rose-800 p-3 rounded-xl text-center">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/25"
          >
            {isVerifying ? 'Doğrulanıyor...' : 'Yönetici Girişi Yap'}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          Varsayılan Yönetici PIN: <code className="text-cyan-400 font-mono">KENIX2026</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Admin Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-400">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Kenix Store Yönetim Paneli
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Yetkili Oturum
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Sponsorluk videolarını denetleyin, yeni resmi Kenix projeleri ekleyin ve vitrini yönetin.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsAuthenticated(false);
            setPin('');
          }}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
        >
          Yönetici Çıkışı
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-2xl text-xs text-emerald-400 font-medium">
          ✓ {actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-bold">
        <button
          onClick={() => setActiveTab('sponsorships')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'sponsorships'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Sponsorluk Videoları ({allSponsorships.length})
        </button>

        <button
          onClick={() => setActiveTab('add_app')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'add_app'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle size={14} /> Yeni Resmi Kenix Uygulaması Ekle
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers size={14} /> Mağaza İçerikleri ({allItems.length})
        </button>
      </div>

      {/* TAB 1: SPONSORSHIPS */}
      {activeTab === 'sponsorships' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Gönderilen Sponsorluk Tanıtım Videoları</h3>
            <span className="text-xs text-slate-400">
              Onayla (+50 KS) • Reddet • Video Silindi / İhlal (-50 KS Geri Al)
            </span>
          </div>

          <div className="space-y-3">
            {allSponsorships.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Sistemde bekleyen veya geçmiş sponsorluk videosu bulunmuyor.
              </div>
            ) : (
              allSponsorships.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{sub.appTitle}</span>
                      <span className="text-slate-400">• Gönderen: <strong className="text-cyan-400">{sub.username}</strong></span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : sub.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : sub.status === 'revoked'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sub.status === 'pending' && 'İnceleniyor (Onay Bekliyor)'}
                        {sub.status === 'approved' && 'Onaylandı (+50 KS Verildi)'}
                        {sub.status === 'revoked' && 'Geri Alındı (-50 KS Kesildi)'}
                        {sub.status === 'rejected' && 'Reddedildi'}
                      </span>
                    </div>

                    <a
                      href={sub.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-md"
                    >
                      <ExternalLink size={11} /> {sub.videoUrl}
                    </a>

                    <div className="text-[10px] text-slate-500">
                      Tarih: {new Date(sub.submittedAt).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {sub.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReviewAction(sub.id, 'approve')}
                          disabled={processingId === sub.id}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={14} /> Onayla (+50 KS Ver)
                        </button>
                        <button
                          onClick={() => handleReviewAction(sub.id, 'reject')}
                          disabled={processingId === sub.id}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center gap-1"
                        >
                          <XCircle size={14} /> Reddet
                        </button>
                      </>
                    )}

                    {sub.status === 'approved' && (
                      <button
                        onClick={() => handleReviewAction(sub.id, 'revoke')}
                        disabled={processingId === sub.id}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-1 shadow-sm"
                        title="Video silinmiş veya geçersiz ise verilen 50 KS geri alınır"
                      >
                        <AlertTriangle size={14} /> Video Silinmiş (50 KS Geri Al)
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADD OFFICIAL APP */}
      {activeTab === 'add_app' && (
        <form onSubmit={handleAddAppSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="text-cyan-400" size={20} />
              Yeni KenixAI Resmi Uygulaması / Projesi Ekle
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kenix ekosistemine yeni bir resmi uygulama ekleyin. Mağazada resmi rozetle listelenecek ve kullanıcılar için sponsorluk video havuzuna dahil olacaktır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Uygulama Adı *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Uygulama adını giriniz"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kategori</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Örn: Bulut & Veri, Yapay Zeka..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">İçerik Tipi</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="app">Uygulama (App)</option>
                <option value="game">Oyun (Game)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">İkon</label>
              <select
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Sparkles">✨ Sparkles</option>
                <option value="Cpu">⚡ Cpu / Engine</option>
                <option value="MessageSquareShare">💬 Mesajlaşma</option>
                <option value="Music2">🎵 Müzik</option>
                <option value="Zap">⚡ Hız / Güç</option>
                <option value="Shield">🛡️ Güvenlik</option>
                <option value="Code2">💻 Kodlama</option>
                <option value="Bot">🤖 AI Robot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Etiketler (Virgülle ayırın)</label>
              <input
                type="text"
                value={newTagsStr}
                onChange={(e) => setNewTagsStr(e.target.value)}
                placeholder="Kenix Resmi, Yapay Zeka..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kapak Görseli URL</label>
            <input
              type="url"
              value={newBanner}
              onChange={(e) => setNewBanner(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kısa Açıklama (Vitrin için) *</label>
            <input
              type="text"
              value={newShortDesc}
              onChange={(e) => setNewShortDesc(e.target.value)}
              placeholder="Uygulamanın kısa ve vurucu tanıtımı..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Detaylı Açıklama</label>
            <textarea
              rows={3}
              value={newFullDesc}
              onChange={(e) => setNewFullDesc(e.target.value)}
              placeholder="Uygulamanın özellikleri ve ekosistemdeki yeri..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {addAppError && (
            <div className="text-rose-400 text-xs bg-rose-950/40 border border-rose-800 p-3 rounded-xl">
              {addAppError}
            </div>
          )}

          {addAppSuccess && (
            <div className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl">
              {addAppSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isAddingApp}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
          >
            <PlusCircle size={16} />
            {isAddingApp ? 'Ekleniyor...' : 'Resmi KenixAI Uygulamasını Kaydet & Yayınla'}
          </button>
        </form>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Aktif Mağaza Envanteri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 text-xs"
              >
                {item.banner ? (
                  <img src={item.banner} alt={item.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white truncate">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{item.developer}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                    <span className="text-cyan-400 font-bold">👍 {item.likes}</span>
                    <span className="text-rose-400 font-bold">👎 {item.dislikes}</span>
                    <span>• {item.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
