import SwiftUI

// ═══════════════════════════════════════════════════════════════
// GAME COVER ART SYSTEM
//
// Procedurally generates unique, visually stunning cover art
// for every game based on its properties. Each game gets a
// distinct look with themed backgrounds, patterns, icons, and
// glow effects. No external assets needed.
// ═══════════════════════════════════════════════════════════════

struct GameCoverArt: View {
    let game: GameInfo
    let size: CoverSize
    
    enum CoverSize {
        case card      // 160x100 - for grid cards
        case featured  // 280x160 - for featured carousel
        case detail    // full width x 240 - for detail view header
        case mini      // 60x60 - for list items
    }
    
    // Unique seed per game for consistent random generation
    private var seed: Int {
        var hasher = Hasher()
        hasher.combine(game.id)
        return abs(hasher.finalize())
    }
    
    private var primaryColor: Color { gamePrimaryColor(game) }
    private var secondaryColor: Color { gameSecondaryColor(game) }
    private var patternType: Int { seed % 6 }
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Layer 1: Gradient background
                gradientBackground
                
                // Layer 2: Pattern overlay
                patternOverlay(size: geo.size)
                
                // Layer 3: Decorative shapes
                decorativeShapes(size: geo.size)
                
                // Layer 4: Glow orbs
                glowOrbs(size: geo.size)
                
                // Layer 5: Game icon & title
                gameOverlay(size: geo.size)
                
                // Layer 6: Category badge
                categoryBadge
                
                // Layer 7: Subtle vignette
                vignette
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(primaryColor.opacity(0.4), lineWidth: 1)
        )
        .shadow(color: primaryColor.opacity(0.3), radius: 8, y: 4)
        .frame(height: frameHeight)
    }
    
    private var cornerRadius: CGFloat {
        switch size {
        case .card: return 16
        case .featured: return 20
        case .detail: return 24
        case .mini: return 12
        }
    }
    
    private var frameHeight: CGFloat {
        switch size {
        case .card: return 110
        case .featured: return 170
        case .detail: return 240
        case .mini: return 60
        }
    }
    
    // MARK: - Layer 1: Gradient Background
    
    private var gradientBackground: some View {
        LinearGradient(
            colors: [
                primaryColor.opacity(0.7),
                Color(red: 0.03, green: 0.03, blue: 0.1),
                secondaryColor.opacity(0.4)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    // MARK: - Layer 2: Pattern Overlay
    
    private func patternOverlay(size: CGSize) -> some View {
        Canvas { context, canvasSize in
            let w = canvasSize.width
            let h = canvasSize.height
            
            switch patternType {
            case 0: // Grid
                for x in stride(from: CGFloat(0), through: w, by: 25) {
                    var path = Path()
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: h))
                    context.stroke(path, with: .color(.white.opacity(0.04)), lineWidth: 0.5)
                }
                for y in stride(from: CGFloat(0), through: h, by: 25) {
                    var path = Path()
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: w, y: y))
                    context.stroke(path, with: .color(.white.opacity(0.04)), lineWidth: 0.5)
                }
                
            case 1: // Diagonal lines
                for i in stride(from: CGFloat(-h), through: w + h, by: 20) {
                    var path = Path()
                    path.move(to: CGPoint(x: i, y: 0))
                    path.addLine(to: CGPoint(x: i + h, y: h))
                    context.stroke(path, with: .color(.white.opacity(0.04)), lineWidth: 0.5)
                }
                
            case 2: // Circles
                for i in 0..<8 {
                    let cx = w * CGFloat((seed + i * 37) % 100) / 100.0
                    let cy = h * CGFloat((seed + i * 53) % 100) / 100.0
                    let r = CGFloat(20 + (seed + i * 17) % 40)
                    let circle = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
                    context.stroke(circle, with: .color(.white.opacity(0.05)), lineWidth: 1)
                }
                
            case 3: // Hexagonal
                let hexSize: CGFloat = 30
                for row in 0..<Int(h / hexSize) + 1 {
                    for col in 0..<Int(w / hexSize) + 1 {
                        let offset: CGFloat = row % 2 == 0 ? 0 : hexSize / 2
                        let x = CGFloat(col) * hexSize + offset
                        let y = CGFloat(row) * hexSize * 0.866
                        var path = Path()
                        for j in 0..<6 {
                            let angle = CGFloat(j) * .pi / 3 - .pi / 6
                            let px = x + cos(angle) * hexSize * 0.4
                            let py = y + sin(angle) * hexSize * 0.4
                            if j == 0 { path.move(to: CGPoint(x: px, y: py)) }
                            else { path.addLine(to: CGPoint(x: px, y: py)) }
                        }
                        path.closeSubpath()
                        context.stroke(path, with: .color(.white.opacity(0.03)), lineWidth: 0.5)
                    }
                }
                
            case 4: // Dot grid
                for x in stride(from: CGFloat(10), through: w, by: 20) {
                    for y in stride(from: CGFloat(10), through: h, by: 20) {
                        let dot = Path(ellipseIn: CGRect(x: x - 1, y: y - 1, width: 2, height: 2))
                        context.fill(dot, with: .color(.white.opacity(0.06)))
                    }
                }
                
            default: // Concentric arcs
                for i in 1..<6 {
                    let r = CGFloat(i) * 40
                    var path = Path()
                    path.addArc(center: CGPoint(x: w * 0.8, y: h * 1.2), radius: r, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
                    context.stroke(path, with: .color(.white.opacity(0.05)), lineWidth: 1)
                }
            }
        }
    }
    
    // MARK: - Layer 3: Decorative Shapes
    
    private func decorativeShapes(size: CGSize) -> some View {
        ZStack {
            // Accent shape 1
            RoundedRectangle(cornerRadius: 8)
                .fill(primaryColor.opacity(0.15))
                .frame(width: size.width * 0.4, height: size.height * 0.3)
                .rotationEffect(.degrees(Double(seed % 45) - 22))
                .offset(
                    x: size.width * 0.3,
                    y: -size.height * 0.15
                )
            
            // Accent shape 2
            Circle()
                .fill(secondaryColor.opacity(0.1))
                .frame(width: size.width * 0.5)
                .offset(
                    x: -size.width * 0.25,
                    y: size.height * 0.2
                )
            
            // Accent line
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [primaryColor.opacity(0.4), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 2)
                .offset(y: size.height * 0.35)
        }
    }
    
    // MARK: - Layer 4: Glow Orbs
    
    private func glowOrbs(size: CGSize) -> some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [primaryColor.opacity(0.35), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: size.width * 0.3
                    )
                )
                .frame(width: size.width * 0.6)
                .offset(
                    x: size.width * 0.2,
                    y: -size.height * 0.1
                )
            
            Circle()
                .fill(
                    RadialGradient(
                        colors: [secondaryColor.opacity(0.25), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: size.width * 0.25
                    )
                )
                .frame(width: size.width * 0.5)
                .offset(
                    x: -size.width * 0.2,
                    y: size.height * 0.15
                )
        }
    }
    
    // MARK: - Layer 5: Game Icon & Title
    
    private func gameOverlay(size: CGSize) -> some View {
        let coverSize = self.size
        return VStack(spacing: coverSize == .mini ? 2 : 6) {
            Text(game.iconEmoji)
                .font(.system(size: emojiSize))
                .shadow(color: primaryColor.opacity(0.8), radius: 10)
                .shadow(color: primaryColor.opacity(0.4), radius: 20)
            
            if coverSize != .mini {
                Text(game.name.uppercased())
                    .font(.system(size: titleSize, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .shadow(color: .black, radius: 4)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .padding(.horizontal, 10)
                
                if coverSize == .detail || coverSize == .featured {
                    Text(game.description)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(coverSize == .detail ? 3 : 2)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)
                }
            }
        }
    }
    
    private var emojiSize: CGFloat {
        switch size {
        case .card: return 32
        case .featured: return 44
        case .detail: return 56
        case .mini: return 24
        }
    }
    
    private var titleSize: CGFloat {
        switch size {
        case .card: return 11
        case .featured: return 16
        case .detail: return 22
        case .mini: return 8
        }
    }
    
    // MARK: - Layer 6: Category Badge
    
    private var categoryBadge: some View {
        VStack {
            HStack {
                Spacer()
                
                if size != .mini {
                    HStack(spacing: 3) {
                        Image(systemName: game.category.iconName)
                            .font(.system(size: 8))
                        Text(game.category.displayName)
                            .font(.system(size: 7).bold())
                    }
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(.ultraThinMaterial)
                    .background(Color.black.opacity(0.3))
                    .cornerRadius(6)
                    .padding(8)
                }
            }
            Spacer()
        }
    }
    
    // MARK: - Layer 7: Vignette
    
    private var vignette: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(
                RadialGradient(
                    colors: [.clear, Color.black.opacity(0.3)],
                    center: .center,
                    startRadius: 50,
                    endRadius: 200
                )
            )
    }
}

// MARK: - Color Mapping

private func gamePrimaryColor(_ game: GameInfo) -> Color {
    // Each game gets a unique primary color based on its ID
    let colors: [Color] = [
        StormColors.neonBlue, StormColors.neonPurple, StormColors.neonGreen,
        StormColors.neonPink, StormColors.neonYellow, StormColors.neonOrange,
        StormColors.neonRed, StormColors.neonCyan,
        Color(red: 0.4, green: 0.8, blue: 1.0),   // Sky blue
        Color(red: 0.8, green: 0.4, blue: 1.0),   // Lavender
        Color(red: 1.0, green: 0.6, blue: 0.2),   // Amber
        Color(red: 0.2, green: 1.0, blue: 0.8),   // Teal
    ]
    
    var hasher = Hasher()
    hasher.combine(game.id)
    hasher.combine("primary")
    let idx = abs(hasher.finalize()) % colors.count
    return colors[idx]
}

private func gameSecondaryColor(_ game: GameInfo) -> Color {
    let colors: [Color] = [
        StormColors.neonPurple, StormColors.neonBlue, StormColors.neonCyan,
        StormColors.neonOrange, StormColors.neonGreen, StormColors.neonPink,
        StormColors.neonYellow, StormColors.neonRed,
        Color(red: 0.6, green: 0.2, blue: 1.0),
        Color(red: 0.0, green: 0.6, blue: 0.8),
        Color(red: 1.0, green: 0.3, blue: 0.5),
        Color(red: 0.3, green: 0.9, blue: 0.4),
    ]
    
    var hasher = Hasher()
    hasher.combine(game.id)
    hasher.combine("secondary")
    let idx = abs(hasher.finalize()) % colors.count
    return colors[idx]
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED GAME CARD — Replaces the old emoji-only card
// ═══════════════════════════════════════════════════════════════

struct EnhancedGameCard: View {
    let game: GameInfo
    
    var body: some View {
        VStack(spacing: 0) {
            // Cover art
            GameCoverArt(game: game, size: .card)
            
            // Info bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(game.name)
                        .font(.caption.bold())
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(game.description)
                        .font(.system(size: 9))
                        .foregroundColor(.white.opacity(0.45))
                        .lineLimit(1)
                }
                
                Spacer()
                
                if !game.isAvailable {
                    StormBadge(text: "SOON", color: .gray)
                } else if game.isPremium {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 10))
                        .foregroundColor(StormColors.neonYellow)
                } else {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(StormColors.neonGreen)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(StormColors.surface)
        }
        .contentShape(RoundedRectangle(cornerRadius: 16))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED FEATURED GAME CARD — For the home page carousel
// ═══════════════════════════════════════════════════════════════

struct EnhancedFeaturedCard: View {
    let game: GameInfo
    
    var body: some View {
        VStack(spacing: 0) {
            GameCoverArt(game: game, size: .featured)
            
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(game.name)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    
                    Text(game.description)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                        .lineLimit(2)
                }
                
                Spacer()
                
                VStack(spacing: 2) {
                    Image(systemName: "play.fill")
                        .font(.title3)
                        .foregroundColor(StormColors.neonGreen)
                    Text("PLAY")
                        .font(.system(size: 8).bold())
                        .foregroundColor(StormColors.neonGreen)
                }
            }
            .padding(12)
            .background(StormColors.surface)
        }
        .frame(width: 280)
        .contentShape(RoundedRectangle(cornerRadius: 20))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: 10, y: 5)
    }
}
