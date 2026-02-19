import SwiftUI
import Combine

// ═══════════════════════════════════════════════════════════════
// BATTLE PASS / SEASON PASS SYSTEM
//
// This is the #1 monetization strategy beyond ads for gaming apps.
// Players earn free rewards by playing. Premium pass holders get
// bonus rewards at each tier. This drives daily engagement AND revenue.
//
// Season duration: 30 days
// Tiers: 30 (1 per day if playing daily)
// XP per tier: 200 (earned from games, challenges, daily login)
//
// Revenue model:
// - Free tier: Basic rewards (coins, power-ups)
// - Premium tier ($4.99/season): Bonus rewards (cosmetics, themes, avatars, 2x coins)
// ═══════════════════════════════════════════════════════════════

class BattlePassManager: ObservableObject {
    static let shared = BattlePassManager()
    
    // MARK: - Season Configuration
    
    @Published var currentSeason: Season
    @Published var currentTier: Int {
        didSet { UserDefaults.standard.set(currentTier, forKey: "bp_currentTier") }
    }
    @Published var currentXP: Int {
        didSet { UserDefaults.standard.set(currentXP, forKey: "bp_currentXP") }
    }
    @Published var isPremium: Bool {
        didSet { UserDefaults.standard.set(isPremium, forKey: "bp_isPremium") }
    }
    @Published var claimedFreeRewards: Set<Int> {
        didSet { UserDefaults.standard.set(Array(claimedFreeRewards), forKey: "bp_claimedFree") }
    }
    @Published var claimedPremiumRewards: Set<Int> {
        didSet { UserDefaults.standard.set(Array(claimedPremiumRewards), forKey: "bp_claimedPremium") }
    }
    @Published var dailyXPEarned: Int {
        didSet { UserDefaults.standard.set(dailyXPEarned, forKey: "bp_dailyXP") }
    }
    @Published var lastDailyReset: Date? {
        didSet { UserDefaults.standard.set(lastDailyReset, forKey: "bp_lastReset") }
    }
    
    static let xpPerTier = 200
    static let maxTier = 30
    static let dailyXPCap = 600
    
    private init() {
        let ud = UserDefaults.standard
        currentTier = ud.integer(forKey: "bp_currentTier")
        currentXP = ud.integer(forKey: "bp_currentXP")
        isPremium = ud.bool(forKey: "bp_isPremium")
        claimedFreeRewards = Set(ud.array(forKey: "bp_claimedFree") as? [Int] ?? [])
        claimedPremiumRewards = Set(ud.array(forKey: "bp_claimedPremium") as? [Int] ?? [])
        dailyXPEarned = ud.integer(forKey: "bp_dailyXP")
        lastDailyReset = ud.object(forKey: "bp_lastReset") as? Date
        
        currentSeason = Season.current
        checkDailyReset()
        checkSeasonReset()
    }
    
    // MARK: - XP System
    
    func addXP(_ amount: Int, source: XPSource) {
        checkDailyReset()
        
        let cappedAmount = min(amount, Self.dailyXPCap - dailyXPEarned)
        guard cappedAmount > 0 else { return }
        
        let xpToAdd = isPremium ? Int(Double(cappedAmount) * 1.5) : cappedAmount
        dailyXPEarned += cappedAmount
        currentXP += xpToAdd
        
        while currentXP >= Self.xpPerTier && currentTier < Self.maxTier {
            currentXP -= Self.xpPerTier
            currentTier += 1
        }
        
        if currentTier >= Self.maxTier {
            currentXP = 0
        }
    }
    
    func claimFreeReward(tier: Int) -> BattlePassReward? {
        guard tier <= currentTier,
              !claimedFreeRewards.contains(tier),
              let reward = currentSeason.freeRewards[tier] else { return nil }
        
        claimedFreeRewards.insert(tier)
        deliverReward(reward)
        return reward
    }
    
    func claimPremiumReward(tier: Int) -> BattlePassReward? {
        guard isPremium,
              tier <= currentTier,
              !claimedPremiumRewards.contains(tier),
              let reward = currentSeason.premiumRewards[tier] else { return nil }
        
        claimedPremiumRewards.insert(tier)
        deliverReward(reward)
        return reward
    }
    
    private func deliverReward(_ reward: BattlePassReward) {
        switch reward.type {
        case .coins:
            PlayerProgress.shared.addCoins(reward.amount)
        case .xp:
            PlayerProgress.shared.addXP(reward.amount)
        case .powerUp:
            PlayerProgress.shared.addPowerUp(reward.itemId ?? "slowTime", count: reward.amount)
        case .cosmetic:
            CosmeticsManager.shared.unlock(reward.itemId ?? "")
        case .avatar:
            CosmeticsManager.shared.unlockAvatar(reward.itemId ?? "")
        case .theme:
            CosmeticsManager.shared.unlockTheme(reward.itemId ?? "")
        case .title:
            CosmeticsManager.shared.unlockTitle(reward.itemId ?? "")
        case .emote:
            CosmeticsManager.shared.unlockEmote(reward.itemId ?? "")
        }
    }
    
    private func checkDailyReset() {
        if let last = lastDailyReset, !Calendar.current.isDateInToday(last) {
            dailyXPEarned = 0
        }
        lastDailyReset = Date()
    }
    
    private func checkSeasonReset() {
        let currentSeasonId = Season.current.id
        let savedSeasonId = UserDefaults.standard.string(forKey: "bp_seasonId") ?? ""
        
        if currentSeasonId != savedSeasonId {
            currentTier = 0
            currentXP = 0
            claimedFreeRewards = []
            claimedPremiumRewards = []
            isPremium = false
            currentSeason = Season.current
            UserDefaults.standard.set(currentSeasonId, forKey: "bp_seasonId")
        }
    }
    
    // MARK: - Computed Properties
    
    var xpProgress: Double {
        guard currentTier < Self.maxTier else { return 1.0 }
        return Double(currentXP) / Double(Self.xpPerTier)
    }
    
    var daysRemaining: Int {
        let calendar = Calendar.current
        let endOfMonth = calendar.date(byAdding: .month, value: 1, to: currentSeason.startDate) ?? Date()
        return max(0, calendar.dateComponents([.day], from: Date(), to: endOfMonth).day ?? 0)
    }
    
    var unclaimedFreeCount: Int {
        guard currentTier >= 1 else { return 0 }
        return (1...min(currentTier, Self.maxTier)).filter { tier in
            !claimedFreeRewards.contains(tier) && currentSeason.freeRewards[tier] != nil
        }.count
    }
    
    var unclaimedPremiumCount: Int {
        guard isPremium, currentTier >= 1 else { return 0 }
        return (1...min(currentTier, Self.maxTier)).filter { tier in
            !claimedPremiumRewards.contains(tier) && currentSeason.premiumRewards[tier] != nil
        }.count
    }
}

// MARK: - Data Models

enum XPSource {
    case gameCompleted
    case questionCorrect
    case dailyLogin
    case dailyChallenge
    case knowledgeGate
    case bossGate
    case multiplayerWin
    case streak
    
    var xpAmount: Int {
        switch self {
        case .gameCompleted: return 30
        case .questionCorrect: return 5
        case .dailyLogin: return 50
        case .dailyChallenge: return 100
        case .knowledgeGate: return 25
        case .bossGate: return 75
        case .multiplayerWin: return 60
        case .streak: return 40
        }
    }
}

struct BattlePassReward: Identifiable {
    let id = UUID()
    let type: RewardType
    let name: String
    let description: String
    let amount: Int
    let itemId: String?
    let iconName: String
    let rarity: Rarity
    
    enum RewardType {
        case coins, xp, powerUp, cosmetic, avatar, theme, title, emote
    }
    
    enum Rarity: String {
        case common = "Common"
        case rare = "Rare"
        case epic = "Epic"
        case legendary = "Legendary"
        
        var color: Color {
            switch self {
            case .common: return .gray
            case .rare: return StormColors.neonBlue
            case .epic: return StormColors.neonPurple
            case .legendary: return StormColors.neonYellow
            }
        }
        
        var gradient: LinearGradient {
            switch self {
            case .common: return LinearGradient(colors: [.gray, .gray.opacity(0.6)], startPoint: .top, endPoint: .bottom)
            case .rare: return StormColors.heroGradient
            case .epic: return LinearGradient(colors: [StormColors.neonPurple, StormColors.neonPink], startPoint: .top, endPoint: .bottom)
            case .legendary: return StormColors.goldGradient
            }
        }
    }
}

struct Season: Identifiable {
    let id: String
    let name: String
    let subtitle: String
    let startDate: Date
    let iconEmoji: String
    let freeRewards: [Int: BattlePassReward]
    let premiumRewards: [Int: BattlePassReward]
    
    static var current: Season {
        let calendar = Calendar.current
        let now = Date()
        let month = calendar.component(.month, from: now)
        let year = calendar.component(.year, from: now)
        let startDate = calendar.date(from: DateComponents(year: year, month: month, day: 1)) ?? now
        
        let seasonNames = [
            (1, "Arctic Blizzard", "Freeze the competition", "❄️"),
            (2, "Neon Storm", "Light up the leaderboard", "⚡"),
            (3, "Spring Surge", "Fresh knowledge blooms", "🌸"),
            (4, "Pixel Pioneers", "8-bit brain power", "👾"),
            (5, "Solar Flare", "Burn through challenges", "☀️"),
            (6, "Ocean Depths", "Dive into learning", "🌊"),
            (7, "Galactic Quest", "Explore the cosmos of knowledge", "🚀"),
            (8, "Thunder Crown", "Rule the Storm", "👑"),
            (9, "Cyber Circuit", "Code your victory", "🤖"),
            (10, "Phantom Night", "Master the shadows", "🎃"),
            (11, "Crystal Peak", "Reach new heights", "💎"),
            (12, "Inferno Finals", "End the year on fire", "🔥")
        ]
        
        let info = seasonNames.first(where: { $0.0 == month }) ?? (1, "Storm Season", "Rise up", "⚡")
        
        return Season(
            id: "\(year)-\(month)",
            name: info.1,
            subtitle: info.2,
            startDate: startDate,
            iconEmoji: info.3,
            freeRewards: generateFreeRewards(),
            premiumRewards: generatePremiumRewards()
        )
    }
    
    private static func generateFreeRewards() -> [Int: BattlePassReward] {
        var rewards: [Int: BattlePassReward] = [:]
        
        for tier in 1...30 {
            switch tier {
            case 1:
                rewards[tier] = BattlePassReward(type: .coins, name: "Welcome Coins", description: "Start your season strong", amount: 50, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .common)
            case 3:
                rewards[tier] = BattlePassReward(type: .powerUp, name: "Slow Time x2", description: "Slow down timed challenges", amount: 2, itemId: "slowTime", iconName: "clock.fill", rarity: .common)
            case 5:
                rewards[tier] = BattlePassReward(type: .coins, name: "100 Coins", description: "Keep grinding!", amount: 100, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .common)
            case 7:
                rewards[tier] = BattlePassReward(type: .powerUp, name: "Extra Life x2", description: "Stay in the game", amount: 2, itemId: "extraLife", iconName: "heart.fill", rarity: .rare)
            case 10:
                rewards[tier] = BattlePassReward(type: .coins, name: "250 Coins", description: "Tier 10 milestone!", amount: 250, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .rare)
            case 13:
                rewards[tier] = BattlePassReward(type: .powerUp, name: "Hint Shield x3", description: "Get hints on tough questions", amount: 3, itemId: "hintShield", iconName: "shield.fill", rarity: .common)
            case 15:
                rewards[tier] = BattlePassReward(type: .coins, name: "300 Coins", description: "Halfway there!", amount: 300, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .rare)
            case 18:
                rewards[tier] = BattlePassReward(type: .powerUp, name: "Double Points x2", description: "2x scoring!", amount: 2, itemId: "doublePoints", iconName: "star.fill", rarity: .rare)
            case 20:
                rewards[tier] = BattlePassReward(type: .coins, name: "500 Coins", description: "Tier 20 milestone!", amount: 500, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .epic)
            case 23:
                rewards[tier] = BattlePassReward(type: .powerUp, name: "Skip Question x2", description: "Skip the hardest questions", amount: 2, itemId: "skipQuestion", iconName: "forward.fill", rarity: .rare)
            case 25:
                rewards[tier] = BattlePassReward(type: .coins, name: "750 Coins", description: "Almost there!", amount: 750, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .epic)
            case 28:
                rewards[tier] = BattlePassReward(type: .powerUp, name: "Mega Pack", description: "3 of every power-up!", amount: 3, itemId: "slowTime", iconName: "cube.fill", rarity: .epic)
            case 30:
                rewards[tier] = BattlePassReward(type: .coins, name: "1000 Coins", description: "Season complete!", amount: 1000, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .legendary)
            default:
                break
            }
        }
        
        return rewards
    }
    
    private static func generatePremiumRewards() -> [Int: BattlePassReward] {
        var rewards: [Int: BattlePassReward] = [:]
        
        for tier in 1...30 {
            switch tier {
            case 1:
                rewards[tier] = BattlePassReward(type: .avatar, name: "Storm Recruit", description: "Premium avatar", amount: 1, itemId: "avatar_recruit", iconName: "person.crop.circle.fill", rarity: .rare)
            case 2:
                rewards[tier] = BattlePassReward(type: .coins, name: "200 Bonus Coins", description: "Premium bonus", amount: 200, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .common)
            case 4:
                rewards[tier] = BattlePassReward(type: .emote, name: "Lightning Strike", description: "Celebration emote", amount: 1, itemId: "emote_lightning", iconName: "bolt.fill", rarity: .rare)
            case 6:
                rewards[tier] = BattlePassReward(type: .theme, name: "Neon Grid", description: "Game theme", amount: 1, itemId: "theme_neon_grid", iconName: "square.grid.3x3.fill", rarity: .rare)
            case 8:
                rewards[tier] = BattlePassReward(type: .coins, name: "400 Bonus Coins", description: "Premium bonus", amount: 400, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .rare)
            case 10:
                rewards[tier] = BattlePassReward(type: .avatar, name: "Storm Warrior", description: "Epic avatar", amount: 1, itemId: "avatar_warrior", iconName: "person.crop.circle.fill", rarity: .epic)
            case 12:
                rewards[tier] = BattlePassReward(type: .title, name: "Brain Blaster", description: "Player title", amount: 1, itemId: "title_brain_blaster", iconName: "textformat", rarity: .rare)
            case 14:
                rewards[tier] = BattlePassReward(type: .emote, name: "Victory Dance", description: "Win celebration", amount: 1, itemId: "emote_victory", iconName: "figure.dance", rarity: .rare)
            case 16:
                rewards[tier] = BattlePassReward(type: .theme, name: "Cosmic Void", description: "Dark space theme", amount: 1, itemId: "theme_cosmic", iconName: "sparkles", rarity: .epic)
            case 18:
                rewards[tier] = BattlePassReward(type: .coins, name: "600 Bonus Coins", description: "Premium bonus", amount: 600, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .rare)
            case 20:
                rewards[tier] = BattlePassReward(type: .avatar, name: "Storm Commander", description: "Legendary avatar", amount: 1, itemId: "avatar_commander", iconName: "person.crop.circle.fill", rarity: .legendary)
            case 22:
                rewards[tier] = BattlePassReward(type: .title, name: "Math Destroyer", description: "Player title", amount: 1, itemId: "title_math_destroyer", iconName: "textformat", rarity: .epic)
            case 24:
                rewards[tier] = BattlePassReward(type: .emote, name: "Storm Surge", description: "Powerful emote", amount: 1, itemId: "emote_surge", iconName: "tornado", rarity: .epic)
            case 26:
                rewards[tier] = BattlePassReward(type: .theme, name: "Inferno Core", description: "Fire theme", amount: 1, itemId: "theme_inferno", iconName: "flame.fill", rarity: .epic)
            case 28:
                rewards[tier] = BattlePassReward(type: .coins, name: "1000 Bonus Coins", description: "Premium bonus", amount: 1000, itemId: nil, iconName: "bitcoinsign.circle.fill", rarity: .epic)
            case 30:
                rewards[tier] = BattlePassReward(type: .avatar, name: "Storm Legend", description: "Ultimate avatar — Season exclusive", amount: 1, itemId: "avatar_legend", iconName: "crown.fill", rarity: .legendary)
            default:
                break
            }
        }
        
        return rewards
    }
}

// ═══════════════════════════════════════════════════════════════
// COSMETICS MANAGER
// Tracks unlocked avatars, themes, titles, emotes
// ═══════════════════════════════════════════════════════════════

class CosmeticsManager: ObservableObject {
    static let shared = CosmeticsManager()
    
    @Published var unlockedAvatars: Set<String> {
        didSet { UserDefaults.standard.set(Array(unlockedAvatars), forKey: "cos_avatars") }
    }
    @Published var unlockedThemes: Set<String> {
        didSet { UserDefaults.standard.set(Array(unlockedThemes), forKey: "cos_themes") }
    }
    @Published var unlockedTitles: Set<String> {
        didSet { UserDefaults.standard.set(Array(unlockedTitles), forKey: "cos_titles") }
    }
    @Published var unlockedEmotes: Set<String> {
        didSet { UserDefaults.standard.set(Array(unlockedEmotes), forKey: "cos_emotes") }
    }
    @Published var unlockedItems: Set<String> {
        didSet { UserDefaults.standard.set(Array(unlockedItems), forKey: "cos_items") }
    }
    @Published var selectedAvatar: String {
        didSet { UserDefaults.standard.set(selectedAvatar, forKey: "cos_selectedAvatar") }
    }
    @Published var selectedTheme: String {
        didSet { UserDefaults.standard.set(selectedTheme, forKey: "cos_selectedTheme") }
    }
    @Published var selectedTitle: String {
        didSet { UserDefaults.standard.set(selectedTitle, forKey: "cos_selectedTitle") }
    }
    
    private init() {
        let ud = UserDefaults.standard
        unlockedAvatars = Set(ud.stringArray(forKey: "cos_avatars") ?? ["avatar_default"])
        unlockedThemes = Set(ud.stringArray(forKey: "cos_themes") ?? ["theme_default"])
        unlockedTitles = Set(ud.stringArray(forKey: "cos_titles") ?? ["title_rookie"])
        unlockedEmotes = Set(ud.stringArray(forKey: "cos_emotes") ?? [])
        unlockedItems = Set(ud.stringArray(forKey: "cos_items") ?? [])
        selectedAvatar = ud.string(forKey: "cos_selectedAvatar") ?? "avatar_default"
        selectedTheme = ud.string(forKey: "cos_selectedTheme") ?? "theme_default"
        selectedTitle = ud.string(forKey: "cos_selectedTitle") ?? "title_rookie"
    }
    
    func unlock(_ itemId: String) {
        unlockedItems.insert(itemId)
    }
    
    func unlockAvatar(_ id: String) {
        unlockedAvatars.insert(id)
    }
    
    func unlockTheme(_ id: String) {
        unlockedThemes.insert(id)
    }
    
    func unlockTitle(_ id: String) {
        unlockedTitles.insert(id)
    }
    
    func unlockEmote(_ id: String) {
        unlockedEmotes.insert(id)
    }
}

// ═══════════════════════════════════════════════════════════════
// AVATAR DEFINITIONS
// ═══════════════════════════════════════════════════════════════

struct AvatarInfo: Identifiable {
    let id: String
    let name: String
    let emoji: String
    let rarity: BattlePassReward.Rarity
    
    static let all: [AvatarInfo] = [
        AvatarInfo(id: "avatar_default", name: "Storm Rookie", emoji: "🧑‍🎓", rarity: .common),
        AvatarInfo(id: "avatar_recruit", name: "Storm Recruit", emoji: "⚡", rarity: .rare),
        AvatarInfo(id: "avatar_warrior", name: "Storm Warrior", emoji: "🦸", rarity: .epic),
        AvatarInfo(id: "avatar_commander", name: "Storm Commander", emoji: "🎖️", rarity: .legendary),
        AvatarInfo(id: "avatar_legend", name: "Storm Legend", emoji: "👑", rarity: .legendary),
        AvatarInfo(id: "avatar_ninja", name: "Math Ninja", emoji: "🥷", rarity: .epic),
        AvatarInfo(id: "avatar_wizard", name: "Word Wizard", emoji: "🧙", rarity: .epic),
        AvatarInfo(id: "avatar_robot", name: "Logic Bot", emoji: "🤖", rarity: .rare),
        AvatarInfo(id: "avatar_dragon", name: "Storm Dragon", emoji: "🐲", rarity: .legendary),
        AvatarInfo(id: "avatar_astronaut", name: "Space Scholar", emoji: "👨‍🚀", rarity: .epic),
        AvatarInfo(id: "avatar_pirate", name: "Knowledge Pirate", emoji: "🏴‍☠️", rarity: .rare),
        AvatarInfo(id: "avatar_alien", name: "Brain Alien", emoji: "👽", rarity: .rare),
    ]
}

struct TitleInfo: Identifiable {
    let id: String
    let name: String
    let rarity: BattlePassReward.Rarity
    
    static let all: [TitleInfo] = [
        TitleInfo(id: "title_rookie", name: "Rookie", rarity: .common),
        TitleInfo(id: "title_brain_blaster", name: "Brain Blaster", rarity: .rare),
        TitleInfo(id: "title_math_destroyer", name: "Math Destroyer", rarity: .epic),
        TitleInfo(id: "title_storm_master", name: "Storm Master", rarity: .legendary),
        TitleInfo(id: "title_quiz_king", name: "Quiz King", rarity: .epic),
        TitleInfo(id: "title_speed_demon", name: "Speed Demon", rarity: .rare),
        TitleInfo(id: "title_genius", name: "Certified Genius", rarity: .legendary),
        TitleInfo(id: "title_scholar", name: "Scholar", rarity: .common),
    ]
}
