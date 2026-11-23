import React, { useState } from 'react';
import { StoreItem } from '../types';
import { ItemIcon } from './ItemIcon';
import { ThumbsUp, ThumbsDown, Award, Layers, Play, Download, Sparkles } from 'lucide-react';

interface StoreItemCardProps {
  item: StoreItem;
  userVote?: 'like' | 'dislike';
  onVote: (itemId: string, voteType: 'like' | 'dislike') => Promise<void>;
  onSelect: (item: StoreItem) => void;
  onQuickLaunch: (item: StoreItem) => void;
}

export const StoreItemCard: React.FC<StoreItemCardProps> = ({
  item,
  userVote,
  onVote,
  onSelect,
  onQuickLaunch
}) => {
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (e: React.MouseEvent, type: 'like' | 'dislike') => {
    e.stopPropagation();
    if (isVoting) return;
    setIsVoting(true);
    try {
      await onVote(item.id, type);
    } finally {
      setIsVoting(false);
    }
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickLaunch(item);
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Banner with badging */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-950">
        {item.banner ? (
          <img
            src={item.banner}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950/60 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {item.isOfficialKenix ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 backdrop-blur-md flex items-center gap-1 shadow-sm">
              <Award size={12} /> KenixAI
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/25 text-purple-300 border border-purple-400/50 backdrop-blur-md flex items-center gap-1 shadow-sm">
              <Layers size={12} /> Studio Oyunu
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-950/70 text-slate-300 backdrop-blur-md border border-slate-800">
            {item.category}
          </span>
        </div>

        {/* Quick Launch Floating Button on hover */}
        <button
          onClick={handleLaunch}
          className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200 flex items-center gap-1.5 text-xs"
          title={item.type === 'game' ? 'Hemen Oyna' : 'Çalıştır'}
        >
          {item.type === 'game' ? <Play size={14} fill="currentColor" /> : <Download size={14} />}
          <span>{item.type === 'game' ? 'Oyna' : 'Başlat'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition">
              <ItemIcon name={item.icon} className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white truncate group-hover:text-cyan-300 transition">
                  {item.title}
                </h3>
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-0.5 shrink-0 ml-2">
                  ★ {item.rating}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {item.developer}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
            {item.shortDescription}
          </p>
        </div>

        {/* Footer: Like / Dislike voting bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={(e) => handleVote(e, 'like')}
              disabled={isVoting}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                userVote === 'like'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title="Beğen (Like)"
            >
              <ThumbsUp size={13} className={userVote === 'like' ? 'fill-cyan-400' : ''} />
              <span>{item.likes}</span>
            </button>

            {/* Dislike */}
            <button
              onClick={(e) => handleVote(e, 'dislike')}
              disabled={isVoting}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                userVote === 'dislike'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm shadow-rose-500/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title="Beğenme (Dislike)"
            >
              <ThumbsDown size={13} className={userVote === 'dislike' ? 'fill-rose-400' : ''} />
              <span>{item.dislikes}</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            {item.downloads.toLocaleString()} yükleme
          </span>
        </div>
      </div>
    </div>
  );
};
