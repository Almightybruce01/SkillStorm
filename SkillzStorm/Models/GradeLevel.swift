import Foundation

enum GradeLevel: String, CaseIterable, Codable, Identifiable {
    case k2 = "K-2"
    case three5 = "3-5"
    case six8 = "6-8"
    case nine12 = "9-12"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .k2: return "K – 2"
        case .three5: return "3 – 5"
        case .six8: return "6 – 8"
        case .nine12: return "9 – 12"
        }
    }
    
    var subtitle: String {
        switch self {
        case .k2: return "Foundations"
        case .three5: return "Core Skills"
        case .six8: return "Middle School"
        case .nine12: return "High School"
        }
    }
    
    var emoji: String {
        switch self {
        case .k2: return "🟢"
        case .three5: return "🔵"
        case .six8: return "🟣"
        case .nine12: return "🔴"
        }
    }
    
    var colorName: String {
        switch self {
        case .k2: return "green"
        case .three5: return "blue"
        case .six8: return "purple"
        case .nine12: return "red"
        }
    }
    
    var difficultyRange: ClosedRange<Int> {
        switch self {
        case .k2: return 1...2
        case .three5: return 2...4
        case .six8: return 4...7
        case .nine12: return 7...10
        }
    }
}
