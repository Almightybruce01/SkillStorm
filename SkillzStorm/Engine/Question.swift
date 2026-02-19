import Foundation

enum QuestionType: String, Codable, CaseIterable {
    case math
    case vocabulary
    case grammar
    case logic
    case science
    case finance
    case history
    case reading
    case spelling
    case geometry
    case algebra
    case statistics
    case chemistry
    case physics
    
    var displayName: String {
        switch self {
        case .math: return "Math"
        case .vocabulary: return "Vocabulary"
        case .grammar: return "Grammar"
        case .logic: return "Logic"
        case .science: return "Science"
        case .finance: return "Financial Literacy"
        case .history: return "History"
        case .reading: return "Reading"
        case .spelling: return "Spelling"
        case .geometry: return "Geometry"
        case .algebra: return "Algebra"
        case .statistics: return "Statistics"
        case .chemistry: return "Chemistry"
        case .physics: return "Physics"
        }
    }
    
    var iconName: String {
        switch self {
        case .math: return "plus.forwardslash.minus"
        case .vocabulary: return "book.fill"
        case .grammar: return "text.quote"
        case .logic: return "brain.head.profile"
        case .science: return "atom"
        case .finance: return "dollarsign.circle.fill"
        case .history: return "clock.fill"
        case .reading: return "book.closed.fill"
        case .spelling: return "character.textbox"
        case .geometry: return "triangle.fill"
        case .algebra: return "x.squareroot"
        case .statistics: return "chart.bar.fill"
        case .chemistry: return "flask.fill"
        case .physics: return "bolt.fill"
        }
    }
}

struct Question: Codable, Identifiable {
    var id: String
    var type: QuestionType
    var gradeLevel: String
    var prompt: String
    var choices: [String]
    var correctIndex: Int
    var difficulty: Int
    var explanation: String?
    var hint: String?
    var timeLimit: Double?
    var points: Int
    
    init(id: String, type: QuestionType, gradeLevel: String = "K-2", prompt: String, choices: [String], correctIndex: Int, difficulty: Int, explanation: String? = nil, hint: String? = nil, timeLimit: Double? = nil, points: Int = 10) {
        self.id = id
        self.type = type
        self.gradeLevel = gradeLevel
        self.prompt = prompt
        self.choices = choices
        self.correctIndex = correctIndex
        self.difficulty = difficulty
        self.explanation = explanation
        self.hint = hint
        self.timeLimit = timeLimit
        self.points = points
    }
    
    var correctAnswer: String {
        choices[correctIndex]
    }
}

// MARK: - Boss Question (Multi-part)

struct BossQuestion: Codable, Identifiable {
    var id: String
    var title: String
    var questions: [Question]
    var bonusPoints: Int
    var timeLimit: Double
}
