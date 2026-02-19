import SwiftUI

// MARK: - Multiplication Meteors (Tap correct answers falling from sky)

struct MultiplicationMeteorsView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var score = 0
    @State private var lives = 5
    @State private var level = 1
    @State private var meteors: [Meteor] = []
    @State private var targetEquation = ""
    @State private var targetAnswer = 0
    @State private var gameOver = false
    @State private var timer: Timer?
    @State private var spawnTimer: Timer?
    @StateObject private var particles = ParticleManager()
    @State private var combo = 0
    @State private var isShaking = false
    @State private var showScorePopup = false
    @State private var lastScoreGain = 0
    
    private let theme: GameTheme = .space
    
    var body: some View {
        ZStack {
            // Enhanced animated space background
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["multiplication_meteors"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "multiplication_meteors", score: score)
                        onExit()
                    }
                )
            } else {
                gameContent
            }
            
            // Particle effects
            ParticleEmitter(particles: $particles.particles)
            
            // Score popup
            if showScorePopup {
                FloatingScoreText(text: "+\(lastScoreGain)", color: StormColors.neonYellow)
            }
        }
        .screenShake(isShaking: $isShaking)
        .onAppear { startGame() }
        .onDisappear { stopTimers(); particles.clear() }
    }
    
    private var gameContent: some View {
        VStack {
            // Enhanced HUD
            GameTopBar(
                theme: theme,
                score: score,
                level: level,
                lives: lives,
                maxLives: 5,
                combo: combo
            )
            
            // Target equation with glow
            Text(targetEquation)
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundColor(StormColors.neonCyan)
                .shadow(color: StormColors.neonCyan.opacity(0.6), radius: 12)
                .padding()
            
            // Meteor field
            GeometryReader { geo in
                ZStack {
                    ForEach(meteors) { meteor in
                        EnhancedMeteorView(meteor: meteor)
                            .position(x: meteor.x, y: meteor.y)
                            .onTapGesture {
                                tapMeteor(meteor, in: geo.size)
                            }
                    }
                }
            }
        }
    }
    
    // MARK: - Logic
    
    private func startGame() {
        generateTarget()
        
        spawnTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            guard !gameOver else { return }
            spawnMeteor()
        }
        
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            guard !gameOver else { return }
            updateMeteors()
        }
    }
    
    private func generateTarget() {
        let a = Int.random(in: 2...12)
        let b = Int.random(in: 2...12)
        targetAnswer = a * b
        targetEquation = "\(a) × \(b) = ?"
    }
    
    private func spawnMeteor() {
        let isCorrect = Bool.random() && Bool.random() // ~25% correct
        let value = isCorrect ? targetAnswer : targetAnswer + Int.random(in: -10...10)
        let correctedValue = value == targetAnswer ? value : (value == 0 ? 1 : value)
        
        let meteor = Meteor(
            id: UUID(),
            x: CGFloat.random(in: 40...340),
            y: -30,
            value: isCorrect ? targetAnswer : correctedValue,
            isCorrect: isCorrect || correctedValue == targetAnswer,
            speed: CGFloat.random(in: 1...2) + CGFloat(level) * 0.3
        )
        meteors.append(meteor)
    }
    
    private func updateMeteors() {
        for i in meteors.indices.reversed() {
            meteors[i].y += meteors[i].speed
            
            if meteors[i].y > 900 {
                if meteors[i].isCorrect || meteors[i].value == targetAnswer {
                    lives -= 1
                    if lives <= 0 { gameOver = true; stopTimers() }
                }
                meteors.remove(at: i)
            }
        }
    }
    
    private func tapMeteor(_ meteor: Meteor, in size: CGSize = CGSize(width: 400, height: 800)) {
        guard let index = meteors.firstIndex(where: { $0.id == meteor.id }) else { return }
        
        let meteorPoint = CGPoint(x: meteor.x, y: meteor.y + 150) // offset for header
        
        if meteor.value == targetAnswer {
            SoundManager.shared.playCorrect()
            combo += 1
            let gain = 10 * level * (1 + combo / 3)
            score += gain
            PlayerProgress.shared.addCoins(5)
            
            // Explosion particles
            particles.emit(ParticleBurst.explosion(at: meteorPoint, color: StormColors.neonBlue))
            if combo > 2 {
                particles.emit(ParticleBurst.combo(at: meteorPoint, multiplier: combo))
            }
            particles.emit(ParticleBurst.scoreRise(at: meteorPoint))
            
            lastScoreGain = gain
            showScorePopup = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { showScorePopup = false }
            
            let _ = withAnimation { meteors.remove(at: index) }
            
            if score > level * 80 { level += 1 }
            generateTarget()
        } else {
            SoundManager.shared.playIncorrect()
            combo = 0
            lives -= 1
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: meteorPoint))
            let _ = withAnimation { meteors.remove(at: index) }
            if lives <= 0 { gameOver = true; stopTimers() }
        }
    }
    
    private func stopTimers() {
        timer?.invalidate()
        spawnTimer?.invalidate()
    }
    
    private func resetGame() {
        score = 0; lives = 5; level = 1; meteors = []; gameOver = false
        startGame()
    }
}

struct Meteor: Identifiable {
    let id: UUID
    var x: CGFloat
    var y: CGFloat
    var value: Int
    var isCorrect: Bool
    var speed: CGFloat
}

struct EnhancedMeteorView: View {
    let meteor: Meteor
    @State private var rotation: Double = 0
    @State private var pulse = false
    
    var body: some View {
        ZStack {
            // Outer glow trail
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.orange.opacity(0.4), Color.red.opacity(0.15), .clear],
                        center: .center,
                        startRadius: 5,
                        endRadius: 45
                    )
                )
                .frame(width: 90, height: 90)
                .scaleEffect(pulse ? 1.15 : 1.0)
            
            // Core meteor
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.white, Color.orange, Color.red.opacity(0.8)],
                        center: UnitPoint(x: 0.35, y: 0.35),
                        startRadius: 2,
                        endRadius: 28
                    )
                )
                .frame(width: 56, height: 56)
                .shadow(color: .orange.opacity(0.6), radius: 10)
            
            // Crater details
            Circle()
                .fill(Color.red.opacity(0.3))
                .frame(width: 12, height: 12)
                .offset(x: 8, y: -6)
            Circle()
                .fill(Color.red.opacity(0.2))
                .frame(width: 8, height: 8)
                .offset(x: -10, y: 8)
            
            // Number value
            Text("\(meteor.value)")
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundColor(.white)
                .shadow(color: .black, radius: 3)
        }
        .rotationEffect(.degrees(rotation))
        .onAppear {
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                rotation = 360
            }
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }
}

struct MeteorView: View {
    let meteor: Meteor
    var body: some View {
        EnhancedMeteorView(meteor: meteor)
    }
}
