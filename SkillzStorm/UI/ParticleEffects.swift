import SwiftUI
import Combine

// ═══════════════════════════════════════════════════════════════
// PARTICLE EFFECTS SYSTEM
//
// Lightweight, performant particle system for visual feedback.
// Supports bursts (correct answer), explosions, sparkles,
// floating particles, and screen-shake.
// ═══════════════════════════════════════════════════════════════

// MARK: - Particle Model

struct Particle: Identifiable {
    let id = UUID()
    var x: CGFloat
    var y: CGFloat
    var size: CGFloat
    var opacity: Double
    var color: Color
    var velocityX: CGFloat
    var velocityY: CGFloat
    var rotation: Double
    var lifetime: Double
    var elapsed: Double = 0
    var shape: ParticleShape = .circle
    
    enum ParticleShape {
        case circle, star, spark, diamond
    }
}

// MARK: - Particle Emitter View

struct ParticleEmitter: View {
    @Binding var particles: [Particle]
    
    var body: some View {
        Canvas { context, size in
            for particle in particles {
                let progress = particle.elapsed / max(particle.lifetime, 0.01)
                let alpha = particle.opacity * (1.0 - progress)
                let currentSize = particle.size * (1.0 - progress * 0.5)
                
                guard alpha > 0.01 else { continue }
                
                let rect = CGRect(
                    x: particle.x - currentSize / 2,
                    y: particle.y - currentSize / 2,
                    width: currentSize,
                    height: currentSize
                )
                
                switch particle.shape {
                case .circle:
                    context.fill(
                        Path(ellipseIn: rect),
                        with: .color(particle.color.opacity(alpha))
                    )
                    // Glow
                    let glowRect = rect.insetBy(dx: -currentSize * 0.5, dy: -currentSize * 0.5)
                    context.fill(
                        Path(ellipseIn: glowRect),
                        with: .color(particle.color.opacity(alpha * 0.2))
                    )
                    
                case .star:
                    context.fill(
                        starPath(in: rect),
                        with: .color(particle.color.opacity(alpha))
                    )
                    
                case .spark:
                    var sparkPath = Path()
                    sparkPath.move(to: CGPoint(x: particle.x, y: particle.y - currentSize))
                    sparkPath.addLine(to: CGPoint(x: particle.x, y: particle.y + currentSize))
                    context.stroke(
                        sparkPath,
                        with: .color(particle.color.opacity(alpha)),
                        lineWidth: max(1, currentSize * 0.3)
                    )
                    var sparkPath2 = Path()
                    sparkPath2.move(to: CGPoint(x: particle.x - currentSize * 0.5, y: particle.y))
                    sparkPath2.addLine(to: CGPoint(x: particle.x + currentSize * 0.5, y: particle.y))
                    context.stroke(
                        sparkPath2,
                        with: .color(particle.color.opacity(alpha)),
                        lineWidth: max(1, currentSize * 0.2)
                    )
                    
                case .diamond:
                    var diamondPath = Path()
                    diamondPath.move(to: CGPoint(x: particle.x, y: particle.y - currentSize / 2))
                    diamondPath.addLine(to: CGPoint(x: particle.x + currentSize / 2, y: particle.y))
                    diamondPath.addLine(to: CGPoint(x: particle.x, y: particle.y + currentSize / 2))
                    diamondPath.addLine(to: CGPoint(x: particle.x - currentSize / 2, y: particle.y))
                    diamondPath.closeSubpath()
                    context.fill(
                        diamondPath,
                        with: .color(particle.color.opacity(alpha))
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
    
    private func starPath(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let outerRadius = rect.width / 2
        let innerRadius = outerRadius * 0.4
        var path = Path()
        
        for i in 0..<10 {
            let angle = CGFloat(i) * .pi / 5 - .pi / 2
            let radius = i % 2 == 0 ? outerRadius : innerRadius
            let point = CGPoint(
                x: center.x + cos(angle) * radius,
                y: center.y + sin(angle) * radius
            )
            if i == 0 { path.move(to: point) }
            else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }
}

// MARK: - Particle Burst Factory

struct ParticleBurst {
    
    /// Correct answer — green sparkles bursting outward
    static func correct(at point: CGPoint, count: Int = 20) -> [Particle] {
        (0..<count).map { _ in
            let angle = CGFloat.random(in: 0...(.pi * 2))
            let speed = CGFloat.random(in: 80...220)
            return Particle(
                x: point.x,
                y: point.y,
                size: CGFloat.random(in: 4...10),
                opacity: Double.random(in: 0.6...1.0),
                color: [StormColors.neonGreen, .green, .white, StormColors.neonCyan].randomElement()!,
                velocityX: cos(angle) * speed,
                velocityY: sin(angle) * speed,
                rotation: Double.random(in: 0...360),
                lifetime: Double.random(in: 0.5...1.0),
                shape: [.circle, .star, .spark].randomElement()!
            )
        }
    }
    
    /// Wrong answer — red sparks
    static func wrong(at point: CGPoint, count: Int = 12) -> [Particle] {
        (0..<count).map { _ in
            let angle = CGFloat.random(in: 0...(.pi * 2))
            let speed = CGFloat.random(in: 60...150)
            return Particle(
                x: point.x,
                y: point.y,
                size: CGFloat.random(in: 3...8),
                opacity: Double.random(in: 0.5...0.9),
                color: [StormColors.neonRed, .red, StormColors.neonOrange].randomElement()!,
                velocityX: cos(angle) * speed,
                velocityY: sin(angle) * speed,
                rotation: Double.random(in: 0...360),
                lifetime: Double.random(in: 0.3...0.7),
                shape: .spark
            )
        }
    }
    
    /// Combo celebration — mixed neon colors
    static func combo(at point: CGPoint, multiplier: Int) -> [Particle] {
        let count = min(40, 15 + multiplier * 3)
        return (0..<count).map { _ in
            let angle = CGFloat.random(in: 0...(.pi * 2))
            let speed = CGFloat.random(in: 100...300)
            return Particle(
                x: point.x,
                y: point.y,
                size: CGFloat.random(in: 5...14),
                opacity: 1.0,
                color: [StormColors.neonBlue, StormColors.neonPurple, StormColors.neonCyan,
                        StormColors.neonGreen, StormColors.neonPink, StormColors.neonYellow].randomElement()!,
                velocityX: cos(angle) * speed,
                velocityY: sin(angle) * speed,
                rotation: Double.random(in: 0...360),
                lifetime: Double.random(in: 0.6...1.2),
                shape: [.star, .diamond, .circle].randomElement()!
            )
        }
    }
    
    /// Explosion — for destroying enemies / objects
    static func explosion(at point: CGPoint, color: Color = StormColors.neonOrange, count: Int = 25) -> [Particle] {
        (0..<count).map { _ in
            let angle = CGFloat.random(in: 0...(.pi * 2))
            let speed = CGFloat.random(in: 100...250)
            return Particle(
                x: point.x,
                y: point.y,
                size: CGFloat.random(in: 4...12),
                opacity: Double.random(in: 0.7...1.0),
                color: [color, color.opacity(0.7), .white, StormColors.neonYellow].randomElement()!,
                velocityX: cos(angle) * speed,
                velocityY: sin(angle) * speed,
                rotation: Double.random(in: 0...360),
                lifetime: Double.random(in: 0.4...0.9),
                shape: [.circle, .spark, .spark].randomElement()!
            )
        }
    }
    
    /// Score popup — floating numbers
    static func scoreRise(at point: CGPoint, color: Color = StormColors.neonYellow) -> [Particle] {
        (0..<6).map { _ in
            Particle(
                x: point.x + CGFloat.random(in: -15...15),
                y: point.y,
                size: CGFloat.random(in: 3...6),
                opacity: Double.random(in: 0.5...0.9),
                color: color,
                velocityX: CGFloat.random(in: -30...30),
                velocityY: CGFloat.random(in: -120 ... -60),
                rotation: 0,
                lifetime: Double.random(in: 0.5...1.0),
                shape: .star
            )
        }
    }
}

// MARK: - Particle Simulation Manager

@MainActor
class ParticleManager: ObservableObject {
    @Published var particles: [Particle] = []
    private var displayLink: Timer?
    
    func emit(_ newParticles: [Particle]) {
        particles.append(contentsOf: newParticles)
        startIfNeeded()
    }
    
    func clear() {
        particles.removeAll()
        displayLink?.invalidate()
        displayLink = nil
    }
    
    private func startIfNeeded() {
        guard displayLink == nil else { return }
        displayLink = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.tick()
            }
        }
    }
    
    private func tick() {
        let dt = 1.0 / 30.0
        
        particles = particles.compactMap { p in
            var updated = p
            updated.elapsed += dt
            
            if updated.elapsed >= updated.lifetime { return nil }
            
            updated.x += updated.velocityX * CGFloat(dt)
            updated.y += updated.velocityY * CGFloat(dt)
            updated.velocityY += 50 * CGFloat(dt) // gravity
            updated.velocityX *= 0.99 // drag
            
            return updated
        }
        
        if particles.isEmpty {
            displayLink?.invalidate()
            displayLink = nil
        }
    }
    
    deinit {
        displayLink?.invalidate()
    }
}

// MARK: - Screen Shake Modifier

struct ScreenShakeModifier: ViewModifier {
    @Binding var isShaking: Bool
    var intensity: CGFloat = 8
    
    @State private var offset: CGSize = .zero
    
    func body(content: Content) -> some View {
        content
            .offset(offset)
            .onChange(of: isShaking) { _, shaking in
                if shaking {
                    performShake()
                }
            }
    }
    
    private func performShake() {
        let steps = 6
        for i in 0..<steps {
            let delay = Double(i) * 0.04
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                let factor = CGFloat(steps - i) / CGFloat(steps)
                withAnimation(.linear(duration: 0.04)) {
                    offset = CGSize(
                        width: CGFloat.random(in: -intensity...intensity) * factor,
                        height: CGFloat.random(in: -intensity...intensity) * factor
                    )
                }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(steps) * 0.04) {
            withAnimation(.linear(duration: 0.04)) {
                offset = .zero
            }
            isShaking = false
        }
    }
}

extension View {
    func screenShake(isShaking: Binding<Bool>, intensity: CGFloat = 8) -> some View {
        modifier(ScreenShakeModifier(isShaking: isShaking, intensity: intensity))
    }
}

// MARK: - Floating Score Text

struct FloatingScoreText: View {
    let text: String
    let color: Color
    @State private var opacity: Double = 1.0
    @State private var yOffset: CGFloat = 0
    @State private var scale: CGFloat = 1.5
    
    var body: some View {
        Text(text)
            .font(.system(size: 24, weight: .black, design: .rounded))
            .foregroundColor(color)
            .shadow(color: color.opacity(0.6), radius: 8)
            .opacity(opacity)
            .offset(y: yOffset)
            .scaleEffect(scale)
            .onAppear {
                withAnimation(.easeOut(duration: 0.8)) {
                    yOffset = -80
                    opacity = 0
                }
                withAnimation(.spring(response: 0.2, dampingFraction: 0.6)) {
                    scale = 1.0
                }
            }
    }
}
