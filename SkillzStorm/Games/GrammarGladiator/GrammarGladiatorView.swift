import SwiftUI

// MARK: - Grammar Gladiator (Arena combat powered by grammar)

struct GrammarGladiatorView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var score = 0
    @State private var playerHP = 100
    @State private var enemyHP = 100
    @State private var round = 1
    @State private var question: Question?
    @State private var gameOver = false
    @State private var playerWon = false
    @State private var combo = 0
    @State private var showAttack = false
    @State private var attackEmoji = ""
    @State private var playerShake: CGFloat = 0
    @State private var enemyShake: CGFloat = 0
    @StateObject private var particles = ParticleManager()
    @State private var isShaking = false
    
    private let theme: GameTheme = .arena
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["grammar_gladiator"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "grammar_gladiator", score: score)
                        onExit()
                    }
                )
            } else {
                mainBattle
            }
            
            // Attack effect overlay
            if showAttack {
                Text(attackEmoji)
                    .font(.system(size: 80))
                    .shadow(color: StormColors.neonOrange.opacity(0.8), radius: 20)
                    .transition(.scale.combined(with: .opacity))
            }
            
            ParticleEmitter(particles: $particles.particles)
        }
        .screenShake(isShaking: $isShaking)
        .onAppear { generateQuestion() }
        .onDisappear { particles.clear() }
    }
    
    private var mainBattle: some View {
        VStack(spacing: 16) {
            // Enhanced top bar
            GameTopBar(
                theme: theme,
                score: score,
                level: round,
                levelLabel: "ROUND",
                combo: combo
            )
            
            // Battle arena with enhanced visuals
            HStack(spacing: 30) {
                // Player
                VStack(spacing: 8) {
                    ZStack {
                        // Player glow
                        Circle()
                            .fill(RadialGradient(colors: [StormColors.neonGreen.opacity(0.2), .clear], center: .center, startRadius: 5, endRadius: 40))
                            .frame(width: 80, height: 80)
                        
                        Text("⚔️").font(.system(size: 50))
                            .shadow(color: StormColors.neonGreen.opacity(0.5), radius: 8)
                            .modifier(ShakeEffect(amount: 5, shakesPerUnit: 3, animatableData: playerShake))
                    }
                    Text("YOU").font(.system(size: 10, weight: .bold)).foregroundColor(StormColors.neonGreen)
                    EnhancedHealthBar(hp: playerHP, maxHP: 100, color: StormColors.neonGreen, label: "\(playerHP) HP")
                }
                
                // VS badge
                VStack(spacing: 4) {
                    Text("VS")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundColor(StormColors.neonRed)
                        .shadow(color: StormColors.neonRed.opacity(0.5), radius: 6)
                }
                
                // Enemy
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(RadialGradient(colors: [StormColors.neonRed.opacity(0.2), .clear], center: .center, startRadius: 5, endRadius: 40))
                            .frame(width: 80, height: 80)
                        
                        Text(enemyEmoji).font(.system(size: 50))
                            .shadow(color: StormColors.neonRed.opacity(0.5), radius: 8)
                            .modifier(ShakeEffect(amount: 5, shakesPerUnit: 3, animatableData: enemyShake))
                    }
                    Text("ENEMY").font(.system(size: 10, weight: .bold)).foregroundColor(StormColors.neonRed)
                    EnhancedHealthBar(hp: enemyHP, maxHP: 100 + round * 10, color: StormColors.neonRed, label: "\(enemyHP) HP")
                }
            }
            .padding(.vertical, 16)
            
            Spacer()
            
            // Question with enhanced styling
            if let q = question {
                VStack(spacing: 16) {
                    Text(q.prompt)
                        .font(.title3.bold())
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    VStack(spacing: 10) {
                        ForEach(q.choices.indices, id: \.self) { i in
                            GameAnswerButton(
                                text: q.choices[i],
                                letter: ["A","B","C","D"][i],
                                color: theme.accentColor,
                                action: { attack(choice: i) }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
            
            Spacer()
        }
    }
    
    private var enemyEmoji: String {
        ["🐲","👹","🦹","🧙‍♂️","👾","🤖"][round % 6]
    }
    
    private func generateQuestion() {
        question = QuestionBank.shared.randomQuestion(for: grade, type: .grammar)
    }
    
    private func attack(choice: Int) {
        guard let q = question else { return }
        
        if choice == q.correctIndex {
            SoundManager.shared.playCorrect()
            combo += 1
            let damage = 15 + combo * 5
            enemyHP = max(0, enemyHP - damage)
            score += 10 * combo
            
            attackEmoji = "💥"
            showAttack = true
            withAnimation { enemyShake += 1 }
            
            // Attack particles on enemy side
            particles.emit(ParticleBurst.explosion(at: CGPoint(x: 300, y: 200), color: StormColors.neonGreen))
            if combo > 2 {
                particles.emit(ParticleBurst.combo(at: CGPoint(x: 200, y: 250), multiplier: combo))
            }
            
            if enemyHP <= 0 {
                round += 1
                enemyHP = 100 + round * 10
                PlayerProgress.shared.addCoins(20)
                particles.emit(ParticleBurst.explosion(at: CGPoint(x: 300, y: 200), color: StormColors.neonYellow, count: 35))
            }
        } else {
            SoundManager.shared.playIncorrect()
            combo = 0
            let damage = 20
            playerHP = max(0, playerHP - damage)
            
            attackEmoji = "🔥"
            showAttack = true
            isShaking = true
            withAnimation { playerShake += 1 }
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: 100, y: 200)))
            
            if playerHP <= 0 {
                playerWon = false
                gameOver = true
                return
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { showAttack = false }
        generateQuestion()
    }
    
    private func resetGame() {
        score = 0; playerHP = 100; enemyHP = 100; round = 1; combo = 0; gameOver = false
        generateQuestion()
    }
}

struct HealthBar: View {
    let hp: Int
    let color: Color
    
    var body: some View {
        EnhancedHealthBar(hp: hp, maxHP: 100, color: color, label: nil)
    }
}

struct EnhancedHealthBar: View {
    let hp: Int
    let maxHP: Int
    let color: Color
    let label: String?
    
    private var progress: CGFloat {
        guard maxHP > 0 else { return 0 }
        return CGFloat(max(0, hp)) / CGFloat(maxHP)
    }
    
    var body: some View {
        VStack(spacing: 2) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 5)
                        .fill(Color.white.opacity(0.08))
                    
                    RoundedRectangle(cornerRadius: 5)
                        .fill(
                            LinearGradient(
                                colors: [color, color.opacity(0.6)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * min(1, progress))
                        .shadow(color: color.opacity(0.5), radius: 4)
                        .animation(.spring(response: 0.3), value: hp)
                }
            }
            .frame(width: 100, height: 10)
            .overlay(
                RoundedRectangle(cornerRadius: 5)
                    .stroke(color.opacity(0.3), lineWidth: 1)
            )
            
            if let label = label {
                Text(label)
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .foregroundColor(color.opacity(0.8))
            }
        }
    }
}
