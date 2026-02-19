import SwiftUI

// MARK: - Memory Matrix (Pattern memory game)

struct MemoryMatrixView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var gridSize = 3
    @State private var pattern: Set<Int> = []
    @State private var playerPattern: Set<Int> = []
    @State private var showingPattern = true
    @State private var score = 0
    @State private var level = 1
    @State private var lives = 3
    @State private var gameOver = false
    @State private var message = ""
    @StateObject private var particles = ParticleManager()
    @State private var isShaking = false
    
    private let theme: GameTheme = .puzzle
    private var totalCells: Int { gridSize * gridSize }
    private var patternCount: Int { min(gridSize + level, totalCells - 1) }
    
    var body: some View {
        ZStack {
            InGameBackground(theme: theme)
            
            if gameOver {
                GameOverOverlay(
                    score: score,
                    highScore: PlayerProgress.shared.highScores["memory_matrix"] ?? 0,
                    theme: theme,
                    onReplay: { resetGame() },
                    onExit: {
                        PlayerProgress.shared.recordGamePlayed(gameId: "memory_matrix", score: score)
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
                        lives: lives
                    )
                    
                    // Phase indicator
                    Text(showingPattern ? "MEMORIZE!" : "REPEAT THE PATTERN")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundColor(showingPattern ? StormColors.neonYellow : StormColors.neonCyan)
                        .shadow(color: (showingPattern ? StormColors.neonYellow : StormColors.neonCyan).opacity(0.5), radius: 8)
                    
                    if !message.isEmpty {
                        Text(message)
                            .font(.subheadline.bold())
                            .foregroundColor(StormColors.neonGreen)
                            .shadow(color: StormColors.neonGreen.opacity(0.5), radius: 4)
                    }
                    
                    Spacer()
                    
                    // Enhanced Grid
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: gridSize), spacing: 10) {
                        ForEach(0..<totalCells, id: \.self) { i in
                            EnhancedMatrixCell(
                                index: i,
                                isPattern: pattern.contains(i),
                                isPlayerTapped: playerPattern.contains(i),
                                showingPattern: showingPattern,
                                theme: theme
                            )
                            .frame(height: 280 / CGFloat(gridSize) - 10)
                            .onTapGesture { cellTapped(i) }
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    Spacer()
                }
            }
            
            ParticleEmitter(particles: $particles.particles)
        }
        .screenShake(isShaking: $isShaking)
        .onAppear { startRound() }
        .onDisappear { particles.clear() }
    }
    
    private func cellTapped(_ index: Int) {
        guard !showingPattern && !gameOver else { return }
        guard !playerPattern.contains(index) else { return }
        
        playerPattern.insert(index)
        
        // Calculate cell position for particles
        let col = index % gridSize
        let row = index / gridSize
        let cellSize = 280 / CGFloat(gridSize)
        let px = 24 + CGFloat(col) * cellSize + cellSize / 2
        let py = 220 + CGFloat(row) * cellSize + cellSize / 2
        
        if pattern.contains(index) {
            SoundManager.shared.playCorrect()
            particles.emit(ParticleBurst.correct(at: CGPoint(x: px, y: py), count: 10))
            
            if playerPattern.intersection(pattern).count == pattern.count {
                score += level * 10
                level += 1
                message = "PERFECT!"
                PlayerProgress.shared.addCoins(10)
                particles.emit(ParticleBurst.combo(at: CGPoint(x: 200, y: 400), multiplier: level))
                
                if level % 3 == 0 && gridSize < 6 { gridSize += 1 }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    message = ""
                    startRound()
                }
            }
        } else {
            SoundManager.shared.playIncorrect()
            lives -= 1
            isShaking = true
            particles.emit(ParticleBurst.wrong(at: CGPoint(x: px, y: py)))
            if lives <= 0 {
                gameOver = true
            } else {
                message = "Wrong cell!"
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    message = ""
                    startRound()
                }
            }
        }
    }
    
    private func startRound() {
        playerPattern = []
        pattern = []
        
        var available = Array(0..<totalCells)
        for _ in 0..<patternCount {
            if let index = available.randomElement() {
                pattern.insert(index)
                available.removeAll { $0 == index }
            }
        }
        
        showingPattern = true
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(1 + level / 2)) {
            showingPattern = false
        }
    }
    
    private func resetGame() {
        score = 0; level = 1; lives = 3; gridSize = 3; gameOver = false; message = ""
        startRound()
    }
}

// MARK: - Enhanced Matrix Cell

struct EnhancedMatrixCell: View {
    let index: Int
    let isPattern: Bool
    let isPlayerTapped: Bool
    let showingPattern: Bool
    let theme: GameTheme
    
    private var cellColor: Color {
        if showingPattern && isPattern {
            return theme.accentColor
        }
        if !showingPattern && isPlayerTapped {
            return isPattern ? StormColors.neonGreen : StormColors.neonRed
        }
        return Color.white.opacity(0.04)
    }
    
    private var borderColor: Color {
        if showingPattern && isPattern { return theme.accentColor.opacity(0.8) }
        if isPlayerTapped { return isPattern ? StormColors.neonGreen : StormColors.neonRed }
        return Color.white.opacity(0.08)
    }
    
    private var isHighlighted: Bool {
        (showingPattern && isPattern) || isPlayerTapped
    }
    
    var body: some View {
        RoundedRectangle(cornerRadius: 10)
            .fill(cellColor.opacity(isHighlighted ? 0.6 : 1.0))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(borderColor, lineWidth: isHighlighted ? 2 : 1)
            )
            .shadow(
                color: isHighlighted ? cellColor.opacity(0.4) : .clear,
                radius: isHighlighted ? 6 : 0
            )
            .animation(.easeInOut(duration: 0.2), value: isHighlighted)
    }
}
