import SwiftUI

struct DailyChallengeView: View {
    @ObservedObject var progress = PlayerProgress.shared
    @State private var questions: [Question] = []
    @State private var currentIndex = 0
    @State private var score = 0
    @State private var streak = 0
    @State private var completed = false
    @State private var selectedAnswer: Int? = nil
    @State private var isCorrect = false
    
    private let questionCount = 10
    
    var body: some View {
        ZStack {
            AnimatedStormBackground()
            
            if progress.dailyChallengeCompleted || completed {
                completedView
            } else if questions.isEmpty {
                loadingView
            } else {
                challengeContent
            }
        }
        .navigationTitle("Daily Challenge")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if !progress.dailyChallengeCompleted {
                questions = QuestionBank.shared.randomQuestions(for: progress.selectedGrade, count: questionCount)
            }
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .tint(StormColors.neonBlue)
            Text("Loading challenge...")
                .foregroundColor(.white.opacity(0.6))
        }
    }
    
    private var challengeContent: some View {
        VStack(spacing: 20) {
            // Progress
            VStack(spacing: 8) {
                HStack {
                    Text("Question \(currentIndex + 1) of \(questionCount)")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonBlue)
                    Spacer()
                    Text("Score: \(score)")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonYellow)
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3).fill(Color.white.opacity(0.1))
                        RoundedRectangle(cornerRadius: 3)
                            .fill(StormColors.heroGradient)
                            .frame(width: geo.size.width * CGFloat(currentIndex) / CGFloat(questionCount))
                    }
                }
                .frame(height: 6)
            }
            .padding(.horizontal)
            
            if streak > 1 {
                Text("\(streak) STREAK!")
                    .font(.headline.bold())
                    .foregroundColor(StormColors.neonOrange)
            }
            
            Spacer()
            
            // Daily challenge badge
            VStack(spacing: 8) {
                Text("🏆").font(.system(size: 40))
                Text("DAILY CHALLENGE")
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonYellow)
                    .tracking(2)
            }
            
            if currentIndex < questions.count {
                let q = questions[currentIndex]
                
                VStack(spacing: 20) {
                    HStack {
                        Image(systemName: q.type.iconName)
                        Text(q.type.displayName)
                    }
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonCyan)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(StormColors.neonCyan.opacity(0.15))
                    .cornerRadius(10)
                    
                    Text(q.prompt)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    VStack(spacing: 10) {
                        ForEach(q.choices.indices, id: \.self) { i in
                            Button(action: { answer(i) }) {
                                HStack {
                                    Text(["A","B","C","D"][i])
                                        .font(.headline.bold())
                                        .frame(width: 32, height: 32)
                                        .background(answerBg(i, q: q))
                                        .cornerRadius(8)
                                    
                                    Text(q.choices[i])
                                        .font(.body.bold())
                                        .foregroundColor(.white)
                                    Spacer()
                                    
                                    if let sel = selectedAnswer, sel == i {
                                        Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .foregroundColor(isCorrect ? StormColors.neonGreen : StormColors.neonRed)
                                    }
                                }
                                .padding(12)
                                .background(StormColors.surface)
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(answerBorder(i, q: q), lineWidth: 2)
                                )
                            }
                            .disabled(selectedAnswer != nil)
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
            
            Spacer()
        }
    }
    
    private var completedView: some View {
        VStack(spacing: 24) {
            Text("🏆").font(.system(size: 80))
            
            Text("CHALLENGE COMPLETE!")
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.goldGradient)
            
            if completed {
                VStack(spacing: 8) {
                    Text("Score: \(score)")
                        .font(.title.bold())
                        .foregroundColor(StormColors.neonYellow)
                    Text("+50 bonus XP • +25 coins")
                        .font(.subheadline)
                        .foregroundColor(StormColors.neonGreen)
                }
            } else {
                Text("Come back tomorrow for a new challenge!")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
    }
    
    // MARK: - Logic
    
    private func answer(_ index: Int) {
        guard selectedAnswer == nil, currentIndex < questions.count else { return }
        let q = questions[currentIndex]
        selectedAnswer = index
        isCorrect = index == q.correctIndex
        
        if isCorrect {
            SoundManager.shared.playCorrect()
            streak += 1
            score += q.points * (1 + streak / 3)
        } else {
            SoundManager.shared.playIncorrect()
            streak = 0
        }
        
        PlayerProgress.shared.recordAnswer(correct: isCorrect)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            selectedAnswer = nil
            currentIndex += 1
            
            if currentIndex >= questionCount {
                completed = true
                progress.dailyChallengeCompleted = true
                progress.addCoins(25)
                progress.addXP(50)
            }
        }
    }
    
    private func answerBg(_ i: Int, q: Question) -> Color {
        guard let sel = selectedAnswer else { return Color.white.opacity(0.1) }
        if sel == i { return isCorrect ? StormColors.neonGreen.opacity(0.3) : StormColors.neonRed.opacity(0.3) }
        return Color.white.opacity(0.05)
    }
    
    private func answerBorder(_ i: Int, q: Question) -> Color {
        guard let sel = selectedAnswer else { return Color.white.opacity(0.1) }
        if sel == i { return isCorrect ? StormColors.neonGreen : StormColors.neonRed }
        if i == q.correctIndex { return StormColors.neonGreen.opacity(0.5) }
        return Color.clear
    }
}
