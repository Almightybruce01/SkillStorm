import Foundation
import SwiftUI

enum GameCategory: String, CaseIterable, Codable, Identifiable {
    case integratedArcade = "StormBattle"
    case dashRunner = "StormDash"
    case puzzleStrategy = "StormPuzzle"
    case quickPlay = "StormQuick"
    case threeD = "Storm3D"
    case vr = "StormVR"
    
    var id: String { rawValue }
    
    var displayName: String { rawValue }
    
    var subtitle: String {
        switch self {
        case .integratedArcade: return "Integrated Learning Arcade"
        case .dashRunner: return "Dash / Runner + Knowledge Gate"
        case .puzzleStrategy: return "Puzzle & Strategy"
        case .quickPlay: return "Quick Play Mini Games"
        case .threeD: return "3D Immersive Games"
        case .vr: return "VR Experience"
        }
    }
    
    var iconName: String {
        switch self {
        case .integratedArcade: return "flame.fill"
        case .dashRunner: return "hare.fill"
        case .puzzleStrategy: return "puzzlepiece.fill"
        case .quickPlay: return "bolt.fill"
        case .threeD: return "cube.fill"
        case .vr: return "visionpro"
        }
    }
    
    var gradientColors: [Color] {
        switch self {
        case .integratedArcade: return [Color(red: 0.1, green: 0.4, blue: 1.0), Color(red: 0.4, green: 0.1, blue: 0.9)]
        case .dashRunner: return [Color(red: 0.0, green: 0.8, blue: 0.4), Color(red: 0.0, green: 0.5, blue: 0.3)]
        case .puzzleStrategy: return [Color(red: 1.0, green: 0.8, blue: 0.0), Color(red: 1.0, green: 0.5, blue: 0.0)]
        case .quickPlay: return [Color(red: 1.0, green: 0.2, blue: 0.3), Color(red: 0.8, green: 0.1, blue: 0.5)]
        case .threeD: return [Color(red: 0.5, green: 0.0, blue: 1.0), Color(red: 0.8, green: 0.0, blue: 0.8)]
        case .vr: return [Color(red: 0.0, green: 0.8, blue: 0.8), Color(red: 0.0, green: 0.4, blue: 0.8)]
        }
    }
}
