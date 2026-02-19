//
//  SkillzStormApp.swift
//  SkillzStorm
//
//  Created by Brian Bruce on 2026-02-11.
//
//  SkillzStorm - Play Hard. Think Harder.
//  An Arcade Learning Network for K-12
//
//  50+ educational games across:
//  - StormBattle (Integrated Learning Arcade)
//  - StormDash (Runner + Knowledge Gates)
//  - StormPuzzle (Puzzle & Strategy)
//  - StormQuick (Quick Play Mini Games)
//  - Storm3D (3D Immersive Games)
//  - StormVR (VR Experience)
//

import SwiftUI
import GoogleMobileAds
import GameKit

@main
struct SkillzStormApp: App {
    
    init() {
        // Force all windows to dark background (prevents white flash)
        let darkBG = UIColor(red: 0.05, green: 0.05, blue: 0.12, alpha: 1.0)
        UIView.appearance(whenContainedInInstancesOf: [UIWindow.self]).backgroundColor = nil
        
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        
        // Tab bar - dark background
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = darkBG
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        
        // Table / scroll views - dark
        UITableView.appearance().backgroundColor = darkBG
        UICollectionView.appearance().backgroundColor = .clear
        
        // Initialize Google AdMob
        AdManager.shared.initialize()
        
        // Authenticate Game Center (for multiplayer)
        MultiplayerService.shared.authenticate()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(PlayerProgress.shared)
                .environmentObject(AdManager.shared)
                .environmentObject(StoreManager.shared)
                .preferredColorScheme(.dark)
        }
    }
}
