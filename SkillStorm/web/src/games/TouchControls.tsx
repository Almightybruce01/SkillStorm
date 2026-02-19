/* ═══════════════════════════════════════════════════════════════════════════════
   TOUCH CONTROLS — Universal Mobile Game Controller
   Provides on-screen D-pad, action buttons, swipe detection, and touch utilities
   for all arcade and educational games on mobile devices.
   
   Usage:
     <TouchControls layout="dpad" onDirection={dir => ...} />
     <TouchControls layout="horizontal" onLeft={...} onRight={...} onAction={...} />
     <TouchControls layout="action-only" onAction={...} />
   ═══════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useRef, useState, useEffect, memo } from 'react';

/* ── Types ── */
export type Direction = 'up' | 'down' | 'left' | 'right';
export type TouchLayout = 'dpad' | 'horizontal' | 'action-only' | 'dual-stick' | 'swipe-only' | 'none';

interface TouchControlsProps {
  layout: TouchLayout;
  onDirection?: (dir: Direction) => void;
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onAction?: () => void;
  onAction2?: () => void;
  onPause?: () => void;
  actionLabel?: string;
  action2Label?: string;
  show?: boolean;
  opacity?: number;
  size?: 'sm' | 'md' | 'lg';
}

/* ── Detect if device has touch ── */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/* ── Swipe Detection Hook ── */
export interface SwipeHandlers {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: (x: number, y: number) => void;
  threshold?: number;
}

export function useSwipe(ref: React.RefObject<HTMLElement | null>, handlers: SwipeHandlers) {
  const startPos = useRef({ x: 0, y: 0 });
  const startTime = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const threshold = handlers.threshold ?? 30;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      startTime.current = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;
      const dt = Date.now() - startTime.current;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < threshold && absDy < threshold && dt < 300) {
        handlers.onTap?.(touch.clientX, touch.clientY);
        return;
      }

      if (absDx > absDy && absDx > threshold) {
        if (dx > 0) handlers.onSwipeRight?.();
        else handlers.onSwipeLeft?.();
      } else if (absDy > absDx && absDy > threshold) {
        if (dy > 0) handlers.onSwipeDown?.();
        else handlers.onSwipeUp?.();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handlers, handlers.threshold]);
}

/* ── Touch Drag Hook (for Pong-style paddle) ── */
export function useTouchDrag(
  ref: React.RefObject<HTMLElement | null>,
  onDrag: (x: number, y: number, dx: number, dy: number) => void,
) {
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleStart = (e: TouchEvent) => {
      const t = e.touches[0];
      lastPos.current = { x: t.clientX, y: t.clientY };
    };

    const handleMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - lastPos.current.x;
      const dy = t.clientY - lastPos.current.y;
      lastPos.current = { x: t.clientX, y: t.clientY };
      onDrag(t.clientX, t.clientY, dx, dy);
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
    };
  }, [ref, onDrag]);
}

/* ── Haptic Feedback ── */
export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    if ('vibrate' in navigator) {
      const ms = style === 'light' ? 10 : style === 'medium' ? 25 : 50;
      navigator.vibrate(ms);
    }
  } catch {}
}

/* ── Responsive Canvas Size ── */
export function getResponsiveCanvasSize(
  maxWidth: number,
  maxHeight: number,
  padding = 32,
): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: maxWidth, height: maxHeight };
  const w = Math.min(maxWidth, window.innerWidth - padding);
  const h = Math.min(maxHeight, window.innerHeight - 200); // leave room for UI
  return { width: Math.floor(w), height: Math.floor(h) };
}

/* ── Button Component ── */
const ControlButton = memo(function ControlButton({
  onPress,
  label,
  icon,
  className = '',
  size = 'md',
}: {
  onPress: () => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-18 h-18 text-xl',
  };

  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptic('light');
    onPress();
  }, [onPress]);

  return (
    <button
      onTouchStart={handleTouch}
      onMouseDown={(e) => { e.preventDefault(); onPress(); }}
      className={`${sizeMap[size]} rounded-full bg-white/15 backdrop-blur-sm border border-white/20
                  flex items-center justify-center text-white/80 active:bg-white/30 active:scale-95
                  transition-all duration-75 select-none touch-manipulation ${className}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {icon || label}
    </button>
  );
});

/* ── D-Pad Component ── */
const DPad = memo(function DPad({
  onDirection,
  onUp, onDown, onLeft, onRight,
  size = 'md',
}: {
  onDirection?: (dir: Direction) => void;
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const press = useCallback((dir: Direction) => {
    haptic('light');
    onDirection?.(dir);
    if (dir === 'up') onUp?.();
    if (dir === 'down') onDown?.();
    if (dir === 'left') onLeft?.();
    if (dir === 'right') onRight?.();
  }, [onDirection, onUp, onDown, onLeft, onRight]);

  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';
  const btnSize = size === 'sm' ? 'w-11 h-11' : size === 'md' ? 'w-14 h-14' : 'w-16 h-16';
  const btnCls = `${btnSize} rounded-xl bg-white/15 backdrop-blur-sm border border-white/20
                  flex items-center justify-center text-white/80 active:bg-white/30 active:scale-95
                  transition-all duration-75 select-none touch-manipulation text-lg`;

  const handleTouch = (dir: Direction) => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    press(dir);
  };

  return (
    <div className={`grid grid-cols-3 ${gap}`} style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div />
      <button onTouchStart={handleTouch('up')} onMouseDown={() => press('up')} className={btnCls}>▲</button>
      <div />
      <button onTouchStart={handleTouch('left')} onMouseDown={() => press('left')} className={btnCls}>◀</button>
      <div />
      <button onTouchStart={handleTouch('right')} onMouseDown={() => press('right')} className={btnCls}>▶</button>
      <div />
      <button onTouchStart={handleTouch('down')} onMouseDown={() => press('down')} className={btnCls}>▼</button>
      <div />
    </div>
  );
});

/* ── Main TouchControls Component ── */
const TouchControls = memo(function TouchControls({
  layout,
  onDirection, onLeft, onRight, onUp, onDown,
  onAction, onAction2, onPause,
  actionLabel = '●',
  action2Label = '○',
  show = true,
  opacity = 0.7,
  size = 'md',
}: TouchControlsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isTouchDevice());
  }, []);

  if (!visible || !show || layout === 'none' || layout === 'swipe-only') return null;

  const containerCls = 'fixed bottom-0 left-0 right-0 z-[9990] pointer-events-none pb-4 px-4';
  const activeArea = 'pointer-events-auto';

  return (
    <div className={containerCls} style={{ opacity }}>
      {/* D-Pad Layout: D-pad on left, action buttons on right */}
      {layout === 'dpad' && (
        <div className="flex items-end justify-between max-w-lg mx-auto">
          <div className={activeArea}>
            <DPad
              onDirection={onDirection}
              onUp={onUp} onDown={onDown} onLeft={onLeft} onRight={onRight}
              size={size}
            />
          </div>
          <div className={`${activeArea} flex gap-3 items-end`}>
            {onPause && (
              <ControlButton onPress={onPause} label="⏸" size="sm" className="mb-2" />
            )}
            {onAction2 && (
              <ControlButton onPress={onAction2} label={action2Label} size={size} />
            )}
            {onAction && (
              <ControlButton onPress={onAction} label={actionLabel} size={size} className="bg-red-500/30 border-red-400/40" />
            )}
          </div>
        </div>
      )}

      {/* Horizontal Layout: Left/Right on left, action on right */}
      {layout === 'horizontal' && (
        <div className="flex items-end justify-between max-w-lg mx-auto">
          <div className={`${activeArea} flex gap-2`}>
            {onLeft && (
              <ControlButton onPress={onLeft} icon={<span>◀</span>} size={size} />
            )}
            {onRight && (
              <ControlButton onPress={onRight} icon={<span>▶</span>} size={size} />
            )}
          </div>
          <div className={`${activeArea} flex gap-3 items-end`}>
            {onPause && (
              <ControlButton onPress={onPause} label="⏸" size="sm" className="mb-2" />
            )}
            {onAction && (
              <ControlButton onPress={onAction} label={actionLabel} size={size} className="bg-red-500/30 border-red-400/40" />
            )}
          </div>
        </div>
      )}

      {/* Action Only: Single button centered or right */}
      {layout === 'action-only' && (
        <div className="flex items-end justify-end max-w-lg mx-auto">
          <div className={`${activeArea} flex gap-3 items-end`}>
            {onPause && (
              <ControlButton onPress={onPause} label="⏸" size="sm" />
            )}
            {onAction && (
              <ControlButton onPress={onAction} label={actionLabel} size="lg" className="bg-red-500/30 border-red-400/40" />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default TouchControls;
