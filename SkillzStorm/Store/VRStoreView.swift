import SwiftUI

// MARK: - VR & 3D Store

struct StoreItem: Identifiable {
    let id: String
    let name: String
    let description: String
    let price: String
    let emoji: String
    let category: String
    let features: [String]
    let inStock: Bool
    let isPhysicalGood: Bool // Physical goods → Stripe website. Digital → StoreKit IAP.
}

struct VRStoreView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var progress = PlayerProgress.shared
    @State private var selectedCategory = "All"
    @State private var cart: [StoreItem] = []
    @State private var showCheckout = false
    @State private var showFreeRewards = false
    
    let categories = ["All", "VR Headsets", "3D Glasses", "Accessories", "Premium"]
    
    // ── Physical goods (ship via Stripe on website) ──
    let storeItems: [StoreItem] = [
        // VR Headsets (PHYSICAL → Stripe)
        StoreItem(id: "vr_lite", name: "StormVR Lite", description: "Entry-level phone-in-headset. Insert your iPhone, launch any StormVR game, and experience immersive learning. Adjustable straps, comfortable foam padding.", price: "$39.99", emoji: "🥽", category: "VR Headsets", features: ["Lightweight design", "Adjustable straps", "Works with iPhone/Android", "Fits all ages", "Includes controller"], inStock: true, isPhysicalGood: true),
        
        StoreItem(id: "vr_pro", name: "StormVR Pro", description: "Premium standalone VR headset. No phone needed — SkillzStorm is built in. 6DOF tracking, 2K displays, hand tracking.", price: "$179.99", emoji: "🎧", category: "VR Headsets", features: ["Standalone — no phone needed", "Built-in SkillzStorm app", "High-res 2K displays", "6DOF head + hand tracking", "2-hour battery", "WiFi + Bluetooth"], inStock: true, isPhysicalGood: true),
        
        StoreItem(id: "vr_ultra", name: "StormVR Ultra", description: "Top-tier VR with eye tracking, haptic controllers, and 4K displays. The ultimate learning experience.", price: "$349.99", emoji: "🔮", category: "VR Headsets", features: ["Eye tracking", "Haptic controllers", "4K per-eye", "Wireless PC streaming", "Passthrough cameras", "5-hour battery"], inStock: false, isPhysicalGood: true),
        
        // 3D Glasses (PHYSICAL → Stripe)
        StoreItem(id: "3d_basic", name: "Storm3D Basic", description: "Classic red/cyan anaglyph 3D glasses. Pack of 5. Works with all Storm3D games.", price: "$7.99", emoji: "👓", category: "3D Glasses", features: ["Pack of 5 glasses", "Classic red/cyan", "Works on any screen", "Scratch-resistant"], inStock: true, isPhysicalGood: true),
        
        StoreItem(id: "3d_polarized", name: "Storm3D Polarized", description: "Polarized 3D glasses for color-accurate 3D viewing. No distortion.", price: "$19.99", emoji: "🕶️", category: "3D Glasses", features: ["Polarized lenses", "No color distortion", "Comfortable fit", "Premium build"], inStock: true, isPhysicalGood: true),
        
        StoreItem(id: "3d_clip", name: "Storm3D Clip-On", description: "Clip-on 3D lenses for people who wear glasses. Flip-up design.", price: "$14.99", emoji: "👁️", category: "3D Glasses", features: ["Clips onto glasses", "Universal fit", "Flip-up design", "Anti-scratch coating"], inStock: true, isPhysicalGood: true),
        
        // Accessories (PHYSICAL → Stripe)
        StoreItem(id: "controller", name: "StormPad Controller", description: "Bluetooth game controller designed for SkillzStorm. Dedicated Storm button for quick actions.", price: "$34.99", emoji: "🎮", category: "Accessories", features: ["Bluetooth 5.0", "iOS & Android", "8-hour battery", "Dedicated Storm button", "Ergonomic design"], inStock: true, isPhysicalGood: true),
        
        StoreItem(id: "headphones", name: "StormSound Buds", description: "Wireless earbuds with game audio optimization and low latency.", price: "$29.99", emoji: "🎵", category: "Accessories", features: ["Low latency gaming mode", "Spatial audio", "4-hour battery", "Sweat-resistant"], inStock: true, isPhysicalGood: true),
        
        StoreItem(id: "stand", name: "StormStand", description: "Adjustable tablet/phone stand for hands-free gaming sessions.", price: "$17.99", emoji: "📱", category: "Accessories", features: ["Adjustable angle", "Foldable & portable", "Anti-slip base", "Fits all devices"], inStock: true, isPhysicalGood: true),
    ]
    
    var filteredItems: [StoreItem] {
        if selectedCategory == "All" { return storeItems }
        if selectedCategory == "Premium" { return [] }
        return storeItems.filter { $0.category == selectedCategory }
    }
    
    var body: some View {
        ZStack {
            AnimatedStormBackground()
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    storeHeader
                    categoryPills
                    
                    // If "Premium" is selected, show IAP button
                    if selectedCategory == "Premium" || selectedCategory == "All" {
                        premiumSection
                    }
                    
                    // Free Rewards (watch ads)
                    if !progress.isAdFree {
                        freeRewardsCard
                    }
                    
                    // Physical goods cart
                    if !cart.isEmpty {
                        cartSummary
                    }
                    
                    // Physical products
                    if selectedCategory != "Premium" {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredItems) { item in
                                StoreItemCard(item: item) {
                                    cart = cart + [item]
                                    SoundManager.shared.playButtonTap()
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    vrDistributionInfo
                    
                    paymentBadges
                    
                    Color.clear.frame(height: 60)
                }
                .padding(.horizontal, Storm.isIPad ? 40 : 0)
                .readableWidth()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
                    .foregroundColor(StormColors.neonBlue)
            }
        }
        .sheet(isPresented: $showCheckout) {
            CheckoutView(items: cart) {
                cart = []
                showCheckout = false
            }
        }
        
        .sheet(isPresented: $showFreeRewards) {
            FreeRewardsView()
        }
    }
    
    // ──────────────────────────────────────────
    // MARK: - Header
    // ──────────────────────────────────────────
    
    private var storeHeader: some View {
        VStack(spacing: 8) {
            Text("⚡️").font(.system(size: 40))
            Text("STORM STORE")
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.goldGradient)
            Text("VR Headsets • 3D Glasses • Premium • Rewards")
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
        }
        .padding(.top)
    }
    
    // ──────────────────────────────────────────
    // MARK: - Category Pills
    // ──────────────────────────────────────────
    
    private var categoryPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(categories, id: \.self) { cat in
                    Button(action: { selectedCategory = cat }) {
                        Text(cat)
                            .font(.caption.bold())
                            .foregroundColor(selectedCategory == cat ? .white : .white.opacity(0.6))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedCategory == cat ? StormColors.neonPurple.opacity(0.5) : StormColors.surface)
                            .cornerRadius(20)
                    }
                }
            }
        }
        .padding(.horizontal)
    }
    
    // ──────────────────────────────────────────
    // MARK: - Premium Section (Website)
    // ──────────────────────────────────────────
    
    private var premiumSection: some View {
        VStack(spacing: 12) {
            Link(destination: URL(string: "https://skillzstorm.com/premium")!) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text("👑").font(.title2)
                            Text("GET PREMIUM")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                        }
                        Text("Ad-free, coins, season pass, and more on skillzstorm.com")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                    Spacer()
                    VStack(spacing: 4) {
                        Image(systemName: "arrow.up.right.square.fill")
                            .font(.title2)
                            .foregroundColor(StormColors.neonYellow)
                        Text("Visit Website")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding(16)
                .background(
                    LinearGradient(colors: [Color.purple.opacity(0.2), Color.blue.opacity(0.1)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .glassCard()
            }
        }
        .padding(.horizontal)
    }
    
    // ──────────────────────────────────────────
    // MARK: - Free Rewards Card
    // ──────────────────────────────────────────
    
    private var freeRewardsCard: some View {
        Button(action: { showFreeRewards = true }) {
            HStack(spacing: 14) {
                Text("🎬").font(.title)
                VStack(alignment: .leading, spacing: 2) {
                    Text("FREE REWARDS")
                        .font(.subheadline.bold())
                        .foregroundColor(StormColors.neonYellow)
                    Text("Watch short videos → earn power-ups & coins")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                Spacer()
                Image(systemName: "chevron.right.circle.fill")
                    .foregroundColor(StormColors.neonYellow)
            }
            .padding(14)
            .background(StormColors.neonYellow.opacity(0.08))
            .glassCard()
        }
        .padding(.horizontal)
    }
    
    // ──────────────────────────────────────────
    // MARK: - Cart Summary
    // ──────────────────────────────────────────
    
    private var cartSummary: some View {
        HStack {
            Image(systemName: "cart.fill")
                .foregroundColor(StormColors.neonPink)
            Text("\(cart.count) items")
                .font(.subheadline.bold())
                .foregroundColor(.white)
            Spacer()
            Button(action: { showCheckout = true }) {
                Text("Checkout")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(StormColors.heroGradient)
                    .cornerRadius(10)
            }
        }
        .padding()
        .glassCard()
        .padding(.horizontal)
    }
    
    // ──────────────────────────────────────────
    // MARK: - VR Distribution Info
    // ──────────────────────────────────────────
    
    private var vrDistributionInfo: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(StormColors.neonCyan)
                Text("HOW TO PLAY VR")
                    .font(.headline.bold())
                    .foregroundColor(.white)
            }
            
            VStack(spacing: 12) {
                vrMethodRow(
                    icon: "iphone",
                    title: "Phone-in-Headset (StormVR Lite)",
                    desc: "Insert your iPhone into a StormVR Lite headset. Open the app, select any StormVR game, and play in immersive VR.",
                    badge: "EASIEST"
                )
                
                vrMethodRow(
                    icon: "visionpro",
                    title: "Apple Vision Pro",
                    desc: "Download SkillzStorm from the visionOS App Store. Full spatial computing experience with hand tracking.",
                    badge: "PREMIUM"
                )
                
                vrMethodRow(
                    icon: "globe",
                    title: "Web VR (WebXR)",
                    desc: "Visit skillzstorm.com on any VR headset's browser. Instant play, no download needed.",
                    badge: "FREE"
                )
                
                vrMethodRow(
                    icon: "display",
                    title: "StormVR Pro Standalone",
                    desc: "Our standalone headset comes with SkillzStorm pre-installed. Power on and play immediately.",
                    badge: "ALL-IN-ONE"
                )
            }
        }
        .padding(16)
        .glassCard()
        .padding(.horizontal)
    }
    
    private func vrMethodRow(icon: String, title: String, desc: String, badge: String) -> some View {
        HStack(alignment: .top, spacing: Storm.isIPad ? 16 : 12) {
            Image(systemName: icon)
                .font(Storm.isIPad ? .title2 : .title3)
                .foregroundColor(StormColors.neonCyan)
                .frame(width: Storm.isIPad ? 48 : 36, height: Storm.isIPad ? 48 : 36)
                .background(StormColors.neonCyan.opacity(0.15))
                .cornerRadius(10)
            
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(title)
                        .font(Storm.isIPad ? .headline.bold() : .subheadline.bold())
                        .foregroundColor(.white)
                    Text(badge)
                        .font(Storm.font(9, weight: .black))
                        .foregroundColor(StormColors.neonCyan)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(StormColors.neonCyan.opacity(0.2))
                        .cornerRadius(4)
                }
                Text(desc)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
            }
        }
    }
    
    // ──────────────────────────────────────────
    // MARK: - Payment Badges
    // ──────────────────────────────────────────
    
    private var paymentBadges: some View {
        VStack(spacing: 8) {
            HStack(spacing: 20) {
                VStack(spacing: 4) {
                    Image(systemName: "lock.shield.fill")
                        .font(.title3)
                        .foregroundColor(StormColors.neonGreen)
                    Text("Secure")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
                VStack(spacing: 4) {
                    Image(systemName: "apple.logo")
                        .font(.title3)
                        .foregroundColor(.white)
                    Text("Apple Pay")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
                VStack(spacing: 4) {
                    Image(systemName: "creditcard.fill")
                        .font(.title3)
                        .foregroundColor(StormColors.neonPurple)
                    Text("Stripe")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            
            Text("Digital purchases via Apple • Physical goods via Stripe")
                .font(.caption2)
                .foregroundColor(.white.opacity(0.3))
        }
        .padding(.top, 12)
    }
}

// MARK: - Store Item Card

struct StoreItemCard: View {
    let item: StoreItem
    let onAddToCart: () -> Void
    @State private var expanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 14) {
                Text(item.emoji)
                    .font(.system(size: 40))
                    .frame(width: 60, height: 60)
                    .background(StormColors.surface)
                    .cornerRadius(16)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(item.name)
                            .font(.headline.bold())
                            .foregroundColor(.white)
                        if item.isPhysicalGood {
                            Text("SHIPS")
                                .font(Storm.font(9, weight: .black))
                                .foregroundColor(StormColors.neonBlue)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(StormColors.neonBlue.opacity(0.2))
                                .cornerRadius(4)
                        }
                    }
                    
                    Text(item.description)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(expanded ? nil : 2)
                }
                
                Spacer()
                
                VStack(spacing: 6) {
                    Text(item.price)
                        .font(.headline.bold())
                        .foregroundColor(StormColors.neonGreen)
                    
                    if !item.inStock {
                        Text("SOON")
                            .font(.caption2.bold())
                            .foregroundColor(.gray)
                    }
                }
            }
            
            if expanded {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(item.features, id: \.self) { feature in
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(StormColors.neonGreen)
                            Text(feature)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding(.leading, 74)
                
                if item.inStock {
                    Button(action: onAddToCart) {
                        HStack {
                            Image(systemName: "cart.badge.plus")
                            Text("Add to Cart — Ships via Website")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(StormColors.heroGradient)
                        .cornerRadius(14)
                    }
                    .padding(.top, 4)
                    
                    Text("Physical items are purchased on skillzstorm.com")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.3))
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
        }
        .padding(16)
        .glassCard()
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) { expanded.toggle() }
        }
    }
}

// MARK: - Checkout View (Stripe-powered for Physical Goods)

struct CheckoutView: View {
    let items: [StoreItem]
    let onComplete: () -> Void
    @Environment(\.dismiss) var dismiss
    @State private var isProcessing = false
    @State private var showWebCheckout = false
    
    var total: Double {
        items.compactMap { item in
            Double(item.price.replacingOccurrences(of: "$", with: ""))
        }.reduce(0, +)
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                StormColors.background.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        Text("🛒").font(.system(size: 50))
                        Text("CHECKOUT")
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(StormColors.goldGradient)
                        
                        // Items
                        ForEach(items) { item in
                            HStack {
                                Text(item.emoji).font(.title2)
                                VStack(alignment: .leading) {
                                    Text(item.name).font(.subheadline.bold()).foregroundColor(.white)
                                    Text(item.category).font(.caption2).foregroundColor(.white.opacity(0.4))
                                }
                                Spacer()
                                Text(item.price).font(.subheadline.bold()).foregroundColor(StormColors.neonGreen)
                            }
                            .padding()
                            .glassCard()
                        }
                        
                        // Total
                        HStack {
                            Text("TOTAL").font(.headline.bold()).foregroundColor(.white)
                            Spacer()
                            Text(String(format: "$%.2f", total))
                                .font(.title2.bold())
                                .foregroundColor(StormColors.neonGreen)
                        }
                        .padding()
                        
                        Divider().background(Color.white.opacity(0.2))
                        
                        // Shipping note
                        VStack(spacing: 8) {
                            Image(systemName: "shippingbox.fill")
                                .font(.title2)
                                .foregroundColor(StormColors.neonBlue)
                            Text("Ships directly to your door")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                            Text("5-10 business days • Free over $50")
                                .font(.caption.bold())
                                .foregroundColor(StormColors.neonGreen)
                        }
                        
                        Button(action: {
                            if let url = URL(string: "https://skillzstorm.com/store") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            HStack {
                                Image(systemName: "creditcard.fill")
                                Text("Pay with Stripe")
                            }
                            .font(.headline.bold())
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(StormColors.heroGradient)
                            .cornerRadius(16)
                        }
                        .padding(.horizontal)
                        
                        HStack(spacing: 16) {
                            Image(systemName: "lock.fill").foregroundColor(StormColors.neonGreen)
                            Text("Secure payment via Stripe")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.4))
                        }
                        
                        Text("You will be redirected to our secure website to complete purchase.")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.3))
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
