import SwiftUI

// MARK: - Fraction Frenzy (Fast fraction matching and solving)

struct FractionFrenzyView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var score = 0
    @State private var level = 1
    @State private var timeLeft: Double = 30
    @State private var question: Question?
    @State private var gameOver = false
    @State private var streak = 0
    @State private var timer: Timer?
    @StateObject private var particles = ParticleManager()
    @State private var showCorrectFlash = false
    @State private var showWrongFlash = false
    @State private var isShaking = false
    @State private var showScorePopup = false
    @State private var lastScoreGain = 0
    
    private let theme: GameTheme = .laboratory
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["fraction_frenzy"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "fraction_frenzy", score: score)
                        onExit()
                    }
                )
            } else {
                VStack(spacing: 16) {
                    // Enhanced HUD
                    GameTopBar(
                        theme: theme,
                        score: score,
                        level: level,
                        timer: Int(timeLeft),
                        combo: streak
                    )
                    
                    Spacer()
                    
                    if let q = question {
                        VStack(spacing: 20) {
                            // Question prompt with glow
                            Text(q.prompt)
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                                .shadow(color: theme.accentColor.opacity(0.4), radius: 8)
                            
                            // Enhanced grid buttons
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                ForEach(q.choices.indices, id: \.self) { i in
                                    Button(action: { answerTap(i) }) {
                                        Text(q.choices[i])
                                            .font(.title3.bold())
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity, minHeight: 70)
                                            .background(
                                                LinearGradient(
                                                    colors: [Color.white.opacity(0.06), Color.white.opacity(0.02)],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
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
                        }
                    }
                    
                    Spacer()
                }
            }
            
            // Particle effects
            ParticleEmitter(particles: $particles.particles)
            
            // Flash overlays
            AnswerFlash(isCorrect: true, isVisible: $showCorrectFlash)
            AnswerFlash(isCorrect: false, isVisible: $showWrongFlash)
            
            if showScorePopup {
                FloatingScoreText(text: "+\(lastScoreGain)", color: theme.accentColor)
            }
        }
        .screenShake(isShaking: $isShaking)
        .onAppear { startGame() }
        .onDisappear { timer?.invalidate(); particles.clear() }
    }
    
    private func startGame() {
        nextQuestion()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            guard !gameOver else { return }
            timeLeft -= 0.1
            if timeLeft <= 0 { gameOver = true; timer?.invalidate() }
        }
    }
    
    private func nextQuestion() {
        question = QuestionBank.shared.randomQuestion(for: grade, type: .math)
    }
    
    private func answerTap(_ index: Int) {
        guard let q = question else { return }
        if index == q.correctIndex {
            SoundManager.shared.playCorrect()
            streak += 1
            let gain = 10 * (1 + streak / 3)
            score += gain
            timeLeft = min(30, timeLeft + 2)
            
            showCorrectFlash = true
            lastScoreGain = gain
            showScorePopup = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { showScorePopup = false }
            particles.emit(ParticleBurst.correct(at: CGPoint(x: 200, y: 400)))
            if streak > 2 {
                particles.emit(ParticleBurst.combo(at: CGPoint(x: 200, y: 350), multiplier: streak))
            }
        } else {
            SoundManager.shared.playIncorrect()
            streak = 0
            timeLeft = max(0, timeLeft - 3)
            
            showWrongFlash = true
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: 200, y: 400)))
        }
        nextQuestion()
    }
    
    private func resetGame() {
        score = 0; level = 1; timeLeft = 30; streak = 0; gameOver = false
        startGame()
    }
}
