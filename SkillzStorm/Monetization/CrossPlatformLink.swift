import SwiftUI
import Combine

// ═══════════════════════════════════════════════════════════════
// CROSS-PLATFORM ACCOUNT LINKING
//
// Since we don't require login, we use a simple CODE SYSTEM:
// 1. User generates a unique 8-character code in the app
// 2. User enters code on skillzstorm.com
// 3. Website purchases (Stripe) are linked to the device
// 4. Benefits sync both ways
//
// This is stored locally with the code → UserDefaults
// When Firestore is added later, this can sync to the cloud
// ═══════════════════════════════════════════════════════════════

class CrossPlatformLink: ObservableObject {
    static let shared = CrossPlatformLink()
    
    @Published var linkCode: String
    @Published var isLinked: Bool
    
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
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // No confusing chars (0/O, 1/I)
        return String((0..<8).map { _ in chars.randomElement()! })
    }
    
    func regenerateCode() {
        let newCode = CrossPlatformLink.generateCode()
        linkCode = newCode
        UserDefaults.standard.set(newCode, forKey: "linkCode")
    }
    
    /// URL to link on the website
    var webLinkURL: URL? {
        URL(string: "https://skillzstorm.com/link?code=\(linkCode)")
    }
    
    /// Deep link to redeem a code from website
    func redeemCode(_ code: String) {
        // In a full implementation, this would:
        // 1. Call your server to validate the code
        // 2. Fetch any purchases linked to that code
        // 3. Apply benefits (ad-free, coins, etc.)
        // For now, we just mark as linked
        isLinked = true
        UserDefaults.standard.set(true, forKey: "isLinked")
    }
}

// ═══════════════════════════════════════════════════════════════
// MARK: - Link Account View
// ═══════════════════════════════════════════════════════════════

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
                        // Header
                        VStack(spacing: 8) {
                            Text("🔗").font(.system(size: 60))
                            Text("LINK YOUR ACCOUNT")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundStyle(StormColors.heroGradient)
                            Text("Connect your app and website for shared benefits")
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
                            stepRow(num: "2", text: "Go to skillzstorm.com/link")
                            stepRow(num: "3", text: "Enter your code on the website")
                            stepRow(num: "4", text: "Your purchases sync across both platforms!")
                        }
                        .padding(20)
                        .glassCard()
                        
                        // Redeem from website
                        VStack(spacing: 12) {
                            Text("HAVE A WEB CODE?")
                                .font(.caption.bold())
                                .foregroundColor(StormColors.neonYellow)
                                .tracking(2)
                            
                            Text("If you bought something on the website, enter the code you got here:")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                                .multilineTextAlignment(.center)
                            
                            HStack {
                                TextField("Enter code", text: $inputCode)
                                    .font(.system(.body, design: .monospaced).bold())
                                    .foregroundColor(.white)
                                    .autocapitalization(.allCharacters)
                                    .padding()
                                    .background(StormColors.surface)
                                    .cornerRadius(12)
                                
                                Button(action: {
                                    if inputCode.count == 8 {
                                        link.redeemCode(inputCode)
                                    }
                                }) {
                                    Text("Redeem")
                                        .font(.subheadline.bold())
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 14)
                                        .background(StormColors.heroGradient)
                                        .cornerRadius(12)
                                }
                            }
                        }
                        .padding(20)
                        .glassCard()
                        
                        // Benefits
                        VStack(spacing: 10) {
                            Text("LINKED BENEFITS")
                                .font(.caption.bold())
                                .foregroundColor(StormColors.neonPurple)
                                .tracking(2)
                            
                            benefitRow("Ad-free syncs between app and website")
                            benefitRow("Coins earned on either platform sync")
                            benefitRow("Premium status carries over")
                            benefitRow("Physical orders tracked on both")
                        }
                        .padding(20)
                        .glassCard()
                        
                        // Link status
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
