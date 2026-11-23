import React, { useState } from 'react';
import { StoreItem } from '../types';
import { ItemIcon } from './ItemIcon';
import { ThumbsUp, ThumbsDown, X, Download, Play, Award, Calendar, Layers, Video } from 'lucide-react';
import { InteractiveAppLauncher } from './InteractiveAppLauncher';

interface ItemDetailModalProps {
  item: StoreItem;
  userVote?: 'like' | 'dislike';
  onVote: (itemId: string, voteType: 'like' | 'dislike') => Promise<void>;
  onClose: () => void;
  onOpenSponsorshipForApp?: (appId: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  userVote,
  onVote,
  onClose,
  onOpenSponsorshipForApp
}) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  const handleVoteClick = async (voteType: 'like' | 'dislike') => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      await onVote(item.id, voteType);
    } finally {
      setIsVoting(false);
    }
  };

  const totalVotes = item.likes + item.dislikes;
  const likeRatio = totalVotes > 0 ? Math.round((item.likes / totalVotes) * 100) : 100;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Banner */}
          <div className="relative h-60 w-full overflow-hidden bg-slate-950">
            {item.banner ? (
              <img
                src={item.banner}
                alt={item.title}
                className="w-full h-full object-cover opacity-75"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950/70 to-slate-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-white transition backdrop-blur-md"
              title="Kapat"
            >
              <X size={20} />
            </button>

            {/* Badges on banner */}
            <div className="absolute top-4 left-4 flex gap-2">
              {item.isOfficialKenix ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md flex items-center gap-1.5">
                  <Award size={14} /> KenixAI Resmi
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 backdrop-blur-md flex items-center gap-1.5">
                  <Layers size={14} /> Kenix Studio Kullanıcı Oyunu
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 backdrop-blur-md border border-slate-700">
                {item.category}
              </span>
            </div>
          </div>

          {/* Modal Header & Meta */}
          <div className="px-6 -mt-12 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 p-2 shadow-2xl flex items-center justify-center shrink-0">
                <ItemIcon name={item.icon} className="w-12 h-12 text-cyan-400" size={48} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{item.title}</h2>
                <p className="text-sm text-cyan-400 font-medium">{item.developer}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Sürüm: {item.version}</span>
                  <span>•</span>
                  <span>{item.downloads.toLocaleString()} İndirme</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">★ {item.rating}</span>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLauncher(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm transition shadow-lg shadow-cyan-500/30 flex items-center gap-2"
              >
                {item.type === 'game' ? <Play size={18} /> : <Download size={18} />}
                {item.type === 'game' ? 'Hemen Oyna (Canlı Simülatör)' : 'Çalıştır & Önizle'}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hakkında</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {item.fullDescription}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Like / Dislike Rating Bar (Strictly no comments) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Topluluk Puanı
                  <span className="text-xs font-medium text-slate-400">({totalVotes} oy)</span>
                </div>
                <div className="w-48 bg-slate-800 h-2 rounded-full mt-2 overflow-hidden flex">
                  <div className="bg-cyan-400 h-full transition-all" style={{ width: `${likeRatio}%` }} />
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - likeRatio}%` }} />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">%{likeRatio} Olumlu Oy</span>
              </div>

              {/* Like / Dislike Real Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleVoteClick('like')}
                  disabled={isVoting}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition ${
                    userVote === 'like'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                  title="Beğen"
                >
                  <ThumbsUp size={16} className={userVote === 'like' ? 'fill-cyan-400' : ''} />
                  <span>{item.likes.toLocaleString()}</span>
                </button>

                <button
                  onClick={() => handleVoteClick('dislike')}
                  disabled={isVoting}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition ${
                    userVote === 'dislike'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md shadow-rose-500/20'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                  title="Beğenme"
                >
                  <ThumbsDown size={16} className={userVote === 'dislike' ? 'fill-rose-400' : ''} />
                  <span>{item.dislikes.toLocaleString()}</span>
                </button>
              </div>
            </div>

            {/* KenixAI Sponsorship CTA banner if official */}
            {item.isOfficialKenix && onOpenSponsorshipForApp && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Video size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Bu Uygulamayı Tanıt, 50 KS Kazan!</h5>
                    <p className="text-xs text-slate-300">
                      {item.title} tanıtım videosu hazırla, linki gönder ve onaylandığında 50 KS ödül al.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSponsorshipForApp(item.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shrink-0"
                >
                  Video Gönder ➔
                </button>
              </div>
            )}

            {/* Publishing details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span>Yayın: {new Date(item.publishedAt).toLocaleDateString('tr-TR')}</span>
              </div>
              <div>
                <span>Ekosistem: {item.isOfficialKenix ? 'Resmi KenixAI' : 'Kenix Studio'}</span>
              </div>
              <div>
                <span>Güvenlik: Kenix Koruma Onaylı ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLauncher && (
        <InteractiveAppLauncher item={item} onClose={() => setShowLauncher(false)} />
      )}
    </>
  );
};
