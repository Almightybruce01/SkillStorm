/* ═══════════════════════════════════════════════════════════════════════════════
   GAME WRAPPER — Consistent Mobile-First Game Container
   Wraps any game component with:
   - Responsive container sizing
   - Fullscreen toggle (iOS/Android safe)
   - Orientation lock suggestion
   - Prevent scroll during gameplay
   - Safe area padding for notch devices
   - Performance tier detection
   - Back button handler (mobile)
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { isTouchDevice } from './TouchControls';
import { isMobile, isIOS, requestFullscreen, exitFullscreen, isFullscreen, detectPerformanceTier } from './GameUtils';

interface GameWrapperProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  showFullscreen?: boolean;
  preferLandscape?: boolean;
}

export default function GameWrapper({
  children,
  onClose,
  title,
  showFullscreen = true,
  preferLandscape = false,
}: GameWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);
  const [perfTier, setPerfTier] = useState<'low' | 'mid' | 'high'>('mid');
  const isTouch = isTouchDevice();
  const mobile = isMobile();

  // Detect performance tier
  useEffect(() => {
    setPerfTier(detectPerformanceTier());
  }, []);

  // Prevent scroll/bounce during gameplay on mobile
  useEffect(() => {
    if (!mobile) return;

    document.body.classList.add('game-playing');

    return () => {
      document.body.classList.remove('game-playing');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [mobile]);

  // Orientation hint for landscape-preferred games
  useEffect(() => {
    if (!preferLandscape || !mobile) return;

    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowRotateHint(isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, [preferLandscape, mobile]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFs(isFullscreen());
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  // Handle back button (mobile)
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      e.preventDefault();
      onClose();
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [onClose]);

  const toggleFullscreen = useCallback(() => {
    if (isFs) {
      exitFullscreen();
    } else if (containerRef.current) {
      requestFullscreen(containerRef.current);
    }
  }, [isFs]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isFs ? 'game-fullscreen' : ''}`}
      data-perf-tier={perfTier}
    >
      {/* Rotate hint overlay */}
      {showRotateHint && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex flex-col items-center justify-center text-white p-8">
          <div className="text-6xl mb-4 animate-bounce">📱↔️</div>
          <p className="text-lg font-bold mb-2">Rotate Your Device</p>
          <p className="text-sm text-slate-300 text-center mb-4">
            This game plays best in landscape mode
          </p>
          <button
            onClick={() => setShowRotateHint(false)}
            className="px-6 py-2 rounded-lg bg-white/20 text-white font-medium touch-manipulation"
          >
            Play Anyway
          </button>
        </div>
      )}

      {/* Fullscreen button (mobile only) */}
      {showFullscreen && isTouch && !isFs && !isIOS() && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 left-2 z-[100] w-8 h-8 rounded-lg bg-black/30 backdrop-blur-sm
                     flex items-center justify-center text-white/70 hover:text-white
                     touch-manipulation active:scale-90 transition-all text-sm"
          title="Fullscreen"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          ⛶
        </button>
      )}

      {children}
    </div>
  );
}

/* ── Performance Context ── */
export function usePerformanceTier(): 'low' | 'mid' | 'high' {
  const [tier, setTier] = useState<'low' | 'mid' | 'high'>('mid');
  useEffect(() => {
    setTier(detectPerformanceTier());
  }, []);
  return tier;
}
