import Foundation
import SwiftUI
import Combine

// MARK: - Knowledge Gate Types

enum GateType {
    case checkpoint      // Standard 1-question gate
    case bossGate        // 3 rapid-fire questions
    case speedGate       // Timed single question
    case streakGate      // Must get 3 in a row
}

enum GateResult {
    case correct
    case incorrect
    case timeout
    case skipped
}

// MARK: - Knowledge Gate Engine

class KnowledgeGateEngine: ObservableObject {
    @Published var isGateActive = false
    @Published var currentQuestion: Question?
    @Published var bossQuestions: [Question] = []
    @Published var bossIndex = 0
    @Published var gateType: GateType = .checkpoint
    @Published var timeRemaining: Double = 15.0
    @Published var streakCount = 0
    @Published var penaltySeconds: Double = 0
    @Published var showResult = false
    @Published var lastResult: GateResult = .correct
    @Published var showExplanation = false
    
    private var timer: Timer?
    private let questionBank = QuestionBank.shared
    
    // MARK: - Gate Activation
    
    func activateCheckpoint(grade: GradeLevel) {
        gateType = .checkpoint
        currentQuestion = questionBank.randomQuestion(for: grade)
        timeRemaining = timeLimit(for: grade)
        isGateActive = true
        startTimer()
    }
    
    func activateBossGate(grade: GradeLevel) {
        gateType = .bossGate
        bossQuestions = questionBank.randomQuestions(for: grade, count: 3)
        bossIndex = 0
        currentQuestion = bossQuestions.first
        timeRemaining = 45
        isGateActive = true
        startTimer()
    }
    
    func activateSpeedGate(grade: GradeLevel) {
        gateType = .speedGate
        currentQuestion = questionBank.randomQuestion(for: grade)
        timeRemaining = 5.0 // Very fast!
        isGateActive = true
        startTimer()
    }
    
    func activateStreakGate(grade: GradeLevel) {
        gateType = .streakGate
        streakCount = 0
        currentQuestion = questionBank.randomQuestion(for: grade)
        timeRemaining = 30
        isGateActive = true
        startTimer()
    }
    
    // MARK: - Answer Handling
    
    func submitAnswer(choiceIndex: Int, grade: GradeLevel, completion: @escaping (GateResult) -> Void) {
        guard let question = currentQuestion else { return }
        stopTimer()
        
        let isCorrect = choiceIndex == question.correctIndex
        PlayerProgress.shared.recordAnswer(correct: isCorrect)
        
        if isCorrect {
            PlayerProgress.shared.addCoins(question.points)
            PlayerProgress.shared.addXP(question.points)
        }
        
        switch gateType {
        case .checkpoint, .speedGate:
            let result: GateResult = isCorrect ? .correct : .incorrect
            lastResult = result
            showResult = true
            
            if !isCorrect {
                penaltySeconds = 3.0
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                self?.showResult = false
                self?.isGateActive = false
                completion(result)
            }
            
        case .bossGate:
            if isCorrect {
                bossIndex += 1
                if bossIndex >= bossQuestions.count {
                    // All boss questions answered!
                    lastResult = .correct
                    showResult = true
                    PlayerProgress.shared.addCoins(100) // Boss bonus
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                        self?.showResult = false
                        self?.isGateActive = false
                        completion(.correct)
                    }
                } else {
                    currentQuestion = bossQuestions[bossIndex]
                    startTimer()
                }
            } else {
                lastResult = .incorrect
                showResult = true
                penaltySeconds = 5.0
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                    self?.showResult = false
                    self?.isGateActive = false
                    completion(.incorrect)
                }
            }
            
        case .streakGate:
            if isCorrect {
                streakCount += 1
                if streakCount >= 3 {
                    lastResult = .correct
                    showResult = true
                    PlayerProgress.shared.addCoins(50)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                        self?.showResult = false
                        self?.isGateActive = false
                        completion(.correct)
                    }
                } else {
                    currentQuestion = questionBank.randomQuestion(for: grade)
                    startTimer()
                }
            } else {
                streakCount = 0
                lastResult = .incorrect
                penaltySeconds = 3.0
                currentQuestion = questionBank.randomQuestion(for: grade)
                startTimer()
            }
        }
    }
    
    func useHint() -> String? {
        guard PlayerProgress.shared.usePowerUp("hintShield") else { return nil }
        return currentQuestion?.hint ?? "Think carefully about each option."
    }
    
    func skipQuestion(grade: GradeLevel, completion: @escaping (GateResult) -> Void) {
        guard PlayerProgress.shared.usePowerUp("skipQuestion") else { return }
        stopTimer()
        isGateActive = false
        completion(.skipped)
    }
    
    // MARK: - Timer
    
    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.timeRemaining -= 0.1
            if self.timeRemaining <= 0 {
                self.stopTimer()
                self.lastResult = .timeout
                self.showResult = true
                self.penaltySeconds = 5.0
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    self.showResult = false
                    self.isGateActive = false
                }
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func timeLimit(for grade: GradeLevel) -> Double {
        switch grade {
        case .k2: return 20.0
        case .three5: return 15.0
        case .six8: return 12.0
        case .nine12: return 10.0
        }
    }
}
