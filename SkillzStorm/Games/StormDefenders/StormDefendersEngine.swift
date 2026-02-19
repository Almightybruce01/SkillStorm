import SwiftUI
import Combine

// ═══════════════════════════════════════════════════════════════
// STORM DEFENDERS — Game Engine
// ═══════════════════════════════════════════════════════════════

class StormDefendersEngine: ObservableObject {
    // Grid
    let rows = 5
    let cols = 9
    
    // Game State
    @Published var wave = 0
    @Published var lives = 10
    @Published var brainPower = 0  // Currency from answering questions
    @Published var score = 0
    @Published var totalKills = 0
    @Published var isPlaying = false
    @Published var isWaveActive = false
    @Published var gameOver = false
    @Published var isPaused = false
    
    // Entities
    @Published var defenders: [PlacedDefender] = []
    @Published var zombies: [Zombie] = []
    @Published var projectiles: [Projectile] = []
    
    // UI State
    @Published var selectedDefender: DefenderType? = nil
    @Published var showPlacementQuiz = false
    @Published var showUpgradeShop = false
    @Published var showWaveComplete = false
    @Published var placementTarget: (row: Int, col: Int)? = nil
    @Published var upgradeTarget: PlacedDefender? = nil
    
    // Unlocked defenders
    @Published var unlockedDefenders: Set<DefenderType> = Set(DefenderType.starterDefenders())
    
    // Damage flash effects
    @Published var damageFlashes: [UUID: Bool] = [:]
    @Published var killEffects: [(id: UUID, x: CGFloat, y: CGFloat)] = []
    
    // Game config
    var grade: GradeLevel = .k2
    private var gameTimer: Timer?
    private var spawnTimer: Timer?
    private var pendingSpawns: [(type: ZombieType, row: Int, delay: Double)] = []
    private var spawnStartTime: Date = .now
    
    // MARK: - Start Wave
    
    func startWave() {
        wave += 1
        isWaveActive = true
        showUpgradeShop = false
        showWaveComplete = false
        
        let waveDef = WaveDefinition.generateWave(number: wave)
        
        // Build spawn queue
        pendingSpawns = []
        var totalDelay: Double = 1.0
        for group in waveDef.zombies {
            for i in 0..<group.count {
                let row = Int.random(in: 0..<rows)
                pendingSpawns.append((type: group.type, row: row, delay: totalDelay + Double(i) * group.delay))
            }
            totalDelay += Double(group.count) * group.delay + 2.0
        }
        
        spawnStartTime = .now
        
        // Start game loop
        startGameLoop()
    }
    
    // MARK: - Game Loop
    
    private func startGameLoop() {
        gameTimer?.invalidate()
        gameTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            guard let self = self, !self.isPaused else { return }
            self.tick()
        }
    }
    
    private func tick() {
        let dt = 1.0 / 30.0
        
        // 1. Spawn zombies
        spawnPendingZombies()
        
        // 2. Move zombies
        moveZombies(dt: dt)
        
        // 3. Defenders attack
        defendersAttack()
        
        // 4. Move projectiles
        moveProjectiles(dt: dt)
        
        // 5. Check projectile hits
        checkProjectileHits()
        
        // 6. Check zombie attacks on defenders
        checkZombieAttacks(dt: dt)
        
        // 7. Check zombies reaching the end
        checkZombiesReachedEnd()
        
        // 8. Heal station logic
        processHealStations(dt: dt)
        
        // 9. Clean up dead entities
        cleanup()
        
        // 10. Check wave completion
        checkWaveComplete()
        
        // 11. Check game over
        if lives <= 0 {
            gameOver = true
            gameTimer?.invalidate()
            PlayerProgress.shared.recordGamePlayed(gameId: "storm_defenders", score: score)
        }
    }
    
    // MARK: - Spawning
    
    private func spawnPendingZombies() {
        let elapsed = Date().timeIntervalSince(spawnStartTime)
        let toSpawn = pendingSpawns.filter { $0.delay <= elapsed }
        
        for spawn in toSpawn {
            let waveMultiplier = 1.0 + Double(wave - 1) * 0.15
            let zombie = Zombie(type: spawn.type, row: spawn.row, startCol: Double(cols) + 0.5, waveMultiplier: waveMultiplier)
            zombies.append(zombie)
        }
        
        pendingSpawns.removeAll { $0.delay <= elapsed }
    }
    
    // MARK: - Movement
    
    private func moveZombies(dt: Double) {
        for zombie in zombies where !zombie.isDead {
            // Check if blocked by a defender
            let blocked = defenders.first { d in
                d.row == zombie.row &&
                abs(Double(d.col) - zombie.colPosition) < 0.6 &&
                Double(d.col) < zombie.colPosition &&
                d.isAlive
            }
            
            if blocked != nil && !zombie.isHeld {
                // Zombie attacks the defender (handled in checkZombieAttacks)
            } else {
                zombie.colPosition -= zombie.speed * dt
            }
        }
    }
    
    private func moveProjectiles(dt: Double) {
        for i in projectiles.indices {
            projectiles[i].colPosition += projectiles[i].speed * dt
        }
        // Remove off-screen
        projectiles.removeAll { $0.colPosition > Double(cols) + 1 }
    }
    
    // MARK: - Combat
    
    private func defendersAttack() {
        let now = Date()
        
        for defender in defenders where defender.isAlive {
            guard defender.type.attackSpeed > 0 else { continue }
            guard now.timeIntervalSince(defender.lastAttackTime) >= defender.attackInterval else { continue }
            
            // Find target zombie in range
            let targets = zombies.filter { z in
                !z.isDead &&
                z.row == defender.row &&
                z.colPosition > Double(defender.col) &&
                z.colPosition <= Double(defender.col + defender.effectiveRange)
            }.sorted { $0.colPosition < $1.colPosition }
            
            // Lightning tower hits any row within range
            let lightningTargets: [Zombie]
            if defender.type == .lightningTower {
                lightningTargets = zombies.filter { z in
                    !z.isDead &&
                    abs(z.row - defender.row) <= 1 &&
                    abs(Int(z.colPosition) - defender.col) <= defender.effectiveRange
                }
            } else {
                lightningTargets = []
            }
            
            let hasTarget = !targets.isEmpty || (defender.type == .lightningTower && !lightningTargets.isEmpty)
            
            guard hasTarget else { continue }
            
            defender.lastAttackTime = now
            defender.isAttacking = true
            
            // Reset attack animation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                defender.isAttacking = false
            }
            
            switch defender.type {
            case .brainBlaster:
                let proj = Projectile(row: defender.row, col: Double(defender.col) + 0.5, damage: defender.damage, color: defender.type.color)
                projectiles.append(proj)
                
            case .freezeRay:
                let proj = Projectile(row: defender.row, col: Double(defender.col) + 0.5, damage: defender.damage, color: defender.type.color, isFreeze: true)
                projectiles.append(proj)
                
            case .doubleCannon:
                let proj1 = Projectile(row: defender.row, col: Double(defender.col) + 0.5, damage: defender.damage, color: defender.type.color)
                let proj2 = Projectile(row: defender.row, col: Double(defender.col) + 0.3, damage: defender.damage, color: defender.type.color)
                projectiles.append(proj1)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                    self?.projectiles.append(proj2)
                }
                
            case .lightningTower:
                for target in lightningTargets.prefix(3) {
                    target.takeDamage(defender.damage)
                    if target.isDead { handleZombieKill(target) }
                }
                
            case .grammarCannon:
                let proj = Projectile(row: defender.row, col: Double(defender.col) + 0.5, damage: defender.damage, color: defender.type.color, isSplash: true, splashRadius: 1)
                projectiles.append(proj)
                
            case .vocabVine:
                if let target = targets.first {
                    target.isHeld = true
                    target.takeDamage(defender.damage)
                    // Release after 3 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                        target.isHeld = false
                    }
                }
                
            default:
                break
            }
        }
    }
    
    private func checkProjectileHits() {
        var projectilesToRemove: Set<UUID> = []
        
        for proj in projectiles {
            let hits = zombies.filter { z in
                !z.isDead &&
                z.row == proj.row &&
                abs(z.colPosition - proj.colPosition) < 0.5
            }
            
            if let hit = hits.first {
                hit.takeDamage(proj.damage)
                
                if proj.isFreeze {
                    hit.isSlowed = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                        hit.isSlowed = false
                    }
                }
                
                if proj.isSplash {
                    // Damage nearby zombies
                    let splashTargets = zombies.filter { z in
                        !z.isDead &&
                        abs(z.row - proj.row) <= proj.splashRadius &&
                        abs(z.colPosition - proj.colPosition) < Double(proj.splashRadius) + 0.5
                    }
                    for target in splashTargets where target.id != hit.id {
                        target.takeDamage(proj.damage / 2)
                        if target.isDead { handleZombieKill(target) }
                    }
                }
                
                if hit.isDead { handleZombieKill(hit) }
                
                projectilesToRemove.insert(proj.id)
            }
        }
        
        projectiles.removeAll { projectilesToRemove.contains($0.id) }
    }
    
    private func checkZombieAttacks(dt: Double) {
        for zombie in zombies where !zombie.isDead {
            // Find defender the zombie is touching
            if let defender = defenders.first(where: { d in
                d.row == zombie.row &&
                abs(Double(d.col) - zombie.colPosition) < 0.6 &&
                Double(d.col) < zombie.colPosition &&
                d.isAlive
            }) {
                defender.takeDamage(Int(Double(zombie.type.damage) * dt * 2))
                damageFlashes[defender.id] = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                    self?.damageFlashes[defender.id] = false
                }
            }
            
            // Math mine: explode on contact
            if let mine = defenders.first(where: { d in
                d.type == .mathMine &&
                d.row == zombie.row &&
                abs(Double(d.col) - zombie.colPosition) < 0.8 &&
                d.isAlive
            }) {
                // Explode: damage all nearby zombies
                let blastZombies = zombies.filter { z in
                    !z.isDead &&
                    abs(z.row - mine.row) <= 1 &&
                    abs(z.colPosition - Double(mine.col)) < 1.5
                }
                for z in blastZombies {
                    z.takeDamage(mine.damage)
                    if z.isDead { handleZombieKill(z) }
                }
                mine.hp = 0 // Mine is consumed
                SoundManager.shared.playExplosion()
            }
        }
        
        // Remove dead defenders
        defenders.removeAll { !$0.isAlive }
    }
    
    private func checkZombiesReachedEnd() {
        let reached = zombies.filter { !$0.isDead && $0.colPosition <= -0.5 }
        for zombie in reached {
            zombie.isDead = true
            lives -= 1
            SoundManager.shared.playIncorrect()
        }
    }
    
    private func processHealStations(dt: Double) {
        for defender in defenders where defender.type == .healStation && defender.isAlive {
            let neighbors = defenders.filter { d in
                d.id != defender.id &&
                abs(d.row - defender.row) <= 1 &&
                abs(d.col - defender.col) <= 1 &&
                d.isAlive &&
                d.hp < d.maxHP
            }
            for neighbor in neighbors {
                neighbor.hp = min(neighbor.maxHP, neighbor.hp + Int(20.0 * dt))
            }
        }
    }
    
    // MARK: - Kill Handling
    
    private func handleZombieKill(_ zombie: Zombie) {
        totalKills += 1
        score += zombie.type.reward * wave
        brainPower += zombie.type.reward / 5
        PlayerProgress.shared.addCoins(zombie.type.reward / 2)
        PlayerProgress.shared.addXP(zombie.type.reward)
        SoundManager.shared.playCoinCollect()
    }
    
    // MARK: - Cleanup
    
    private func cleanup() {
        zombies.removeAll { $0.isDead }
        defenders.removeAll { !$0.isAlive }
    }
    
    // MARK: - Wave Completion
    
    private func checkWaveComplete() {
        guard isWaveActive else { return }
        if pendingSpawns.isEmpty && zombies.allSatisfy({ $0.isDead }) && zombies.isEmpty {
            isWaveActive = false
            gameTimer?.invalidate()
            
            // Reward
            let waveBonus = wave * 10
            score += waveBonus
            PlayerProgress.shared.addCoins(waveBonus / 2)
            
            // Unlock new defender every 2 waves
            let unlockOrder = DefenderType.unlockOrder()
            let unlockIndex = wave / 2 - 1
            if unlockIndex >= 0 && unlockIndex < unlockOrder.count {
                let newDefender = unlockOrder[unlockIndex]
                if !unlockedDefenders.contains(newDefender) {
                    unlockedDefenders.insert(newDefender)
                }
            }
            
            SoundManager.shared.playLevelUp()
            showWaveComplete = true
        }
    }
    
    // MARK: - Placement
    
    func tryPlaceDefender(type: DefenderType, row: Int, col: Int) {
        // Check if cell is empty
        guard !defenders.contains(where: { $0.row == row && $0.col == col }) else { return }
        guard col < cols - 1 else { return } // Can't place in last column
        
        selectedDefender = type
        placementTarget = (row, col)
        showPlacementQuiz = true
    }
    
    func confirmPlacement(answeredCorrectly: Bool) {
        guard let type = selectedDefender, let target = placementTarget else { return }
        showPlacementQuiz = false
        
        if answeredCorrectly {
            let defender = PlacedDefender(type: type, row: target.row, col: target.col)
            defenders.append(defender)
            SoundManager.shared.playCorrect()
            PlayerProgress.shared.recordAnswer(correct: true)
        } else {
            SoundManager.shared.playIncorrect()
            PlayerProgress.shared.recordAnswer(correct: false)
        }
        
        selectedDefender = nil
        placementTarget = nil
    }
    
    // MARK: - Upgrades
    
    func tryUpgradeDefender(_ defender: PlacedDefender) {
        guard defender.level < 5 else { return }
        upgradeTarget = defender
        showPlacementQuiz = true
    }
    
    func confirmUpgrade(answeredCorrectly: Bool) {
        guard let target = upgradeTarget else { return }
        showPlacementQuiz = false
        
        if answeredCorrectly {
            target.upgrade()
            SoundManager.shared.playLevelUp()
            PlayerProgress.shared.recordAnswer(correct: true)
        } else {
            PlayerProgress.shared.recordAnswer(correct: false)
            SoundManager.shared.playIncorrect()
        }
        
        upgradeTarget = nil
    }
    
    // MARK: - Reset
    
    func reset() {
        gameTimer?.invalidate()
        wave = 0
        lives = 10
        brainPower = 0
        score = 0
        totalKills = 0
        defenders = []
        zombies = []
        projectiles = []
        pendingSpawns = []
        isWaveActive = false
        gameOver = false
        showUpgradeShop = false
        showWaveComplete = false
        unlockedDefenders = Set(DefenderType.starterDefenders())
    }
    
    func getDefender(at row: Int, col: Int) -> PlacedDefender? {
        defenders.first { $0.row == row && $0.col == col }
    }
}
