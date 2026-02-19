import SwiftUI

// MARK: - SkillzStorm Design System

struct StormColors {
    // Primary palette
    static let background = Color(red: 0.05, green: 0.05, blue: 0.12)
    static let surface = Color(red: 0.1, green: 0.1, blue: 0.2)
    static let surfaceLight = Color(red: 0.15, green: 0.15, blue: 0.28)
    
    // Neon accents
    static let neonBlue = Color(red: 0.0, green: 0.6, blue: 1.0)
    static let neonPurple = Color(red: 0.6, green: 0.2, blue: 1.0)
    static let neonGreen = Color(red: 0.0, green: 1.0, blue: 0.5)
    static let neonPink = Color(red: 1.0, green: 0.2, blue: 0.6)
    static let neonYellow = Color(red: 1.0, green: 0.9, blue: 0.0)
    static let neonOrange = Color(red: 1.0, green: 0.5, blue: 0.0)
    static let neonRed = Color(red: 1.0, green: 0.15, blue: 0.15)
    static let neonCyan = Color(red: 0.0, green: 0.9, blue: 0.9)
    
    // Gradients
    static let mainGradient = LinearGradient(
        colors: [Color(red: 0.1, green: 0.0, blue: 0.3), Color(red: 0.0, green: 0.1, blue: 0.2)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let heroGradient = LinearGradient(
        colors: [neonBlue, neonPurple],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    static let fireGradient = LinearGradient(
        colors: [neonOrange, neonRed, neonPink],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let successGradient = LinearGradient(
        colors: [neonGreen, Color(red: 0.0, green: 0.7, blue: 0.3)],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    static let goldGradient = LinearGradient(
        colors: [neonYellow, neonOrange],
        startPoint: .top,
        endPoint: .bottom
    )
    
    // Grade Colors
    static func gradeColor(_ grade: GradeLevel) -> Color {
        switch grade {
        case .k2: return neonGreen
        case .three5: return neonBlue
        case .six8: return neonPurple
        case .nine12: return neonRed
        }
    }
    
    static func gradeGradient(_ grade: GradeLevel) -> LinearGradient {
        let color = gradeColor(grade)
        return LinearGradient(
            colors: [color, color.opacity(0.6)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - iPad Scaling

enum Storm {
    static var isIPad: Bool {
        UIDevice.current.userInterfaceIdiom == .pad
    }
    
    static var scale: CGFloat {
        isIPad ? 1.35 : 1.0
    }
    
    static func scaled(_ size: CGFloat) -> CGFloat {
        max(size * scale, isIPad ? 13 : size)
    }
    
    static func font(_ size: CGFloat, weight: Font.Weight = .regular, design: Font.Design = .default) -> Font {
        .system(size: scaled(size), weight: weight, design: design)
    }
    
    static var maxContentWidth: CGFloat {
        isIPad ? 700 : .infinity
    }
}

struct ReadableWidth: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: Storm.maxContentWidth)
            .frame(maxWidth: .infinity)
    }
}

extension View {
    func readableWidth() -> some View {
        modifier(ReadableWidth())
    }
}

// MARK: - Custom View Modifiers

struct NeonGlow: ViewModifier {
    let color: Color
    let radius: CGFloat
    
    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(0.8), radius: radius)
            .shadow(color: color.opacity(0.4), radius: radius * 2)
    }
}

struct GlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial)
            .background(StormColors.surface.opacity(0.5))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.2), Color.white.opacity(0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
    }
}

struct PulsingAnimation: ViewModifier {
    @State private var isPulsing = false
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.05 : 1.0)
            .animation(
                .easeInOut(duration: 1.5).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear { isPulsing = true }
    }
}

struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 10
    var shakesPerUnit: CGFloat = 3
    var animatableData: CGFloat
    
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX:
            amount * sin(animatableData * .pi * shakesPerUnit),
            y: 0))
    }
}

struct FloatingAnimation: ViewModifier {
    @State private var isFloating = false
    let delay: Double
    
    func body(content: Content) -> some View {
        content
            .offset(y: isFloating ? -8 : 8)
            .animation(
                .easeInOut(duration: 2.0).repeatForever(autoreverses: true).delay(delay),
                value: isFloating
            )
            .onAppear { isFloating = true }
    }
}

// MARK: - View Extensions

extension View {
    func neonGlow(_ color: Color, radius: CGFloat = 8) -> some View {
        modifier(NeonGlow(color: color, radius: radius))
    }
    
    func glassCard() -> some View {
        modifier(GlassCard())
    }
    
    func pulsing() -> some View {
        modifier(PulsingAnimation())
    }
    
    func floating(delay: Double = 0) -> some View {
        modifier(FloatingAnimation(delay: delay))
    }
}

// MARK: - Reusable Styled Components

struct StormButton: View {
    let title: String
    let icon: String?
    let gradient: LinearGradient
    let action: () -> Void
    
    init(_ title: String, icon: String? = nil, gradient: LinearGradient = StormColors.heroGradient, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.gradient = gradient
        self.action = action
    }
    
    var body: some View {
        Button(action: {
            SoundManager.shared.playButtonTap()
            action()
        }) {
            HStack(spacing: 10) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title3.bold())
                }
                Text(title)
                    .font(.headline.bold())
            }
            .foregroundColor(.white)
            .padding(.horizontal, 28)
            .padding(.vertical, 14)
            .background(gradient)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
        }
    }
}

struct StormBadge: View {
    let text: String
    let color: Color
    
    var body: some View {
        Text(text)
            .font(.caption.bold())
            .foregroundColor(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color)
            .cornerRadius(8)
    }
}

// MARK: - Animated Background

struct AnimatedStormBackground: View {
    @State private var phase: CGFloat = 0
    
    var body: some View {
        ZStack {
            StormColors.background
                .ignoresSafeArea()
            
            // Floating orbs
            GeometryReader { geo in
                ForEach(0..<6, id: \.self) { i in
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [orbColor(i).opacity(0.3), orbColor(i).opacity(0.0)],
                                center: .center,
                                startRadius: 0,
                                endRadius: 120
                            )
                        )
                        .frame(width: 240, height: 240)
                        .offset(
                            x: cos(phase + Double(i) * 1.2) * geo.size.width * 0.3,
                            y: sin(phase + Double(i) * 0.8) * geo.size.height * 0.2
                        )
                        .position(
                            x: geo.size.width * orbX(i),
                            y: geo.size.height * orbY(i)
                        )
                }
            }
            .onAppear {
                withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                    phase = .pi * 2
                }
            }
            
            // Grid lines
            GeometryReader { geo in
                Path { path in
                    let spacing: CGFloat = 40
                    for x in stride(from: CGFloat(0), through: geo.size.width, by: spacing) {
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: geo.size.height))
                    }
                    for y in stride(from: CGFloat(0), through: geo.size.height, by: spacing) {
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: geo.size.width, y: y))
                    }
                }
                .stroke(Color.white.opacity(0.03), lineWidth: 0.5)
            }
        }
    }
    
    private func orbColor(_ index: Int) -> Color {
        let colors: [Color] = [
            StormColors.neonBlue, StormColors.neonPurple,
            StormColors.neonCyan, StormColors.neonPink,
            StormColors.neonGreen, StormColors.neonOrange
        ]
        return colors[index % colors.count]
    }
    
    private func orbX(_ i: Int) -> CGFloat {
        [0.2, 0.8, 0.5, 0.3, 0.7, 0.9][i % 6]
    }
    
    private func orbY(_ i: Int) -> CGFloat {
        [0.3, 0.7, 0.2, 0.8, 0.5, 0.4][i % 6]
    }
}

// MARK: - Particle Emitter View

struct ParticleView: View {
    let count: Int
    let color: Color
    @State private var particles: [(offset: CGSize, opacity: Double, scale: Double)] = []
    
    var body: some View {
        ZStack {
            ForEach(0..<count, id: \.self) { i in
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
                    .scaleEffect(i < particles.count ? particles[i].scale : 0)
                    .opacity(i < particles.count ? particles[i].opacity : 0)
                    .offset(i < particles.count ? particles[i].offset : .zero)
            }
        }
        .onAppear {
            particles = (0..<count).map { _ in
                (
                    offset: CGSize(
                        width: CGFloat.random(in: -100...100),
                        height: CGFloat.random(in: -100...100)
                    ),
                    opacity: Double.random(in: 0.3...1.0),
                    scale: Double.random(in: 0.5...1.5)
                )
            }
        }
    }
}
