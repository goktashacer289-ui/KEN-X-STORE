import React from 'react';
import { StoreItem } from '../types';
import { ExternalLink, Layers } from 'lucide-react';

interface InteractiveAppLauncherProps {
  item: StoreItem;
  onClose: () => void;
}

export const InteractiveAppLauncher: React.FC<InteractiveAppLauncherProps> = ({ item, onClose }) => {
  const hasRealUrl = Boolean(
    item.gameplayUrl &&
      (item.gameplayUrl.startsWith('http://') || item.gameplayUrl.startsWith('https://'))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div>
            <h3 className="text-lg font-bold text-white">{item.title}</h3>
            <p className="text-xs text-slate-400">Geliştirici: {item.developer}</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition"
          >
            Pencereyi Kapat
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950/60">
          <div className="w-full max-w-md bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center">
              <Layers className="text-cyan-400" size={28} />
            </div>

            <div>
              <h4 className="text-xl font-bold text-white">{item.title}</h4>
              <p className="text-sm text-slate-400 mt-1">{item.shortDescription}</p>
            </div>

            <div className="w-full bg-slate-900 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Sürüm:</span>
                <span className="font-mono">{item.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Geliştirici:</span>
                <span>{item.developer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kategori:</span>
                <span>{item.category}</span>
              </div>
            </div>

            {hasRealUrl ? (
              <a
                href={item.gameplayUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} /> Bağlantıyı Aç
              </a>
            ) : (
              <p className="text-xs text-slate-400">
                Bu kayıt için harici çalıştırma bağlantısı tanımlanmamış.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
