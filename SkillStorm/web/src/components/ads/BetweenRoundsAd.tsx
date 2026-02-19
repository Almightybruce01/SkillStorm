/* BETWEEN ROUNDS AD — Apple 2.5.18 Compliant. Continue always available. */
import { AD_CONFIG, adsAllowed } from './AdConfig';
import AdPlaceholder from './AdPlaceholder';

interface Props {
  round: number;
  score: number;
  onContinue: () => void;
}

export default function BetweenRoundsAd({ round, score, onContinue }: Props) {
  const showAd = adsAllowed();

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="text-center max-w-md w-full mx-4 animate-pop-in">
        <div className="mb-4">
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="font-display font-extrabold text-xl text-gray-900 mb-1">Round {round} Complete!</h3>
          <p className="text-2xl font-black text-gradient">{score.toLocaleString()} pts</p>
        </div>

        {showAd && (
          <div className="mb-4">
            {AD_CONFIG.adsLive ? (
              <div className="ad-container rounded-xl" style={{ minHeight: 100 }}>
                <ins className="adsbygoogle" style={{ display: 'block' }}
                  data-ad-client={AD_CONFIG.publisherId} data-ad-slot={AD_CONFIG.slots.betweenRounds}
                  data-ad-format="rectangle" />
              </div>
            ) : (
              <AdPlaceholder format="rectangle" />
            )}
          </div>
        )}

        <button onClick={onContinue} className="btn-elite btn-elite-primary text-sm w-full min-h-[44px]">
          Continue to Next Round
        </button>
      </div>
    </div>
  );
}
