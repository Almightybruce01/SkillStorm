import SwiftUI

struct GameBrowserView: View {
    let category: GameCategory?
    @ObservedObject var progress = PlayerProgress.shared
    @State private var searchText = ""
    @State private var selectedCategory: GameCategory?
    @State private var showFilters = false
    
    var filteredGames: [GameInfo] {
        var games: [GameInfo]
        
        if let cat = category ?? selectedCategory {
            games = GameCatalog.games(for: cat, grade: progress.selectedGrade)
        } else {
            games = GameCatalog.games(for: progress.selectedGrade)
        }
        
        if !searchText.isEmpty {
            games = games.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return games
    }
    
    var body: some View {
        ZStack {
            AnimatedStormBackground()
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    // Header info
                    if let cat = category {
                        categoryHeader(cat)
                    } else {
                        allGamesHeader
                    }
                    
                    // Search bar
                    searchBar
                    
                    // Category filter pills (if showing all)
                    if category == nil {
                        categoryFilters
                    }
                    
                    // Game grid
                    if filteredGames.isEmpty {
                        emptyState
                    } else {
                        gameGrid
                    }
                    
                    Color.clear.frame(height: 40)
                }
                .padding(.horizontal, Storm.isIPad ? 40 : 20)
                .readableWidth()
            }
        }
        .navigationTitle(category?.displayName ?? "All Games")
        .navigationBarTitleDisplayMode(.large)
        .preferredColorScheme(.dark)
    }
    
    // MARK: - Category Header
    
    private func categoryHeader(_ cat: GameCategory) -> some View {
        HStack(spacing: 16) {
            Image(systemName: cat.iconName)
                .font(.largeTitle)
                .foregroundColor(.white)
                .frame(width: 70, height: 70)
                .background(
                    LinearGradient(colors: cat.gradientColors, startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .cornerRadius(20)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(cat.displayName)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                Text(cat.subtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                Text("\(filteredGames.count) games for \(progress.selectedGrade.displayName)")
                    .font(.caption)
                    .foregroundColor(StormColors.neonBlue)
            }
            
            Spacer()
        }
        .padding(16)
        .glassCard()
    }
    
    private var allGamesHeader: some View {
        VStack(spacing: 8) {
            Text("ALL GAMES")
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.heroGradient)
            Text("Grade: \(progress.selectedGrade.displayName) • \(filteredGames.count) games")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
        }
    }
    
    // MARK: - Search Bar
    
    private var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.5))
            
            TextField("Search games...", text: $searchText)
                .foregroundColor(.white)
                .autocorrectionDisabled()
            
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.5))
                }
            }
        }
        .padding(14)
        .background(StormColors.surface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
    
    // MARK: - Category Filters
    
    private var categoryFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                filterPill(title: "All", isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }
                
                ForEach(GameCategory.allCases) { cat in
                    filterPill(title: cat.displayName, isSelected: selectedCategory == cat) {
                        selectedCategory = cat
                    }
                }
            }
        }
    }
    
    private func filterPill(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            SoundManager.shared.playButtonTap()
            withAnimation(.spring(response: 0.3)) { action() }
        }) {
            Text(title)
                .font(.caption.bold())
                .foregroundColor(isSelected ? .white : .white.opacity(0.6))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected
                    ? StormColors.neonBlue.opacity(0.5)
                    : StormColors.surface
                )
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? StormColors.neonBlue : Color.clear, lineWidth: 1)
                )
        }
    }
    
    // MARK: - Game Grid
    
    private var gameGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: Storm.isIPad ? 3 : 2), spacing: 14) {
            ForEach(filteredGames) { game in
                NavigationLink(destination: GameDetailView(game: game)) {
                    EnhancedGameCard(game: game)
                }
                .buttonStyle(.plain)
            }
        }
    }
    
    // MARK: - Empty State
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Text("🔍")
                .font(.system(size: 60))
            Text("No games found")
                .font(.headline)
                .foregroundColor(.white)
            Text("Try a different search or category")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Game Card

struct GameCard: View {
    let game: GameInfo
    
    var body: some View {
        VStack(spacing: 8) {
            // Icon
            Text(game.iconEmoji)
                .font(.system(size: 36))
                .frame(height: 50)
            
            // Name
            Text(game.name)
                .font(.subheadline.bold())
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            // Description
            Text(game.description)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.5))
                .lineLimit(2)
                .multilineTextAlignment(.center)
            
            Spacer()
            
            // Status
            HStack {
                if !game.isAvailable {
                    StormBadge(text: "SOON", color: .gray)
                } else if game.isPremium {
                    StormBadge(text: "PREMIUM", color: StormColors.neonYellow)
                } else {
                    StormBadge(text: "FREE", color: StormColors.neonGreen)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 170)
        .contentShape(RoundedRectangle(cornerRadius: 16))
        .background(
            LinearGradient(
                colors: game.category.gradientColors.map { $0.opacity(0.15) },
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .glassCard()
    }
}

#Preview {
    NavigationStack {
        GameBrowserView(category: nil)
    }
}
