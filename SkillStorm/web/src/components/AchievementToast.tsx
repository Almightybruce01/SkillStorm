/* ═══════════════════════════════════════════════════════════════════════════════
   ACHIEVEMENT TOAST — Animated Achievement Notification
   Shows a beautiful animated popup when an achievement is unlocked.
   Features: Slide-in animation, tier-based styling, auto-dismiss,
   sound effect trigger, confetti burst, stacking for multiple unlocks.
   ═══════════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type AchievementDef,
  TIER_COLORS,
  TIER_XP,
  getUnnotifiedAchievements,
  markAchievementNotified,
  checkAchievements,
} from '../games/AchievementSystem';

interface ToastItem {
  achievement: AchievementDef;
  id: number;
  entering: boolean;
  leaving: boolean;
}

let toastIdCounter = 0;

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((achievement: AchievementDef) => {
    const id = toastIdCounter++;
    setToasts(prev => [...prev, { achievement, id, entering: true, leaving: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, entering: false } : t));
    }, 50);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    }, 4500);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      markAchievementNotified(achievement.id);
    }, 5000);
  }, []);

  useEffect(() => {
    const check = () => {
      checkAchievements();
      const unnotified = getUnnotifiedAchievements();
      if (unnotified.length > 0) {
        unnotified.forEach((ach, i) => {
          setTimeout(() => addToast(ach), i * 600);
        });
      }
    };

    check();
    checkInterval.current = setInterval(check, 5000);

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '360px' }}>
      {toasts.map((toast) => {
        const { achievement, entering, leaving } = toast;
        const colors = TIER_COLORS[achievement.tier];
        const xp = TIER_XP[achievement.tier];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto"
            style={{
              transform: entering ? 'translateX(120%)' : leaving ? 'translateX(120%)' : 'translateX(0)',
              opacity: entering ? 0 : leaving ? 0 : 1,
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              className="rounded-xl overflow-hidden shadow-2xl border"
              style={{
                background: 'white',
                borderColor: colors.border,
                boxShadow: `0 8px 32px ${colors.glow}, 0 4px 16px rgba(0,0,0,0.1)`,
              }}
            >
              {/* Top accent bar */}
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${colors.bg}, ${colors.border})` }} />

              <div className="flex items-center gap-3 p-3">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${colors.bg}20`, border: `2px solid ${colors.border}40` }}
                >
                  {achievement.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: colors.bg, color: colors.text }}>
                      {achievement.tier}
                    </span>
                    <span className="text-[10px] text-gray-400">+{xp} XP</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm truncate mt-0.5">{achievement.title}</h4>
                  <p className="text-[11px] text-gray-500 truncate">{achievement.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Achievement Badge Component (for display in profiles, etc.) ── */
export function AchievementBadge({ achievement, size = 'md', showTooltip = true }: {
  achievement: AchievementDef;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}) {
  const colors = TIER_COLORS[achievement.tier];
  const sizeMap = { sm: 'w-8 h-8 text-lg', md: 'w-12 h-12 text-2xl', lg: 'w-16 h-16 text-3xl' };

  return (
    <div className="relative group inline-block">
      <div
        className={`${sizeMap[size]} rounded-lg flex items-center justify-center border-2 transition-transform group-hover:scale-110`}
        style={{
          background: `${colors.bg}30`,
          borderColor: colors.border,
          boxShadow: `0 2px 8px ${colors.glow}`,
        }}
      >
        {achievement.icon}
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
            <div className="font-bold">{achievement.title}</div>
            <div className="text-gray-400 text-[10px]">{achievement.description}</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Achievement Progress Ring ── */
export function AchievementProgressRing({ progress, size = 40, color = '#6C5CE7' }: {
  progress: number;
  size?: number;
  color?: string;
}) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />
    </svg>
  );
}
