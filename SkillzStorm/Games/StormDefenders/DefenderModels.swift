import SwiftUI
import Combine

// ═══════════════════════════════════════════════════════════════
// STORM DEFENDERS — Tower Defense Data Models
// "Defend Your Brain. Upgrade Your Mind."
// ═══════════════════════════════════════════════════════════════

// MARK: - Defender (Turret) Types

enum DefenderType: String, CaseIterable, Identifiable {
    case brainBlaster      // Basic shooter (peashooter)
    case freezeRay         // Slows zombies (snow pea)
    case mathMine          // Explodes on contact (cherry bomb)
    case wordWall          // Blocks zombies (wall-nut)
    case lightningTower    // Chain damage (lightning reed)
    case healStation       // Heals nearby defenders
    case doubleCannon      // Shoots two projectiles
    case shieldGen         // Protects a whole row
    case vocabVine         // Grabs and holds zombies
    case grammarCannon     // Area-of-effect damage
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .brainBlaster: return "Brain Blaster"
        case .freezeRay: return "Freeze Ray"
        case .mathMine: return "Math Mine"
        case .wordWall: return "Word Wall"
        case .lightningTower: return "Lightning Tower"
        case .healStation: return "Heal Station"
        case .doubleCannon: return "Double Cannon"
        case .shieldGen: return "Shield Generator"
        case .vocabVine: return "Vocab Vine"
        case .grammarCannon: return "Grammar Cannon"
        }
    }
    
    var emoji: String {
        switch self {
        case .brainBlaster: return "🧠"
        case .freezeRay: return "🧊"
        case .mathMine: return "💣"
        case .wordWall: return "🧱"
        case .lightningTower: return "⚡"
        case .healStation: return "💚"
        case .doubleCannon: return "🔫"
        case .shieldGen: return "🛡️"
        case .vocabVine: return "🌿"
        case .grammarCannon: return "💥"
        }
    }
    
    var description: String {
        switch self {
        case .brainBlaster: return "Shoots knowledge bolts at zombies"
        case .freezeRay: return "Slows zombies in its lane"
        case .mathMine: return "Explodes when a zombie steps on it"
        case .wordWall: return "Blocks zombies with high HP"
        case .lightningTower: return "Chains electricity to nearby zombies"
        case .healStation: return "Slowly heals adjacent defenders"
        case .doubleCannon: return "Fires two shots per attack"
        case .shieldGen: return "Creates a shield across the row"
        case .vocabVine: return "Grabs and holds zombies in place"
        case .grammarCannon: return "Deals splash damage to groups"
        }
    }
    
    var baseCost: Int {
        switch self {
        case .brainBlaster: return 1   // Answer 1 question
        case .freezeRay: return 2
        case .mathMine: return 1
        case .wordWall: return 1
        case .lightningTower: return 3
        case .healStation: return 2
        case .doubleCannon: return 3
        case .shieldGen: return 4
        case .vocabVine: return 2
        case .grammarCannon: return 3
        }
    }
    
    var baseHP: Int {
        switch self {
        case .wordWall: return 300
        case .shieldGen: return 200
        case .healStation: return 150
        default: return 100
        }
    }
    
    var baseDamage: Int {
        switch self {
        case .brainBlaster: return 20
        case .freezeRay: return 10
        case .mathMine: return 200
        case .wordWall: return 0
        case .lightningTower: return 30
        case .healStation: return 0
        case .doubleCannon: return 15
        case .shieldGen: return 0
        case .vocabVine: return 5
        case .grammarCannon: return 40
        }
    }
    
    var attackSpeed: Double { // seconds between attacks
        switch self {
        case .brainBlaster: return 1.2
        case .freezeRay: return 1.5
        case .doubleCannon: return 0.8
        case .lightningTower: return 2.0
        case .grammarCannon: return 2.5
        case .vocabVine: return 3.0
        default: return 0
        }
    }
    
    var range: Int { // cells
        switch self {
        case .brainBlaster: return 8
        case .freezeRay: return 6
        case .lightningTower: return 4
        case .doubleCannon: return 7
        case .grammarCannon: return 3
        case .vocabVine: return 2
        default: return 0
        }
    }
    
    var color: Color {
        switch self {
        case .brainBlaster: return Color(red: 0, green: 0.8, blue: 0.4)
        case .freezeRay: return Color(red: 0.3, green: 0.8, blue: 1.0)
        case .mathMine: return Color(red: 1, green: 0.3, blue: 0.2)
        case .wordWall: return Color(red: 0.6, green: 0.5, blue: 0.3)
        case .lightningTower: return Color(red: 1, green: 0.9, blue: 0)
        case .healStation: return Color(red: 0, green: 0.9, blue: 0.3)
        case .doubleCannon: return Color(red: 0.8, green: 0.4, blue: 1)
        case .shieldGen: return Color(red: 0.3, green: 0.5, blue: 1)
        case .vocabVine: return Color(red: 0.2, green: 0.8, blue: 0.2)
        case .grammarCannon: return Color(red: 1, green: 0.5, blue: 0)
        }
    }
    
    // Which defenders are available at start
    static func starterDefenders() -> [DefenderType] {
        [.brainBlaster, .wordWall, .mathMine]
    }
    
    // Unlock order
    static func unlockOrder() -> [DefenderType] {
        [.freezeRay, .doubleCannon, .vocabVine, .healStation, .lightningTower, .grammarCannon, .shieldGen]
    }
}

// MARK: - Placed Defender Instance

class PlacedDefender: Identifiable, ObservableObject {
    let id = UUID()
    let type: DefenderType
    var row: Int
    var col: Int
    @Published var hp: Int
    @Published var level: Int = 1
    @Published var lastAttackTime: Date = .distantPast
    @Published var isAttacking = false
    
    var maxHP: Int { type.baseHP * level }
    var damage: Int { type.baseDamage * level + (level - 1) * 5 }
    var attackInterval: Double { max(0.3, type.attackSpeed - Double(level - 1) * 0.1) }
    var effectiveRange: Int { type.range + (level >= 3 ? 1 : 0) }
    
    init(type: DefenderType, row: Int, col: Int) {
        self.type = type
        self.row = row
        self.col = col
        self.hp = type.baseHP
    }
    
    func upgrade() {
        level += 1
        hp = maxHP
    }
    
    func takeDamage(_ amount: Int) {
        hp = max(0, hp - amount)
    }
    
    var isAlive: Bool { hp > 0 }
    var hpPercent: Double { Double(hp) / Double(maxHP) }
}

// MARK: - Zombie Types

enum ZombieType: CaseIterable {
    case basic
    case armored
    case fast
    case giant
    case healer
    case boss
    
    var displayName: String {
        switch self {
        case .basic: return "Zombie"
        case .armored: return "Armored Zombie"
        case .fast: return "Speed Zombie"
        case .giant: return "Giant Zombie"
        case .healer: return "Healer Zombie"
        case .boss: return "Boss Zombie"
        }
    }
    
    var emoji: String {
        switch self {
        case .basic: return "🧟"
        case .armored: return "🧟‍♂️"
        case .fast: return "💨"
        case .giant: return "👹"
        case .healer: return "🩹"
        case .boss: return "👾"
        }
    }
    
    var baseHP: Int {
        switch self {
        case .basic: return 60
        case .armored: return 150
        case .fast: return 40
        case .giant: return 400
        case .healer: return 80
        case .boss: return 800
        }
    }
    
    var speed: Double { // cells per second
        switch self {
        case .basic: return 0.5
        case .armored: return 0.3
        case .fast: return 1.0
        case .giant: return 0.2
        case .healer: return 0.4
        case .boss: return 0.15
        }
    }
    
    var damage: Int {
        switch self {
        case .basic: return 10
        case .armored: return 15
        case .fast: return 8
        case .giant: return 30
        case .healer: return 5
        case .boss: return 50
        }
    }
    
    var reward: Int { // BrainPower on kill
        switch self {
        case .basic: return 5
        case .armored: return 10
        case .fast: return 8
        case .giant: return 25
        case .healer: return 12
        case .boss: return 100
        }
    }
}

// MARK: - Zombie Instance

class Zombie: Identifiable, ObservableObject {
    let id = UUID()
    let type: ZombieType
    var row: Int
    @Published var colPosition: Double // Fractional column position (0 = left edge)
    @Published var hp: Int
    @Published var maxHP: Int
    @Published var isSlowed = false
    @Published var isHeld = false
    @Published var isDead = false
    
    var speed: Double {
        var s = type.speed
        if isSlowed { s *= 0.4 }
        if isHeld { s = 0 }
        return s
    }
    
    init(type: ZombieType, row: Int, startCol: Double, waveMultiplier: Double = 1.0) {
        self.type = type
        self.row = row
        self.colPosition = startCol
        let scaledHP = Int(Double(type.baseHP) * waveMultiplier)
        self.hp = scaledHP
        self.maxHP = scaledHP
    }
    
    func takeDamage(_ amount: Int) {
        hp = max(0, hp - amount)
        if hp <= 0 { isDead = true }
    }
    
    var hpPercent: Double { Double(hp) / Double(maxHP) }
}

// MARK: - Projectile

struct Projectile: Identifiable {
    let id = UUID()
    var row: Int
    var colPosition: Double
    let damage: Int
    let speed: Double
    let color: Color
    let isFreeze: Bool
    let isSplash: Bool
    let splashRadius: Int
    
    init(row: Int, col: Double, damage: Int, color: Color, isFreeze: Bool = false, isSplash: Bool = false, splashRadius: Int = 0) {
        self.row = row
        self.colPosition = col
        self.damage = damage
        self.speed = 8.0
        self.color = color
        self.isFreeze = isFreeze
        self.isSplash = isSplash
        self.splashRadius = splashRadius
    }
}

// MARK: - Wave Definition

struct WaveDefinition {
    let waveNumber: Int
    let zombies: [(type: ZombieType, count: Int, delay: Double)]
    let isBossWave: Bool
    
    static func generateWave(number: Int) -> WaveDefinition {
        var zombies: [(ZombieType, Int, Double)] = []
        let isBoss = number % 5 == 0
        
        // Base zombies scale with wave
        let basicCount = 3 + number
        zombies.append((.basic, basicCount, 1.5))
        
        // Add variety as waves progress
        if number >= 3 {
            zombies.append((.fast, number / 2, 2.0))
        }
        if number >= 5 {
            zombies.append((.armored, number / 3, 3.0))
        }
        if number >= 8 {
            zombies.append((.healer, max(1, number / 5), 4.0))
        }
        if number >= 10 {
            zombies.append((.giant, max(1, number / 6), 5.0))
        }
        if isBoss {
            zombies.append((.boss, 1, 8.0))
        }
        
        return WaveDefinition(waveNumber: number, zombies: zombies, isBossWave: isBoss)
    }
}

// MARK: - Upgrade Option

struct UpgradeOption: Identifiable {
    let id = UUID()
    let title: String
    let description: String
    let emoji: String
    let type: UpgradeType
    let cost: Int // questions to answer
    
    enum UpgradeType {
        case upgradeDefender(DefenderType)
        case unlockDefender(DefenderType)
        case healAll
        case bonusBrainPower(Int)
        case extraLife
    }
}
