import SwiftUI

// ═══════════════════════════════════════════════════════════════
// PRIVACY POLICY & COPPA COMPLIANCE
// App Store Guidelines: 5.1, 1.3 (Kids Category)
// COPPA: Children's Online Privacy Protection Act
// ═══════════════════════════════════════════════════════════════

struct PrivacyPolicyView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                StormColors.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        // Header
                        VStack(spacing: 8) {
                            Image(systemName: "shield.checkered")
                                .font(.system(size: 50))
                                .foregroundStyle(StormColors.heroGradient)
                            Text("Privacy Policy")
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                            Text("Last Updated: February 14, 2026")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)
                        
                        policySection(
                            title: "Our Commitment to Privacy",
                            icon: "lock.shield.fill",
                            content: """
                            SkillzStorm ("we," "our," or "us") is committed to protecting the privacy of all users, \
                            especially children. This Privacy Policy explains what information we collect, how we use it, \
                            and your rights regarding that information.
                            
                            SkillzStorm is designed as an educational gaming platform for students in grades K-12. We \
                            comply with the Children's Online Privacy Protection Act (COPPA), the General Data Protection \
                            Regulation (GDPR), and all applicable privacy laws.
                            """
                        )
                        
                        policySection(
                            title: "Information We Collect",
                            icon: "doc.text.magnifyingglass",
                            content: """
                            LOCAL DATA ONLY — We store the following data exclusively on your device using Apple's \
                            built-in storage (UserDefaults). This data never leaves your device:
                            
                            • Game progress (scores, levels completed, coins earned)
                            • Grade level selection
                            • Settings preferences (sound, haptics)
                            • Purchase history (managed by Apple's StoreKit)
                            
                            WE DO NOT COLLECT:
                            • Names, email addresses, or any personal identifiers
                            • Location data
                            • Photos, contacts, or device data
                            • Browsing history
                            • Any information that could identify a child
                            """
                        )
                        
                        policySection(
                            title: "Children's Privacy (COPPA)",
                            icon: "figure.and.child.holdinghands",
                            content: """
                            SkillzStorm is designed for children and complies with COPPA:
                            
                            • We do NOT collect personal information from children under 13
                            • We do NOT require account creation or login
                            • We do NOT allow user-generated content or social features
                            • We do NOT share any data with third parties
                            • All ads shown are non-personalized, child-safe, and contextual only
                            • Ad content is rated General (G) through Google AdMob's child-directed settings
                            • No behavioral tracking or targeted advertising is used
                            • Multiplayer features use anonymous player numbers only (no usernames, no chat)
                            
                            Parents can contact us at privacy@skillzstorm.com with any questions or to request \
                            deletion of any locally stored data.
                            """
                        )
                        
                        policySection(
                            title: "Advertising",
                            icon: "megaphone.fill",
                            content: """
                            SkillzStorm displays non-personalized, child-safe advertisements through Google AdMob. \
                            These ads are:
                            
                            • Marked as child-directed (COPPA-compliant)
                            • Rated General (G) content only
                            • Non-targeted — no behavioral data is used for ad selection
                            • Clearly marked as advertisements
                            • Dismissible with a visible close button
                            
                            Users can remove all ads by purchasing the "Ad-Free" option through Apple's \
                            In-App Purchase system.
                            
                            We do NOT use third-party analytics that collect personal data from children.
                            """
                        )
                        
                        policySection(
                            title: "In-App Purchases",
                            icon: "cart.fill",
                            content: """
                            All in-app purchases are processed securely through Apple's App Store payment system. \
                            We do not collect or store any payment information. Available purchases include:
                            
                            • Ad-Free experience
                            • Season Pass (cosmetic rewards)
                            • Coin packs (in-game currency)
                            • Premium game modes
                            
                            All purchases require Apple ID authentication. Parents can restrict purchases \
                            using Screen Time parental controls on their device.
                            
                            In-game currency (Storm Coins) can be earned for free by playing games and \
                            watching optional rewarded ads. No purchase is required to enjoy the full \
                            educational experience.
                            """
                        )
                        
                        policySection(
                            title: "Multiplayer Features",
                            icon: "person.2.fill",
                            content: """
                            Some arcade games offer optional multiplayer through Apple Game Center:
                            
                            • Players are identified only by anonymous player numbers (e.g., "Player 1")
                            • No chat, messaging, or communication features
                            • No personal information is shared between players
                            • No location data is used for matchmaking
                            • Matchmaking is based solely on grade level and game type
                            • All multiplayer features are optional — every game can be played solo
                            
                            Game Center is managed by Apple and governed by Apple's privacy policy.
                            """
                        )
                        
                        policySection(
                            title: "Data Retention & Deletion",
                            icon: "trash.fill",
                            content: """
                            Since all data is stored locally on your device:
                            
                            • Uninstalling the app deletes all data permanently
                            • You can reset all progress in Settings > Reset Progress
                            • No data is stored on our servers — there is nothing for us to delete
                            
                            Apple manages purchase history through your Apple ID account.
                            """
                        )
                        
                        policySection(
                            title: "Third-Party Services",
                            icon: "link",
                            content: """
                            We use the following third-party services:
                            
                            • Google AdMob — Child-directed, non-personalized advertising
                            • Apple StoreKit — Secure in-app purchase processing
                            • Apple Game Center — Anonymous multiplayer matchmaking
                            
                            Each service has its own privacy policy. We ensure all third-party services \
                            comply with COPPA and do not collect personal data from children.
                            """
                        )
                        
                        policySection(
                            title: "Changes to This Policy",
                            icon: "doc.badge.clock",
                            content: """
                            We may update this Privacy Policy from time to time. Changes will be reflected \
                            in the "Last Updated" date above. Continued use of the app after changes \
                            constitutes acceptance of the updated policy.
                            """
                        )
                        
                        policySection(
                            title: "Contact Us",
                            icon: "envelope.fill",
                            content: """
                            If you have questions about this Privacy Policy or our practices:
                            
                            Email: privacy@skillzstorm.com
                            Website: https://skillzstorm.com/privacy
                            
                            For COPPA-related inquiries or to request data deletion:
                            Email: coppa@skillzstorm.com
                            """
                        )
                        
                        Color.clear.frame(height: 40)
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
    
    private func policySection(title: String, icon: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(StormColors.neonBlue)
                    .frame(width: 30)
                Text(title)
                    .font(.headline.bold())
                    .foregroundColor(.white)
            }
            
            Text(content)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.75))
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(StormColors.surface.opacity(0.5))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// TERMS OF SERVICE
// ═══════════════════════════════════════════════════════════════

struct TermsOfServiceView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                StormColors.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(spacing: 8) {
                            Image(systemName: "doc.text.fill")
                                .font(.system(size: 50))
                                .foregroundStyle(StormColors.goldGradient)
                            Text("Terms of Service")
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                            Text("Effective: February 14, 2026")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)
                        
                        termsSection(title: "1. Acceptance of Terms", content: """
                        By downloading, installing, or using SkillzStorm ("the App"), you agree to be bound by \
                        these Terms of Service. If you are under 18, your parent or legal guardian must agree to \
                        these terms on your behalf. If you do not agree, do not use the App.
                        """)
                        
                        termsSection(title: "2. Description of Service", content: """
                        SkillzStorm is an educational gaming platform designed for students in grades K-12. The App \
                        provides educational games covering mathematics, language arts, science, and other subjects. \
                        The App is intended for personal, non-commercial educational use.
                        """)
                        
                        termsSection(title: "3. User Accounts", content: """
                        SkillzStorm does not require account creation. All progress is stored locally on your \
                        device. Optional features like Game Center multiplayer use Apple's account system and are \
                        governed by Apple's terms.
                        """)
                        
                        termsSection(title: "4. In-App Purchases", content: """
                        The App offers optional in-app purchases processed through Apple's App Store. All purchases \
                        are final and governed by Apple's refund policies. Prices are displayed before purchase. \
                        In-game currency (Storm Coins) has no real-world monetary value and cannot be exchanged, \
                        transferred, or refunded outside of Apple's policies.
                        
                        Parents can restrict in-app purchases using Screen Time settings on their device.
                        """)
                        
                        termsSection(title: "5. Intellectual Property", content: """
                        All content in SkillzStorm — including but not limited to game designs, artwork, music, \
                        sound effects, animations, characters, and educational content — is the intellectual \
                        property of SkillzStorm and is protected by copyright, trademark, and other intellectual \
                        property laws.
                        
                        You may not copy, modify, distribute, sell, or create derivative works based on any \
                        content from the App without prior written permission.
                        """)
                        
                        termsSection(title: "6. Educational Content Disclaimer", content: """
                        While we strive for accuracy, SkillzStorm is a supplementary educational tool and should \
                        not be used as a substitute for formal education, tutoring, or professional academic \
                        guidance. We make no guarantees about academic outcomes from using the App.
                        """)
                        
                        termsSection(title: "7. Multiplayer Conduct", content: """
                        When using multiplayer features, you agree to:
                        • Play fairly and not exploit bugs or glitches
                        • Not attempt to disrupt other players' experience
                        • Not use any unauthorized tools or modifications
                        
                        We reserve the right to restrict multiplayer access for violations.
                        """)
                        
                        termsSection(title: "8. Advertising", content: """
                        The free version of SkillzStorm displays non-personalized, child-safe advertisements. \
                        By using the free version, you acknowledge and accept the display of such ads. Ads can \
                        be permanently removed through the Ad-Free in-app purchase.
                        """)
                        
                        termsSection(title: "9. Limitation of Liability", content: """
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, SKILLZSTORM SHALL NOT BE LIABLE FOR ANY INDIRECT, \
                        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP. \
                        OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP OR IN-APP PURCHASES \
                        IN THE 12 MONTHS PRECEDING THE CLAIM.
                        """)
                        
                        termsSection(title: "10. Modifications", content: """
                        We reserve the right to modify these Terms at any time. Changes will be effective upon \
                        posting in the App. Continued use after modifications constitutes acceptance.
                        """)
                        
                        termsSection(title: "11. Governing Law", content: """
                        These Terms are governed by the laws of the United States and the state in which SkillzStorm \
                        operates, without regard to conflict of law principles.
                        """)
                        
                        termsSection(title: "12. Contact", content: """
                        For questions about these Terms:
                        Email: legal@skillzstorm.com
                        Website: https://skillzstorm.com/terms
                        """)
                        
                        Color.clear.frame(height: 40)
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
    
    private func termsSection(title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline.bold())
                .foregroundColor(StormColors.neonBlue)
            Text(content)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.75))
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(StormColors.surface.opacity(0.5))
        .cornerRadius(16)
    }
}

// ═══════════════════════════════════════════════════════════════
// PARENTAL GATE — Required for Kids Category (Guideline 1.3)
// Prevents children from accidentally accessing external links,
// purchases, or multiplayer without parental awareness.
// ═══════════════════════════════════════════════════════════════

struct ParentalGateView: View {
    let title: String
    let description: String
    let onSuccess: () -> Void
    let onCancel: () -> Void
    
    @State private var answer = ""
    @State private var num1 = Int.random(in: 12...29)
    @State private var num2 = Int.random(in: 12...29)
    @State private var showError = false
    @State private var attempts = 0
    
    var correctAnswer: Int { num1 * num2 }
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.85)
                .ignoresSafeArea()
                .onTapGesture { onCancel() }
            
            VStack(spacing: 20) {
                // Lock icon
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(StormColors.heroGradient)
                
                Text("Parental Verification")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text(title)
                    .font(.headline)
                    .foregroundColor(StormColors.neonBlue)
                    .multilineTextAlignment(.center)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
                
                Divider().background(Color.white.opacity(0.2))
                
                Text("To continue, solve this math problem:")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                
                Text("What is \(num1) x \(num2)?")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                TextField("Enter answer", text: $answer)
                    .keyboardType(.numberPad)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(14)
                    .background(StormColors.surface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(showError ? StormColors.neonRed : Color.white.opacity(0.1), lineWidth: 1)
                    )
                    .frame(width: 200)
                
                if showError {
                    Text("Incorrect answer. Please try again.")
                        .font(.caption)
                        .foregroundColor(StormColors.neonRed)
                }
                
                HStack(spacing: 16) {
                    Button(action: { onCancel() }) {
                        Text("Cancel")
                            .font(.headline)
                            .foregroundColor(.white.opacity(0.6))
                            .padding(.horizontal, 28)
                            .padding(.vertical, 12)
                            .background(StormColors.surface)
                            .cornerRadius(12)
                    }
                    
                    Button(action: verify) {
                        Text("Verify")
                            .font(.headline.bold())
                            .foregroundColor(.white)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 12)
                            .background(StormColors.heroGradient)
                            .cornerRadius(12)
                    }
                }
            }
            .padding(28)
            .background(StormColors.surface)
            .cornerRadius(24)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(StormColors.neonBlue.opacity(0.3), lineWidth: 1)
            )
            .shadow(color: StormColors.neonBlue.opacity(0.2), radius: 20)
            .padding(30)
        }
    }
    
    private func verify() {
        if Int(answer) == correctAnswer {
            onSuccess()
        } else {
            showError = true
            answer = ""
            attempts += 1
            if attempts >= 3 {
                num1 = Int.random(in: 12...29)
                num2 = Int.random(in: 12...29)
                attempts = 0
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// EULA VIEW
// ═══════════════════════════════════════════════════════════════

struct EULAView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                StormColors.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(spacing: 8) {
                            Image(systemName: "signature")
                                .font(.system(size: 50))
                                .foregroundStyle(StormColors.successGradient)
                            Text("End User License Agreement")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)
                        
                        eulaText("""
                        This End User License Agreement ("EULA") is a legal agreement between you and SkillzStorm \
                        for the use of the SkillzStorm mobile application.
                        
                        LICENSE GRANT: We grant you a limited, non-exclusive, non-transferable, revocable license \
                        to use the App for personal, non-commercial educational purposes.
                        
                        RESTRICTIONS: You may not:
                        • Reverse engineer, decompile, or disassemble the App
                        • Modify, adapt, or create derivative works
                        • Distribute, sublicense, or transfer the App
                        • Use the App for any commercial purpose
                        • Remove any proprietary notices or labels
                        
                        VIRTUAL ITEMS: In-game currency and virtual items are licensed, not sold. They have no \
                        real-world value and cannot be traded, sold, or exchanged outside the App.
                        
                        TERMINATION: This license is effective until terminated. It terminates automatically if \
                        you fail to comply with any term. Upon termination, you must delete the App.
                        
                        DISCLAIMER: THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL \
                        WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
                        
                        This EULA is governed by applicable law and supplements Apple's Licensed Application \
                        End User License Agreement.
                        """)
                        
                        Color.clear.frame(height: 40)
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
    
    private func eulaText(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundColor(.white.opacity(0.75))
            .lineSpacing(4)
            .padding(16)
            .background(StormColors.surface.opacity(0.5))
            .cornerRadius(16)
    }
}
