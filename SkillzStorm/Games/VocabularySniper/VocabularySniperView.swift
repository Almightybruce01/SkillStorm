import SwiftUI

// MARK: - Vocabulary Sniper (Aim and shoot word targets)

struct VocabularySniperView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var score = 0
    @State private var lives = 3
    @State private var level = 1
    @State private var targets: [WordTarget] = []
    @State private var definition = ""
    @State private var correctWord = ""
    @State private var gameOver = false
    @State private var timer: Timer?
    @State private var combo = 0
    @State private var timeLeft: Double = 45
    @StateObject private var particles = ParticleManager()
    @State private var isShaking = false
    @State private var showScorePopup = false
    @State private var lastScoreGain = 0
    
    private let theme: GameTheme = .ocean
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["vocabulary_sniper"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "vocabulary_sniper", score: score)
                        onExit()
                    }
                )
            } else {
                VStack {
                    // Enhanced HUD
                    GameTopBar(
                        theme: theme,
                        score: score,
                        level: level,
                        lives: lives,
                        timer: Int(timeLeft),
                        combo: combo
                    )
                    
                    // Definition prompt with glow
                    VStack(spacing: 8) {
                        Text("FIND THE WORD:")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white.opacity(0.4))
                            .tracking(2)
                        Text(definition)
                            .font(.title3.bold())
                            .foregroundColor(StormColors.neonCyan)
                            .shadow(color: StormColors.neonCyan.opacity(0.5), radius: 8)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.vertical, 10)
                    
                    // Target field with crosshair
                    GeometryReader { geo in
                        ZStack {
                            // Enhanced crosshair
                            CrosshairOverlay()
                                .position(x: geo.size.width / 2, y: geo.size.height / 2)
                            
                            ForEach(targets) { target in
                                EnhancedTargetBubble(target: target, theme: theme)
                                    .position(x: target.x, y: target.y)
                                    .onTapGesture { shootTarget(target) }
                            }
                        }
                    }
                }
            }
            
            ParticleEmitter(particles: $particles.particles)
            
            if showScorePopup {
                FloatingScoreText(text: "+\(lastScoreGain)", color: StormColors.neonGreen)
            }
        }
        .screenShake(isShaking: $isShaking)
        .onAppear { startGame() }
        .onDisappear { timer?.invalidate(); particles.clear() }
    }
    
    private func startGame() {
        generateTargets()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            guard !gameOver else { return }
            timeLeft -= 0.1
            
            // Move targets
            for i in targets.indices {
                targets[i].x += targets[i].dx
                targets[i].y += targets[i].dy
                
                if targets[i].x < 30 || targets[i].x > 350 { targets[i].dx *= -1 }
                if targets[i].y < 30 || targets[i].y > 500 { targets[i].dy *= -1 }
            }
            
            if timeLeft <= 0 { gameOver = true; timer?.invalidate() }
        }
    }
    
    private func generateTargets() {
        let question = QuestionBank.shared.randomQuestion(for: grade, type: .vocabulary)
        definition = question.prompt
        correctWord = question.correctAnswer
        
        targets = question.choices.enumerated().map { index, choice in
            WordTarget(
                id: UUID(),
                word: choice,
                isCorrect: index == question.correctIndex,
                x: CGFloat.random(in: 50...320),
                y: CGFloat.random(in: 50...450),
                dx: CGFloat.random(in: -1.5...1.5),
                dy: CGFloat.random(in: -1...1)
            )
        }
    }
    
    private func shootTarget(_ target: WordTarget) {
        let hitPoint = CGPoint(x: target.x, y: target.y + 160) // offset for headers
        
        if target.isCorrect {
            SoundManager.shared.playCorrect()
            combo += 1
            let gain = 15 * combo
            score += gain
            PlayerProgress.shared.addCoins(5)
            
            // Hit particles
            particles.emit(ParticleBurst.explosion(at: hitPoint, color: theme.accentColor))
            particles.emit(ParticleBurst.scoreRise(at: hitPoint))
            if combo > 2 {
                particles.emit(ParticleBurst.combo(at: hitPoint, multiplier: combo))
            }
            
            lastScoreGain = gain
            showScorePopup = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { showScorePopup = false }
            
            if score > level * 100 { level += 1 }
            generateTargets()
        } else {
            SoundManager.shared.playIncorrect()
            combo = 0
            lives -= 1
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: hitPoint))
            targets.removeAll { $0.id == target.id }
            if lives <= 0 { gameOver = true; timer?.invalidate() }
        }
    }
    
    private func resetGame() {
        score = 0; lives = 3; level = 1; combo = 0; timeLeft = 45; gameOver = false
        startGame()
    }
}

struct WordTarget: Identifiable {
    let id: UUID
    let word: String
    let isCorrect: Bool
    var x: CGFloat
    var y: CGFloat
    var dx: CGFloat
    var dy: CGFloat
}

// MARK: - Enhanced Target Bubble

struct EnhancedTargetBubble: View {
    let target: WordTarget
    let theme: GameTheme
    @State private var pulse = false
    @State private var rotation: Double = 0
    
    var body: some View {
        ZStack {
            // Outer glow ring
            Circle()
                .fill(
                    RadialGradient(colors: [theme.accentColor.opacity(0.25), .clear], center: .center, startRadius: 10, endRadius: 50)
                )
                .frame(width: 95, height: 95)
                .scaleEffect(pulse ? 1.15 : 1.0)
            
            // Rotating ring
            Circle()
                .trim(from: 0, to: 0.7)
                .stroke(theme.accentColor.opacity(0.3), lineWidth: 1.5)
                .frame(width: 82, height: 82)
                .rotationEffect(.degrees(rotation))
            
            // Main bubble
            Circle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 74, height: 74)
                .overlay(
                    Circle()
                        .stroke(
                            LinearGradient(
                                colors: [theme.accentColor, theme.accentColor.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 2
                        )
                )
            
            // Word text
            Text(target.word)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .shadow(color: .black, radius: 2)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(width: 60)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                pulse = true
            }
            withAnimation(.linear(duration: 6).repeatForever(autoreverses: false)) {
                rotation = 360
            }
        }
    }
}

struct TargetBubble: View {
    let target: WordTarget
    var body: some View {
        EnhancedTargetBubble(target: target, theme: .ocean)
    }
}

// MARK: - Crosshair Overlay

struct CrosshairOverlay: View {
    @State private var pulse = false
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(StormColors.neonRed.opacity(0.2), lineWidth: 1)
                .frame(width: 120, height: 120)
                .scaleEffect(pulse ? 1.05 : 0.95)
            
            Circle()
                .stroke(StormColors.neonRed.opacity(0.15), lineWidth: 0.5)
                .frame(width: 80, height: 80)
            
            // Crosshair lines
            Rectangle()
                .fill(StormColors.neonRed.opacity(0.15))
                .frame(width: 1, height: 140)
            Rectangle()
                .fill(StormColors.neonRed.opacity(0.15))
                .frame(width: 140, height: 1)
            
            Circle()
                .fill(StormColors.neonRed.opacity(0.1))
                .frame(width: 4, height: 4)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }
}
