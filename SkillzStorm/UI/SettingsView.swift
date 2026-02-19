import SwiftUI
import StoreKit

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var progress = PlayerProgress.shared
    @ObservedObject var sound = SoundManager.shared
    @State private var showResetConfirm = false
    @State private var showAdFreeInfo = false
    @State private var showLinkAccount = false
    @State private var showStormStore = false
    @State private var showFreeRewards = false
    @State private var showPrivacy = false
    @State private var showTerms = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                StormColors.background.ignoresSafeArea()
                
                List {
                    // Profile
                    Section {
                        HStack(spacing: Storm.isIPad ? 20 : 16) {
                            ZStack {
                                Circle()
                                    .fill(StormColors.heroGradient)
                                    .frame(width: Storm.isIPad ? 80 : 60, height: Storm.isIPad ? 80 : 60)
                                Text("⚡")
                                    .font(.system(size: Storm.isIPad ? 40 : 30))
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Storm Player")
                                    .font(Storm.isIPad ? .title3.bold() : .headline.bold())
                                    .foregroundColor(.white)
                                Text("Level \(progress.level) • \(progress.totalXP) XP")
                                    .font(Storm.isIPad ? .subheadline : .caption)
                                    .foregroundColor(.white.opacity(0.6))
                                Text("Grade: \(progress.selectedGrade.displayName)")
                                    .font(Storm.isIPad ? .subheadline : .caption)
                                    .foregroundColor(StormColors.neonBlue)
                            }
                        }
                        .listRowBackground(StormColors.surface)
                    }
                    
                    // Grade Selection
                    Section("Grade Level") {
                        ForEach(GradeLevel.allCases) { grade in
                            Button(action: {
                                progress.selectedGrade = grade
                                SoundManager.shared.playButtonTap()
                            }) {
                                HStack {
                                    Text(grade.emoji)
                                    Text(grade.displayName)
                                        .foregroundColor(.white)
                                    Text("(\(grade.subtitle))")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.5))
                                    Spacer()
                                    if progress.selectedGrade == grade {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(StormColors.neonGreen)
                                    }
                                }
                            }
                            .listRowBackground(StormColors.surface)
                        }
                    }
                    
                    // Sound
                    Section("Sound") {
                        Toggle(isOn: Binding(
                            get: { !sound.isMuted },
                            set: { _ in sound.toggleMute() }
                        )) {
                            Label("Sound Effects", systemImage: "speaker.wave.2.fill")
                                .foregroundColor(.white)
                        }
                        .listRowBackground(StormColors.surface)
                        .tint(StormColors.neonBlue)
                    }
                    
                    // Premium & Monetization
                    Section("Premium") {
                        Button(action: { showAdFreeInfo = true }) {
                            HStack {
                                Label("Remove Ads", systemImage: "star.fill")
                                    .foregroundColor(StormColors.neonYellow)
                                Spacer()
                                if progress.isAdFree {
                                    Text("ACTIVE")
                                        .font(.caption.bold())
                                        .foregroundColor(StormColors.neonGreen)
                                } else {
                                    Text("$2.99")
                                        .font(.caption.bold())
                                        .foregroundColor(StormColors.neonBlue)
                                }
                            }
                        }
                        .listRowBackground(StormColors.surface)
                        
                        Button(action: { showStormStore = true }) {
                            HStack {
                                Label("Storm Store", systemImage: "cart.fill")
                                    .foregroundColor(StormColors.neonPink)
                                Spacer()
                                Text("Coins & More")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                        .listRowBackground(StormColors.surface)
                        
                        if !progress.isAdFree {
                            Button(action: { showFreeRewards = true }) {
                                HStack {
                                    Label("Free Rewards", systemImage: "play.rectangle.fill")
                                        .foregroundColor(StormColors.neonGreen)
                                    Spacer()
                                    Text("Watch & Earn")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.5))
                                }
                            }
                            .listRowBackground(StormColors.surface)
                        }
                        
                        Button(action: {
                            Task { await StoreManager.shared.restorePurchases() }
                        }) {
                            Label("Restore Purchases", systemImage: "arrow.clockwise")
                                .foregroundColor(StormColors.neonBlue)
                        }
                        .listRowBackground(StormColors.surface)
                    }
                    
                    // Account Linking
                    Section("Account") {
                        Button(action: { showLinkAccount = true }) {
                            HStack {
                                Label("Link to Website", systemImage: "link.circle.fill")
                                    .foregroundColor(StormColors.neonCyan)
                                Spacer()
                                if CrossPlatformLink.shared.isLinked {
                                    Text("LINKED")
                                        .font(.caption.bold())
                                        .foregroundColor(StormColors.neonGreen)
                                } else {
                                    Text("Connect")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.5))
                                }
                            }
                        }
                        .listRowBackground(StormColors.surface)
                    }
                    
                    // Stats
                    Section("Statistics") {
                        statRow("Games Played", "\(progress.gamesPlayed)")
                        statRow("Questions Answered", "\(progress.questionsAnswered)")
                        statRow("Accuracy", String(format: "%.1f%%", progress.accuracy))
                        statRow("Current Streak", "\(progress.currentStreak) days")
                        statRow("Total Coins", "\(progress.totalCoins)")
                        statRow("Total XP", "\(progress.totalXP)")
                    }
                    
                    // Legal (Required by App Store & COPPA)
                    Section("Legal") {
                        Button(action: { showPrivacy = true }) {
                            HStack {
                                Label("Privacy Policy", systemImage: "hand.raised.fill")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.3))
                            }
                        }
                        .listRowBackground(StormColors.surface)
                        
                        Button(action: { showTerms = true }) {
                            HStack {
                                Label("Terms of Service", systemImage: "doc.text.fill")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.3))
                            }
                        }
                        .listRowBackground(StormColors.surface)
                        
                        Link(destination: URL(string: "https://skillzstorm.com/privacy")!) {
                            HStack {
                                Label("Privacy on Web", systemImage: "globe")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "arrow.up.right.square")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.3))
                            }
                        }
                        .listRowBackground(StormColors.surface)
                    }
                    
                    // About
                    Section("About") {
                        HStack {
                            Text("Version")
                                .foregroundColor(.white)
                            Spacer()
                            Text("1.0.0")
                                .foregroundColor(.white.opacity(0.5))
                        }
                        .listRowBackground(StormColors.surface)
                        
                        HStack {
                            Text("Total Games")
                                .foregroundColor(.white)
                            Spacer()
                            Text("\(GameCatalog.totalGameCount)")
                                .foregroundColor(.white.opacity(0.5))
                        }
                        .listRowBackground(StormColors.surface)
                        
                        HStack {
                            Text("COPPA Compliant")
                                .foregroundColor(.white)
                            Spacer()
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(StormColors.neonGreen)
                        }
                        .listRowBackground(StormColors.surface)
                    }
                    
                    // Reset
                    Section {
                        Button(action: { showResetConfirm = true }) {
                            Label("Reset All Progress", systemImage: "trash.fill")
                                .foregroundColor(.red)
                        }
                        .listRowBackground(StormColors.surface)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
            .alert("Reset Progress?", isPresented: $showResetConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Reset", role: .destructive) {
                    let domain = Bundle.main.bundleIdentifier!
                    UserDefaults.standard.removePersistentDomain(forName: domain)
                }
            } message: {
                Text("This will delete all your scores, coins, and progress. This cannot be undone.")
            }
            .sheet(isPresented: $showAdFreeInfo) {
                AdFreeView()
            }
            .sheet(isPresented: $showLinkAccount) {
                LinkAccountView()
            }
            .sheet(isPresented: $showStormStore) {
                StormStoreView()
            }
            .sheet(isPresented: $showFreeRewards) {
                FreeRewardsView()
            }
            .sheet(isPresented: $showPrivacy) {
                PrivacyPolicyView()
            }
            .sheet(isPresented: $showTerms) {
                TermsOfServiceView()
            }
        }
        .preferredColorScheme(.dark)
    }
    
    private func statRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundColor(.white)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundColor(StormColors.neonBlue)
        }
        .listRowBackground(StormColors.surface)
    }
}

// MARK: - Ad-Free Purchase View (StoreKit 2 Compliant)

struct AdFreeView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var progress = PlayerProgress.shared
    @StateObject var storeManager = StoreManager.shared
    @State private var isPurchasing = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                VStack(spacing: 24) {
                    Text("⭐").font(.system(size: 80))
                    
                    Text("GO AD-FREE")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(StormColors.goldGradient)
                    
                    Text("Remove all ads and enjoy uninterrupted gaming")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        benefitRow("No banner ads")
                        benefitRow("No interstitial ads")
                        benefitRow("No video ads")
                        benefitRow("Pure gaming experience")
                        benefitRow("Support SkillzStorm development")
                    }
                    .padding()
                    .glassCard()
                    
                    if progress.isAdFree {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(StormColors.neonGreen)
                            Text("AD-FREE ACTIVE")
                                .font(.headline.bold())
                                .foregroundColor(StormColors.neonGreen)
                        }
                        .padding(.vertical, 18)
                    } else if let product = storeManager.product(for: .adFree) {
                        Button(action: {
                            isPurchasing = true
                            Task {
                                do {
                                    let success = try await storeManager.purchase(product)
                                    isPurchasing = false
                                    if success {
                                        AdManager.shared.updateAdVisibility()
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { dismiss() }
                                    }
                                } catch {
                                    isPurchasing = false
                                    errorMessage = error.localizedDescription
                                    showError = true
                                }
                            }
                        }) {
                            if isPurchasing {
                                ProgressView()
                                    .tint(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 18)
                                    .background(StormColors.goldGradient)
                                    .cornerRadius(20)
                            } else {
                                Text("Purchase for \(product.displayPrice)")
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 18)
                                    .background(StormColors.goldGradient)
                                    .cornerRadius(20)
                            }
                        }
                        .disabled(isPurchasing)
                        .padding(.horizontal)
                    } else {
                        Text("Loading...")
                            .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Button("Restore Purchases") {
                        Task { await storeManager.restorePurchases() }
                    }
                    .font(.caption)
                    .foregroundColor(StormColors.neonBlue)
                }
                .padding()
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
            .alert("Purchase Error", isPresented: $showError) {
                Button("OK") {}
            } message: {
                Text(errorMessage)
            }
        }
        .preferredColorScheme(.dark)
    }
    
    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(StormColors.neonGreen)
            Text(text)
                .foregroundColor(.white)
        }
    }
}
