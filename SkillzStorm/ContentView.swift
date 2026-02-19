import SwiftUI

struct ContentView: View {
    @StateObject var progress = PlayerProgress.shared
    @ObservedObject var adManager = AdManager.shared
    @State private var selectedTab = 0
    @State private var showFreeRewards = false
    @State private var showStormStore = false
    
    var body: some View {
        ZStack {
            StormColors.background
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                TabView(selection: $selectedTab) {
                    // Home
                    HomeView()
                        .tabItem {
                            Image(systemName: "house.fill")
                            Text("Home")
                        }
                        .tag(0)
                    
                    // Games
                    NavigationStack {
                        GameBrowserView(category: nil)
                    }
                    .tabItem {
                        Image(systemName: "gamecontroller.fill")
                        Text("Games")
                    }
                    .tag(1)
                    
                    // Daily Challenge
                    NavigationStack {
                        DailyChallengeView()
                    }
                    .tabItem {
                        Image(systemName: "calendar")
                        Text("Daily")
                    }
                    .tag(2)
                    
                    // Store
                    NavigationStack {
                        VRStoreView()
                    }
                    .tabItem {
                        Image(systemName: "cart.fill")
                        Text("Store")
                    }
                    .tag(3)
                    
                    // Profile
                    NavigationStack {
                        SettingsView()
                    }
                    .tabItem {
                        Image(systemName: "person.fill")
                        Text("Profile")
                    }
                    .tag(4)
                }
                .tint(StormColors.neonBlue)
                
                // Banner Ad (auto-hides for ad-free users)
                SmartBannerAd()
            }
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
}
