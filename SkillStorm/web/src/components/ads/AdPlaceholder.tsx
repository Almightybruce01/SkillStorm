/* Replica ad placeholder — self-promo banners shown until real AdSense ads
   start serving. Small, clean, and styled to match the site.
   When AdSense is approved: set adsLive:true in AdConfig.ts and uncomment
   the script tag in index.html. */

import { Link } from 'react-router-dom';

interface AdPlaceholderProps {
  format: 'banner' | 'leaderboard' | 'rectangle' | 'sidebar';
}

const PROMOS = [
  { text: 'Go Premium — No Ads + Bonus Games', cta: 'Upgrade', href: '/premium', gradient: 'from-violet-500 to-indigo-600' },
  { text: 'New Arcade Games Added Weekly', cta: 'Play Now', href: '/arcade', gradient: 'from-pink-500 to-rose-500' },
  { text: 'Track Your Stats & Achievements', cta: 'Dashboard', href: '/dashboard', gradient: 'from-emerald-500 to-teal-600' },
  { text: 'Challenge Yourself — 25+ Games', cta: 'Browse', href: '/games', gradient: 'from-amber-500 to-orange-500' },
];

export default function AdPlaceholder({ format }: AdPlaceholderProps) {
  const promo = PROMOS[Math.floor(Math.random() * PROMOS.length)];

  if (format === 'banner') {
    return (
      <Link
        to={promo.href}
        className={`flex items-center justify-center gap-2 w-full h-8 rounded-lg bg-gradient-to-r ${promo.gradient} hover:brightness-110 transition-all`}
      >
        <span className="text-white/90 text-[11px] font-medium truncate">{promo.text}</span>
        <span className="shrink-0 text-[9px] font-bold text-white bg-white/20 rounded px-1.5 py-0.5">{promo.cta}</span>
      </Link>
    );
  }

  if (format === 'leaderboard') {
    return (
      <Link
        to={promo.href}
        className={`flex items-center justify-center gap-3 w-full h-10 rounded-lg bg-gradient-to-r ${promo.gradient} hover:brightness-110 transition-all`}
      >
        <span className="text-white/90 text-xs font-medium truncate">{promo.text}</span>
        <span className="shrink-0 text-[10px] font-bold text-white bg-white/20 rounded px-2 py-0.5">{promo.cta}</span>
      </Link>
    );
  }

  if (format === 'sidebar') {
    return (
      <Link
        to={promo.href}
        className={`flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl bg-gradient-to-br ${promo.gradient} hover:brightness-110 transition-all`}
      >
        <span className="text-white/90 text-xs font-medium text-center px-3 leading-relaxed">{promo.text}</span>
        <span className="text-[10px] font-bold text-white bg-white/20 rounded px-3 py-1">{promo.cta}</span>
        <span className="text-white/40 text-[8px] mt-1">Sponsored</span>
      </Link>
    );
  }

  // rectangle
  return (
    <Link
      to={promo.href}
      className={`flex flex-col items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-br ${promo.gradient} hover:brightness-110 transition-all`}
    >
      <span className="text-white/90 text-xs font-medium text-center px-4">{promo.text}</span>
      <span className="text-[10px] font-bold text-white bg-white/20 rounded px-2 py-0.5">{promo.cta}</span>
    </Link>
  );
}
