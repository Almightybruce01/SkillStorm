/* GAME OVER AD — Apple 2.5.18 Compliant. Retry/exit always available. */
import { AD_CONFIG, adsAllowed } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

interface Props {
  score: number;
  onRetry: () => void;
  onExit: () => void;
  onWatchAdForLife?: () => void;
}

export default function GameOverAd({ score, onRetry, onExit, onWatchAdForLife }: Props) {
  const showAd = adsAllowed();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-pop-in">
        <div className="text-center pt-6 pb-3 px-6">
          <div className="text-5xl mb-2">💀</div>
          <h3 className="font-display font-extrabold text-xl text-gray-900 mb-1">Game Over!</h3>
          <p className="text-3xl font-black text-gradient mb-1">{score.toLocaleString()} pts</p>
        </div>

        {showAd && (
          <div className="mx-4 mb-3">
            {AD_CONFIG.adsLive ? (
              <div className="ad-container rounded-xl" style={{ minHeight: 100 }}>
                <ins className="adsbygoogle" style={{ display: 'block' }}
                  data-ad-client={AD_CONFIG.publisherId} data-ad-slot={AD_CONFIG.slots.gameOver}
                  data-ad-format="rectangle" />
              </div>
            ) : (
              <AdPlaceholder format="rectangle" />
            )}
          </div>
        )}

        <div className="px-6 pb-6 space-y-2">
          {onWatchAdForLife && showAd && (
            <button onClick={onWatchAdForLife} className="w-full btn-elite btn-elite-accent text-sm min-h-[44px]">
              Watch Ad for Extra Life
            </button>
          )}
          <button onClick={onRetry} className="w-full btn-elite btn-elite-primary text-sm min-h-[44px]">
            Play Again
          </button>
          <button onClick={onExit} className="w-full btn-elite btn-elite-ghost text-sm min-h-[44px]">
            Exit Game
          </button>
        </div>
      </div>
    </div>
  );
}
