import SwiftUI
import Combine
import StoreKit

// ═══════════════════════════════════════════════════════════════
// STORE MANAGER — StoreKit 2 In-App Purchases
//
// Apple App Store REQUIRES all digital purchases go through StoreKit.
// Physical goods (VR headsets, 3D glasses) → Stripe on website.
//
// SETUP INSTRUCTIONS:
// 1. Go to App Store Connect → Your App → In-App Purchases
// 2. Create these product IDs:
//    - com.skillzstorm.adfree          ($2.99) Non-consumable
//    - com.skillzstorm.coins500        ($0.99) Consumable
//    - com.skillzstorm.coins2500       ($3.99) Consumable
//    - com.skillzstorm.coins10000      ($9.99) Consumable
//    - com.skillzstorm.premiumBundle   ($4.99) Non-consumable
//    - com.skillzstorm.seasonPass      ($7.99) Non-renewing subscription
// 3. For testing, create a StoreKit Configuration File in Xcode
//    (File → New → StoreKit Configuration File)
//
// REVENUE: Apple takes 30% (15% if you're in the Small Business Program
//          for revenue under $1M/year — you almost certainly qualify).
//          You get paid monthly.
// ═══════════════════════════════════════════════════════════════

// MARK: - Product Identifiers

enum StormProduct: String, CaseIterable {
    case adFree = "com.skillzstorm.adfree"
    case coins500 = "com.skillzstorm.coins500"
    case coins2500 = "com.skillzstorm.coins2500"
    case coins10000 = "com.skillzstorm.coins10000"
    case premiumBundle = "com.skillzstorm.premiumBundle"
    case seasonPass = "com.skillzstorm.seasonPass"
    
    var displayName: String {
        switch self {
        case .adFree: return "Remove Ads"
        case .coins500: return "500 Coins"
        case .coins2500: return "2,500 Coins"
        case .coins10000: return "10,000 Coins"
        case .premiumBundle: return "Premium Bundle"
        case .seasonPass: return "Season Pass"
        }
    }
    
    var icon: String {
        switch self {
        case .adFree: return "hand.raised.slash.fill"
        case .coins500: return "circle.fill"
        case .coins2500: return "circle.circle.fill"
        case .coins10000: return "star.circle.fill"
        case .premiumBundle: return "crown.fill"
        case .seasonPass: return "bolt.shield.fill"
        }
    }
    
    var description: String {
        switch self {
        case .adFree: return "Remove all ads forever. No interruptions."
        case .coins500: return "500 coins to spend in the shop."
        case .coins2500: return "2,500 coins + 250 bonus!"
        case .coins10000: return "10,000 coins + 2,000 bonus!"
        case .premiumBundle: return "Ad-free + 5,000 coins + exclusive skins."
        case .seasonPass: return "Unlock all premium games for this season."
        }
    }
    
    var coinAmount: Int {
        switch self {
        case .coins500: return 500
        case .coins2500: return 2750  // 2500 + 250 bonus
        case .coins10000: return 12000 // 10000 + 2000 bonus
        case .premiumBundle: return 5000
        default: return 0
        }
    }
}

// MARK: - Store Manager

@MainActor
class StoreManager: ObservableObject {
    static let shared = StoreManager()
    
    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showPurchaseSuccess = false
    @Published var lastPurchasedProduct: String?
    
    private var updateListenerTask: Task<Void, Error>?
    
    init() {
        updateListenerTask = listenForTransactions()
        Task { await loadProducts() }
        Task { await updatePurchasedProducts() }
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    // ─────────────────────────────────────────
    // MARK: - Load Products from App Store
    // ─────────────────────────────────────────
    
    func loadProducts() async {
        isLoading = true
        do {
            let productIDs = StormProduct.allCases.map(\.rawValue)
            let loaded = try await withTimeout(seconds: 10) {
                try await Product.products(for: Set(productIDs))
            }
            products = loaded.sorted { $0.price < $1.price }
            isLoading = false
            if products.isEmpty {
                errorMessage = nil
            }
            print("[StoreManager] Loaded \(products.count) products")
        } catch is TimeoutError {
            isLoading = false
            errorMessage = nil
            print("[StoreManager] Product load timed out — store will show without live prices")
        } catch {
            errorMessage = nil
            isLoading = false
            print("[StoreManager] Error: \(error)")
        }
    }
    
    private func withTimeout<T>(seconds: Double, operation: @escaping () async throws -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask { try await operation() }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw TimeoutError()
            }
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Purchase
    // ─────────────────────────────────────────
    
    func purchase(_ product: Product) async throws -> Bool {
        isLoading = true
        defer { isLoading = false }
        
        let result = try await product.purchase()
        
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            
            // Deliver the content
            await deliverProduct(for: transaction)
            
            // Finish the transaction (REQUIRED)
            await transaction.finish()
            
            // Update purchased products
            await updatePurchasedProducts()
            
            // Show success
            lastPurchasedProduct = product.displayName
            showPurchaseSuccess = true
            
            print("[StoreManager] Purchase successful: \(product.id)")
            return true
            
        case .userCancelled:
            print("[StoreManager] User cancelled")
            return false
            
        case .pending:
            print("[StoreManager] Purchase pending (Ask to Buy)")
            return false
            
        @unknown default:
            return false
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Restore Purchases (Required by Apple)
    // ─────────────────────────────────────────
    
    func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }
        
        // StoreKit 2 automatically syncs purchases, but we can force refresh
        try? await AppStore.sync()
        await updatePurchasedProducts()
        print("[StoreManager] Purchases restored")
    }
    
    // ─────────────────────────────────────────
    // MARK: - Transaction Listener
    // ─────────────────────────────────────────
    
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in StoreKit.Transaction.updates {
                do {
                    let transaction = try await self.checkVerified(result)
                    await self.deliverProduct(for: transaction)
                    await transaction.finish()
                    await self.updatePurchasedProducts()
                } catch {
                    print("[StoreManager] Transaction verification failed: \(error)")
                }
            }
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Deliver Products
    // ─────────────────────────────────────────
    
    private func deliverProduct(for transaction: StoreKit.Transaction) async {
        guard let product = StormProduct(rawValue: transaction.productID) else { return }
        
        switch product {
        case .adFree:
            PlayerProgress.shared.isAdFree = true
            AdManager.shared.updateAdVisibility()
            
        case .coins500, .coins2500, .coins10000:
            PlayerProgress.shared.addCoins(product.coinAmount)
            
        case .premiumBundle:
            PlayerProgress.shared.isAdFree = true
            PlayerProgress.shared.addCoins(product.coinAmount)
            PlayerProgress.shared.isPremium = true
            AdManager.shared.updateAdVisibility()
            
        case .seasonPass:
            PlayerProgress.shared.hasSeasonPass = true
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Verification
    // ─────────────────────────────────────────
    
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw StoreError.verificationFailed(error)
        case .verified(let item):
            return item
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Update Purchased Products
    // ─────────────────────────────────────────
    
    func updatePurchasedProducts() async {
        var purchased = Set<String>()
        
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                purchased.insert(transaction.productID)
            }
        }
        
        purchasedProductIDs = purchased
        
        // Sync with PlayerProgress
        if purchased.contains(StormProduct.adFree.rawValue) || purchased.contains(StormProduct.premiumBundle.rawValue) {
            PlayerProgress.shared.isAdFree = true
        }
        if purchased.contains(StormProduct.premiumBundle.rawValue) {
            PlayerProgress.shared.isPremium = true
        }
        if purchased.contains(StormProduct.seasonPass.rawValue) {
            PlayerProgress.shared.hasSeasonPass = true
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Helpers
    // ─────────────────────────────────────────
    
    func isPurchased(_ productID: String) -> Bool {
        purchasedProductIDs.contains(productID)
    }
    
    func product(for stormProduct: StormProduct) -> Product? {
        products.first { $0.id == stormProduct.rawValue }
    }
}

enum StoreError: Error, LocalizedError {
    case verificationFailed(Error)
    
    var errorDescription: String? {
        switch self {
        case .verificationFailed(let error):
            return "Purchase verification failed: \(error.localizedDescription)"
        }
    }
}

private struct TimeoutError: Error {}

// ═══════════════════════════════════════════════════════════════
// MARK: - In-App Store View (App Store Compliant)
// ═══════════════════════════════════════════════════════════════

struct StormStoreView: View {
    @StateObject private var storeManager = StoreManager.shared
    @ObservedObject var progress = PlayerProgress.shared
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        storeHeader
                        
                        if storeManager.isLoading && storeManager.products.isEmpty {
                            VStack(spacing: 16) {
                                ProgressView()
                                    .tint(.white)
                                Text("Loading store...")
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            .padding(40)
                        }
                        
                        if let error = storeManager.errorMessage {
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.5))
                                .multilineTextAlignment(.center)
                                .padding()
                        }
                        
                        if !progress.isAdFree {
                            adFreeCard
                        }
                        
                        if !progress.isPremium {
                            premiumBundleCard
                        }
                        
                        coinPacksSection
                        
                        seasonPassSection
                        
                        restoreButton
                        
                        Spacer(minLength: 80)
                    }
                    .padding(.horizontal, Storm.isIPad ? 40 : 20)
                    .readableWidth()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    coinDisplay
                }
            }
        }
        .overlay(successOverlay)
        .preferredColorScheme(.dark)
    }
    
    // ──────────────────────────────────────────
    private var storeHeader: some View {
        VStack(spacing: 8) {
            Text("⚡️").font(.system(size: Storm.isIPad ? 64 : 50))
            Text("STORM STORE")
                .font(Storm.font(28, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.goldGradient)
            Text("Power up your game")
                .font(Storm.isIPad ? .body : .subheadline)
                .foregroundColor(.white.opacity(0.5))
        }
        .padding(.top, 10)
    }
    
    // ──────────────────────────────────────────
    private var adFreeCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "hand.raised.slash.fill")
                    .font(.title)
                    .foregroundStyle(StormColors.goldGradient)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("REMOVE ADS")
                        .font(.headline.bold())
                        .foregroundColor(.white)
                    Text("No more interruptions. Ever.")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                
                Spacer()
                
                purchaseButton(for: .adFree)
            }
            .padding(16)
            .background(
                LinearGradient(colors: [Color.purple.opacity(0.3), Color.blue.opacity(0.2)],
                              startPoint: .topLeading, endPoint: .bottomTrailing)
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(StormColors.neonPurple.opacity(0.5), lineWidth: 1)
            )
        }
    }
    
    // ──────────────────────────────────────────
    private var premiumBundleCard: some View {
        VStack(spacing: 12) {
            HStack(spacing: 4) {
                Text("👑 BEST VALUE").font(.caption2.bold())
                    .foregroundColor(StormColors.neonYellow)
                Spacer()
            }
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("PREMIUM BUNDLE")
                        .font(.headline.bold())
                        .foregroundColor(.white)
                    Text("Ad-free + 5,000 coins + exclusive skins")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                Spacer()
                purchaseButton(for: .premiumBundle)
            }
        }
        .padding(16)
        .background(
            LinearGradient(colors: [Color.orange.opacity(0.3), Color.yellow.opacity(0.15)],
                          startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(StormColors.neonYellow.opacity(0.5), lineWidth: 1)
        )
    }
    
    // ──────────────────────────────────────────
    private var coinPacksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("COIN PACKS")
                .font(.headline.bold())
                .foregroundColor(.white)
            
            ForEach([StormProduct.coins500, .coins2500, .coins10000], id: \.rawValue) { stormProduct in
                HStack {
                    Image(systemName: stormProduct.icon)
                        .foregroundColor(StormColors.neonYellow)
                        .frame(width: 36, height: 36)
                        .background(StormColors.neonYellow.opacity(0.15))
                        .cornerRadius(8)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(stormProduct.displayName)
                            .font(.subheadline.bold())
                            .foregroundColor(.white)
                        Text(stormProduct.description)
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.4))
                    }
                    
                    Spacer()
                    
                    purchaseButton(for: stormProduct)
                }
                .padding(12)
                .background(StormColors.surface)
                .cornerRadius(12)
            }
        }
    }
    
    // ──────────────────────────────────────────
    private var seasonPassSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SEASON PASS")
                .font(.headline.bold())
                .foregroundColor(.white)
            
            HStack {
                Image(systemName: "bolt.shield.fill")
                    .foregroundColor(StormColors.neonBlue)
                    .frame(width: 36, height: 36)
                    .background(StormColors.neonBlue.opacity(0.15))
                    .cornerRadius(8)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Season Pass")
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    Text("Unlock all premium games this season")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
                
                Spacer()
                
                if storeManager.isPurchased(StormProduct.seasonPass.rawValue) {
                    Text("OWNED")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonGreen)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(StormColors.neonGreen.opacity(0.15))
                        .cornerRadius(8)
                } else {
                    purchaseButton(for: .seasonPass)
                }
            }
            .padding(12)
            .background(StormColors.surface)
            .cornerRadius(12)
        }
    }
    
    // ──────────────────────────────────────────
    private func purchaseButton(for stormProduct: StormProduct) -> some View {
        Group {
            if storeManager.isPurchased(stormProduct.rawValue) {
                Text("OWNED")
                    .font(.caption.bold())
                    .foregroundColor(StormColors.neonGreen)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(StormColors.neonGreen.opacity(0.15))
                    .cornerRadius(8)
            } else if let product = storeManager.product(for: stormProduct) {
                Button {
                    Task {
                        try? await storeManager.purchase(product)
                    }
                } label: {
                    Text(product.displayPrice)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(StormColors.neonBlue)
                        .cornerRadius(10)
                }
            } else if storeManager.isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(width: 60)
            } else {
                Button {
                    Task { await storeManager.loadProducts() }
                } label: {
                    Text("Retry")
                        .font(.caption.bold())
                        .foregroundColor(StormColors.neonBlue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(StormColors.neonBlue.opacity(0.15))
                        .cornerRadius(8)
                }
            }
        }
    }
    
    // ──────────────────────────────────────────
    private var restoreButton: some View {
        Button {
            Task { await storeManager.restorePurchases() }
        } label: {
            Text("Restore Purchases")
                .font(.subheadline)
                .foregroundColor(StormColors.neonBlue)
                .padding(.vertical, 12)
        }
    }
    
    private var coinDisplay: some View {
        HStack(spacing: 4) {
            Image(systemName: "circle.fill")
                .font(.caption)
                .foregroundColor(StormColors.neonYellow)
            Text("\(progress.coins)")
                .font(.subheadline.bold())
                .foregroundColor(.white)
        }
    }
    
    // ──────────────────────────────────────────
    @ViewBuilder
    private var successOverlay: some View {
        if storeManager.showPurchaseSuccess {
            ZStack {
                Color.black.opacity(0.7).ignoresSafeArea()
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(StormColors.neonGreen)
                    Text("PURCHASE COMPLETE!")
                        .font(.title2.bold())
                        .foregroundColor(.white)
                    if let name = storeManager.lastPurchasedProduct {
                        Text(name)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                .padding(32)
                .background(StormColors.surface)
                .cornerRadius(20)
            }
            .onTapGesture {
                storeManager.showPurchaseSuccess = false
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                    storeManager.showPurchaseSuccess = false
                }
            }
        }
    }
}
