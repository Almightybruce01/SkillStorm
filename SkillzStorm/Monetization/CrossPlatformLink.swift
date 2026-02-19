import SwiftUI
import Combine

class CrossPlatformLink: ObservableObject {
    static let shared = CrossPlatformLink()
    
    @Published var linkCode: String
    @Published var isLinked: Bool
    @Published var isSyncing = false
    @Published var lastSyncResult: String?
    
    private init() {
        let ud = UserDefaults.standard
        if let existing = ud.string(forKey: "linkCode") {
            linkCode = existing
        } else {
            let newCode = CrossPlatformLink.generateCode()
            ud.set(newCode, forKey: "linkCode")
            linkCode = newCode
        }
        isLinked = ud.bool(forKey: "isLinked")
    }
    
    static func generateCode() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<8).map { _ in chars.randomElement()! })
    }
    
    func regenerateCode() {
        let newCode = CrossPlatformLink.generateCode()
        linkCode = newCode
        UserDefaults.standard.set(newCode, forKey: "linkCode")
        isLinked = false
        UserDefaults.standard.set(false, forKey: "isLinked")
    }
    
    var webLinkURL: URL? {
        URL(string: "https://skillzstorm.com/link?code=\(linkCode)")
    }
    
    /// Redeem a code entered manually
    func redeemCode(_ code: String) {
        isLinked = true
        UserDefaults.standard.set(true, forKey: "isLinked")
        Task { await syncPurchases(code: code) }
    }
    
    /// Sync purchases from the server using the link code
    @MainActor
    func syncPurchases(code: String? = nil) async {
        let syncCode = code ?? linkCode
        guard !syncCode.isEmpty else { return }
        
        isSyncing = true
        defer { isSyncing = false }
        
        guard let url = URL(string: "https://skillzstorm.com/api/verify-purchase") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        
        let body: [String: String] = ["linkCode": syncCode]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                lastSyncResult = "Server error"
                return
            }
            
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                lastSyncResult = "Invalid response"
                return
            }
            
            let progress = PlayerProgress.shared
            var changes: [String] = []
            
            if let adFree = json["isAdFree"] as? Bool, adFree {
                if !progress.isAdFree {
                    progress.isAdFree = true
                    AdManager.shared.updateAdVisibility()
                    changes.append("Ad-free")
                }
            }
            
            if let premium = json["isPremium"] as? Bool, premium {
                if !progress.isPremium {
                    progress.isPremium = true
                    changes.append("Premium")
                }
            }
            
            if let seasonPass = json["hasSeasonPass"] as? Bool, seasonPass {
                if !progress.hasSeasonPass {
                    progress.hasSeasonPass = true
                    changes.append("Season Pass")
                }
            }
            
            if let coins = json["totalCoins"] as? Int, coins > 0 {
                let previouslyAwarded = UserDefaults.standard.integer(forKey: "syncedCoins_\(syncCode)")
                let newCoins = coins - previouslyAwarded
                if newCoins > 0 {
                    progress.addCoins(newCoins)
                    UserDefaults.standard.set(coins, forKey: "syncedCoins_\(syncCode)")
                    changes.append("\(newCoins) coins")
                }
            }
            
            if changes.isEmpty {
                lastSyncResult = "Up to date"
            } else {
                isLinked = true
                UserDefaults.standard.set(true, forKey: "isLinked")
                lastSyncResult = "Synced: \(changes.joined(separator: ", "))"
            }
            
            print("[CrossPlatformLink] Sync result: \(lastSyncResult ?? "nil")")
            
        } catch {
            lastSyncResult = "Network error"
            print("[CrossPlatformLink] Sync failed: \(error)")
        }
    }
}

// MARK: - Link Account View

struct LinkAccountView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var link = CrossPlatformLink.shared
    @State private var inputCode = ""
    @State private var showCopied = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        VStack(spacing: 8) {
                            Text("🔗").font(.system(size: 60))
                            Text("LINK YOUR ACCOUNT")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundStyle(StormColors.heroGradient)
                            Text("Connect your app and website purchases")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 20)
                        
                        // Your Link Code
                        VStack(spacing: 12) {
                            Text("YOUR CODE")
                                .font(.caption.bold())
                                .foregroundColor(StormColors.neonBlue)
                                .tracking(2)
                            
                            HStack(spacing: 3) {
                                ForEach(Array(link.linkCode.enumerated()), id: \.offset) { _, char in
                                    Text(String(char))
                                        .font(.system(size: 28, weight: .black, design: .monospaced))
                                        .foregroundColor(.white)
                                        .frame(width: 36, height: 46)
                                        .background(StormColors.surface)
                                        .cornerRadius(8)
                                }
                            }
                            
                            HStack(spacing: 12) {
                                Button(action: {
                                    UIPasteboard.general.string = link.linkCode
                                    showCopied = true
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { showCopied = false }
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: showCopied ? "checkmark" : "doc.on.doc")
                                        Text(showCopied ? "Copied!" : "Copy Code")
                                    }
                                    .font(.caption.bold())
                                    .foregroundColor(StormColors.neonBlue)
                                }
                                
                                Button(action: { link.regenerateCode() }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "arrow.clockwise")
                                        Text("New Code")
                                    }
                                    .font(.caption.bold())
                                    .foregroundColor(.white.opacity(0.5))
                                }
                            }
                            
                            Text("Enter this code at skillzstorm.com/premium when you buy")
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.4))
                                .multilineTextAlignment(.center)
                        }
                        .padding(20)
                        .glassCard()
                        
                        // Sync button
                        VStack(spacing: 12) {
                            Button(action: {
                                Task { await link.syncPurchases() }
                            }) {
                                HStack(spacing: 8) {
                                    if link.isSyncing {
                                        ProgressView().tint(.white)
                                    } else {
                                        Image(systemName: "arrow.triangle.2.circlepath")
                                    }
                                    Text(link.isSyncing ? "Syncing..." : "Sync Purchases")
                                        .font(.headline.bold())
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(StormColors.heroGradient)
                                .cornerRadius(16)
                            }
                            .disabled(link.isSyncing)
                            
                            if let result = link.lastSyncResult {
                                Text(result)
                                    .font(.caption)
                                    .foregroundColor(
                                        result.starts(with: "Synced") ? StormColors.neonGreen :
                                        result == "Up to date" ? .white.opacity(0.5) :
                                        StormColors.neonYellow
                                    )
                            }
                        }
                        .padding(20)
                        .glassCard()
                        
                        // How it works
                        VStack(alignment: .leading, spacing: 14) {
                            Text("HOW IT WORKS")
                                .font(.caption.bold())
                                .foregroundColor(StormColors.neonGreen)
                                .tracking(2)
                            
                            stepRow(num: "1", text: "Copy your code above")
                            stepRow(num: "2", text: "Go to skillzstorm.com/premium")
                            stepRow(num: "3", text: "Paste your code when you buy")
                            stepRow(num: "4", text: "Tap \"Sync Purchases\" to activate!")
                        }
                        .padding(20)
                        .glassCard()
                        
                        // Benefits
                        VStack(spacing: 10) {
                            Text("WHAT SYNCS")
                                .font(.caption.bold())
                                .foregroundColor(StormColors.neonPurple)
                                .tracking(2)
                            
                            benefitRow("Ad-free status removes all ads in the app")
                            benefitRow("Coins purchased on website added to your balance")
                            benefitRow("Premium status unlocks exclusive content")
                            benefitRow("Season pass activates in the app")
                        }
                        .padding(20)
                        .glassCard()
                        
                        if link.isLinked {
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(StormColors.neonGreen)
                                Text("ACCOUNTS LINKED")
                                    .font(.headline.bold())
                                    .foregroundColor(StormColors.neonGreen)
                            }
                            .padding()
                        }
                        
                        Spacer(minLength: 60)
                    }
                    .padding(.horizontal, 20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    private func stepRow(num: String, text: String) -> some View {
        HStack(spacing: 12) {
            Text(num)
                .font(.caption.bold())
                .foregroundColor(StormColors.neonGreen)
                .frame(width: 24, height: 24)
                .background(StormColors.neonGreen.opacity(0.2))
                .cornerRadius(12)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))
        }
    }
    
    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .font(.caption)
                .foregroundColor(StormColors.neonPurple)
            Text(text)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
