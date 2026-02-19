import SwiftUI
import Combine
import GoogleMobileAds

// ═══════════════════════════════════════════════════════════════
// AD MANAGER — Google AdMob Integration
//
// SETUP INSTRUCTIONS:
// 1. Create account at https://admob.google.com
// 2. Create an app → get your App ID
// 3. Create ad units → get unit IDs for banner, interstitial, rewarded
// 4. Add to Info.plist: GADApplicationIdentifier = your-app-id
// 5. Replace the test IDs below with your real ad unit IDs
// 6. Add GoogleMobileAds SDK via SPM or CocoaPods
//
// REVENUE: You get paid monthly via AdMob to your bank account.
// At 50k DAU with $5-12 eCPM = $250-600/day potential
// ═══════════════════════════════════════════════════════════════

class AdManager: NSObject, ObservableObject {
    static let shared = AdManager()
    
    // ──────────────────────────────────────────
    // ⚠️ REPLACE THESE WITH YOUR REAL AD UNIT IDS FROM ADMOB
    // These are Google's official test IDs (safe for development)
    // ──────────────────────────────────────────
    
    #if DEBUG
    private let bannerAdUnitID     = "ca-app-pub-3940256099942544/2934735716"
    private let interstitialAdID   = "ca-app-pub-3940256099942544/4411468910"
    private let rewardedAdID       = "ca-app-pub-3940256099942544/1712485313"
    private let appOpenAdID        = "ca-app-pub-3940256099942544/5575463023"
    #else
    private let bannerAdUnitID     = "ca-app-pub-9418265198529416/1044892153"
    private let interstitialAdID   = "ca-app-pub-9418265198529416/8731810484"
    private let rewardedAdID       = "ca-app-pub-9418265198529416/9154917088"
    private let appOpenAdID        = "ca-app-pub-9418265198529416/2397937040"
    #endif
    
    // State
    @Published var isBannerReady = false
    @Published var isInterstitialReady = false
    @Published var isRewardedReady = false
    @Published var showBanner = true
    
    private var interstitialAd: InterstitialAd?
    private var rewardedAd: RewardedAd?
    private var appOpenAd: AppOpenAd?
    private var rewardCompletion: ((Bool) -> Void)?
    private var appOpenAdLoadTime: Date?
    
    // Tracking
    private var gamesPlayedSinceLastAd = 0
    private let interstitialFrequency = 3 // Show interstitial every 3 games
    
    override init() {
        super.init()
    }
    
    // ─────────────────────────────────────────
    // MARK: - Initialization
    // ─────────────────────────────────────────
    
    func initialize() {
        // COPPA COMPLIANCE: Mark all ad requests as child-directed
        MobileAds.shared.requestConfiguration.tagForChildDirectedTreatment = true
        MobileAds.shared.requestConfiguration.maxAdContentRating = .general
        
        // Initialize Google Mobile Ads SDK
        MobileAds.shared.start { status in
            print("[AdManager] SDK initialized (child-directed mode). Adapters: \(status.adapterStatusesByClassName)")
            Task { @MainActor in
                self.loadInterstitial()
                self.loadRewarded()
                self.loadAppOpenAd()
            }
        }
        
        // Respect ad-free purchase
        updateAdVisibility()
    }
    
    func updateAdVisibility() {
        let isAdFree = PlayerProgress.shared.isAdFree
        showBanner = !isAdFree
    }
    
    // ─────────────────────────────────────────
    // MARK: - Banner Ad
    // ─────────────────────────────────────────
    
    var bannerUnitID: String { bannerAdUnitID }
    
    var shouldShowBanner: Bool {
        !PlayerProgress.shared.isAdFree
    }
    
    // ─────────────────────────────────────────
    // MARK: - Interstitial Ad (Between Games)
    // ─────────────────────────────────────────
    
    private func loadInterstitial() {
        guard !PlayerProgress.shared.isAdFree else { return }
        
        let request = GoogleMobileAds.Request()
        InterstitialAd.load(with: interstitialAdID, request: request) { [weak self] ad, error in
            if let error = error {
                print("[AdManager] Interstitial load error: \(error.localizedDescription)")
                return
            }
            guard let self else { return }
            Task { @MainActor [self] in
                self.interstitialAd = ad
                self.interstitialAd?.fullScreenContentDelegate = self
                self.isInterstitialReady = true
                print("[AdManager] Interstitial ready")
            }
        }
    }
    
    /// Call this after a game ends. Shows interstitial every N games.
    func onGameCompleted() {
        guard !PlayerProgress.shared.isAdFree else { return }
        gamesPlayedSinceLastAd += 1
        
        if gamesPlayedSinceLastAd >= interstitialFrequency {
            showInterstitial()
            gamesPlayedSinceLastAd = 0
        }
    }
    
    func showInterstitial() {
        guard !PlayerProgress.shared.isAdFree else { return }
        guard let ad = interstitialAd else {
            loadInterstitial()
            return
        }
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            ad.present(from: rootVC)
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Rewarded Ad (Watch for Power-ups)
    // ─────────────────────────────────────────
    
    private func loadRewarded() {
        let request = GoogleMobileAds.Request()
        RewardedAd.load(with: rewardedAdID, request: request) { [weak self] ad, error in
            if let error = error {
                print("[AdManager] Rewarded load error: \(error.localizedDescription)")
                return
            }
            guard let self else { return }
            Task { @MainActor [self] in
                self.rewardedAd = ad
                self.rewardedAd?.fullScreenContentDelegate = self
                self.isRewardedReady = true
                print("[AdManager] Rewarded ready")
            }
        }
    }
    
    /// Shows a rewarded video ad. Completion returns true if user earned reward.
    func showRewardedAd(completion: @escaping (Bool) -> Void) {
        guard let ad = rewardedAd else {
            loadRewarded()
            completion(false)
            return
        }
        
        rewardCompletion = completion
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            ad.present(from: rootVC) {
                // User earned reward
                let reward = ad.adReward
                print("[AdManager] User earned reward: \(reward.amount) \(reward.type)")
                completion(true)
            }
        }
    }
    
    /// Reward types players can earn from watching ads
    enum AdRewardType: String {
        case extraLife = "Extra Life"
        case skipQuestion = "Skip Question"
        case doubleCoins = "2x Coins"
        case powerUp = "Power-Up"
        case hintShield = "Hint Shield"
    }
    
    func showRewardedAd(for rewardType: AdRewardType, completion: @escaping (Bool) -> Void) {
        showRewardedAd { success in
            if success {
                switch rewardType {
                case .extraLife:
                    PlayerProgress.shared.addPowerUp("extraLife")
                case .skipQuestion:
                    PlayerProgress.shared.addPowerUp("skipQuestion")
                case .doubleCoins:
                    PlayerProgress.shared.addCoins(50)
                case .powerUp:
                    PlayerProgress.shared.addPowerUp("slowTime")
                case .hintShield:
                    PlayerProgress.shared.addPowerUp("hintShield")
                }
            }
            completion(success)
        }
    }
    // ─────────────────────────────────────────
    // MARK: - App Open Ad (shows when returning to app)
    // ─────────────────────────────────────────
    
    private func loadAppOpenAd() {
        guard !PlayerProgress.shared.isAdFree else { return }
        
        AppOpenAd.load(with: appOpenAdID, request: GoogleMobileAds.Request()) { [weak self] ad, error in
            if let error = error {
                print("[AdManager] App open load error: \(error.localizedDescription)")
                return
            }
            guard let self else { return }
            Task { @MainActor [self] in
                self.appOpenAd = ad
                self.appOpenAd?.fullScreenContentDelegate = self
                self.appOpenAdLoadTime = Date()
                print("[AdManager] App open ad ready")
            }
        }
    }
    
    func showAppOpenAd() {
        guard !PlayerProgress.shared.isAdFree else { return }
        
        // Don't show if ad is older than 4 hours
        if let loadTime = appOpenAdLoadTime, Date().timeIntervalSince(loadTime) > 4 * 3600 {
            appOpenAd = nil
            loadAppOpenAd()
            return
        }
        
        guard let ad = appOpenAd else {
            loadAppOpenAd()
            return
        }
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            ad.present(from: rootVC)
        }
    }
}

// MARK: - Full Screen Ad Delegate

extension AdManager: FullScreenContentDelegate {
    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        if ad is InterstitialAd {
            isInterstitialReady = false
            loadInterstitial()
        } else if ad is RewardedAd {
            isRewardedReady = false
            loadRewarded()
        } else if ad is AppOpenAd {
            loadAppOpenAd()
        }
    }
    
    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        print("[AdManager] Failed to present: \(error.localizedDescription)")
        if ad is InterstitialAd {
            loadInterstitial()
        } else if ad is RewardedAd {
            loadRewarded()
            rewardCompletion?(false)
        } else if ad is AppOpenAd {
            loadAppOpenAd()
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Banner Ad SwiftUI View
// ═══════════════════════════════════════════════════════════════

struct BannerAdView: UIViewRepresentable {
    let adUnitID: String
    
    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView(adSize: AdSizeBanner)
        banner.adUnitID = adUnitID
        banner.backgroundColor = UIColor(red: 0.05, green: 0.05, blue: 0.12, alpha: 1)
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            banner.rootViewController = rootVC
        }
        
        banner.load(GoogleMobileAds.Request())
        return banner
    }
    
    func updateUIView(_ uiView: BannerView, context: Context) {}
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Smart Ad Banner (auto-hides for ad-free users)
// ═══════════════════════════════════════════════════════════════

struct SmartBannerAd: View {
    @ObservedObject var adManager = AdManager.shared
    @ObservedObject var progress = PlayerProgress.shared
    
    var body: some View {
        if !progress.isAdFree {
            VStack(spacing: 0) {
                Divider().background(Color.white.opacity(0.1))
                BannerAdView(adUnitID: adManager.bannerUnitID)
                    .frame(height: 50)
                    .background(StormColors.background)
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Rewarded Ad Button (Watch Ad for Reward)
// ═══════════════════════════════════════════════════════════════

struct RewardedAdButton: View {
    let rewardType: AdManager.AdRewardType
    let icon: String
    let title: String
    let description: String
    @ObservedObject var adManager = AdManager.shared
    @State private var isLoading = false
    @State private var showSuccess = false
    
    var body: some View {
        Button(action: {
            isLoading = true
            adManager.showRewardedAd(for: rewardType) { success in
                isLoading = false
                if success {
                    showSuccess = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        showSuccess = false
                    }
                }
            }
        }) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(StormColors.neonYellow)
                    .frame(width: 40, height: 40)
                    .background(StormColors.neonYellow.opacity(0.15))
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                
                Spacer()
                
                if isLoading {
                    ProgressView().tint(.white)
                } else if showSuccess {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(StormColors.neonGreen)
                } else {
                    HStack(spacing: 4) {
                        Image(systemName: "play.rectangle.fill")
                        Text("Watch")
                    }
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonYellow)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(StormColors.neonYellow.opacity(0.15))
                    .cornerRadius(10)
                }
            }
            .padding(12)
            .background(StormColors.surface)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .disabled(isLoading)
    }
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Free Rewards Hub (Earn by Watching Ads)
// ═══════════════════════════════════════════════════════════════

struct FreeRewardsView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {
                        // Header
                        VStack(spacing: 8) {
                            Text("🎬").font(.system(size: 50))
                            Text("FREE REWARDS")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundStyle(StormColors.goldGradient)
                            Text("Watch short videos to earn rewards!")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                        }
                        .padding(.top, 20)
                        
                        // Reward options
                        VStack(spacing: 10) {
                            RewardedAdButton(
                                rewardType: .extraLife,
                                icon: "heart.fill",
                                title: "Extra Life",
                                description: "Get 1 extra life for any game"
                            )
                            RewardedAdButton(
                                rewardType: .skipQuestion,
                                icon: "forward.fill",
                                title: "Skip Question",
                                description: "Skip 1 Knowledge Gate question"
                            )
                            RewardedAdButton(
                                rewardType: .doubleCoins,
                                icon: "bitcoinsign.circle.fill",
                                title: "50 Bonus Coins",
                                description: "Instant 50 coin bonus"
                            )
                            RewardedAdButton(
                                rewardType: .powerUp,
                                icon: "clock.fill",
                                title: "Slow Time",
                                description: "Slow down timed challenges"
                            )
                            RewardedAdButton(
                                rewardType: .hintShield,
                                icon: "shield.fill",
                                title: "Hint Shield",
                                description: "Get a hint on tough questions"
                            )
                        }
                        .padding(.horizontal, 20)
                        
                        Spacer(minLength: 40)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
