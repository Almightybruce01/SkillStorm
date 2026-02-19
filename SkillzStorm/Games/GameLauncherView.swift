import SwiftUI
import SpriteKit

struct GameLauncherView: View {
    let game: GameInfo
    @Environment(\.dismiss) var dismiss
    @ObservedObject var progress = PlayerProgress.shared
    @State private var countdown = 3
    @State private var showCountdown = true
    @State private var showGame = false
    
    /// Exit handler that fires interstitial ad after every N games
    private func exitAndShowAd() {
        // Record game completion & trigger interstitial ad (every 3 games)
        AdManager.shared.onGameCompleted()
        dismiss()
    }
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if showCountdown {
                countdownView
            } else {
                gameContent
            }
            
            // Top bar
            VStack {
                HStack {
                    Button(action: { exitAndShowAd() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.white.opacity(0.7))
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "bitcoinsign.circle.fill")
                            .foregroundColor(StormColors.neonYellow)
                        Text("\(progress.totalCoins)")
                            .font(.subheadline.bold())
                            .foregroundColor(.white)
                    }
                }
                .padding()
                
                Spacer()
            }
        }
        .statusBarHidden()
        .onAppear {
            startCountdown()
        }
    }
    
    private var countdownView: some View {
        VStack(spacing: 20) {
            Text(game.iconEmoji)
                .font(.system(size: 60))
            
            Text(game.name)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundColor(.white)
            
            Text("\(countdown)")
                .font(.system(size: 100, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.heroGradient)
                .neonGlow(StormColors.neonBlue, radius: 20)
                .scaleEffect(1.2)
                .animation(.spring(response: 0.3), value: countdown)
        }
    }
    
    @ViewBuilder
    private var gameContent: some View {
        switch game.id {
        case "astromath_wars":
            AstroMathWarsView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "skilldash":
            SkillDashGameView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "wordwave_survival":
            WordWaveSurvivalView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "bull_run_logic":
            BullRunLogicView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "multiplication_meteors":
            MultiplicationMeteorsView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "vocabulary_sniper":
            VocabularySniperView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "grammar_gladiator":
            GrammarGladiatorView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "fraction_frenzy":
            FractionFrenzyView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "brain_boost", "brain_arena", "quick_sat", "flash_fact_frenzy":
            BrainArenaView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "memory_matrix":
            MemoryMatrixView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "speed_multiplication":
            SpeedMultiplicationView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "geometry_runner_3d":
            GeometryRunner3DView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "storm_defenders":
            StormDefendersView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        case "storm_defenders_vr":
            StormDefendersVRView(grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        default:
            GenericGameView(game: game, grade: progress.selectedGrade, onExit: { exitAndShowAd() })
        }
    }
    
    private func startCountdown() {
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            if countdown > 1 {
                countdown -= 1
                SoundManager.shared.playCountdown()
            } else {
                timer.invalidate()
                SoundManager.shared.playLevelUp()
                withAnimation(.easeInOut(duration: 0.3)) {
                    showCountdown = false
                    showGame = true
                }
            }
        }
    }
}

// MARK: - Generic Game (For Games Not Yet Fully Implemented)

struct GenericGameView: View {
    let game: GameInfo
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @State private var score = 0
    @State private var level = 1
    @State private var lives = 3
    @State private var showGate = false
    @State private var gameOver = false
    @State private var targetNumber = 0
    @State private var playerPosition: CGFloat = 0
    @State private var obstacles: [(id: UUID, x: CGFloat, y: CGFloat, value: Int)] = []
    @State private var timer: Timer?
    
    var body: some View {
        ZStack {
            // Game background
            LinearGradient(
                colors: game.category.gradientColors.map { $0.opacity(0.3) } + [Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            if gameOver {
                gameOverScreen
            } else if showGate {
                KnowledgeGateView(engine: gateEngine, grade: grade) { result in
                    showGate = false
                    if result == .correct {
                        level += 1
                        score += 50
                        SoundManager.shared.playLevelUp()
                    } else {
                        lives -= 1
                        if lives <= 0 { gameOver = true }
                    }
                }
            } else {
                // Main game area
                VStack {
                    // HUD
                    HStack {
                        // Score
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundColor(StormColors.neonYellow)
                            Text("\(score)")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        // Level
                        Text("LVL \(level)")
                            .font(.headline.bold())
                            .foregroundColor(StormColors.neonBlue)
                        
                        Spacer()
                        
                        // Lives
                        HStack(spacing: 2) {
                            ForEach(0..<lives, id: \.self) { _ in
                                Image(systemName: "heart.fill")
                                    .foregroundColor(StormColors.neonPink)
                                    .font(.subheadline)
                            }
                        }
                    }
                    .padding()
                    
                    Spacer()
                    
                    // Game emoji
                    Text(game.iconEmoji)
                        .font(.system(size: 60))
                        .floating()
                    
                    Text(game.name)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                    
                    Text("Level \(level)")
                        .font(.headline)
                        .foregroundColor(StormColors.neonBlue)
                    
                    Spacer()
                    
                    // Action buttons
                    VStack(spacing: 16) {
                        StormButton("Answer Challenge", icon: "brain.head.profile", gradient: StormColors.heroGradient) {
                            gateEngine.activateCheckpoint(grade: grade)
                            showGate = true
                        }
                        
                        if level % 3 == 0 {
                            StormButton("BOSS GATE", icon: "flame.fill", gradient: StormColors.fireGradient) {
                                gateEngine.activateBossGate(grade: grade)
                                showGate = true
                            }
                        }
                        
                        StormButton("Speed Round", icon: "bolt.fill", gradient: StormColors.goldGradient) {
                            gateEngine.activateSpeedGate(grade: grade)
                            showGate = true
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
    }
    
    private var gameOverScreen: some View {
        VStack(spacing: 24) {
            Text("GAME OVER")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.fireGradient)
            
            Text(game.iconEmoji)
                .font(.system(size: 60))
            
            VStack(spacing: 8) {
                Text("Score: \(score)")
                    .font(.title.bold())
                    .foregroundColor(StormColors.neonYellow)
                
                Text("Level: \(level)")
                    .font(.title2)
                    .foregroundColor(.white)
            }
            
            VStack(spacing: 12) {
                StormButton("Play Again", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                    score = 0
                    level = 1
                    lives = 3
                    gameOver = false
                }
                
                StormButton("Exit", icon: "xmark", gradient: LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .leading, endPoint: .trailing)) {
                    PlayerProgress.shared.recordGamePlayed(gameId: game.id, score: score)
                    onExit()
                }
            }
        }
    }
}
