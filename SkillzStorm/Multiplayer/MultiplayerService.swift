import SwiftUI
import Combine
import GameKit

// ═══════════════════════════════════════════════════════════════
// MULTIPLAYER SERVICE — Apple Game Center Integration
//
// Provides anonymous, COPPA-compliant multiplayer for arcade games.
// - No chat, no personal data, no location tracking
// - Players identified by "Player 1", "Player 2", etc.
// - Matchmaking based on grade level and game type
// - Real-time multiplayer for head-to-head quiz battles
// ═══════════════════════════════════════════════════════════════

class MultiplayerService: NSObject, ObservableObject {
    static let shared = MultiplayerService()
    
    // MARK: - State
    
    @Published var isAuthenticated = false
    @Published var isMatchmaking = false
    @Published var isInMatch = false
    @Published var currentMatch: GKMatch?
    @Published var playerSlot: Int = 0
    @Published var connectedPlayers: [MultiplayerPlayer] = []
    @Published var matchState: MatchState = .idle
    @Published var opponentScore: Int = 0
    @Published var opponentReady: Bool = false
    @Published var localPlayerAlias: String = "Player"
    
    private var matchRequest: GKMatchRequest?
    private var matchmakerVC: GKMatchmakerViewController?
    
    enum MatchState: Equatable {
        case idle
        case searching
        case connecting
        case playing
        case finished
        case error(String)
    }
    
    // MARK: - Authentication
    
    func authenticate() {
        let localPlayer = GKLocalPlayer.local
        localPlayer.authenticateHandler = { [weak self] viewController, error in
            Task { @MainActor in
                if let error = error {
                    print("[Multiplayer] Auth error: \(error.localizedDescription)")
                    self?.isAuthenticated = false
                    return
                }
                
                if viewController != nil {
                    // Game Center needs to present a login UI — but we won't force it
                    // The user can authenticate through Settings > Game Center
                    print("[Multiplayer] Game Center login needed")
                    self?.isAuthenticated = false
                } else if localPlayer.isAuthenticated {
                    print("[Multiplayer] Authenticated as: \(localPlayer.displayName)")
                    self?.isAuthenticated = true
                    self?.localPlayerAlias = "Player \(Int.random(in: 100...999))"
                }
            }
        }
    }
    
    // MARK: - Matchmaking
    
    func findMatch(gameId: String, gradeLevel: GradeLevel) {
        guard isAuthenticated else {
            matchState = .error("Please sign in to Game Center in Settings to play multiplayer.")
            return
        }
        
        matchState = .searching
        isMatchmaking = true
        
        let request = GKMatchRequest()
        request.minPlayers = 2
        request.maxPlayers = 2
        request.playerGroup = playerGroupId(gameId: gameId, grade: gradeLevel)
        request.inviteMessage = "Join my SkillzStorm match!"
        
        GKMatchmaker.shared().findMatch(for: request) { [weak self] match, error in
            guard let self else { return }
            Task { @MainActor [self] in
                self.isMatchmaking = false
                
                if let error = error {
                    print("[Multiplayer] Match error: \(error.localizedDescription)")
                    self.matchState = .error("Could not find a match. Try again later.")
                    return
                }
                
                guard let match = match else {
                    self.matchState = .error("Match not available.")
                    return
                }
                
                self.startMatch(match)
            }
        }
    }
    
    func cancelMatchmaking() {
        GKMatchmaker.shared().cancel()
        isMatchmaking = false
        matchState = .idle
    }
    
    private func startMatch(_ match: GKMatch) {
        currentMatch = match
        match.delegate = self
        isInMatch = true
        matchState = .connecting
        
        // Assign player slots based on player ID comparison
        let localId = GKLocalPlayer.local.gamePlayerID
        let otherId = match.players.first?.gamePlayerID ?? ""
        playerSlot = localId < otherId ? 1 : 2
        
        // Build player list
        connectedPlayers = [
            MultiplayerPlayer(slot: playerSlot, displayName: "You (Player \(playerSlot))", isLocal: true, score: 0),
            MultiplayerPlayer(slot: playerSlot == 1 ? 2 : 1, displayName: "Player \(playerSlot == 1 ? 2 : 1)", isLocal: false, score: 0)
        ]
        
        // Send ready signal
        sendData(MultiplayerMessage(type: .ready, score: 0, answer: -1))
        
        print("[Multiplayer] Match started! You are Player \(playerSlot)")
    }
    
    // MARK: - Communication
    
    func sendScore(_ score: Int) {
        sendData(MultiplayerMessage(type: .scoreUpdate, score: score, answer: -1))
    }
    
    func sendAnswer(_ answerIndex: Int, questionId: Int) {
        sendData(MultiplayerMessage(type: .answer, score: 0, answer: answerIndex))
    }
    
    func sendGameOver(finalScore: Int) {
        sendData(MultiplayerMessage(type: .gameOver, score: finalScore, answer: -1))
    }
    
    private func sendData(_ message: MultiplayerMessage) {
        guard let match = currentMatch else { return }
        
        do {
            let data = try JSONEncoder().encode(message)
            try match.sendData(toAllPlayers: data, with: .reliable)
        } catch {
            print("[Multiplayer] Send error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Disconnect
    
    func disconnect() {
        currentMatch?.disconnect()
        currentMatch = nil
        isInMatch = false
        isMatchmaking = false
        matchState = .idle
        connectedPlayers = []
        opponentScore = 0
        opponentReady = false
    }
    
    // MARK: - Helpers
    
    private func playerGroupId(gameId: String, grade: GradeLevel) -> Int {
        // Create a unique group per game + grade combo for matchmaking
        var hasher = Hasher()
        hasher.combine(gameId)
        hasher.combine(grade.rawValue)
        return abs(hasher.finalize()) % 100000
    }
}

// MARK: - GKMatchDelegate

extension MultiplayerService: GKMatchDelegate {
    func match(_ match: GKMatch, didReceive data: Data, fromRemotePlayer player: GKPlayer) {
        do {
            let message = try JSONDecoder().decode(MultiplayerMessage.self, from: data)
            
            Task { @MainActor in
                switch message.type {
                case .ready:
                    self.opponentReady = true
                    if self.matchState == .connecting {
                        self.matchState = .playing
                    }
                    
                case .scoreUpdate:
                    self.opponentScore = message.score
                    if let idx = self.connectedPlayers.firstIndex(where: { !$0.isLocal }) {
                        self.connectedPlayers[idx].score = message.score
                    }
                    
                case .answer:
                    // Opponent answered — update UI
                    break
                    
                case .gameOver:
                    self.opponentScore = message.score
                    if let idx = self.connectedPlayers.firstIndex(where: { !$0.isLocal }) {
                        self.connectedPlayers[idx].score = message.score
                    }
                    self.matchState = .finished
                }
            }
        } catch {
            print("[Multiplayer] Decode error: \(error.localizedDescription)")
        }
    }
    
    func match(_ match: GKMatch, player: GKPlayer, didChange state: GKPlayerConnectionState) {
        Task { @MainActor in
            switch state {
            case .connected:
                print("[Multiplayer] Player connected: \(player.displayName)")
            case .disconnected:
                print("[Multiplayer] Player disconnected: \(player.displayName)")
                self.matchState = .finished
            default:
                break
            }
        }
    }
    
    func match(_ match: GKMatch, didFailWithError error: Error?) {
        Task { @MainActor in
            print("[Multiplayer] Match failed: \(error?.localizedDescription ?? "unknown")")
            self.matchState = .error("Connection lost. Please try again.")
            self.disconnect()
        }
    }
}

// MARK: - Data Models

struct MultiplayerMessage: Codable {
    enum MessageType: String, Codable {
        case ready
        case scoreUpdate
        case answer
        case gameOver
    }
    
    let type: MessageType
    let score: Int
    let answer: Int
}

struct MultiplayerPlayer: Identifiable {
    let id = UUID()
    let slot: Int
    let displayName: String
    let isLocal: Bool
    var score: Int
}

// ═══════════════════════════════════════════════════════════════
// MULTIPLAYER LOBBY VIEW
// ═══════════════════════════════════════════════════════════════

struct MultiplayerLobbyView: View {
    let gameId: String
    let gameName: String
    let gameEmoji: String
    let grade: GradeLevel
    let onStartMatch: () -> Void
    let onCancel: () -> Void
    
    @ObservedObject var multiplayer = MultiplayerService.shared
    @State private var searchDots = ""
    @State private var searchTimer: Timer?
    @State private var showParentalGate = false
    @State private var parentalGatePassed = false
    
    var body: some View {
        ZStack {
            StormColors.background.ignoresSafeArea()
            
            if showParentalGate && !parentalGatePassed {
                ParentalGateView(
                    title: "Multiplayer Access",
                    description: "Your child wants to play multiplayer. This uses Apple Game Center with anonymous player numbers only. No chat or personal data is shared.",
                    onSuccess: {
                        parentalGatePassed = true
                        showParentalGate = false
                        startSearching()
                    },
                    onCancel: {
                        showParentalGate = false
                        onCancel()
                    }
                )
            } else {
                VStack(spacing: 24) {
                    // Game info
                    VStack(spacing: 8) {
                        Text(gameEmoji)
                            .font(.system(size: 60))
                            .floating()
                        
                        Text(gameName)
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                        
                        Text("MULTIPLAYER")
                            .font(.caption.bold())
                            .foregroundColor(StormColors.neonCyan)
                            .tracking(3)
                    }
                    .padding(.top, 40)
                    
                    Spacer()
                    
                    // Status
                    statusView
                    
                    Spacer()
                    
                    // Players
                    if !multiplayer.connectedPlayers.isEmpty {
                        playersView
                    }
                    
                    // Actions
                    VStack(spacing: 12) {
                        if multiplayer.matchState == .playing || (multiplayer.matchState == .connecting && multiplayer.opponentReady) {
                            StormButton("START BATTLE", icon: "bolt.fill", gradient: StormColors.heroGradient) {
                                onStartMatch()
                            }
                            .pulsing()
                        }
                        
                        Button(action: {
                            multiplayer.cancelMatchmaking()
                            multiplayer.disconnect()
                            onCancel()
                        }) {
                            Text("Cancel")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .onAppear {
            if !parentalGatePassed {
                showParentalGate = true
            } else {
                startSearching()
            }
        }
        .onDisappear {
            searchTimer?.invalidate()
        }
    }
    
    private var statusView: some View {
        VStack(spacing: 12) {
            switch multiplayer.matchState {
            case .idle:
                Text("Preparing\(searchDots)")
                    .font(.headline)
                    .foregroundColor(.white)
                
            case .searching:
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(StormColors.neonBlue)
                        .scaleEffect(1.5)
                    
                    Text("Searching for opponent\(searchDots)")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text("Grade: \(grade.displayName)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                
            case .connecting:
                VStack(spacing: 8) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 40))
                        .foregroundColor(StormColors.neonGreen)
                    
                    Text("Opponent Found!")
                        .font(.headline.bold())
                        .foregroundColor(StormColors.neonGreen)
                    
                    Text(multiplayer.opponentReady ? "Both players ready!" : "Waiting for opponent to ready up\(searchDots)")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.6))
                }
                
            case .playing:
                Text("MATCH READY")
                    .font(.title.bold())
                    .foregroundColor(StormColors.neonGreen)
                
            case .finished:
                Text("Match Complete")
                    .font(.headline)
                    .foregroundColor(.white)
                
            case .error(let msg):
                VStack(spacing: 8) {
                    Image(systemName: "wifi.slash")
                        .font(.system(size: 40))
                        .foregroundColor(StormColors.neonRed)
                    Text(msg)
                        .font(.subheadline)
                        .foregroundColor(StormColors.neonRed)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(StormColors.surface.opacity(0.5))
        .cornerRadius(20)
        .padding(.horizontal, 20)
    }
    
    private var playersView: some View {
        VStack(spacing: 8) {
            ForEach(multiplayer.connectedPlayers) { player in
                HStack(spacing: 12) {
                    Circle()
                        .fill(player.isLocal ? StormColors.neonBlue : StormColors.neonOrange)
                        .frame(width: 40, height: 40)
                        .overlay(
                            Text("P\(player.slot)")
                                .font(.caption.bold())
                                .foregroundColor(.white)
                        )
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(player.displayName)
                            .font(.subheadline.bold())
                            .foregroundColor(.white)
                        Text(player.isLocal ? "You" : "Opponent")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Spacer()
                    
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(StormColors.neonGreen)
                }
                .padding(12)
                .background(StormColors.surface)
                .cornerRadius(12)
            }
        }
        .padding(.horizontal, 20)
    }
    
    private func startSearching() {
        multiplayer.findMatch(gameId: gameId, gradeLevel: grade)
        
        searchTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            if searchDots.count >= 3 {
                searchDots = ""
            } else {
                searchDots += "."
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MULTIPLAYER HUD — Shows during multiplayer games
// ═══════════════════════════════════════════════════════════════

struct MultiplayerHUD: View {
    @ObservedObject var multiplayer = MultiplayerService.shared
    let localScore: Int
    
    var body: some View {
        HStack(spacing: 0) {
            // Local player
            HStack(spacing: 6) {
                Circle()
                    .fill(StormColors.neonBlue)
                    .frame(width: 24, height: 24)
                    .overlay(
                        Text("P\(multiplayer.playerSlot)")
                            .font(.system(size: 8).bold())
                            .foregroundColor(.white)
                    )
                
                Text("\(localScore)")
                    .font(.headline.bold())
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(StormColors.neonBlue.opacity(0.2))
            .cornerRadius(10, corners: [.topLeft, .bottomLeft])
            
            // VS
            Text("VS")
                .font(.caption.bold())
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(StormColors.surface)
            
            // Opponent
            HStack(spacing: 6) {
                Text("\(multiplayer.opponentScore)")
                    .font(.headline.bold())
                    .foregroundColor(.white)
                
                Circle()
                    .fill(StormColors.neonOrange)
                    .frame(width: 24, height: 24)
                    .overlay(
                        Text("P\(multiplayer.playerSlot == 1 ? 2 : 1)")
                            .font(.system(size: 8).bold())
                            .foregroundColor(.white)
                    )
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(StormColors.neonOrange.opacity(0.2))
            .cornerRadius(10, corners: [.topRight, .bottomRight])
        }
        .onChange(of: localScore) { _, newScore in
            multiplayer.sendScore(newScore)
        }
    }
}

// Corner radius helper
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
