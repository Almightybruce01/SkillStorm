import SwiftUI

// MARK: - Bull Run Logic (Solve equations before the bull catches you)

struct BullRunLogicView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @State private var score = 0
    @State private var level = 1
    @State private var lives = 3
    @State private var bullDistance: CGFloat = 0.0  // 0 = far, 1 = caught
    @State private var question: Question?
    @State private var gameOver = false
    @State private var showGate = false
    @State private var timer: Timer?
    @State private var bullSpeed: Double = 0.02
    @State private var screenShake: CGFloat = 0
    @State private var questionsAnswered = 0
    
    @StateObject private var particles = ParticleManager()
    @State private var isShaking = false
    
    private let theme: GameTheme = .nature
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                gameOverView
            } else if showGate {
                KnowledgeGateView(engine: gateEngine, grade: grade) { result in
                    showGate = false
                    if result == .correct {
                        level += 1
                        bullDistance = max(0, bullDistance - 0.3)
                        bullSpeed += 0.005
                    } else {
                        lives -= 1
                        if lives <= 0 { gameOver = true }
                    }
                    resumeTimer()
                }
            } else {
                mainGame
            }
        }
        .overlay { ParticleEmitter(particles: $particles.particles) }
        .screenShake(isShaking: $isShaking)
        .modifier(ShakeEffect(amount: bullDistance > 0.7 ? 4 : 0, shakesPerUnit: 3, animatableData: screenShake))
        .onAppear {
            generateQuestion()
            startBullChase()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }
    
    // MARK: - Main Game
    
    private var mainGame: some View {
        VStack(spacing: 0) {
            // Enhanced HUD
            GameTopBar(
                theme: theme,
                score: score,
                level: level,
                lives: lives
            )
            
            // Bull chase visualization
            VStack(spacing: 8) {
                // Distance bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white.opacity(0.1))
                        
                        RoundedRectangle(cornerRadius: 8)
                            .fill(
                                LinearGradient(
                                    colors: bullDistance > 0.7 ? [.red, .orange] : [.green, .yellow],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * min(1, bullDistance))
                            .animation(.linear(duration: 0.1), value: bullDistance)
                    }
                }
                .frame(height: 12)
                .padding(.horizontal)
                
                // Bull and runner
                HStack {
                    Text("🐂")
                        .font(.system(size: 50))
                        .offset(x: bullDistance > 0.5 ? CGFloat.random(in: -3...3) : 0)
                    
                    Spacer()
                    
                    Text(bullDistance > 0.7 ? "😱" : "🏃")
                        .font(.system(size: 40))
                }
                .padding(.horizontal, 30)
                
                if bullDistance > 0.7 {
                    Text("THE BULL IS CLOSE! SOLVE FASTER!")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonRed)
                        .neonGlow(StormColors.neonRed, radius: 4)
                }
            }
            .padding(.vertical, 20)
            
            Spacer()
            
            // Question area
            if let question = question {
                VStack(spacing: 20) {
                    // Question type
                    HStack {
                        Image(systemName: question.type.iconName)
                        Text(question.type.displayName)
                    }
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonCyan)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(StormColors.neonCyan.opacity(0.15))
                    .cornerRadius(10)
                    
                    // Prompt
                    Text(question.prompt)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    // Choices
                    VStack(spacing: 10) {
                        ForEach(question.choices.indices, id: \.self) { index in
                            Button(action: { answerQuestion(index) }) {
                                Text(question.choices[index])
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(
                                        LinearGradient(
                                            colors: [StormColors.surface, StormColors.surfaceLight],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .cornerRadius(16)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                    )
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
            
            Spacer()
        }
    }
    
    // MARK: - Game Over
    
    private var gameOverView: some View {
        GameOverOverlay(
            score: score,
            highScore: PlayerProgress.shared.highScores["bull_run_logic"] ?? 0,
            theme: theme,
            onReplay: { resetGame() },
            onExit: {
                PlayerProgress.shared.recordGamePlayed(gameId: "bull_run_logic", score: score)
                onExit()
            }
        )
    }
    
    // MARK: - Logic
    
    private func generateQuestion() {
        question = QuestionBank.shared.randomQuestion(for: grade)
    }
    
    private func answerQuestion(_ index: Int) {
        guard let q = question else { return }
        questionsAnswered += 1
        
        if index == q.correctIndex {
            SoundManager.shared.playCorrect()
            score += q.points * level
            bullDistance = max(0, bullDistance - 0.15)
            PlayerProgress.shared.recordAnswer(correct: true)
            PlayerProgress.shared.addCoins(q.points / 2)
            particles.emit(ParticleBurst.correct(at: CGPoint(x: 200, y: 400)))
            
            // Check for knowledge gate every 5 questions
            if questionsAnswered % 5 == 0 {
                timer?.invalidate()
                gateEngine.activateCheckpoint(grade: grade)
                showGate = true
                return
            }
        } else {
            SoundManager.shared.playIncorrect()
            bullDistance = min(1, bullDistance + 0.1)
            PlayerProgress.shared.recordAnswer(correct: false)
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: 200, y: 400)))
            
            if bullDistance >= 1 {
                lives -= 1
                if lives <= 0 {
                    gameOver = true
                    timer?.invalidate()
                    return
                }
                bullDistance = 0.5
            }
        }
        
        generateQuestion()
    }
    
    private func startBullChase() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            guard !gameOver && !showGate else { return }
            bullDistance = min(1, bullDistance + bullSpeed)
            
            if bullDistance > 0.7 {
                screenShake += 1
            }
            
            if bullDistance >= 1 {
                lives -= 1
                if lives <= 0 {
                    gameOver = true
                    timer?.invalidate()
                } else {
                    bullDistance = 0.5
                }
            }
        }
    }
    
    private func resumeTimer() {
        startBullChase()
    }
    
    private func resetGame() {
        score = 0
        level = 1
        lives = 3
        bullDistance = 0
        bullSpeed = 0.02
        questionsAnswered = 0
        gameOver = false
        generateQuestion()
        startBullChase()
    }
}
