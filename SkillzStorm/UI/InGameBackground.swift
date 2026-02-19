import SwiftUI

// ═══════════════════════════════════════════════════════════════
// IN-GAME BACKGROUND SYSTEM
//
// Animated, themed backgrounds for every game type.
// Each theme has parallax star layers, floating particles,
// and themed color palettes.
// ═══════════════════════════════════════════════════════════════

enum GameTheme: String {
    case space        // AstroMath, Multiplication Meteors, Math Galaxy
    case arena        // Brain Arena, Grammar Gladiator, SAT Word Arena
    case nature       // Bull Run, Word Rocket, History Dash
    case cyber        // SkillDash, Code Breaker, Logic Tower
    case ocean        // WordWave Survival, Vocabulary Sniper
    case laboratory   // Chem Lab, Science Defender, Fraction Frenzy
    case fortress     // Storm Defenders, Geometry Defender
    case puzzle       // Memory Matrix, Pattern Blast, Sentence Builder
    case speed        // Speed Multiplication, Flash Fact Frenzy
    case market       // Financial Literacy, Market Mayhem
    
    var gradientColors: [Color] {
        switch self {
        case .space:
            return [Color(red: 0.02, green: 0.02, blue: 0.12),
                    Color(red: 0.05, green: 0.0, blue: 0.2),
                    Color(red: 0.0, green: 0.03, blue: 0.15)]
        case .arena:
            return [Color(red: 0.12, green: 0.02, blue: 0.18),
                    Color(red: 0.06, green: 0.02, blue: 0.14),
                    Color(red: 0.15, green: 0.0, blue: 0.1)]
        case .nature:
            return [Color(red: 0.05, green: 0.1, blue: 0.02),
                    Color(red: 0.08, green: 0.06, blue: 0.0),
                    Color(red: 0.02, green: 0.05, blue: 0.02)]
        case .cyber:
            return [Color(red: 0.0, green: 0.05, blue: 0.12),
                    Color(red: 0.02, green: 0.02, blue: 0.1),
                    Color(red: 0.0, green: 0.08, blue: 0.1)]
        case .ocean:
            return [Color(red: 0.0, green: 0.04, blue: 0.14),
                    Color(red: 0.02, green: 0.06, blue: 0.16),
                    Color(red: 0.0, green: 0.02, blue: 0.1)]
        case .laboratory:
            return [Color(red: 0.02, green: 0.08, blue: 0.06),
                    Color(red: 0.0, green: 0.05, blue: 0.1),
                    Color(red: 0.04, green: 0.06, blue: 0.02)]
        case .fortress:
            return [Color(red: 0.04, green: 0.08, blue: 0.02),
                    Color(red: 0.02, green: 0.05, blue: 0.0),
                    Color(red: 0.06, green: 0.04, blue: 0.0)]
        case .puzzle:
            return [Color(red: 0.06, green: 0.02, blue: 0.12),
                    Color(red: 0.02, green: 0.04, blue: 0.14),
                    Color(red: 0.08, green: 0.02, blue: 0.1)]
        case .speed:
            return [Color(red: 0.12, green: 0.04, blue: 0.02),
                    Color(red: 0.1, green: 0.02, blue: 0.06),
                    Color(red: 0.06, green: 0.0, blue: 0.1)]
        case .market:
            return [Color(red: 0.02, green: 0.06, blue: 0.02),
                    Color(red: 0.0, green: 0.04, blue: 0.06),
                    Color(red: 0.04, green: 0.08, blue: 0.04)]
        }
    }
    
    var accentColor: Color {
        switch self {
        case .space: return StormColors.neonBlue
        case .arena: return StormColors.neonPurple
        case .nature: return StormColors.neonGreen
        case .cyber: return StormColors.neonCyan
        case .ocean: return Color(red: 0.2, green: 0.6, blue: 1.0)
        case .laboratory: return Color(red: 0.0, green: 1.0, blue: 0.6)
        case .fortress: return StormColors.neonOrange
        case .puzzle: return StormColors.neonPink
        case .speed: return StormColors.neonRed
        case .market: return StormColors.neonGreen
        }
    }
    
    var particleColor: Color {
        switch self {
        case .space: return .white
        case .arena: return StormColors.neonPurple
        case .nature: return StormColors.neonGreen
        case .cyber: return StormColors.neonCyan
        case .ocean: return Color(red: 0.3, green: 0.7, blue: 1.0)
        case .laboratory: return Color(red: 0.2, green: 1.0, blue: 0.5)
        case .fortress: return StormColors.neonYellow
        case .puzzle: return StormColors.neonPink
        case .speed: return StormColors.neonOrange
        case .market: return StormColors.neonGreen
        }
    }
}

// MARK: - Animated In-Game Background

struct InGameBackground: View {
    let theme: GameTheme
    @State private var phase: CGFloat = 0
    
    var body: some View {
        ZStack {
            // Base gradient
            LinearGradient(
                colors: theme.gradientColors,
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            // Starfield / particle layer
            StarfieldLayer(theme: theme)
            
            // Nebula glow
            nebulaGlow
            
            // Grid lines (subtle)
            gridOverlay
        }
        .ignoresSafeArea()
    }
    
    private var nebulaGlow: some View {
        GeometryReader { geo in
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [theme.accentColor.opacity(0.08), .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: geo.size.width * 0.5
                        )
                    )
                    .frame(width: geo.size.width * 0.8)
                    .offset(x: geo.size.width * 0.25, y: -geo.size.height * 0.15)
                
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [theme.particleColor.opacity(0.05), .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: geo.size.width * 0.4
                        )
                    )
                    .frame(width: geo.size.width * 0.6)
                    .offset(x: -geo.size.width * 0.2, y: geo.size.height * 0.3)
            }
        }
    }
    
    private var gridOverlay: some View {
        Canvas { context, size in
            let spacing: CGFloat = 40
            
            for x in stride(from: CGFloat(0), through: size.width, by: spacing) {
                var path = Path()
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                context.stroke(path, with: .color(.white.opacity(0.015)), lineWidth: 0.5)
            }
            for y in stride(from: CGFloat(0), through: size.height, by: spacing) {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(path, with: .color(.white.opacity(0.015)), lineWidth: 0.5)
            }
        }
        .ignoresSafeArea()
    }
}

// MARK: - Starfield Layer

struct StarfieldLayer: View {
    let theme: GameTheme
    
    struct Star: Identifiable {
        let id = UUID()
        let x: CGFloat
        let y: CGFloat
        let size: CGFloat
        let opacity: Double
        let speed: Double
    }
    
    @State private var stars: [Star] = []
    @State private var offset: CGFloat = 0
    
    var body: some View {
        GeometryReader { geo in
            Canvas { context, canvasSize in
                for star in stars {
                    let adjustedY = (star.y + offset * CGFloat(star.speed))
                        .truncatingRemainder(dividingBy: canvasSize.height)
                    let finalY = adjustedY < 0 ? adjustedY + canvasSize.height : adjustedY
                    
                    let rect = CGRect(
                        x: star.x - star.size / 2,
                        y: finalY - star.size / 2,
                        width: star.size,
                        height: star.size
                    )
                    
                    context.fill(
                        Path(ellipseIn: rect),
                        with: .color(theme.particleColor.opacity(star.opacity))
                    )
                    
                    // Glow on larger stars
                    if star.size > 2 {
                        let glowRect = CGRect(
                            x: star.x - star.size * 2,
                            y: finalY - star.size * 2,
                            width: star.size * 4,
                            height: star.size * 4
                        )
                        context.fill(
                            Path(ellipseIn: glowRect),
                            with: .color(theme.accentColor.opacity(star.opacity * 0.15))
                        )
                    }
                }
            }
            .onAppear {
                generateStars(in: geo.size)
                startAnimation()
            }
        }
    }
    
    private func generateStars(in size: CGSize) {
        stars = (0..<60).map { _ in
            Star(
                x: CGFloat.random(in: 0...size.width),
                y: CGFloat.random(in: 0...size.height),
                size: CGFloat.random(in: 0.5...3.5),
                opacity: Double.random(in: 0.15...0.7),
                speed: Double.random(in: 0.2...1.0)
            )
        }
    }
    
    private func startAnimation() {
        withAnimation(.linear(duration: 60).repeatForever(autoreverses: false)) {
            offset = 800
        }
    }
}

// MARK: - Game Theme Mapping

extension GameInfo {
    var gameTheme: GameTheme {
        switch id {
        case "astromath_wars", "multiplication_meteors", "algebra_blaster",
             "math_galaxy_3d", "geometry_runner_3d", "word_rocket_run":
            return .space
        case "brain_arena", "grammar_gladiator", "sat_word_arena",
             "brain_boost", "quick_sat", "debate_dash":
            return .arena
        case "bull_run_logic", "history_timeline_rush", "history_dash",
             "word_world_3d":
            return .nature
        case "skilldash", "code_breaker", "logic_tower",
             "logic_tunnel", "equation_escape":
            return .cyber
        case "wordwave_survival", "vocabulary_sniper", "word_connect_storm",
             "sentence_sprint", "speed_reading_dash", "essay_builder_rush":
            return .ocean
        case "science_defender", "chem_lab_chaos", "chem_jump",
             "fraction_frenzy":
            return .laboratory
        case "storm_defenders", "storm_defenders_vr", "geometry_defender",
             "data_defender", "coordinate_conquest":
            return .fortress
        case "sentence_builder_pro", "context_clue_hunt", "pattern_blast",
             "memory_matrix", "word_balloon_pop", "probability_quest",
             "ratio_architect", "timeline_builder", "proof_builder":
            return .puzzle
        case "speed_multiplication", "flash_fact_frenzy", "number_catch",
             "color_equation", "grammar_clicker", "spelling_sniper",
             "geometry_glide", "maze_of_ratios", "physics_platform":
            return .speed
        case "financial_literacy_run", "market_mayhem", "statistics_paintball":
            return .market
        default:
            return .cyber
        }
    }
}
