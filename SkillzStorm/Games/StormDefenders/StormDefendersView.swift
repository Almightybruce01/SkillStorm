import SwiftUI

// ═══════════════════════════════════════════════════════════════
// STORM DEFENDERS — Main Game View
// "Defend Your Brain. Upgrade Your Mind."
// ═══════════════════════════════════════════════════════════════

struct StormDefendersView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var engine = StormDefendersEngine()
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @State private var selectedDefenderType: DefenderType? = nil
    @State private var showDefenderPicker = true
    @State private var quizQuestion: Question? = nil
    
    var body: some View {
        ZStack {
            // Enhanced animated background
            InGameBackground(theme: .fortress)
            
            VStack(spacing: 0) {
                // Top HUD
                topHUD
                
                // Main Game Grid
                gameGrid
                    .layoutPriority(1)
                
                // Bottom: Defender Picker
                defenderPickerBar
            }
            
            // Overlays
            if engine.showPlacementQuiz {
                placementQuizOverlay
            }
            
            if engine.showWaveComplete && !engine.gameOver {
                waveCompleteOverlay
            }
            
            if engine.gameOver {
                gameOverOverlay
            }
            
            if !engine.isPlaying && !engine.gameOver {
                startOverlay
            }
        }
        .onAppear {
            engine.grade = grade
        }
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Top HUD
    // ─────────────────────────────────────────────
    
    private var topHUD: some View {
        HStack(spacing: 0) {
            // Exit button
            Button(action: { onExit() }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding(.leading, 8)
            
            // Wave
            VStack(spacing: 1) {
                Text("WAVE")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                Text("\(engine.wave)")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(StormColors.neonPurple)
            }
            .frame(maxWidth: .infinity)
            
            // Score
            VStack(spacing: 1) {
                Text("SCORE")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                Text("\(engine.score)")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(StormColors.neonYellow)
            }
            .frame(maxWidth: .infinity)
            
            // Kills
            VStack(spacing: 1) {
                Text("KILLS")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                Text("\(engine.totalKills)")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(StormColors.neonRed)
            }
            .frame(maxWidth: .infinity)
            
            // Lives
            VStack(spacing: 1) {
                Text("LIVES")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                HStack(spacing: 1) {
                    ForEach(0..<min(engine.lives, 10), id: \.self) { _ in
                        Image(systemName: "heart.fill")
                            .font(.system(size: 8))
                            .foregroundColor(StormColors.neonPink)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            
            // Pause
            Button(action: { engine.isPaused.toggle() }) {
                Image(systemName: engine.isPaused ? "play.circle.fill" : "pause.circle.fill")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding(.trailing, 8)
        }
        .padding(.vertical, 6)
        .background(Color.black.opacity(0.6))
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Game Grid
    // ─────────────────────────────────────────────
    
    private var gameGrid: some View {
        GeometryReader { geo in
            let cellW = geo.size.width / CGFloat(engine.cols)
            let cellH = geo.size.height / CGFloat(engine.rows)
            
            ZStack(alignment: .topLeading) {
                // Grid background
                ForEach(0..<engine.rows, id: \.self) { row in
                    ForEach(0..<engine.cols, id: \.self) { col in
                        Rectangle()
                            .fill(gridCellColor(row: row, col: col))
                            .frame(width: cellW, height: cellH)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.white.opacity(0.05), lineWidth: 0.5)
                            )
                            .position(
                                x: CGFloat(col) * cellW + cellW / 2,
                                y: CGFloat(row) * cellH + cellH / 2
                            )
                            .onTapGesture {
                                handleCellTap(row: row, col: col)
                            }
                    }
                }
                
                // Home base (left edge)
                ForEach(0..<engine.rows, id: \.self) { row in
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [StormColors.neonBlue.opacity(0.3), Color.clear],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: cellW * 0.5, height: cellH)
                        .position(x: cellW * 0.25, y: CGFloat(row) * cellH + cellH / 2)
                }
                
                // Placed defenders
                ForEach(engine.defenders) { defender in
                    DefenderCellView(
                        defender: defender,
                        cellW: cellW,
                        cellH: cellH,
                        isDamaged: engine.damageFlashes[defender.id] ?? false
                    )
                    .position(
                        x: CGFloat(defender.col) * cellW + cellW / 2,
                        y: CGFloat(defender.row) * cellH + cellH / 2
                    )
                    .onTapGesture {
                        engine.tryUpgradeDefender(defender)
                    }
                }
                
                // Zombies
                ForEach(engine.zombies) { zombie in
                    ZombieCellView(zombie: zombie, cellW: cellW, cellH: cellH)
                        .position(
                            x: CGFloat(zombie.colPosition) * cellW + cellW / 2,
                            y: CGFloat(zombie.row) * cellH + cellH / 2
                        )
                }
                
                // Projectiles
                ForEach(engine.projectiles) { proj in
                    Circle()
                        .fill(proj.color)
                        .frame(width: proj.isSplash ? 12 : 8, height: proj.isSplash ? 12 : 8)
                        .shadow(color: proj.color, radius: 4)
                        .position(
                            x: CGFloat(proj.colPosition) * cellW + cellW / 2,
                            y: CGFloat(proj.row) * cellH + cellH / 2
                        )
                }
            }
        }
    }
    
    private func gridCellColor(row: Int, col: Int) -> Color {
        let isEven = (row + col) % 2 == 0
        let base = isEven
            ? Color(red: 0.12, green: 0.2, blue: 0.1)
            : Color(red: 0.1, green: 0.17, blue: 0.08)
        
        // Highlight if placing
        if selectedDefenderType != nil, engine.getDefender(at: row, col: col) == nil && col < engine.cols - 1 {
            return base.opacity(0.8)
        }
        return base
    }
    
    private func handleCellTap(row: Int, col: Int) {
        // If a defender type is selected, try to place it
        if let type = selectedDefenderType {
            engine.tryPlaceDefender(type: type, row: row, col: col)
            // Prepare quiz question
            quizQuestion = QuestionBank.shared.randomQuestion(for: grade)
        }
        // If there's already a defender, try to upgrade
        else if let existing = engine.getDefender(at: row, col: col) {
            engine.tryUpgradeDefender(existing)
            quizQuestion = QuestionBank.shared.randomQuestion(for: grade)
        }
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Defender Picker
    // ─────────────────────────────────────────────
    
    private var defenderPickerBar: some View {
        VStack(spacing: 4) {
            // Instruction
            Text(selectedDefenderType != nil ? "Tap a cell to place \(selectedDefenderType!.displayName)" : "Select a defender, then tap a cell")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white.opacity(0.4))
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(engine.unlockedDefenders).sorted(by: { $0.baseCost < $1.baseCost })) { type in
                        Button(action: {
                            SoundManager.shared.playButtonTap()
                            if selectedDefenderType == type {
                                selectedDefenderType = nil
                            } else {
                                selectedDefenderType = type
                            }
                        }) {
                            VStack(spacing: 2) {
                                Text(type.emoji)
                                    .font(.system(size: 22))
                                Text(type.displayName)
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                            }
                            .frame(width: 60, height: 52)
                            .background(
                                selectedDefenderType == type
                                ? type.color.opacity(0.4)
                                : StormColors.surface
                            )
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(
                                        selectedDefenderType == type ? type.color : Color.white.opacity(0.1),
                                        lineWidth: selectedDefenderType == type ? 2 : 1
                                    )
                            )
                        }
                    }
                }
                .padding(.horizontal, 12)
            }
        }
        .padding(.vertical, 6)
        .background(Color.black.opacity(0.7))
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Placement Quiz Overlay
    // ─────────────────────────────────────────────
    
    private var placementQuizOverlay: some View {
        ZStack {
            Color.black.opacity(0.8).ignoresSafeArea()
            
            VStack(spacing: 16) {
                // Title
                if engine.upgradeTarget != nil {
                    VStack(spacing: 4) {
                        Text("⬆️ UPGRADE")
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundColor(StormColors.neonYellow)
                        Text("Answer correctly to upgrade!")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                } else {
                    VStack(spacing: 4) {
                        Text("\(selectedDefenderType?.emoji ?? "🧠") PLACE DEFENDER")
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundColor(StormColors.neonGreen)
                        Text("Answer correctly to place \(selectedDefenderType?.displayName ?? "defender")!")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                
                if let q = quizQuestion {
                    // Subject badge
                    HStack {
                        Image(systemName: q.type.iconName)
                        Text(q.type.displayName)
                    }
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonCyan)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(StormColors.neonCyan.opacity(0.15))
                    .cornerRadius(8)
                    
                    // Question
                    Text(q.prompt)
                        .font(.title3.bold())
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                    
                    // Choices
                    VStack(spacing: 8) {
                        ForEach(q.choices.indices, id: \.self) { i in
                            Button(action: {
                                let correct = i == q.correctIndex
                                if engine.upgradeTarget != nil {
                                    engine.confirmUpgrade(answeredCorrectly: correct)
                                } else {
                                    engine.confirmPlacement(answeredCorrectly: correct)
                                }
                                selectedDefenderType = nil
                                quizQuestion = nil
                            }) {
                                Text(q.choices[i])
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(StormColors.surface)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                    )
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                // Cancel
                Button("Cancel") {
                    engine.showPlacementQuiz = false
                    engine.upgradeTarget = nil
                    selectedDefenderType = nil
                    quizQuestion = nil
                }
                .font(.caption.bold())
                .foregroundColor(.white.opacity(0.4))
            }
            .padding(.vertical, 24)
        }
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Wave Complete
    // ─────────────────────────────────────────────
    
    private var waveCompleteOverlay: some View {
        ZStack {
            Color.black.opacity(0.75).ignoresSafeArea()
            
            VStack(spacing: 20) {
                Text("🏆 WAVE \(engine.wave) CLEARED!")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(StormColors.goldGradient)
                
                // Rewards
                VStack(spacing: 8) {
                    HStack {
                        Text("Wave Bonus:")
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                        Text("+\(engine.wave * 10) pts")
                            .font(.headline.bold())
                            .foregroundColor(StormColors.neonYellow)
                    }
                    HStack {
                        Text("Zombies Killed:")
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                        Text("\(engine.totalKills)")
                            .font(.headline.bold())
                            .foregroundColor(StormColors.neonRed)
                    }
                }
                .padding(.horizontal, 40)
                
                // New unlock notification
                let unlockOrder = DefenderType.unlockOrder()
                let unlockIndex = engine.wave / 2 - 1
                if unlockIndex >= 0 && unlockIndex < unlockOrder.count {
                    let newDef = unlockOrder[unlockIndex]
                    VStack(spacing: 6) {
                        Text("🔓 NEW DEFENDER UNLOCKED!")
                            .font(.caption.bold())
                            .foregroundColor(StormColors.neonGreen)
                        HStack(spacing: 8) {
                            Text(newDef.emoji).font(.title)
                            VStack(alignment: .leading) {
                                Text(newDef.displayName)
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                Text(newDef.description)
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                    }
                    .padding()
                    .background(StormColors.neonGreen.opacity(0.1))
                    .cornerRadius(14)
                }
                
                // Tip
                VStack(spacing: 4) {
                    Text("💡 TIP")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonCyan)
                    Text(waveTip)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(StormColors.neonCyan.opacity(0.05))
                .cornerRadius(12)
                
                // Next wave button
                StormButton("NEXT WAVE →", icon: "arrow.right", gradient: StormColors.heroGradient) {
                    engine.startWave()
                }
            }
            .padding(24)
        }
    }
    
    private var waveTip: String {
        let tips = [
            "Place Word Walls in front of shooters to protect them!",
            "Upgrade defenders to level 3 for extra range!",
            "Freeze Rays slow zombies — great for tough lanes!",
            "Math Mines are one-use but deal massive damage!",
            "Mix defender types for the best defense!",
            "Heal Stations repair nearby defenders over time!",
            "Lightning Towers hit zombies in adjacent rows!",
            "Boss zombies appear every 5 waves — prepare!",
            "Each correct answer makes your brain stronger!",
            "Vocab Vines grab and hold zombies in place!"
        ]
        return tips[engine.wave % tips.count]
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Game Over
    // ─────────────────────────────────────────────
    
    private var gameOverOverlay: some View {
        ZStack {
            Color.black.opacity(0.85).ignoresSafeArea()
            
            VStack(spacing: 24) {
                Text("BRAIN OVERRUN!")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(StormColors.fireGradient)
                
                Text("🧟💀🧠")
                    .font(.system(size: 50))
                
                // Final stats
                VStack(spacing: 12) {
                    finalStat("Waves Survived", "\(engine.wave)", StormColors.neonPurple)
                    finalStat("Total Score", "\(engine.score)", StormColors.neonYellow)
                    finalStat("Zombies Killed", "\(engine.totalKills)", StormColors.neonRed)
                    finalStat("Defenders Unlocked", "\(engine.unlockedDefenders.count)/\(DefenderType.allCases.count)", StormColors.neonGreen)
                }
                
                VStack(spacing: 12) {
                    StormButton("Defend Again", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                        engine.reset()
                    }
                    StormButton("Exit", icon: "xmark", gradient: LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .leading, endPoint: .trailing)) {
                        onExit()
                    }
                }
            }
        }
    }
    
    private func finalStat(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack {
            Text(label)
                .foregroundColor(.white.opacity(0.6))
            Spacer()
            Text(value)
                .font(.headline.bold())
                .foregroundColor(color)
        }
        .padding(.horizontal, 40)
    }
    
    // ─────────────────────────────────────────────
    // MARK: - Start Overlay
    // ─────────────────────────────────────────────
    
    private var startOverlay: some View {
        ZStack {
            Color.black.opacity(0.85).ignoresSafeArea()
            
            VStack(spacing: 20) {
                Text("🧠🛡️")
                    .font(.system(size: 60))
                
                Text("STORM DEFENDERS")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(StormColors.heroGradient)
                
                Text("Defend Your Brain. Upgrade Your Mind.")
                    .font(.subheadline)
                    .foregroundColor(StormColors.neonCyan)
                
                VStack(alignment: .leading, spacing: 8) {
                    instructionRow("🧠", "Place defenders by answering questions")
                    instructionRow("🧟", "Stop zombies from reaching your base")
                    instructionRow("⬆️", "Upgrade defenders between waves")
                    instructionRow("🔓", "Unlock new defenders as you progress")
                    instructionRow("💡", "Every question makes you smarter!")
                }
                .padding()
                .glassCard()
                
                Text("Grade: \(grade.displayName)")
                    .font(.caption.bold())
                    .foregroundColor(StormColors.gradeColor(grade))
                
                StormButton("DEFEND!", icon: "shield.fill", gradient: StormColors.heroGradient) {
                    engine.isPlaying = true
                    engine.startWave()
                }
                .pulsing()
            }
            .padding(24)
        }
    }
    
    private func instructionRow(_ emoji: String, _ text: String) -> some View {
        HStack(spacing: 12) {
            Text(emoji).font(.title3)
            Text(text).font(.caption).foregroundColor(.white.opacity(0.7))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Defender Cell View
// ═══════════════════════════════════════════════════════════════

struct DefenderCellView: View {
    @ObservedObject var defender: PlacedDefender
    let cellW: CGFloat
    let cellH: CGFloat
    let isDamaged: Bool
    
    var body: some View {
        ZStack {
            // Base
            RoundedRectangle(cornerRadius: 4)
                .fill(defender.type.color.opacity(0.3))
                .frame(width: cellW * 0.85, height: cellH * 0.85)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(defender.type.color.opacity(0.6), lineWidth: 1)
                )
            
            // Emoji
            Text(defender.type.emoji)
                .font(.system(size: min(cellW, cellH) * 0.45))
                .scaleEffect(defender.isAttacking ? 1.2 : 1.0)
                .animation(.spring(response: 0.1), value: defender.isAttacking)
            
            // Level badge
            if defender.level > 1 {
                Text("Lv\(defender.level)")
                    .font(.system(size: 7, weight: .black))
                    .foregroundColor(.white)
                    .padding(.horizontal, 3)
                    .padding(.vertical, 1)
                    .background(StormColors.neonPurple)
                    .cornerRadius(3)
                    .offset(x: cellW * 0.25, y: -cellH * 0.3)
            }
            
            // HP bar
            GeometryReader { _ in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.black.opacity(0.5))
                        .frame(width: cellW * 0.7, height: 3)
                    RoundedRectangle(cornerRadius: 1)
                        .fill(hpColor)
                        .frame(width: cellW * 0.7 * defender.hpPercent, height: 3)
                }
                .position(x: cellW * 0.425, y: cellH * 0.82)
            }
        }
        .frame(width: cellW, height: cellH)
        .overlay(
            isDamaged
            ? Color.red.opacity(0.3).cornerRadius(4)
            : Color.clear.cornerRadius(4)
        )
    }
    
    private var hpColor: Color {
        if defender.hpPercent > 0.6 { return StormColors.neonGreen }
        if defender.hpPercent > 0.3 { return StormColors.neonYellow }
        return StormColors.neonRed
    }
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Zombie Cell View
// ═══════════════════════════════════════════════════════════════

struct ZombieCellView: View {
    @ObservedObject var zombie: Zombie
    let cellW: CGFloat
    let cellH: CGFloat
    
    @State private var wobble = false
    
    var body: some View {
        ZStack {
            // Zombie body
            Text(zombie.type.emoji)
                .font(.system(size: min(cellW, cellH) * 0.5))
                .scaleEffect(x: -1, y: 1) // Face left (toward base)
                .offset(x: wobble ? -2 : 2)
                .animation(
                    .easeInOut(duration: zombie.isSlowed ? 0.6 : 0.25).repeatForever(autoreverses: true),
                    value: wobble
                )
            
            // Slow effect
            if zombie.isSlowed {
                Text("❄️")
                    .font(.system(size: 10))
                    .offset(y: -cellH * 0.3)
            }
            
            // Held effect
            if zombie.isHeld {
                Text("🌿")
                    .font(.system(size: 10))
                    .offset(y: cellH * 0.3)
            }
            
            // HP bar
            VStack {
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.black.opacity(0.5))
                        .frame(width: cellW * 0.6, height: 3)
                    RoundedRectangle(cornerRadius: 1)
                        .fill(StormColors.neonRed)
                        .frame(width: cellW * 0.6 * zombie.hpPercent, height: 3)
                }
                Spacer()
            }
            .frame(width: cellW * 0.6, height: cellH * 0.4)
            .offset(y: -cellH * 0.25)
        }
        .frame(width: cellW, height: cellH)
        .onAppear { wobble = true }
    }
}
