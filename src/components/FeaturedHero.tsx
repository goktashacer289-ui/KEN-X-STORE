import React, { useState, useEffect } from 'react';
import { StoreItem } from '../types';
import { ItemIcon } from './ItemIcon';
import { Play, Download, Award, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface FeaturedHeroProps {
  items: StoreItem[];
  onSelect: (item: StoreItem) => void;
  onQuickLaunch: (item: StoreItem) => void;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({ items, onSelect, onQuickLaunch }) => {
  const featuredItems = items.filter((i) => i.featured).slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  if (featuredItems.length === 0) return null;

  const current = featuredItems[currentIndex];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl mb-8 group">
      {/* Background Banner */}
      <div className="relative h-80 sm:h-96 w-full overflow-hidden">
        {current.banner ? (
          <img
            src={current.banner}
            alt={current.title}
            className="w-full h-full object-cover opacity-60 transition-all duration-700 scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950/70 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      </div>

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500 text-slate-950 uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Sparkles size={12} /> Öne Çıkan
            </span>
            {current.isOfficialKenix ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-md flex items-center gap-1">
                <Award size={12} /> KenixAI Resmi Ekosistemi
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                Kenix Studio Topluluk Oyunu
              </span>
            )}
            <span className="text-xs text-slate-400">• {current.category}</span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/90 border border-cyan-500/50 p-2.5 shadow-2xl flex items-center justify-center shrink-0">
              <ItemIcon name={current.icon} className="w-8 h-8 text-cyan-400" size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {current.title}
              </h1>
              <p className="text-xs sm:text-sm text-cyan-400 font-medium">
                Geliştirici: {current.developer} • Sürüm {current.version}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-xl leading-relaxed">
            {current.shortDescription}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onQuickLaunch(current)}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm transition shadow-lg shadow-cyan-500/30 flex items-center gap-2"
            >
              {current.type === 'game' ? <Play size={16} fill="currentColor" /> : <Download size={16} />}
              <span>{current.type === 'game' ? 'Hemen Oyna' : 'Çalıştır & İncele'}</span>
            </button>

            <button
              onClick={() => onSelect(current)}
              className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700 transition"
            >
              Detayları Görüntüle
            </button>

            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300 ml-4 font-mono">
              <span className="text-amber-400 font-bold">★ {current.rating} Puan</span>
              <span>{current.likes.toLocaleString()} Beğeni</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : featuredItems.length - 1))}
        className="absolute top-1/2 -translate-y-1/2 left-4 p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white border border-slate-800 transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
        title="Önceki"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredItems.length)}
        className="absolute top-1/2 -translate-y-1/2 right-4 p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white border border-slate-800 transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
        title="Sonraki"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 right-6 flex items-center gap-1.5 z-20">
        {featuredItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === currentIndex ? 'w-7 bg-cyan-400' : 'w-2 bg-slate-600 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
