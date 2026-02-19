import SwiftUI

// MARK: - WordWave Survival (Zombie-style vocabulary arena)

struct WordWaveSurvivalView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @StateObject private var particles = ParticleManager()
    @State private var score = 0
    @State private var wave = 1
    @State private var lives = 5
    @State private var enemies: [WordEnemy] = []
    @State private var currentWord = ""
    @State private var currentDefinition = ""
    @State private var choices: [String] = []
    @State private var correctIndex = 0
    @State private var showGate = false
    @State private var gameOver = false
    @State private var timeRemaining: Double = 60
    @State private var timer: Timer?
    @State private var combo = 0
    @State private var maxCombo = 0
    @State private var enemiesDefeated = 0
    @State private var showCorrectFlash = false
    @State private var showWrongFlash = false
    @State private var isShaking = false
    @State private var showScorePopup = false
    @State private var lastScoreGain = 0
    
    private let theme: GameTheme = .ocean
    
    var body: some View {
        ZStack {
            // Enhanced animated background
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["wordwave_survival"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "wordwave_survival", score: score)
                        onExit()
                    }
                )
            } else if showGate {
                KnowledgeGateView(engine: gateEngine, grade: grade) { result in
                    showGate = false
                    if result == .correct {
                        wave += 1
                        timeRemaining = 60
                        spawnWave()
                    } else {
                        lives -= 1
                        if lives <= 0 { gameOver = true }
                    }
                }
            } else {
                gameContent
            }
            
            // Particle effects
            ParticleEmitter(particles: $particles.particles)
            
            // Flash overlays
            AnswerFlash(isCorrect: true, isVisible: $showCorrectFlash)
            AnswerFlash(isCorrect: false, isVisible: $showWrongFlash)
            
            // Score popup
            if showScorePopup {
                FloatingScoreText(text: "+\(lastScoreGain)", color: StormColors.neonGreen)
            }
        }
        .screenShake(isShaking: $isShaking)
        .onAppear {
            spawnWave()
            startTimer()
        }
        .onDisappear {
            timer?.invalidate()
            particles.clear()
        }
    }
    
    // MARK: - Game Content
    
    private var gameContent: some View {
        VStack(spacing: 0) {
            // Enhanced HUD
            GameTopBar(
                theme: theme,
                score: score,
                level: wave,
                levelLabel: "WAVE",
                lives: lives,
                maxLives: 5,
                timer: Int(timeRemaining),
                combo: combo
            )
            
            // Enemy Arena
            ZStack {
                ForEach(0..<enemies.count, id: \.self) { i in
                    EnhancedEnemyView(enemy: enemies[i], theme: theme)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
            
            Spacer()
            
            // Word challenge
            VStack(spacing: 16) {
                Text("What does this word mean?")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                
                Text(currentWord)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(StormColors.neonCyan)
                    .shadow(color: StormColors.neonCyan.opacity(0.6), radius: 10)
                
                // Enhanced answer choices
                VStack(spacing: 10) {
                    ForEach(0..<choices.count, id: \.self) { index in
                        GameAnswerButton(
                            text: choices[index],
                            letter: ["A","B","C","D"][index],
                            color: theme.accentColor,
                            action: { answerTapped(index) }
                        )
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.bottom, 30)
        }
    }
    
    // MARK: - Game Logic
    
    private func spawnWave() {
        enemies = []
        for _ in 0..<(3 + wave) {
            let enemy = WordEnemy(
                id: UUID(),
                x: CGFloat.random(in: 40...300),
                y: CGFloat.random(in: 60...250),
                emoji: ["🧟","🧟‍♂️","🧟‍♀️","💀","👻","👹"].randomElement()!,
                health: wave
            )
            enemies.append(enemy)
        }
        generateWordChallenge()
    }
    
    private func generateWordChallenge() {
        let question = QuestionBank.shared.randomQuestion(for: grade, type: .vocabulary)
        currentWord = question.prompt.replacingOccurrences(of: "What does ", with: "").replacingOccurrences(of: " mean?", with: "").replacingOccurrences(of: "Choose the synonym for ", with: "").replacingOccurrences(of: ":", with: "")
        choices = question.choices
        correctIndex = question.correctIndex
    }
    
    private func answerTapped(_ index: Int) {
        if index == correctIndex {
            SoundManager.shared.playCorrect()
            let gain = 10 * (1 + combo)
            score += gain
            combo += 1
            maxCombo = max(maxCombo, combo)
            enemiesDefeated += 1
            
            // Visual feedback
            showCorrectFlash = true
            lastScoreGain = gain
            showScorePopup = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { showScorePopup = false }
            
            // Particle burst on enemy position
            if let enemy = enemies.first {
                particles.emit(ParticleBurst.explosion(at: CGPoint(x: enemy.x, y: enemy.y + 120), color: theme.accentColor))
            }
            if combo > 2 {
                particles.emit(ParticleBurst.combo(at: CGPoint(x: 200, y: 300), multiplier: combo))
            }
            
            // Remove an enemy
            if !enemies.isEmpty {
                let _ = withAnimation(.spring(response: 0.3)) {
                    enemies.removeFirst()
                }
            }
            
            if enemies.isEmpty {
                gateEngine.activateCheckpoint(grade: grade)
                showGate = true
            } else {
                generateWordChallenge()
            }
        } else {
            SoundManager.shared.playIncorrect()
            combo = 0
            lives -= 1
            
            showWrongFlash = true
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: 200, y: 500)))
            
            if lives <= 0 {
                gameOver = true
            } else {
                generateWordChallenge()
            }
        }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if !gameOver && !showGate {
                timeRemaining -= 1
                if timeRemaining <= 0 {
                    gameOver = true
                }
            }
        }
    }
    
    private func resetGame() {
        score = 0
        wave = 1
        lives = 5
        combo = 0
        maxCombo = 0
        enemiesDefeated = 0
        timeRemaining = 60
        gameOver = false
        spawnWave()
    }
}

// MARK: - Enemy Model

struct WordEnemy: Identifiable {
    let id: UUID
    var x: CGFloat
    var y: CGFloat
    var emoji: String
    var health: Int
}

// MARK: - Enhanced Enemy View

struct EnhancedEnemyView: View {
    let enemy: WordEnemy
    let theme: GameTheme
    @State private var bounce = false
    @State private var glowPulse = false
    
    var body: some View {
        ZStack {
            // Glow aura
            Circle()
                .fill(
                    RadialGradient(
                        colors: [StormColors.neonRed.opacity(0.25), .clear],
                        center: .center,
                        startRadius: 5,
                        endRadius: 35
                    )
                )
                .frame(width: 70, height: 70)
                .scaleEffect(glowPulse ? 1.3 : 1.0)
            
            // Shadow under enemy
            Ellipse()
                .fill(Color.black.opacity(0.3))
                .frame(width: 40, height: 10)
                .offset(y: 25)
                .blur(radius: 3)
            
            // Enemy character
            Text(enemy.emoji)
                .font(.system(size: 48))
                .shadow(color: StormColors.neonRed.opacity(0.5), radius: 8)
            
            // HP indicator
            if enemy.health > 1 {
                Text("HP:\(enemy.health)")
                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                    .foregroundColor(StormColors.neonRed)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 1)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(4)
                    .offset(y: -30)
            }
        }
        .offset(y: bounce ? -8 : 8)
        .animation(
            .easeInOut(duration: Double.random(in: 0.6...1.2)).repeatForever(autoreverses: true),
            value: bounce
        )
        .position(x: enemy.x, y: enemy.y)
        .onAppear {
            bounce = true
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                glowPulse = true
            }
        }
    }
}

// Keep old name for backwards compat
struct EnemyView: View {
    let enemy: WordEnemy
    @State private var bounce = false
    
    var body: some View {
        EnhancedEnemyView(enemy: enemy, theme: .ocean)
    }
}
