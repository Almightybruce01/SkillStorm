import SwiftUI

// ═══════════════════════════════════════════════════════════════
// BATTLE PASS VIEW — Season Pass UI
// Shows tiers, rewards, progress, and purchase option
// ═══════════════════════════════════════════════════════════════

struct BattlePassView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var battlePass = BattlePassManager.shared
    @ObservedObject var cosmetics = CosmeticsManager.shared
    @State private var selectedTier: Int? = nil
    @State private var showPurchaseConfirm = false
    @State private var showClaimAnimation = false
    @State private var claimedRewardName = ""
    @State private var scrollOffset: CGFloat = 0
    
    var body: some View {
        NavigationStack {
            ZStack {
                seasonBackground
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        seasonHeader
                            .padding(.bottom, 16)
                        
                        xpProgressBar
                            .padding(.horizontal, 20)
                            .padding(.bottom, 20)
                        
                        statsRow
                            .padding(.horizontal, 20)
                            .padding(.bottom, 24)
                        
                        if !battlePass.isPremium {
                            premiumUpgradeCard
                                .padding(.horizontal, 20)
                                .padding(.bottom, 24)
                        }
                        
                        tierList
                            .padding(.horizontal, 16)
                        
                        Color.clear.frame(height: 40)
                    }
                }
                
                if showClaimAnimation {
                    claimOverlay
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                ToolbarItem(placement: .principal) {
                    Text("SEASON PASS")
                        .font(.headline.bold())
                        .foregroundColor(.white)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    // MARK: - Season Background
    
    private var seasonBackground: some View {
        ZStack {
            StormColors.background.ignoresSafeArea()
            
            GeometryReader { geo in
                ForEach(0..<8, id: \.self) { i in
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [seasonAccentColor.opacity(0.2), .clear],
                                center: .center,
                                startRadius: 0,
                                endRadius: 100
                            )
                        )
                        .frame(width: 200, height: 200)
                        .position(
                            x: CGFloat.random(in: 0...geo.size.width),
                            y: CGFloat.random(in: 0...geo.size.height)
                        )
                }
            }
        }
    }
    
    private var seasonAccentColor: Color {
        let month = Calendar.current.component(.month, from: Date())
        switch month {
        case 1, 2: return StormColors.neonCyan
        case 3, 4: return StormColors.neonGreen
        case 5, 6: return StormColors.neonYellow
        case 7, 8: return StormColors.neonOrange
        case 9, 10: return StormColors.neonPurple
        case 11, 12: return StormColors.neonRed
        default: return StormColors.neonBlue
        }
    }
    
    // MARK: - Season Header
    
    private var seasonHeader: some View {
        VStack(spacing: 8) {
            Text(battlePass.currentSeason.iconEmoji)
                .font(.system(size: 60))
                .floating()
            
            Text(battlePass.currentSeason.name.uppercased())
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(
                    LinearGradient(colors: [seasonAccentColor, seasonAccentColor.opacity(0.6)],
                                   startPoint: .leading, endPoint: .trailing)
                )
            
            Text(battlePass.currentSeason.subtitle)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
            
            if battlePass.isPremium {
                HStack(spacing: 6) {
                    Image(systemName: "crown.fill")
                        .foregroundColor(StormColors.neonYellow)
                    Text("PREMIUM ACTIVE")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonYellow)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(StormColors.neonYellow.opacity(0.15))
                .cornerRadius(10)
            }
        }
        .padding(.top, 20)
    }
    
    // MARK: - XP Progress
    
    private var xpProgressBar: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Tier \(battlePass.currentTier)")
                    .font(.headline.bold())
                    .foregroundColor(.white)
                
                Spacer()
                
                if battlePass.currentTier < BattlePassManager.maxTier {
                    Text("Tier \(battlePass.currentTier + 1)")
                        .font(.headline.bold())
                        .foregroundColor(.white.opacity(0.5))
                } else {
                    Text("MAX")
                        .font(.headline.bold())
                        .foregroundColor(StormColors.neonYellow)
                }
            }
            
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(StormColors.surface)
                        .frame(height: 12)
                    
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [seasonAccentColor, seasonAccentColor.opacity(0.6)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * battlePass.xpProgress, height: 12)
                        .animation(.spring(response: 0.5), value: battlePass.xpProgress)
                }
            }
            .frame(height: 12)
            
            HStack {
                Text("\(battlePass.currentXP) / \(BattlePassManager.xpPerTier) XP")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                
                Spacer()
                
                Text("Daily: \(battlePass.dailyXPEarned)/\(BattlePassManager.dailyXPCap)")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
            }
        }
    }
    
    // MARK: - Stats Row
    
    private var statsRow: some View {
        HStack(spacing: 12) {
            statCard(value: "\(battlePass.currentTier)/\(BattlePassManager.maxTier)", label: "Tier", icon: "trophy.fill", color: StormColors.neonYellow)
            statCard(value: "\(battlePass.daysRemaining)", label: "Days Left", icon: "calendar", color: StormColors.neonBlue)
            statCard(value: "\(battlePass.unclaimedFreeCount + battlePass.unclaimedPremiumCount)", label: "Unclaimed", icon: "gift.fill", color: StormColors.neonGreen)
        }
    }
    
    private func statCard(value: String, label: String, icon: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            Text(value)
                .font(.title3.bold())
                .foregroundColor(.white)
            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(StormColors.surface.opacity(0.5))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }
    
    // MARK: - Premium Upgrade Card
    
    private var premiumUpgradeCard: some View {
        Button(action: { showPurchaseConfirm = true }) {
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: "crown.fill")
                                .foregroundColor(StormColors.neonYellow)
                            Text("UPGRADE TO PREMIUM")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                        }
                        
                        Text("Unlock exclusive avatars, themes, titles & 1.5x XP boost")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    Spacer()
                    
                    Text("$4.99")
                        .font(.title2.bold())
                        .foregroundColor(StormColors.neonYellow)
                }
                
                HStack(spacing: 16) {
                    premiumPerk(icon: "person.crop.circle.fill", text: "Avatars")
                    premiumPerk(icon: "paintpalette.fill", text: "Themes")
                    premiumPerk(icon: "textformat", text: "Titles")
                    premiumPerk(icon: "bolt.fill", text: "1.5x XP")
                }
            }
            .padding(16)
            .background(
                LinearGradient(
                    colors: [StormColors.neonYellow.opacity(0.15), StormColors.neonOrange.opacity(0.1)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(StormColors.neonYellow.opacity(0.3), lineWidth: 1)
            )
        }
        .alert("Upgrade to Premium Pass", isPresented: $showPurchaseConfirm) {
            Button("Buy for $4.99") {
                battlePass.isPremium = true
                PlayerProgress.shared.hasSeasonPass = true
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Unlock exclusive rewards, 1.5x XP boost, and cosmetic items for this season!")
        }
    }
    
    private func premiumPerk(icon: String, text: String) -> some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundColor(StormColors.neonYellow)
            Text(text)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Tier List
    
    private var tierList: some View {
        VStack(spacing: 0) {
            ForEach(1...BattlePassManager.maxTier, id: \.self) { tier in
                tierRow(tier: tier)
            }
        }
    }
    
    private func tierRow(tier: Int) -> some View {
        let isUnlocked = tier <= battlePass.currentTier
        let freeReward = battlePass.currentSeason.freeRewards[tier]
        let premiumReward = battlePass.currentSeason.premiumRewards[tier]
        let freeClaimed = battlePass.claimedFreeRewards.contains(tier)
        let premiumClaimed = battlePass.claimedPremiumRewards.contains(tier)
        
        return HStack(spacing: 0) {
            // Tier number
            ZStack {
                Circle()
                    .fill(isUnlocked ? seasonAccentColor : StormColors.surface)
                    .frame(width: 36, height: 36)
                
                Text("\(tier)")
                    .font(.caption.bold())
                    .foregroundColor(isUnlocked ? .white : .white.opacity(0.4))
            }
            .frame(width: 50)
            
            // Free reward
            if let reward = freeReward {
                rewardCell(reward: reward, isUnlocked: isUnlocked, isClaimed: freeClaimed, isPremiumReward: false) {
                    if let claimed = battlePass.claimFreeReward(tier: tier) {
                        showRewardClaim(claimed.name)
                    }
                }
            } else {
                Color.clear.frame(maxWidth: .infinity, minHeight: 60)
            }
            
            // Divider
            Rectangle()
                .fill(isUnlocked ? seasonAccentColor.opacity(0.3) : Color.white.opacity(0.05))
                .frame(width: 2, height: 60)
            
            // Premium reward
            if let reward = premiumReward {
                rewardCell(reward: reward, isUnlocked: isUnlocked && battlePass.isPremium, isClaimed: premiumClaimed, isPremiumReward: true) {
                    if let claimed = battlePass.claimPremiumReward(tier: tier) {
                        showRewardClaim(claimed.name)
                    }
                }
            } else {
                Color.clear.frame(maxWidth: .infinity, minHeight: 60)
            }
        }
        .padding(.vertical, 4)
        .opacity(isUnlocked ? 1.0 : 0.5)
    }
    
    private func rewardCell(reward: BattlePassReward, isUnlocked: Bool, isClaimed: Bool, isPremiumReward: Bool, onClaim: @escaping () -> Void) -> some View {
        Button(action: {
            guard isUnlocked && !isClaimed else { return }
            SoundManager.shared.playCorrect()
            onClaim()
        }) {
            HStack(spacing: 8) {
                Image(systemName: reward.iconName)
                    .font(.title3)
                    .foregroundColor(isClaimed ? .gray : reward.rarity.color)
                    .frame(width: 30)
                
                VStack(alignment: .leading, spacing: 1) {
                    Text(reward.name)
                        .font(.caption.bold())
                        .foregroundColor(isClaimed ? .gray : .white)
                        .lineLimit(1)
                    
                    Text(reward.rarity.rawValue)
                        .font(.system(size: 9).bold())
                        .foregroundColor(reward.rarity.color.opacity(isClaimed ? 0.4 : 0.8))
                }
                
                Spacer()
                
                if isClaimed {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.gray)
                        .font(.caption)
                } else if isUnlocked {
                    Text("CLAIM")
                        .font(.system(size: 9).bold())
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(reward.rarity.gradient)
                        .cornerRadius(6)
                } else if isPremiumReward && !battlePass.isPremium {
                    Image(systemName: "lock.fill")
                        .foregroundColor(StormColors.neonYellow.opacity(0.5))
                        .font(.caption)
                } else {
                    Image(systemName: "lock.fill")
                        .foregroundColor(.white.opacity(0.2))
                        .font(.caption)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(
                isPremiumReward
                ? StormColors.neonYellow.opacity(isClaimed ? 0.02 : 0.05)
                : StormColors.surface.opacity(isClaimed ? 0.2 : 0.4)
            )
            .cornerRadius(10)
        }
        .disabled(!isUnlocked || isClaimed)
    }
    
    // MARK: - Claim Overlay
    
    private var claimOverlay: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation { showClaimAnimation = false }
                }
            
            VStack(spacing: 16) {
                Image(systemName: "gift.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(StormColors.goldGradient)
                    .scaleEffect(showClaimAnimation ? 1.2 : 0.5)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: showClaimAnimation)
                
                Text("REWARD CLAIMED!")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(StormColors.goldGradient)
                
                Text(claimedRewardName)
                    .font(.headline)
                    .foregroundColor(.white)
                
                ParticleView(count: 20, color: StormColors.neonYellow)
                    .frame(width: 200, height: 200)
            }
        }
    }
    
    private func showRewardClaim(_ name: String) {
        claimedRewardName = name
        withAnimation(.spring(response: 0.3)) {
            showClaimAnimation = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation { showClaimAnimation = false }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// COSMETICS SHOP VIEW
// Buy cosmetics with in-game coins
// ═══════════════════════════════════════════════════════════════

struct CosmeticsShopView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var cosmetics = CosmeticsManager.shared
    @ObservedObject var progress = PlayerProgress.shared
    @State private var selectedTab = 0
    @State private var showPurchaseAlert = false
    @State private var purchaseItem: AvatarInfo?
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                VStack(spacing: 0) {
                    // Tab selector
                    HStack(spacing: 0) {
                        shopTab("Avatars", icon: "person.crop.circle.fill", index: 0)
                        shopTab("Titles", icon: "textformat", index: 1)
                        shopTab("Themes", icon: "paintpalette.fill", index: 2)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    
                    // Coin balance
                    HStack {
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "bitcoinsign.circle.fill")
                                .foregroundColor(StormColors.neonYellow)
                            Text("\(progress.totalCoins)")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(StormColors.surface)
                        .cornerRadius(10)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                    
                    ScrollView(showsIndicators: false) {
                        switch selectedTab {
                        case 0: avatarGrid
                        case 1: titleGrid
                        case 2: themeGrid
                        default: EmptyView()
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("STORM SHOP")
                        .font(.headline.bold())
                        .foregroundColor(.white)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    private func shopTab(_ title: String, icon: String, index: Int) -> some View {
        Button(action: { withAnimation(.spring(response: 0.3)) { selectedTab = index } }) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.subheadline)
                Text(title)
                    .font(.caption.bold())
            }
            .foregroundColor(selectedTab == index ? .white : .white.opacity(0.4))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(selectedTab == index ? StormColors.neonBlue.opacity(0.3) : Color.clear)
            .cornerRadius(10)
        }
    }
    
    private var avatarGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
            ForEach(AvatarInfo.all) { avatar in
                avatarCard(avatar)
            }
        }
        .padding(16)
    }
    
    private func avatarCard(_ avatar: AvatarInfo) -> some View {
        let isOwned = cosmetics.unlockedAvatars.contains(avatar.id)
        let isSelected = cosmetics.selectedAvatar == avatar.id
        let price = avatarPrice(avatar.rarity)
        
        return Button(action: {
            if isOwned {
                cosmetics.selectedAvatar = avatar.id
                SoundManager.shared.playButtonTap()
            } else if progress.totalCoins >= price {
                purchaseItem = avatar
                showPurchaseAlert = true
            }
        }) {
            VStack(spacing: 6) {
                Text(avatar.emoji)
                    .font(.system(size: 36))
                
                Text(avatar.name)
                    .font(.caption2.bold())
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                if isSelected {
                    Text("EQUIPPED")
                        .font(.system(size: 8).bold())
                        .foregroundColor(StormColors.neonGreen)
                } else if isOwned {
                    Text("OWNED")
                        .font(.system(size: 8).bold())
                        .foregroundColor(.white.opacity(0.5))
                } else {
                    HStack(spacing: 2) {
                        Image(systemName: "bitcoinsign.circle.fill")
                            .font(.system(size: 8))
                            .foregroundColor(StormColors.neonYellow)
                        Text("\(price)")
                            .font(.system(size: 10).bold())
                            .foregroundColor(StormColors.neonYellow)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isSelected ? StormColors.neonBlue.opacity(0.2) : StormColors.surface.opacity(0.5))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? StormColors.neonBlue : avatar.rarity.color.opacity(0.3), lineWidth: isSelected ? 2 : 1)
            )
        }
        .alert("Buy \(purchaseItem?.name ?? "")?", isPresented: $showPurchaseAlert) {
            Button("Buy for \(avatarPrice(purchaseItem?.rarity ?? .common)) coins") {
                if let item = purchaseItem {
                    let price = avatarPrice(item.rarity)
                    if progress.totalCoins >= price {
                        progress.totalCoins -= price
                        cosmetics.unlockAvatar(item.id)
                        cosmetics.selectedAvatar = item.id
                        SoundManager.shared.playLevelUp()
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        }
    }
    
    private func avatarPrice(_ rarity: BattlePassReward.Rarity) -> Int {
        switch rarity {
        case .common: return 100
        case .rare: return 300
        case .epic: return 750
        case .legendary: return 1500
        }
    }
    
    private var titleGrid: some View {
        VStack(spacing: 10) {
            ForEach(TitleInfo.all) { title in
                let isOwned = cosmetics.unlockedTitles.contains(title.id)
                let isSelected = cosmetics.selectedTitle == title.id
                
                Button(action: {
                    if isOwned {
                        cosmetics.selectedTitle = title.id
                        SoundManager.shared.playButtonTap()
                    }
                }) {
                    HStack {
                        Text(title.name)
                            .font(.headline.bold())
                            .foregroundColor(isSelected ? title.rarity.color : .white)
                        
                        Spacer()
                        
                        Text(title.rarity.rawValue)
                            .font(.caption2.bold())
                            .foregroundColor(title.rarity.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(title.rarity.color.opacity(0.15))
                            .cornerRadius(6)
                        
                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(StormColors.neonGreen)
                        } else if !isOwned {
                            Image(systemName: "lock.fill")
                                .foregroundColor(.white.opacity(0.3))
                        }
                    }
                    .padding(14)
                    .background(isSelected ? title.rarity.color.opacity(0.1) : StormColors.surface.opacity(0.5))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? title.rarity.color.opacity(0.5) : Color.white.opacity(0.05), lineWidth: 1)
                    )
                }
                .disabled(!isOwned)
            }
        }
        .padding(16)
    }
    
    private var themeGrid: some View {
        VStack(spacing: 16) {
            Text("Themes change game backgrounds and effects")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
                .padding(.top, 16)
            
            Text("Earn themes from the Season Pass!")
                .font(.subheadline.bold())
                .foregroundColor(StormColors.neonBlue)
            
            VStack(spacing: 10) {
                themeRow(id: "theme_default", name: "Default Storm", color: StormColors.neonBlue, emoji: "⚡")
                themeRow(id: "theme_neon_grid", name: "Neon Grid", color: StormColors.neonCyan, emoji: "🌐")
                themeRow(id: "theme_cosmic", name: "Cosmic Void", color: StormColors.neonPurple, emoji: "🌌")
                themeRow(id: "theme_inferno", name: "Inferno Core", color: StormColors.neonRed, emoji: "🔥")
            }
            .padding(.horizontal, 16)
        }
    }
    
    private func themeRow(id: String, name: String, color: Color, emoji: String) -> some View {
        let isOwned = cosmetics.unlockedThemes.contains(id)
        let isSelected = cosmetics.selectedTheme == id
        
        return Button(action: {
            if isOwned {
                cosmetics.selectedTheme = id
                SoundManager.shared.playButtonTap()
            }
        }) {
            HStack(spacing: 12) {
                Text(emoji)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.headline.bold())
                        .foregroundColor(.white)
                    Text(isOwned ? (isSelected ? "Equipped" : "Tap to equip") : "Season Pass reward")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(StormColors.neonGreen)
                } else if !isOwned {
                    Image(systemName: "lock.fill")
                        .foregroundColor(.white.opacity(0.3))
                }
            }
            .padding(14)
            .background(
                isSelected
                ? color.opacity(0.15)
                : StormColors.surface.opacity(0.5)
            )
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? color.opacity(0.5) : Color.white.opacity(0.05), lineWidth: 1)
            )
        }
        .disabled(!isOwned)
    }
}
