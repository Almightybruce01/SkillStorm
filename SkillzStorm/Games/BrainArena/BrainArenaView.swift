import SwiftUI

// MARK: - Brain Arena (Timed Quiz Arena)

struct BrainArenaView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var score = 0
    @State private var streak = 0
    @State private var maxStreak = 0
    @State private var totalAnswered = 0
    @State private var totalCorrect = 0
    @State private var timeRemaining: Double = 60
    @State private var currentQuestion: Question?
    @State private var selectedAnswer: Int? = nil
    @State private var showResult = false
    @State private var isCorrect = false
    @State private var gameOver = false
    @State private var timer: Timer?
    @State private var multiplier = 1
    @State private var shakeAmount: CGFloat = 0
    @StateObject private var particles = ParticleManager()
    @State private var showCorrectFlash = false
    @State private var showWrongFlash = false
    @State private var isShaking = false
    @State private var showScorePopup = false
    @State private var lastScoreGain = 0
    
    private let totalTime: Double = 60
    private let theme: GameTheme = .arena
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                resultsView
            } else {
                gameContent
            }
            
            // Particles
            ParticleEmitter(particles: $particles.particles)
            
            // Flash overlays
            AnswerFlash(isCorrect: true, isVisible: $showCorrectFlash)
            AnswerFlash(isCorrect: false, isVisible: $showWrongFlash)
            
            if showScorePopup {
                FloatingScoreText(text: "+\(lastScoreGain)", color: StormColors.neonYellow)
            }
        }
        .screenShake(isShaking: $isShaking)
        .onAppear {
            nextQuestion()
            startTimer()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }
    
    // MARK: - Game Content
    
    private var gameContent: some View {
        VStack(spacing: 16) {
            // HUD
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("BRAIN ARENA")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonPurple)
                        .tracking(2)
                    Text("\(Int(timeRemaining))s")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundColor(timeRemaining < 10 ? StormColors.neonRed : .white)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("SCORE")
                        .font(.caption2.bold())
                        .foregroundColor(.white.opacity(0.5))
                    Text("\(score)")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundColor(StormColors.neonYellow)
                }
            }
            .padding(.horizontal)
            
            // Timer bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.1))
                    
                    RoundedRectangle(cornerRadius: 3)
                        .fill(
                            timeRemaining < 10
                            ? LinearGradient(colors: [StormColors.neonRed, StormColors.neonOrange], startPoint: .leading, endPoint: .trailing)
                            : StormColors.heroGradient
                        )
                        .frame(width: geo.size.width * (timeRemaining / totalTime))
                }
            }
            .frame(height: 6)
            .padding(.horizontal)
            
            // Streak & Multiplier
            HStack {
                if streak > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .foregroundColor(StormColors.neonOrange)
                        Text("\(streak) streak")
                            .font(.caption.bold())
                            .foregroundColor(StormColors.neonOrange)
                    }
                    .transition(.scale)
                }
                
                Spacer()
                
                if multiplier > 1 {
                    Text("\(multiplier)x")
                        .font(.headline.bold())
                        .foregroundColor(StormColors.neonYellow)
                        .neonGlow(StormColors.neonYellow, radius: 6)
                        .transition(.scale)
                }
            }
            .padding(.horizontal)
            
            Spacer()
            
            // Question
            if let question = currentQuestion {
                VStack(spacing: 20) {
                    // Type badge
                    HStack {
                        Image(systemName: question.type.iconName)
                        Text(question.type.displayName)
                    }
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonCyan)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(StormColors.neonCyan.opacity(0.15))
                    .cornerRadius(12)
                    
                    // Prompt
                    Text(question.prompt)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                        .modifier(ShakeEffect(amount: 10, shakesPerUnit: 3, animatableData: shakeAmount))
                    
                    // Points
                    Text("+\(question.points * multiplier) pts")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonYellow)
                    
                    // Choices
                    VStack(spacing: 10) {
                        ForEach(question.choices.indices, id: \.self) { index in
                            Button(action: { answer(index) }) {
                                HStack {
                                    Text(["A","B","C","D"][index])
                                        .font(.headline.bold())
                                        .foregroundColor(choiceColor(index, question: question))
                                        .frame(width: 36, height: 36)
                                        .background(choiceBg(index, question: question))
                                        .cornerRadius(10)
                                    
                                    Text(question.choices[index])
                                        .font(.body.bold())
                                        .foregroundColor(.white)
                                    
                                    Spacer()
                                    
                                    if let sel = selectedAnswer, sel == index {
                                        Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .foregroundColor(isCorrect ? StormColors.neonGreen : StormColors.neonRed)
                                    }
                                }
                                .padding(12)
                                .background(StormColors.surface)
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(choiceBorder(index, question: question), lineWidth: 2)
                                )
                            }
                            .disabled(selectedAnswer != nil)
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
            
            Spacer()
            
            // Stats bar
            HStack(spacing: 30) {
                VStack {
                    Text("\(totalAnswered)")
                        .font(.headline.bold())
                        .foregroundColor(.white)
                    Text("Answered")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                }
                VStack {
                    Text("\(totalCorrect)")
                        .font(.headline.bold())
                        .foregroundColor(StormColors.neonGreen)
                    Text("Correct")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                }
                VStack {
                    Text(totalAnswered > 0 ? "\(Int(Double(totalCorrect) / Double(totalAnswered) * 100))%" : "0%")
                        .font(.headline.bold())
                        .foregroundColor(StormColors.neonBlue)
                    Text("Accuracy")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .padding(.bottom, 20)
        }
    }
    
    // MARK: - Results
    
    private var resultsView: some View {
        VStack(spacing: 24) {
            Text("TIME'S UP!")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.heroGradient)
            
            Text("🧠")
                .font(.system(size: 60))
            
            // Rank
            Text(rankTitle)
                .font(.title2.bold())
                .foregroundColor(rankColor)
            
            // Stats grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                resultStat("Score", "\(score)", StormColors.neonYellow)
                resultStat("Answered", "\(totalAnswered)", .white)
                resultStat("Correct", "\(totalCorrect)", StormColors.neonGreen)
                resultStat("Accuracy", totalAnswered > 0 ? "\(Int(Double(totalCorrect) / Double(totalAnswered) * 100))%" : "0%", StormColors.neonBlue)
                resultStat("Max Streak", "\(maxStreak)", StormColors.neonOrange)
                resultStat("Best Multi", "\(multiplier)x", StormColors.neonPurple)
            }
            .padding(.horizontal, 30)
            
            VStack(spacing: 12) {
                StormButton("Play Again", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                    resetGame()
                }
                StormButton("Exit", icon: "xmark") {
                    PlayerProgress.shared.recordGamePlayed(gameId: "brain_arena", score: score)
                    onExit()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.85))
    }
    
    private func resultStat(_ label: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.bold())
                .foregroundColor(color)
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .glassCard()
    }
    
    private var rankTitle: String {
        let acc = totalAnswered > 0 ? Double(totalCorrect) / Double(totalAnswered) : 0
        if acc >= 0.9 { return "GENIUS" }
        if acc >= 0.7 { return "SCHOLAR" }
        if acc >= 0.5 { return "APPRENTICE" }
        return "ROOKIE"
    }
    
    private var rankColor: Color {
        let acc = totalAnswered > 0 ? Double(totalCorrect) / Double(totalAnswered) : 0
        if acc >= 0.9 { return StormColors.neonYellow }
        if acc >= 0.7 { return StormColors.neonBlue }
        if acc >= 0.5 { return StormColors.neonGreen }
        return .white
    }
    
    // MARK: - Logic
    
    private func nextQuestion() {
        selectedAnswer = nil
        showResult = false
        currentQuestion = QuestionBank.shared.randomQuestion(for: grade)
    }
    
    private func answer(_ index: Int) {
        guard let q = currentQuestion, selectedAnswer == nil else { return }
        selectedAnswer = index
        totalAnswered += 1
        
        let correct = index == q.correctIndex
        isCorrect = correct
        
        PlayerProgress.shared.recordAnswer(correct: correct)
        
        if correct {
            SoundManager.shared.playCorrect()
            streak += 1
            maxStreak = max(maxStreak, streak)
            multiplier = min(5, 1 + streak / 3)
            let gain = q.points * multiplier
            score += gain
            PlayerProgress.shared.addCoins(q.points / 2)
            totalCorrect += 1
            
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
            multiplier = 1
            
            showWrongFlash = true
            isShaking = true
            withAnimation { shakeAmount += 1 }
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: 200, y: 400)))
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { nextQuestion() }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            guard !gameOver else { return }
            timeRemaining -= 0.1
            if timeRemaining <= 0 {
                timer?.invalidate()
                gameOver = true
                SoundManager.shared.playGameOver()
            }
        }
    }
    
    private func resetGame() {
        score = 0
        streak = 0
        maxStreak = 0
        totalAnswered = 0
        totalCorrect = 0
        multiplier = 1
        timeRemaining = totalTime
        gameOver = false
        nextQuestion()
        startTimer()
    }
    
    // MARK: - Styling helpers
    
    private func choiceColor(_ index: Int, question: Question) -> Color {
        guard let sel = selectedAnswer else { return .white }
        if sel == index { return isCorrect ? StormColors.neonGreen : StormColors.neonRed }
        return .white.opacity(0.4)
    }
    
    private func choiceBg(_ index: Int, question: Question) -> Color {
        guard let sel = selectedAnswer else { return Color.white.opacity(0.1) }
        if sel == index { return isCorrect ? StormColors.neonGreen.opacity(0.2) : StormColors.neonRed.opacity(0.2) }
        return Color.white.opacity(0.05)
    }
    
    private func choiceBorder(_ index: Int, question: Question) -> Color {
        guard let sel = selectedAnswer else { return Color.white.opacity(0.1) }
        if sel == index { return isCorrect ? StormColors.neonGreen : StormColors.neonRed }
        if index == question.correctIndex { return StormColors.neonGreen.opacity(0.5) }
        return Color.clear
    }
}
