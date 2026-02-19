import SwiftUI

// MARK: - Speed Multiplication (Beat your record multiplication drill)

struct SpeedMultiplicationView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var a = 0
    @State private var b = 0
    @State private var answer = 0
    @State private var choices: [Int] = []
    @State private var score = 0
    @State private var streak = 0
    @State private var bestStreak = 0
    @State private var timeLeft: Double = 30
    @State private var gameOver = false
    @State private var timer: Timer?
    @State private var totalAnswered = 0
    @State private var totalCorrect = 0
    @StateObject private var particles = ParticleManager()
    @State private var isShaking = false
    @State private var showScorePopup = false
    @State private var lastScoreGain = 0
    
    private let theme: GameTheme = .speed
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["speed_multiplication"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "speed_multiplication", score: score)
                        onExit()
                    }
                )
            } else {
                VStack(spacing: 20) {
                    // Enhanced HUD
                    GameTopBar(
                        theme: theme,
                        score: score,
                        timer: Int(timeLeft),
                        combo: streak
                    )
                    
                    Spacer()
                    
                    // Problem display with glow
                    VStack(spacing: 4) {
                        Text("\(a) × \(b)")
                            .font(.system(size: 56, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: theme.accentColor.opacity(0.4), radius: 12)
                        
                        Text("= ?")
                            .font(.title)
                            .foregroundColor(StormColors.neonCyan)
                            .shadow(color: StormColors.neonCyan.opacity(0.5), radius: 6)
                    }
                    
                    Spacer()
                    
                    // Enhanced number pad
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(choices, id: \.self) { choice in
                            Button(action: { tap(choice) }) {
                                Text("\(choice)")
                                    .font(.system(size: 28, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity, minHeight: 70)
                                    .background(
                                        LinearGradient(
                                            colors: [Color.white.opacity(0.06), Color.white.opacity(0.02)],
                                            startPoint: .top,
                                            endPoint: .bottom
                                        )
                                    )
                                    .cornerRadius(16)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(theme.accentColor.opacity(0.2), lineWidth: 1)
                                    )
                                    .shadow(color: theme.accentColor.opacity(0.1), radius: 4)
                            }
                        }
                    }.padding(.horizontal, 20)
                    
                    Spacer()
                }
            }
            
            ParticleEmitter(particles: $particles.particles)
            
            if showScorePopup {
                FloatingScoreText(text: "+\(lastScoreGain)", color: StormColors.neonYellow)
            }
        }
        .screenShake(isShaking: $isShaking)
        .onAppear { startGame() }
        .onDisappear { timer?.invalidate(); particles.clear() }
    }
    
    private func startGame() {
        generateProblem()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            guard !gameOver else { return }
            timeLeft -= 0.1
            if timeLeft <= 0 { gameOver = true; timer?.invalidate() }
        }
    }
    
    private func generateProblem() {
        let range: ClosedRange<Int> = grade == .k2 ? 1...5 : (grade == .three5 ? 2...12 : 3...15)
        a = Int.random(in: range)
        b = Int.random(in: range)
        answer = a * b
        
        var set: Set<Int> = [answer]
        while set.count < 4 {
            let wrong = answer + Int.random(in: -10...10)
            if wrong > 0 && wrong != answer { set.insert(wrong) }
        }
        choices = Array(set).shuffled()
    }
    
    private func tap(_ choice: Int) {
        totalAnswered += 1
        if choice == answer {
            SoundManager.shared.playCorrect()
            streak += 1
            bestStreak = max(bestStreak, streak)
            let gain = 10 * (1 + streak / 3)
            score += gain
            totalCorrect += 1
            timeLeft = min(30, timeLeft + 1)
            
            particles.emit(ParticleBurst.correct(at: CGPoint(x: 200, y: 350)))
            if streak > 2 {
                particles.emit(ParticleBurst.combo(at: CGPoint(x: 200, y: 300), multiplier: streak))
            }
            lastScoreGain = gain
            showScorePopup = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { showScorePopup = false }
        } else {
            SoundManager.shared.playIncorrect()
            streak = 0
            timeLeft = max(0, timeLeft - 2)
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: 200, y: 350)))
        }
        generateProblem()
    }
    
    private func resetGame() {
        score = 0; streak = 0; bestStreak = 0; timeLeft = 30; totalAnswered = 0; totalCorrect = 0; gameOver = false
        startGame()
    }
}
