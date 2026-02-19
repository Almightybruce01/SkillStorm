import SwiftUI

struct GameDetailView: View {
    let game: GameInfo
    @ObservedObject var progress = PlayerProgress.shared
    @State private var showGame = false
    @State private var animateIn = false
    
    var highScore: Int {
        progress.highScores[game.id] ?? 0
    }
    
    var body: some View {
        ZStack {
            AnimatedStormBackground()
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    // Hero
                    gameHero
                    
                    // Stats
                    if highScore > 0 {
                        gameStats
                    }
                    
                    // Description
                    descriptionCard
                    
                    // Play Button
                    playButton
                    
                    // Supported Grades
                    gradesCard
                    
                    // Power-ups
                    powerUpsCard
                    
                    Color.clear.frame(height: 40)
                }
                .padding(.horizontal, Storm.isIPad ? 40 : 20)
                .readableWidth()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .preferredColorScheme(.dark)
        .fullScreenCover(isPresented: $showGame) {
            GameLauncherView(game: game)
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                animateIn = true
            }
        }
    }
    
    // MARK: - Hero (Cover Art)
    
    private var gameHero: some View {
        VStack(spacing: 16) {
            // Full-width cover art
            GameCoverArt(game: game, size: .detail)
                .scaleEffect(animateIn ? 1.0 : 0.95)
                .opacity(animateIn ? 1.0 : 0)
            
            // Badges row
            HStack(spacing: 12) {
                StormBadge(text: game.category.displayName, color: game.category.gradientColors.first ?? .blue)
                
                if game.isFeatured {
                    StormBadge(text: "FEATURED", color: StormColors.neonYellow)
                }
                
                if !game.isAvailable {
                    StormBadge(text: "COMING SOON", color: .gray)
                }
            }
        }
        .padding(.top, 8)
    }
    
    // MARK: - Stats
    
    private var gameStats: some View {
        HStack(spacing: 0) {
            VStack(spacing: 4) {
                Text("🏆")
                    .font(.title2)
                Text("\(highScore)")
                    .font(.title3.bold())
                    .foregroundColor(StormColors.neonYellow)
                Text("High Score")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
            
            Divider().frame(height: 40).background(Color.white.opacity(0.2))
            
            VStack(spacing: 4) {
                Text("⚡")
                    .font(.title2)
                Text("Lv.\(progress.level)")
                    .font(.title3.bold())
                    .foregroundColor(StormColors.neonBlue)
                Text("Your Level")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 16)
        .glassCard()
    }
    
    // MARK: - Description
    
    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("ABOUT")
                .font(.caption.bold())
                .foregroundColor(StormColors.neonBlue)
                .tracking(2)
            
            Text(game.description)
                .font(.body)
                .foregroundColor(.white.opacity(0.8))
                .lineSpacing(4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .glassCard()
    }
    
    // MARK: - Play Button
    
    private var playButton: some View {
        Button(action: {
            SoundManager.shared.playButtonTap()
            showGame = true
        }) {
            HStack(spacing: 12) {
                Image(systemName: "play.fill")
                    .font(.title2)
                Text(game.isAvailable ? "PLAY NOW" : "COMING SOON")
                    .font(.title3.bold())
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                game.isAvailable
                ? StormColors.heroGradient
                : LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .leading, endPoint: .trailing)
            )
            .cornerRadius(20)
            .neonGlow(game.isAvailable ? StormColors.neonBlue : .gray, radius: 10)
        }
        .disabled(!game.isAvailable)
        .pulsing()
    }
    
    // MARK: - Grades
    
    private var gradesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("GRADE LEVELS")
                .font(.caption.bold())
                .foregroundColor(StormColors.neonPurple)
                .tracking(2)
            
            HStack(spacing: 8) {
                ForEach(game.grades) { grade in
                    HStack(spacing: 4) {
                        Text(grade.emoji)
                        Text(grade.displayName)
                            .font(.caption.bold())
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(StormColors.gradeColor(grade).opacity(0.3))
                    .cornerRadius(12)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .glassCard()
    }
    
    // MARK: - Power-ups
    
    private var powerUpsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("POWER-UPS")
                .font(.caption.bold())
                .foregroundColor(StormColors.neonOrange)
                .tracking(2)
            
            HStack(spacing: 16) {
                powerUpItem(icon: "clock.fill", name: "Slow Time", count: progress.powerUps["slowTime"] ?? 0, color: StormColors.neonCyan)
                powerUpItem(icon: "shield.fill", name: "Hint Shield", count: progress.powerUps["hintShield"] ?? 0, color: StormColors.neonGreen)
                powerUpItem(icon: "star.fill", name: "2x Points", count: progress.powerUps["doublePoints"] ?? 0, color: StormColors.neonYellow)
                powerUpItem(icon: "heart.fill", name: "Extra Life", count: progress.powerUps["extraLife"] ?? 0, color: StormColors.neonPink)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .glassCard()
    }
    
    private func powerUpItem(icon: String, name: String, count: Int, color: Color) -> some View {
        VStack(spacing: 6) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.2))
                    .cornerRadius(12)
                
                Text("\(count)")
                    .font(.caption2.bold())
                    .foregroundColor(.white)
                    .frame(width: 18, height: 18)
                    .background(StormColors.neonRed)
                    .cornerRadius(9)
                    .offset(x: 4, y: -4)
            }
            
            Text(name)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.6))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationStack {
        GameDetailView(game: GameCatalog.allGames[0])
    }
}
