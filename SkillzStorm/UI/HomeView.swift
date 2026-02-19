import SwiftUI

struct HomeView: View {
    @ObservedObject var progress = PlayerProgress.shared
    @State private var showGradeSelection = false
    @State private var showDailyChallenge = false
    @State private var showSettings = false
    @State private var showStore = false
    @State private var showFreeRewards = false
    @State private var showIAPStore = false
    @State private var showBattlePass = false
    @State private var showCosmeticsShop = false
    @State private var logoScale: CGFloat = 0.5
    @State private var logoOpacity: Double = 0
    @State private var taglineOffset: CGFloat = 30
    @State private var buttonsOpacity: Double = 0
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        heroSection
                        
                        statsBar
                            .padding(.top, 8)
                        
                        quickActions
                            .padding(.top, 24)
                        
                        featuredGamesSection
                            .padding(.top, 28)
                        
                        categoriesSection
                            .padding(.top, 28)
                        
                        dailyChallengeCard
                            .padding(.top, 28)
                        
                        monetizationCards
                            .padding(.top, 20)
                        
                        Color.clear.frame(height: 100)
                    }
                    .padding(.horizontal, Storm.isIPad ? 40 : 20)
                    .readableWidth()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gearshape.fill")
                            .foregroundColor(StormColors.neonBlue)
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        // Coins
                        HStack(spacing: 4) {
                            Image(systemName: "bitcoinsign.circle.fill")
                                .foregroundColor(StormColors.neonYellow)
                            Text("\(progress.totalCoins)")
                                .font(.subheadline.bold())
                                .foregroundColor(.white)
                        }
                        
                        // Store
                        Button(action: { showStore = true }) {
                            Image(systemName: "cart.fill")
                                .foregroundColor(StormColors.neonPink)
                        }
                    }
                }
            }
            .sheet(isPresented: $showGradeSelection) {
                GradeSelectionView()
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showStore) {
                VRStoreView()
            }
            .sheet(isPresented: $showFreeRewards) {
                FreeRewardsView()
            }
            .sheet(isPresented: $showIAPStore) {
                StormStoreView()
            }
            .sheet(isPresented: $showBattlePass) {
                BattlePassView()
            }
            .sheet(isPresented: $showCosmeticsShop) {
                CosmeticsShopView()
            }
            .onAppear {
                withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                    logoScale = 1.0
                    logoOpacity = 1.0
                }
                withAnimation(.easeOut(duration: 0.8).delay(0.3)) {
                    taglineOffset = 0
                }
                withAnimation(.easeOut(duration: 0.6).delay(0.6)) {
                    buttonsOpacity = 1.0
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    // MARK: - Monetization Cards (Rewards + Premium)
    
    private var monetizationCards: some View {
        VStack(spacing: 12) {
            // Free Rewards (watch ads for power-ups)
            if !progress.isAdFree {
                Button(action: { showFreeRewards = true }) {
                    HStack(spacing: 14) {
                        Text("🎬")
                            .font(.title2)
                            .frame(width: 44, height: 44)
                            .background(StormColors.neonYellow.opacity(0.15))
                            .cornerRadius(12)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("FREE REWARDS")
                                .font(.subheadline.bold())
                                .foregroundColor(StormColors.neonYellow)
                            Text("Watch short videos → earn power-ups")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                        }
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right.circle.fill")
                            .foregroundColor(StormColors.neonYellow)
                    }
                    .padding(14)
                    .background(StormColors.neonYellow.opacity(0.06))
                    .glassCard()
                }
            }
            
            // Season Pass
            Button(action: { showBattlePass = true }) {
                HStack(spacing: 14) {
                    Text(BattlePassManager.shared.currentSeason.iconEmoji)
                        .font(.title2)
                        .frame(width: 44, height: 44)
                        .background(StormColors.neonCyan.opacity(0.15))
                        .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("SEASON PASS")
                            .font(.subheadline.bold())
                            .foregroundColor(StormColors.neonCyan)
                        Text("\(BattlePassManager.shared.currentSeason.name) • Tier \(BattlePassManager.shared.currentTier)/\(BattlePassManager.maxTier)")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Spacer()
                    
                    if BattlePassManager.shared.unclaimedFreeCount > 0 {
                        Text("\(BattlePassManager.shared.unclaimedFreeCount)")
                            .font(.caption.bold())
                            .foregroundColor(.white)
                            .frame(width: 22, height: 22)
                            .background(StormColors.neonRed)
                            .clipShape(Circle())
                    }
                    
                    Image(systemName: "chevron.right.circle.fill")
                        .foregroundColor(StormColors.neonCyan)
                }
                .padding(14)
                .background(StormColors.neonCyan.opacity(0.06))
                .glassCard()
            }
            
            // Cosmetics Shop
            Button(action: { showCosmeticsShop = true }) {
                HStack(spacing: 14) {
                    Text("🎨")
                        .font(.title2)
                        .frame(width: 44, height: 44)
                        .background(StormColors.neonPink.opacity(0.15))
                        .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("STORM SHOP")
                            .font(.subheadline.bold())
                            .foregroundColor(StormColors.neonPink)
                        Text("Avatars, titles & themes")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right.circle.fill")
                        .foregroundColor(StormColors.neonPink)
                }
                .padding(14)
                .background(StormColors.neonPink.opacity(0.06))
                .glassCard()
            }
            
            // Premium upsell
            if !progress.isPremium {
                Button(action: { showIAPStore = true }) {
                    HStack(spacing: 14) {
                        Text("👑")
                            .font(.title2)
                            .frame(width: 44, height: 44)
                            .background(StormColors.neonPurple.opacity(0.15))
                            .cornerRadius(12)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("GO PREMIUM")
                                .font(.subheadline.bold())
                                .foregroundColor(.white)
                            Text("Ad-free + coins + exclusive content")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                        }
                        
                        Spacer()
                        
                        Text("$4.99")
                            .font(.caption.bold())
                            .foregroundColor(StormColors.neonGreen)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(StormColors.neonGreen.opacity(0.15))
                            .cornerRadius(8)
                    }
                    .padding(14)
                    .background(
                        LinearGradient(colors: [StormColors.neonPurple.opacity(0.06), StormColors.neonBlue.opacity(0.04)],
                                      startPoint: .leading, endPoint: .trailing)
                    )
                    .glassCard()
                }
            }
        }
    }
    
    // MARK: - Hero Section
    
    private var heroSection: some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 20)
            
            // Logo
            VStack(spacing: 4) {
                HStack(spacing: 0) {
                    Text("SKILLZ")
                        .font(Storm.font(52, weight: .black, design: .rounded))
                        .foregroundStyle(StormColors.heroGradient)
                        .neonGlow(StormColors.neonBlue, radius: 12)
                    Text("STORM")
                        .font(Storm.font(52, weight: .black, design: .rounded))
                        .foregroundStyle(StormColors.fireGradient)
                }
            }
            .scaleEffect(logoScale)
            .opacity(logoOpacity)
            
            // Tagline
            Text("PLAY HARD. THINK HARDER.")
                .font(Storm.font(14, weight: .bold, design: .monospaced))
                .tracking(4)
                .foregroundColor(StormColors.neonCyan)
                .offset(y: taglineOffset)
                .neonGlow(StormColors.neonCyan, radius: 4)
            
            // Level & XP
            VStack(spacing: 6) {
                HStack {
                    Text("LEVEL \(progress.level)")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonYellow)
                    Spacer()
                    Text("\(progress.xpToNextLevel) XP to next")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 6)
                        
                        RoundedRectangle(cornerRadius: 4)
                            .fill(StormColors.goldGradient)
                            .frame(width: geo.size.width * progress.xpProgress, height: 6)
                    }
                }
                .frame(height: 6)
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)
        }
    }
    
    // MARK: - Stats Bar
    
    private var statsBar: some View {
        HStack(spacing: 0) {
            statItem(icon: "flame.fill", value: "\(progress.currentStreak)", label: "Streak", color: StormColors.neonOrange)
            Divider().frame(height: 30).background(Color.white.opacity(0.2))
            statItem(icon: "gamecontroller.fill", value: "\(progress.gamesPlayed)", label: "Games", color: StormColors.neonBlue)
            Divider().frame(height: 30).background(Color.white.opacity(0.2))
            statItem(icon: "checkmark.circle.fill", value: String(format: "%.0f%%", progress.accuracy), label: "Accuracy", color: StormColors.neonGreen)
            Divider().frame(height: 30).background(Color.white.opacity(0.2))
            statItem(icon: "star.fill", value: "\(progress.totalXP)", label: "XP", color: StormColors.neonYellow)
        }
        .padding(.vertical, 12)
        .glassCard()
    }
    
    private func statItem(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: Storm.isIPad ? 6 : 4) {
            Image(systemName: icon)
                .font(Storm.isIPad ? .body : .caption)
                .foregroundColor(color)
            Text(value)
                .font(Storm.isIPad ? .headline.bold() : .subheadline.bold())
                .foregroundColor(.white)
            Text(label)
                .font(Storm.isIPad ? .caption : .caption2)
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Quick Actions
    
    private var quickActions: some View {
        VStack(spacing: 12) {
            // Main Play Button
            Button(action: { showGradeSelection = true }) {
                HStack {
                    Image(systemName: "play.fill")
                        .font(.title2)
                    Text("PLAY NOW")
                        .font(.title3.bold())
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(StormColors.heroGradient)
                .cornerRadius(20)
                .neonGlow(StormColors.neonBlue, radius: 10)
            }
            .pulsing()
            
            // Secondary buttons
            HStack(spacing: 12) {
                quickActionButton(title: "Random", icon: "shuffle", gradient: StormColors.fireGradient) {
                    showGradeSelection = true
                }
                
                quickActionButton(title: "Daily", icon: "calendar", gradient: StormColors.successGradient) {
                    showDailyChallenge = true
                }
                
                quickActionButton(title: "Trending", icon: "chart.line.uptrend.xyaxis", gradient: StormColors.goldGradient) {
                    showGradeSelection = true
                }
            }
        }
        .opacity(buttonsOpacity)
    }
    
    private func quickActionButton(title: String, icon: String, gradient: LinearGradient, action: @escaping () -> Void) -> some View {
        Button(action: {
            SoundManager.shared.playButtonTap()
            action()
        }) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title3)
                Text(title)
                    .font(.caption.bold())
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(gradient.opacity(0.8))
            .cornerRadius(16)
        }
    }
    
    // MARK: - Featured Games
    
    private var featuredGamesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(StormColors.neonYellow)
                Text("FEATURED")
                    .font(.headline.bold())
                    .foregroundColor(.white)
                    .tracking(2)
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(GameCatalog.featuredGames()) { game in
                        NavigationLink(destination: GameDetailView(game: game)) {
                            EnhancedFeaturedCard(game: game)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
    
    // MARK: - Categories
    
    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "square.grid.2x2.fill")
                    .foregroundColor(StormColors.neonPurple)
                Text("GAME MODES")
                    .font(.headline.bold())
                    .foregroundColor(.white)
                    .tracking(2)
            }
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: Storm.isIPad ? 3 : 2), spacing: 14) {
                ForEach(GameCategory.allCases) { category in
                    NavigationLink(destination: GameBrowserView(category: category)) {
                        CategoryCard(category: category)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
    
    // MARK: - Daily Challenge
    
    private var dailyChallengeCard: some View {
        Button(action: { showDailyChallenge = true }) {
            HStack(spacing: 16) {
                VStack(spacing: 4) {
                    Text("🏆")
                        .font(.system(size: 40))
                    Text("DAILY")
                        .font(.caption2.bold())
                        .foregroundColor(StormColors.neonYellow)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Daily Challenge")
                        .font(.headline.bold())
                        .foregroundColor(.white)
                    Text("Complete today's challenge for bonus XP and coins!")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(2)
                }
                
                Spacer()
                
                if progress.dailyChallengeCompleted {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title)
                        .foregroundColor(StormColors.neonGreen)
                } else {
                    Image(systemName: "chevron.right.circle.fill")
                        .font(.title)
                        .foregroundColor(StormColors.neonYellow)
                }
            }
            .padding(16)
            .background(
                LinearGradient(
                    colors: [StormColors.neonYellow.opacity(0.2), StormColors.neonOrange.opacity(0.1)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .glassCard()
        }
    }
}

// MARK: - Featured Game Card

struct FeaturedGameCard: View {
    let game: GameInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Emoji icon
            Text(game.iconEmoji)
                .font(.system(size: 44))
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 12)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(game.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(game.description)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(2)
            }
            .padding(.horizontal, 12)
            
            Spacer()
            
            // Tags
            HStack {
                if game.isFeatured {
                    StormBadge(text: "HOT", color: StormColors.neonRed)
                }
                StormBadge(text: game.category.displayName, color: game.category.gradientColors.first ?? .blue)
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .frame(width: Storm.isIPad ? 240 : 180, height: Storm.isIPad ? 280 : 220)
        .background(
            LinearGradient(
                colors: game.category.gradientColors.map { $0.opacity(0.3) },
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .glassCard()
    }
}

// MARK: - Category Card

struct CategoryCard: View {
    let category: GameCategory
    
    var body: some View {
        VStack(spacing: Storm.isIPad ? 14 : 10) {
            Image(systemName: category.iconName)
                .font(Storm.isIPad ? .largeTitle : .title)
                .foregroundColor(.white)
                .frame(width: Storm.isIPad ? 72 : 56, height: Storm.isIPad ? 72 : 56)
                .background(
                    LinearGradient(colors: category.gradientColors, startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .cornerRadius(16)
            
            Text(category.displayName)
                .font(Storm.isIPad ? .headline.bold() : .subheadline.bold())
                .foregroundColor(.white)
            
            Text("\(GameCatalog.games(for: category).count) games")
                .font(Storm.isIPad ? .subheadline : .caption2)
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .glassCard()
    }
}

#Preview {
    HomeView()
}
