import SwiftUI

// ═══════════════════════════════════════════════════════════════
// ENHANCED GAME HUD SYSTEM
//
// Modular, glowing HUD elements for every game.
// Provides consistent, polished stat displays with
// neon accents, animations, and glass effects.
// ═══════════════════════════════════════════════════════════════

// MARK: - Top Bar HUD

struct GameTopBar: View {
    let theme: GameTheme
    var score: Int = 0
    var scoreLabel: String = "SCORE"
    var level: Int? = nil
    var levelLabel: String = "LEVEL"
    var lives: Int? = nil
    var maxLives: Int = 3
    var timer: Int? = nil
    var combo: Int = 0
    var onPause: (() -> Void)? = nil
    
    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 0) {
                // Score
                HUDStatPill(
                    icon: "star.fill",
                    label: scoreLabel,
                    value: "\(score)",
                    color: StormColors.neonYellow,
                    theme: theme
                )
                
                Spacer()
                
                // Level (if present)
                if let level = level {
                    HUDStatPill(
                        icon: "bolt.fill",
                        label: levelLabel,
                        value: "\(level)",
                        color: theme.accentColor,
                        theme: theme
                    )
                    
                    Spacer()
                }
                
                // Lives (if present)
                if let lives = lives {
                    HUDLivesDisplay(lives: lives, maxLives: maxLives)
                    
                    Spacer()
                }
                
                // Pause button
                if let onPause = onPause {
                    Button(action: onPause) {
                        Image(systemName: "pause.fill")
                            .font(Storm.font(14, weight: .bold))
                            .foregroundColor(.white.opacity(0.7))
                            .frame(width: Storm.isIPad ? 44 : 34, height: Storm.isIPad ? 44 : 34)
                            .background(.ultraThinMaterial)
                            .background(Color.black.opacity(0.3))
                            .clipShape(Circle())
                    }
                }
            }
            .padding(.horizontal, 16)
            
            // Timer bar (if present)
            if let timer = timer {
                HUDTimerBar(seconds: timer, maxSeconds: 60, color: theme.accentColor)
                    .padding(.horizontal, 16)
            }
            
            // Combo indicator
            if combo > 1 {
                HUDComboIndicator(combo: combo, color: theme.accentColor)
            }
        }
        .padding(.top, 8)
    }
}

// MARK: - HUD Stat Pill

struct HUDStatPill: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    let theme: GameTheme
    
    var body: some View {
        HStack(spacing: Storm.isIPad ? 8 : 6) {
            Image(systemName: icon)
                .font(Storm.font(12, weight: .bold))
                .foregroundColor(color)
            
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(Storm.font(9, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1)
                Text(value)
                    .font(Storm.font(16, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .contentTransition(.numericText())
            }
        }
        .padding(.horizontal, Storm.isIPad ? 14 : 10)
        .padding(.vertical, Storm.isIPad ? 8 : 6)
        .background(.ultraThinMaterial)
        .background(color.opacity(0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Lives Display

struct HUDLivesDisplay: View {
    let lives: Int
    let maxLives: Int
    
    var body: some View {
        HStack(spacing: Storm.isIPad ? 5 : 3) {
            ForEach(0..<maxLives, id: \.self) { i in
                Image(systemName: i < lives ? "heart.fill" : "heart")
                    .font(Storm.font(14))
                    .foregroundColor(i < lives ? StormColors.neonRed : .white.opacity(0.2))
                    .scaleEffect(i < lives ? 1.0 : 0.8)
                    .shadow(color: i < lives ? StormColors.neonRed.opacity(0.6) : .clear, radius: 4)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial)
        .background(Color.black.opacity(0.2))
        .cornerRadius(12)
    }
}

// MARK: - Timer Bar

struct HUDTimerBar: View {
    let seconds: Int
    let maxSeconds: Int
    let color: Color
    
    private var progress: Double {
        guard maxSeconds > 0 else { return 0 }
        return min(1.0, Double(seconds) / Double(maxSeconds))
    }
    
    private var barColor: Color {
        if progress > 0.5 { return color }
        if progress > 0.25 { return StormColors.neonYellow }
        return StormColors.neonRed
    }
    
    var body: some View {
        VStack(spacing: 2) {
            HStack {
                Image(systemName: "clock.fill")
                    .font(Storm.font(10))
                    .foregroundColor(barColor)
                
                Text("\(seconds)s")
                    .font(Storm.font(12, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .contentTransition(.numericText())
                
                Spacer()
            }
            
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 6)
                    
                    // Fill
                    RoundedRectangle(cornerRadius: 3)
                        .fill(
                            LinearGradient(
                                colors: [barColor, barColor.opacity(0.7)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * progress, height: 6)
                        .shadow(color: barColor.opacity(0.5), radius: 4)
                        .animation(.easeInOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: 6)
        }
    }
}

// MARK: - Combo Indicator

struct HUDComboIndicator: View {
    let combo: Int
    let color: Color
    @State private var scale: CGFloat = 1.0
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "flame.fill")
                .font(.system(size: 14))
                .foregroundColor(comboColor)
            
            Text("\(combo)x COMBO")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundColor(comboColor)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(comboColor.opacity(0.15))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(comboColor.opacity(0.5), lineWidth: 1)
        )
        .shadow(color: comboColor.opacity(0.4), radius: 8)
        .scaleEffect(scale)
        .onChange(of: combo) { _, _ in
            withAnimation(.spring(response: 0.15, dampingFraction: 0.4)) {
                scale = 1.3
            }
            withAnimation(.spring(response: 0.2, dampingFraction: 0.6).delay(0.15)) {
                scale = 1.0
            }
        }
    }
    
    private var comboColor: Color {
        if combo >= 10 { return StormColors.neonRed }
        if combo >= 5 { return StormColors.neonOrange }
        return color
    }
}

// MARK: - Answer Button Styles

struct GameAnswerButton: View {
    let text: String
    let letter: String?
    let color: Color
    let isCorrect: Bool?
    let isSelected: Bool
    let action: () -> Void
    
    init(text: String, letter: String? = nil, color: Color = StormColors.neonBlue, isCorrect: Bool? = nil, isSelected: Bool = false, action: @escaping () -> Void) {
        self.text = text
        self.letter = letter
        self.color = color
        self.isCorrect = isCorrect
        self.isSelected = isSelected
        self.action = action
    }
    
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: Storm.isIPad ? 14 : 10) {
                if let letter = letter {
                    Text(letter)
                        .font(Storm.font(14, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .frame(width: Storm.isIPad ? 36 : 28, height: Storm.isIPad ? 36 : 28)
                        .background(letterBackground)
                        .clipShape(Circle())
                }
                
                Text(text)
                    .font(Storm.font(15, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                
                Spacer()
                
                if let isCorrect = isCorrect, isSelected {
                    Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(isCorrect ? StormColors.neonGreen : StormColors.neonRed)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(buttonBackground)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(borderColor, lineWidth: isSelected ? 2 : 1)
            )
            .shadow(color: shadowColor, radius: isSelected ? 8 : 0)
            .scaleEffect(isPressed ? 0.96 : 1.0)
        }
        .buttonStyle(.plain)
        .onLongPressGesture(minimumDuration: 0, pressing: { pressing in
            withAnimation(.spring(response: 0.15)) {
                isPressed = pressing
            }
        }, perform: {})
    }
    
    private var letterBackground: Color {
        if let isCorrect = isCorrect, isSelected {
            return isCorrect ? StormColors.neonGreen : StormColors.neonRed
        }
        return color
    }
    
    private var buttonBackground: some ShapeStyle {
        if let isCorrect = isCorrect, isSelected {
            return isCorrect
                ? AnyShapeStyle(StormColors.neonGreen.opacity(0.15))
                : AnyShapeStyle(StormColors.neonRed.opacity(0.15))
        }
        return AnyShapeStyle(Color.white.opacity(0.06))
    }
    
    private var borderColor: Color {
        if let isCorrect = isCorrect, isSelected {
            return isCorrect ? StormColors.neonGreen : StormColors.neonRed
        }
        return Color.white.opacity(0.1)
    }
    
    private var shadowColor: Color {
        if let isCorrect = isCorrect, isSelected {
            return isCorrect ? StormColors.neonGreen.opacity(0.4) : StormColors.neonRed.opacity(0.4)
        }
        return .clear
    }
}

// MARK: - Correct / Wrong Flash Overlay

struct AnswerFlash: View {
    let isCorrect: Bool
    @Binding var isVisible: Bool
    
    var body: some View {
        if isVisible {
            ZStack {
                (isCorrect ? StormColors.neonGreen : StormColors.neonRed)
                    .opacity(0.15)
                    .ignoresSafeArea()
                
                VStack(spacing: 8) {
                    Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(isCorrect ? StormColors.neonGreen : StormColors.neonRed)
                        .shadow(color: (isCorrect ? StormColors.neonGreen : StormColors.neonRed).opacity(0.6), radius: 20)
                    
                    Text(isCorrect ? "CORRECT!" : "WRONG!")
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                }
                .transition(.scale.combined(with: .opacity))
            }
            .allowsHitTesting(false)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    withAnimation(.easeOut(duration: 0.3)) {
                        isVisible = false
                    }
                }
            }
        }
    }
}

// MARK: - Game Over Overlay

struct GameOverOverlay: View {
    let score: Int
    let highScore: Int
    let theme: GameTheme
    let onReplay: () -> Void
    let onExit: () -> Void
    
    @State private var animateIn = false
    
    var isNewRecord: Bool { score > highScore && score > 0 }
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // Title
                Text("GAME OVER")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, theme.accentColor],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: theme.accentColor.opacity(0.5), radius: 10)
                
                // New record
                if isNewRecord {
                    HStack(spacing: 6) {
                        Image(systemName: "trophy.fill")
                            .foregroundColor(StormColors.neonYellow)
                        Text("NEW RECORD!")
                            .font(.headline.bold())
                            .foregroundColor(StormColors.neonYellow)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(StormColors.neonYellow.opacity(0.15))
                    .cornerRadius(12)
                    .shadow(color: StormColors.neonYellow.opacity(0.4), radius: 8)
                }
                
                // Score
                VStack(spacing: 4) {
                    Text("SCORE")
                        .font(.caption.bold())
                        .foregroundColor(.white.opacity(0.5))
                        .tracking(2)
                    
                    Text("\(score)")
                        .font(.system(size: 56, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .shadow(color: theme.accentColor.opacity(0.5), radius: 8)
                    
                    if highScore > 0 {
                        Text("Best: \(max(score, highScore))")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity)
                .background(.ultraThinMaterial)
                .background(theme.accentColor.opacity(0.05))
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(theme.accentColor.opacity(0.2), lineWidth: 1)
                )
                
                // Buttons
                VStack(spacing: 12) {
                    Button(action: onReplay) {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.counterclockwise")
                            Text("PLAY AGAIN")
                                .font(.headline.bold())
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [theme.accentColor, theme.accentColor.opacity(0.7)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(16)
                        .shadow(color: theme.accentColor.opacity(0.4), radius: 8)
                    }
                    
                    Button(action: onExit) {
                        HStack(spacing: 8) {
                            Image(systemName: "xmark")
                            Text("EXIT")
                                .font(.headline.bold())
                        }
                        .foregroundColor(.white.opacity(0.7))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(16)
                    }
                }
            }
            .padding(28)
            .scaleEffect(animateIn ? 1.0 : 0.8)
            .opacity(animateIn ? 1.0 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                animateIn = true
            }
        }
    }
}
