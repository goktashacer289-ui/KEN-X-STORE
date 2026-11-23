import React, { useState } from 'react';
import { UserProfile, StoreItem, SponsorshipSubmission } from '../types';
import { Coins, Gift, Video, History, AlertCircle, CheckCircle2, Clock, Send, ShieldAlert, ArrowUpRight, ArrowDownLeft, Sparkles, ExternalLink } from 'lucide-react';

interface KcWalletSectionProps {
  user: UserProfile;
  officialApps: StoreItem[];
  sponsorships: SponsorshipSubmission[];
  preselectedAppId?: string;
  onClaimDaily: () => Promise<void>;
  onSubmitSponsorship: (appId: string, videoUrl: string) => Promise<void>;
  onRefreshUser: () => Promise<void>;
}

export const KcWalletSection: React.FC<KcWalletSectionProps> = ({
  user,
  officialApps,
  sponsorships,
  preselectedAppId,
  onClaimDaily,
  onSubmitSponsorship,
  onRefreshUser
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(preselectedAppId || (officialApps[0]?.id || ''));
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);

  // Check if daily reward claimed today
  const todayStr = new Date().toISOString().slice(0, 10);
  const isDailyClaimedToday = user.lastDailyRewardDate === todayStr;

  const handleDailyClick = async () => {
    if (isClaimingDaily || isDailyClaimedToday) return;
    setIsClaimingDaily(true);
    setDailyMessage(null);
    try {
      await onClaimDaily();
      setDailyMessage('Tebrikler! 20 KS günlük ödülünüz hesabınıza eklendi.');
    } catch (err: any) {
      setDailyMessage(err.message || 'Günlük ödül alınamadı.');
    } finally {
      setIsClaimingDaily(false);
    }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!videoUrl.trim()) {
      setSubmitError('Lütfen tanıtım videosu bağlantısını giriniz.');
      return;
    }

    if (!selectedAppId) {
      setSubmitError('Lütfen tanıtımını yaptığınız KenixAI uygulamasını seçiniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitSponsorship(selectedAppId, videoUrl.trim());
      setSubmitSuccess('Tanıtım videonuz başarıyla gönderildi! Video kontrol edilip onaylandıktan sonra 50 KS hesabınıza tanımlanacaktır.');
      setVideoUrl('');
    } catch (err: any) {
      setSubmitError(err.message || 'Video gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Wallet Balance Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                <Coins size={14} /> Kenix Ekosistemi Ortak Para Birimi
              </span>
              <span className="text-xs text-slate-400">Kullanıcı: {user.username}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="text-amber-400 font-mono">{user.kcBalance.toLocaleString()}</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-500">KS</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              KS, tüm Kenix ekosisteminde (KChat, KChat Music, Kenix Nova, Kenix OP Modu ve Kenix Studio) geçerli olan evrensel dijital değer birimidir.
            </p>
          </div>

          {/* Quick Daily Claim Card */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-5 shrink-0 w-full md:w-72 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Gift size={16} className="text-amber-400" /> Günlük Giriş Ödülü
              </span>
              <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                +20 KS
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Günde bir kez alınabilir. Düzenli giriş yaparak KS bakiyenizi büyütün.
            </p>

            <button
              onClick={handleDailyClick}
              disabled={isDailyClaimedToday || isClaimingDaily}
              className={`w-full py-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                isDailyClaimedToday
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25'
              }`}
            >
              <Gift size={16} />
              {isDailyClaimedToday ? 'Bugün Alındı (Yarın Tekrar Gel)' : isClaimingDaily ? 'Yükleniyor...' : 'Günlük 20 KS Talep Et'}
            </button>

            {dailyMessage && (
              <span className="text-[11px] text-emerald-400 font-semibold text-center block">
                {dailyMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 5: KC Kaynakları (KX, OP, KN, KS ve 5. Kaynak) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="text-amber-400" size={20} />
              Kenix KS Ekosistem Kaynakları
            </h3>
            <p className="text-xs text-slate-400">
              Kenix ortak para birimine bağlanan resmi platform kaynakları ve durumları
            </p>
          </div>
          <span className="text-xs text-slate-500 italic hidden sm:block">
            *Dönüşüm oranları belirlenmeden otomatik dönüşüm yapılmaz
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* KX */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-black text-cyan-400">KX</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800 font-bold">Kaynak 1</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">KChat & KChat Music</h4>
              <p className="text-xs text-slate-400 mt-1">Mesajlaşma etkileşimi ve müzik dinleme odalarından elde edilen değer kaynağı.</p>
            </div>
            <div className="text-[11px] text-cyan-300 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
              Durum: Entegre
            </div>
          </div>

          {/* OP */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-black text-amber-400">OP</span>
                <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800 font-bold">Kaynak 2</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">Kenix OP Modu</h4>
              <p className="text-xs text-slate-400 mt-1">Oyuncu hızlandırma ve donanım optimizasyon kiti para birimi kaynağı.</p>
            </div>
            <div className="text-[11px] text-amber-300 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
              Durum: Entegre
            </div>
          </div>

          {/* KN */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-black text-indigo-400">KN</span>
                <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-800 font-bold">Kaynak 3</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">Kenix Nova</h4>
              <p className="text-xs text-slate-400 mt-1">Yapay zeka mimari optimizasyon ve kodlama motoru değer kaynağı.</p>
            </div>
            <div className="text-[11px] text-indigo-300 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
              Durum: Entegre
            </div>
          </div>

          {/* KS */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-black text-purple-400">KS</span>
                <span className="text-[10px] bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800 font-bold">Kaynak 4</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">Kenix Studio</h4>
              <p className="text-xs text-slate-400 mt-1">Oyun yapımı, geliştirici gelirleri ve mağaza yayınlama döngüsü.</p>
            </div>
            <div className="text-[11px] text-purple-300 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
              Durum: Entegre
            </div>
          </div>

          {/* 5th Source - Strictly as requested */}
          <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 opacity-80">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-black text-slate-500">???</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-bold">Kaynak 5</span>
              </div>
              <h4 className="text-sm font-bold text-slate-300 mt-1">Henüz Belirlenmedi</h4>
              <p className="text-xs text-slate-500 mt-1">Resmi protokol henüz tanımlanmadı. Uydurma kaynak eklenmez.</p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              Kur: Belirlenmedi
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: KS Kazanma - Sponsorluk Sistemi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Video Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Video size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Sponsorluk: Tanıtım Videosu Gönder</h3>
                <p className="text-xs text-slate-400">KenixAI resmi uygulamaları için video başına <span className="text-amber-400 font-bold">50 KS</span> kazanın.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mt-5 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Şartlar ve Kurallar:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Yalnızca KenixAI resmi uygulamalarının tanıtımları kabul edilir.</li>
                <li>Geçerli bir video linki (YouTube, TikTok, Reels vb.) girilmesi zorunludur.</li>
                <li>Video yetkili admin tarafından kontrol edilip <span className="text-white font-semibold">onaylanmadan KS verilmez</span>.</li>
                <li>Video sonradan silinirse doğrulama sonucunda verilen <span className="text-rose-400 font-semibold">50 KS geri alınır</span>.</li>
                <li>Aynı video bağlantısı tekrar gönderilemez.</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSponsorSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tanıtılan KenixAI Resmi Uygulaması:
              </label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {officialApps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.title} ({app.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Video Bağlantısı (URL):
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Video bağlantısını (https://...) giriniz"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/40 border border-rose-800 p-3 rounded-xl">
                <AlertCircle size={16} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Send size={14} />
              {isSubmitting ? 'Gönderiliyor...' : 'İncelemeye Gönder (50 KS)'}
            </button>
          </form>
        </div>

        {/* Sponsorship History Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History size={18} className="text-cyan-400" />
                Sponsorluk Başvuru Geçmişi
              </h3>
              <span className="text-xs text-slate-400">{sponsorships.length} Başvuru</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gönderdiğiniz tanıtım videolarının anlık onay durumu ve KS ödülleri
            </p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 space-y-3 pr-1">
            {sponsorships.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Henüz sponsorluk videosu göndermediniz. KenixAI uygulamalarını tanıtarak her video için 50 KS kazanabilirsiniz!
              </div>
            ) : (
              sponsorships.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{sub.appTitle}</span>
                    {sub.status === 'pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Clock size={11} /> İnceleniyor (Onay Bekliyor)
                      </span>
                    ) : sub.status === 'approved' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Onaylandı (+50 KS Verildi)
                      </span>
                    ) : sub.status === 'revoked' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <ShieldAlert size={11} /> Video Silindi (-50 KS Geri Alındı)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Reddedildi
                      </span>
                    )}
                  </div>

                  <a
                    href={sub.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] truncate"
                  >
                    <ExternalLink size={11} /> {sub.videoUrl}
                  </a>

                  {sub.notes && (
                    <p className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                      Not: {sub.notes}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-500">
                    Gönderim: {new Date(sub.submittedAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-amber-400" />
              KS İşlem Geçmişi (Hesap Özeti)
            </h3>
            <p className="text-xs text-slate-400">
              Kullanıcınıza ait tüm harcama, ödül ve stüdyo işlemlerinin kalıcı sunucu kaydı
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">
            Bakiye: {user.kcBalance.toLocaleString()} KS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">İşlem Türü</th>
                <th className="py-3 px-4">Açıklama</th>
                <th className="py-3 px-4 text-right">Tutar</th>
                <th className="py-3 px-4 text-right">Sonraki Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {user.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-sans">
                    Henüz işlem kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                user.transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(tx.date).toLocaleDateString('tr-TR')} {new Date(tx.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'daily'
                              ? 'bg-amber-500/20 text-amber-300'
                              : tx.type === 'publish'
                              ? 'bg-purple-500/20 text-purple-300'
                              : tx.type === 'studio_entry'
                              ? 'bg-blue-500/20 text-blue-300'
                              : tx.type === 'membership'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : tx.type === 'sponsor_reward'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {tx.type === 'daily' && 'Günlük Ödül'}
                          {tx.type === 'publish' && 'Oyun Yayınlama'}
                          {tx.type === 'studio_entry' && 'Stüdyo Girişi'}
                          {tx.type === 'membership' && 'PLUS Üyelik'}
                          {tx.type === 'sponsor_reward' && 'Sponsorluk Ödülü'}
                          {tx.type === 'sponsor_revoke' && 'KS Geri Alımı'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-sans text-xs">
                        {tx.description}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${tx.amount}` : tx.amount} KS
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 text-xs">
                        {tx.balanceAfter} KS
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
