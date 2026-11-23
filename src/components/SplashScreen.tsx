import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 5000;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [showKenix, setShowKenix] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const startTime = Date.now();
    hasCompletedRef.current = false;

    const finishSplash = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      onCompleteRef.current();
    };

    const kenixTimer = window.setTimeout(() => {
      setShowKenix(true);
    }, 200);

    const storeTimer = window.setTimeout(() => {
      setShowStore(true);
    }, 1850);

    const completeTimer = window.setTimeout(() => {
      finishSplash();
    }, TOTAL_DURATION_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - startTime;
        if (elapsed >= 200) setShowKenix(true);
        if (elapsed >= 1850) setShowStore(true);
        if (elapsed >= TOTAL_DURATION_MS) {
          finishSplash();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(kenixTimer);
      window.clearTimeout(storeTimer);
      window.clearTimeout(completeTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 h-[100dvh] w-full kenix-navy-canvas p-2.5 sm:p-5 md:p-7 overflow-hidden select-none"
      aria-label="KENİX STORE açılış ekranı"
    >
      {/* Ekran kenarlarında lacivert neon ışık çerçevesi */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl kenix-neon-frame animate-kenix-frame flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
        {/* İç neon çerçeve katmanı */}
        <div className="absolute inset-1.5 sm:inset-2.5 rounded-[14px] sm:rounded-[20px] kenix-neon-frame-inner pointer-events-none" />

        {/* Üst ve alt kenar neon ışık geçişi */}
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-blue-300 to-transparent animate-kenix-sweep" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none">
          <div
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-blue-300 to-transparent animate-kenix-sweep"
            style={{ animationDelay: '1.3s' }}
          />
        </div>

        {/* Köşe neon ışık vurguları */}
        <span className="pointer-events-none absolute top-3 left-3 sm:top-4 sm:left-4 w-5 h-5 sm:w-7 sm:h-7 border-t-2 border-l-2 border-blue-300 rounded-tl-lg shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
        <span className="pointer-events-none absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-7 sm:h-7 border-t-2 border-r-2 border-blue-300 rounded-tr-lg shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
        <span className="pointer-events-none absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-5 h-5 sm:w-7 sm:h-7 border-b-2 border-l-2 border-blue-300 rounded-bl-lg shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
        <span className="pointer-events-none absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-5 h-5 sm:w-7 sm:h-7 border-b-2 border-r-2 border-blue-300 rounded-br-lg shadow-[0_0_12px_rgba(96,165,250,0.9)]" />

        {/* Merkez marka alanı: Yalnızca KENİX✓ ve STORE + neon ışık sarımı */}
        <div className="relative flex flex-col items-center justify-center text-center max-w-full">
          {/* Yazıların çevresindeki lacivert neon ışık sarımı */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: showKenix ? (showStore ? 1 : 0.78) : 0,
              scale: showStore ? 1.08 : 0.96,
            }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute -inset-x-10 -inset-y-8 sm:-inset-x-20 sm:-inset-y-12 rounded-full kenix-neon-aura"
          />

          {/* Yazıları saran ince neon çerçeve halkası */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: showKenix ? 0.65 : 0,
              scale: showStore ? 1 : 0.96,
            }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute -inset-x-5 -inset-y-4 sm:-inset-x-10 sm:-inset-y-6 rounded-3xl border border-blue-400/35 shadow-[0_0_24px_rgba(59,130,246,0.45),inset_0_0_20px_rgba(37,99,235,0.35)]"
          />

          {/* İlk olarak KENİX✓ yazısı görünür */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={
              showKenix
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 14, scale: 0.92 }
            }
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center gap-1.5 sm:gap-2.5"
          >
            <h1 className="text-[clamp(2.5rem,11.5vw,5.25rem)] font-black tracking-[0.14em] leading-none kenix-text-neon-primary whitespace-nowrap">
              KENİX
            </h1>

            <motion.svg
              initial={{ opacity: 0, scale: 0.6 }}
              animate={showKenix ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              viewBox="0 0 36 36"
              fill="none"
              className="w-[clamp(2rem,8.5vw,4rem)] h-[clamp(2rem,8.5vw,4rem)] kenix-text-neon-check shrink-0 -ml-0.5"
              aria-label="✓"
            >
              <motion.path
                d="M7 19.5L14.5 27L29.5 10"
                stroke="currentColor"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: showKenix ? 1 : 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              />
            </motion.svg>
          </motion.div>

          {/* İki yazı arası neon ışık çizgisi */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={showStore ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-36 sm:w-56 h-[2px] my-3 sm:my-4 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_14px_rgba(96,165,250,0.95)]"
          />

          {/* Ardından STORE yazısı belirir */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={
              showStore
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 12, scale: 0.94 }
            }
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <p className="text-[clamp(1.25rem,5.2vw,2.35rem)] font-extrabold tracking-[0.38em] pl-[0.38em] leading-none kenix-text-neon-secondary whitespace-nowrap">
              STORE
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
