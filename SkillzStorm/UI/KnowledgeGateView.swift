import SwiftUI

struct KnowledgeGateView: View {
    @ObservedObject var engine: KnowledgeGateEngine
    let grade: GradeLevel
    let onComplete: (GateResult) -> Void
    
    @State private var selectedChoice: Int? = nil
    @State private var shakeAmount: CGFloat = 0
    @State private var showHint = false
    @State private var hintText = ""
    
    var body: some View {
        ZStack {
            // Dark overlay
            Color.black.opacity(0.85)
                .ignoresSafeArea()
                .onTapGesture {} // Prevent tap-through
            
            VStack(spacing: 0) {
                // Gate Header
                gateHeader
                
                // Timer bar
                timerBar
                    .padding(.top, 8)
                
                // Question
                if let question = engine.currentQuestion {
                    questionSection(question)
                }
                
                // Hint
                if showHint {
                    Text(hintText)
                        .font(.caption)
                        .foregroundColor(StormColors.neonCyan)
                        .padding(12)
                        .background(StormColors.neonCyan.opacity(0.1))
                        .cornerRadius(12)
                        .padding(.horizontal, 20)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                
                // Power-up buttons
                powerUpBar
                    .padding(.top, 12)
                
                Spacer()
            }
            .padding(.top, 40)
            
            // Result overlay
            if engine.showResult {
                resultOverlay
            }
        }
    }
    
    // MARK: - Gate Header
    
    private var gateHeader: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: gateIcon)
                    .font(.title2)
                    .foregroundColor(gateColor)
                
                Text(gateTitle)
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundColor(.white)
            }
            .neonGlow(gateColor, radius: 8)
            
            if engine.gateType == .bossGate {
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { i in
                        Circle()
                            .fill(i < engine.bossIndex ? StormColors.neonGreen : Color.white.opacity(0.3))
                            .frame(width: 12, height: 12)
                    }
                }
            }
            
            if engine.gateType == .streakGate {
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { i in
                        Image(systemName: i < engine.streakCount ? "star.fill" : "star")
                            .foregroundColor(StormColors.neonYellow)
                    }
                }
            }
        }
    }
    
    private var gateIcon: String {
        switch engine.gateType {
        case .checkpoint: return "lock.fill"
        case .bossGate: return "flame.fill"
        case .speedGate: return "bolt.fill"
        case .streakGate: return "star.fill"
        }
    }
    
    private var gateTitle: String {
        switch engine.gateType {
        case .checkpoint: return "KNOWLEDGE GATE"
        case .bossGate: return "BOSS GATE"
        case .speedGate: return "SPEED GATE"
        case .streakGate: return "STREAK GATE"
        }
    }
    
    private var gateColor: Color {
        switch engine.gateType {
        case .checkpoint: return StormColors.neonBlue
        case .bossGate: return StormColors.neonRed
        case .speedGate: return StormColors.neonYellow
        case .streakGate: return StormColors.neonPurple
        }
    }
    
    // MARK: - Timer Bar
    
    private var timerBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.white.opacity(0.1))
                
                RoundedRectangle(cornerRadius: 4)
                    .fill(timerColor)
                    .frame(width: max(0, geo.size.width * timerProgress))
                    .animation(.linear(duration: 0.1), value: engine.timeRemaining)
            }
        }
        .frame(height: 6)
        .padding(.horizontal, 20)
    }
    
    private var timerProgress: CGFloat {
        switch engine.gateType {
        case .checkpoint: return engine.timeRemaining / 15.0
        case .bossGate: return engine.timeRemaining / 45.0
        case .speedGate: return engine.timeRemaining / 5.0
        case .streakGate: return engine.timeRemaining / 30.0
        }
    }
    
    private var timerColor: LinearGradient {
        if engine.timeRemaining < 3 {
            return LinearGradient(colors: [StormColors.neonRed, StormColors.neonOrange], startPoint: .leading, endPoint: .trailing)
        }
        return LinearGradient(colors: [gateColor, gateColor.opacity(0.7)], startPoint: .leading, endPoint: .trailing)
    }
    
    // MARK: - Question Section
    
    private func questionSection(_ question: Question) -> some View {
        VStack(spacing: 20) {
            // Question type badge
            HStack {
                Image(systemName: question.type.iconName)
                    .font(.caption)
                Text(question.type.displayName)
                    .font(.caption.bold())
            }
            .foregroundColor(StormColors.neonCyan)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(StormColors.neonCyan.opacity(0.15))
            .cornerRadius(12)
            
            // Prompt
            Text(question.prompt)
                .font(.title2.bold())
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
                .modifier(ShakeEffect(amount: 10, shakesPerUnit: 3, animatableData: shakeAmount))
            
            // Points
            Text("+\(question.points) pts")
                .font(.caption.bold())
                .foregroundColor(StormColors.neonYellow)
            
            // Choices
            VStack(spacing: 12) {
                ForEach(question.choices.indices, id: \.self) { index in
                    Button(action: {
                        guard selectedChoice == nil else { return }
                        selectedChoice = index
                        
                        let isCorrect = index == question.correctIndex
                        if isCorrect {
                            SoundManager.shared.playCorrect()
                        } else {
                            SoundManager.shared.playIncorrect()
                            withAnimation(.default) {
                                shakeAmount += 1
                            }
                        }
                        
                        engine.submitAnswer(choiceIndex: index, grade: grade) { result in
                            selectedChoice = nil
                            onComplete(result)
                        }
                    }) {
                        HStack {
                            Text(choiceLetter(index))
                                .font(.headline.bold())
                                .foregroundColor(choiceLetterColor(index, question: question))
                                .frame(width: 36, height: 36)
                                .background(choiceLetterBg(index, question: question))
                                .cornerRadius(10)
                            
                            Text(question.choices[index])
                                .font(.body.bold())
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            if let selected = selectedChoice, selected == index {
                                Image(systemName: index == question.correctIndex ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundColor(index == question.correctIndex ? StormColors.neonGreen : StormColors.neonRed)
                                    .transition(.scale)
                            }
                        }
                        .padding(14)
                        .background(choiceBackground(index, question: question))
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(choiceBorder(index, question: question), lineWidth: 2)
                        )
                    }
                    .disabled(selectedChoice != nil)
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.top, 20)
    }
    
    private func choiceLetter(_ index: Int) -> String {
        ["A", "B", "C", "D"][index]
    }
    
    private func choiceLetterColor(_ index: Int, question: Question) -> Color {
        guard let selected = selectedChoice else { return .white }
        if selected == index {
            return index == question.correctIndex ? StormColors.neonGreen : StormColors.neonRed
        }
        return .white.opacity(0.5)
    }
    
    private func choiceLetterBg(_ index: Int, question: Question) -> Color {
        guard let selected = selectedChoice else { return Color.white.opacity(0.1) }
        if selected == index {
            return index == question.correctIndex ? StormColors.neonGreen.opacity(0.2) : StormColors.neonRed.opacity(0.2)
        }
        return Color.white.opacity(0.05)
    }
    
    private func choiceBackground(_ index: Int, question: Question) -> Color {
        guard let selected = selectedChoice else { return StormColors.surface }
        if selected == index {
            return index == question.correctIndex ? StormColors.neonGreen.opacity(0.15) : StormColors.neonRed.opacity(0.15)
        }
        return StormColors.surface.opacity(0.5)
    }
    
    private func choiceBorder(_ index: Int, question: Question) -> Color {
        guard let selected = selectedChoice else { return Color.white.opacity(0.1) }
        if selected == index {
            return index == question.correctIndex ? StormColors.neonGreen : StormColors.neonRed
        }
        if index == question.correctIndex {
            return StormColors.neonGreen.opacity(0.5)
        }
        return Color.clear
    }
    
    // MARK: - Power-up Bar
    
    private var powerUpBar: some View {
        HStack(spacing: 16) {
            // Hint
            Button(action: {
                if let hint = engine.useHint() {
                    hintText = hint
                    withAnimation { showHint = true }
                }
            }) {
                VStack(spacing: 2) {
                    Image(systemName: "shield.fill")
                        .font(.title3)
                        .foregroundColor(StormColors.neonGreen)
                    Text("Hint")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.6))
                }
                .frame(width: 60, height: 50)
                .background(StormColors.surface)
                .cornerRadius(12)
            }
            
            // Skip
            Button(action: {
                engine.skipQuestion(grade: grade) { result in
                    onComplete(result)
                }
            }) {
                VStack(spacing: 2) {
                    Image(systemName: "forward.fill")
                        .font(.title3)
                        .foregroundColor(StormColors.neonYellow)
                    Text("Skip")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.6))
                }
                .frame(width: 60, height: 50)
                .background(StormColors.surface)
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Result Overlay
    
    private var resultOverlay: some View {
        VStack(spacing: 16) {
            Text(resultEmoji)
                .font(.system(size: 80))
                .transition(.scale)
            
            Text(resultTitle)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundColor(resultColor)
            
            if engine.lastResult == .incorrect {
                Text("Penalty: \(Int(engine.penaltySeconds))s delay")
                    .font(.subheadline)
                    .foregroundColor(StormColors.neonRed.opacity(0.8))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.7))
        .transition(.opacity)
    }
    
    private var resultEmoji: String {
        switch engine.lastResult {
        case .correct: return "✅"
        case .incorrect: return "❌"
        case .timeout: return "⏰"
        case .skipped: return "⏭️"
        }
    }
    
    private var resultTitle: String {
        switch engine.lastResult {
        case .correct: return "CORRECT!"
        case .incorrect: return "WRONG!"
        case .timeout: return "TIME'S UP!"
        case .skipped: return "SKIPPED"
        }
    }
    
    private var resultColor: Color {
        switch engine.lastResult {
        case .correct: return StormColors.neonGreen
        case .incorrect: return StormColors.neonRed
        case .timeout: return StormColors.neonOrange
        case .skipped: return StormColors.neonYellow
        }
    }
}
