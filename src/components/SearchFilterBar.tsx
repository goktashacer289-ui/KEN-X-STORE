import React from 'react';
import { Search, SlidersHorizontal, Award, Layers, Flame, Clock, X } from 'lucide-react';

export type FilterCategory = 'all' | 'official' | 'community' | 'popular' | 'new';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  genres: string[];
  sortBy: 'rating' | 'likes' | 'downloads' | 'newest';
  onSortChange: (sort: 'rating' | 'likes' | 'downloads' | 'newest') => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  selectedGenre,
  onGenreChange,
  genres,
  sortBy,
  onSortChange
}) => {
  return (
    <div className="space-y-4 mb-8">
      {/* Search and Sort row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Uygulama, oyun veya geliştirici ara..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sort and Genre selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Genre select */}
          <select
            value={selectedGenre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tüm Türler</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="bg-transparent text-slate-300 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="rating" className="bg-slate-900 text-white">En Yüksek Puan</option>
              <option value="likes" className="bg-slate-900 text-white">En Çok Beğenilen (Like)</option>
              <option value="downloads" className="bg-slate-900 text-white">En Çok İndirilen</option>
              <option value="newest" className="bg-slate-900 text-white">En Yeni Eklenenler</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-4 py-2 rounded-xl border transition shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'all'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>Tüm İçerik</span>
        </button>

        <button
          onClick={() => onFilterChange('official')}
          className={`px-4 py-2 rounded-xl border transition shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'official'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Award size={14} />
          <span>KenixAI Resmi Uygulamaları</span>
        </button>

        <button
          onClick={() => onFilterChange('community')}
          className={`px-4 py-2 rounded-xl border transition shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'community'
              ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-md shadow-purple-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Layers size={14} />
          <span>Kenix Studio Kullanıcı Oyunları</span>
        </button>

        <button
          onClick={() => onFilterChange('popular')}
          className={`px-4 py-2 rounded-xl border transition shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'popular'
              ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Flame size={14} />
          <span>Popüler Oyunlar</span>
        </button>

        <button
          onClick={() => onFilterChange('new')}
          className={`px-4 py-2 rounded-xl border transition shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'new'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Clock size={14} />
          <span>Yeni Yayınlananlar</span>
        </button>
      </div>
    </div>
  );
};
