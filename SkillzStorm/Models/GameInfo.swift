import Foundation
import SwiftUI

struct GameInfo: Identifiable, Codable {
    var id: String
    var name: String
    var description: String
    var categoryRaw: String
    var iconEmoji: String
    var supportedGrades: [String]
    var isAvailable: Bool
    var isFeatured: Bool
    var isPremium: Bool
    
    var category: GameCategory {
        GameCategory(rawValue: categoryRaw) ?? .integratedArcade
    }
    
    var grades: [GradeLevel] {
        supportedGrades.compactMap { GradeLevel(rawValue: $0) }
    }
}

// MARK: - Full Game Catalog

struct GameCatalog {
    
    static let allGames: [GameInfo] = [
        
        // ═══════════════════════════════════════════
        // TYPE 1: Integrated Learning Arcade (15)
        // ═══════════════════════════════════════════
        
        GameInfo(id: "astromath_wars", name: "AstroMath Wars", description: "Space shooter — destroy asteroids containing wrong answers. Boss fights are word problems. Powerups include slow time, hint shield, and double points.", categoryRaw: "StormBattle", iconEmoji: "🚀", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "multiplication_meteors", name: "Multiplication Meteors", description: "Meteors rain down with multiplication problems. Shoot the correct answer before they hit your base.", categoryRaw: "StormBattle", iconEmoji: "☄️", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "fraction_frenzy", name: "Fraction Frenzy", description: "Fast-paced fraction matching and solving. Chain combos for multiplier streaks.", categoryRaw: "StormBattle", iconEmoji: "🍕", supportedGrades: ["3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "algebra_blaster", name: "Algebra Blaster", description: "Solve algebraic equations in an intense space battle. Harder equations give more points.", categoryRaw: "StormBattle", iconEmoji: "⚡", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "vocabulary_sniper", name: "Vocabulary Sniper", description: "Aim and shoot targets matching word definitions. Speed and accuracy earn bonus points.", categoryRaw: "StormBattle", iconEmoji: "🎯", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "grammar_gladiator", name: "Grammar Gladiator", description: "Arena combat where attacks are powered by correct grammar choices. Build combo streaks.", categoryRaw: "StormBattle", iconEmoji: "⚔️", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "science_defender", name: "Science Defender", description: "Defend your lab by answering science questions. Each correct answer powers your shield.", categoryRaw: "StormBattle", iconEmoji: "🔬", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "history_timeline_rush", name: "History Timeline Rush", description: "Race to place historical events in the correct order on a timeline. Beat the clock.", categoryRaw: "StormBattle", iconEmoji: "📜", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "geometry_defender", name: "Geometry Defender", description: "Protect your geometric fortress by solving shape and angle problems.", categoryRaw: "StormBattle", iconEmoji: "📐", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "sat_word_arena", name: "SAT Word Arena", description: "Competitive word knowledge arena. Match definitions, synonyms, and antonyms under pressure.", categoryRaw: "StormBattle", iconEmoji: "📖", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "statistics_paintball", name: "Statistics Paintball", description: "Paintball arena where ammo is earned by solving statistics problems. Mean, median, mode combat.", categoryRaw: "StormBattle", iconEmoji: "🎨", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "chem_lab_chaos", name: "Chem Lab Chaos", description: "Mix chemicals and balance equations in a frantic lab setting. Don't let the lab explode.", categoryRaw: "StormBattle", iconEmoji: "🧪", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "financial_literacy_run", name: "Financial Literacy Run", description: "Navigate the stock market, manage budgets, and learn compound interest through gameplay.", categoryRaw: "StormBattle", iconEmoji: "💰", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "coordinate_conquest", name: "Coordinate Conquest", description: "Plot points and lines on a coordinate grid to conquer territory. Strategic math warfare.", categoryRaw: "StormBattle", iconEmoji: "📊", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "data_defender", name: "Data Defender", description: "Protect data sets from corruption by interpreting graphs, charts, and statistical measures.", categoryRaw: "StormBattle", iconEmoji: "🛡️", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        // ═══════════════════════════════════════════
        // TYPE 2: Dash / Runner + Knowledge Gate (15)
        // ═══════════════════════════════════════════
        
        GameInfo(id: "skilldash", name: "SkillDash", description: "Auto-runner inspired by Geometry Dash. Jump obstacles, collect coins, answer questions at checkpoints to advance.", categoryRaw: "StormDash", iconEmoji: "💨", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "sentence_sprint", name: "Sentence Sprint", description: "Side-scrolling runner. Jump and hit words in the correct order to form sentences.", categoryRaw: "StormDash", iconEmoji: "✍️", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "bull_run_logic", name: "Bull Run Logic", description: "Run from the bull! Solve equations before it catches you. Harder grades = shorter timer.", categoryRaw: "StormDash", iconEmoji: "🐂", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "equation_escape", name: "Equation Escape", description: "Escape a collapsing maze by solving equations at each locked door.", categoryRaw: "StormDash", iconEmoji: "🏃", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "maze_of_ratios", name: "Maze of Ratios", description: "Navigate a ratio-based maze. Each path requires proportional thinking.", categoryRaw: "StormDash", iconEmoji: "🌀", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "physics_platform", name: "Physics Platform", description: "Platformer where physics equations control gravity, speed, and jump height.", categoryRaw: "StormDash", iconEmoji: "🎮", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "word_rocket_run", name: "Word Rocket Run", description: "Rocket through space collecting vocabulary words. Wrong words slow you down.", categoryRaw: "StormDash", iconEmoji: "🚀", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "logic_tunnel", name: "Logic Tunnel", description: "Speed through a tunnel solving logic puzzles to keep the path open.", categoryRaw: "StormDash", iconEmoji: "🕳️", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "history_dash", name: "History Dash", description: "Run through historical eras. Answer history questions to unlock the next time period.", categoryRaw: "StormDash", iconEmoji: "🏛️", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "chem_jump", name: "Chem Jump", description: "Jump across periodic table elements. Land on the correct element to continue.", categoryRaw: "StormDash", iconEmoji: "⚗️", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "speed_reading_dash", name: "Speed Reading Dash", description: "Run and read! Comprehension gates test your speed reading ability.", categoryRaw: "StormDash", iconEmoji: "📚", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "essay_builder_rush", name: "Essay Builder Rush", description: "Race to collect paragraph components in the correct order to build essays.", categoryRaw: "StormDash", iconEmoji: "📝", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "market_mayhem", name: "Market Mayhem", description: "Stock market simulation runner. Solve percentage changes and profit calculations to advance.", categoryRaw: "StormDash", iconEmoji: "📈", supportedGrades: ["9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "debate_dash", name: "Debate Dash", description: "Race through argument structures. Build logical arguments to break through barriers.", categoryRaw: "StormDash", iconEmoji: "🗣️", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "geometry_glide", name: "Geometry Glide", description: "Glide through geometric shapes. Identify properties to navigate safely.", categoryRaw: "StormDash", iconEmoji: "🔷", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        // ═══════════════════════════════════════════
        // TYPE 3: Puzzle & Strategy (10)
        // ═══════════════════════════════════════════
        
        GameInfo(id: "sentence_builder_pro", name: "Sentence Builder Pro", description: "Drag and drop words to build grammatically correct sentences. Increasing complexity.", categoryRaw: "StormPuzzle", iconEmoji: "🧩", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "context_clue_hunt", name: "Context Clue Hunt", description: "Detective-style investigation. Use context clues to determine word meanings.", categoryRaw: "StormPuzzle", iconEmoji: "🔍", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "pattern_blast", name: "Pattern Blast", description: "Identify and extend patterns. Blast wrong answers and protect the sequence.", categoryRaw: "StormPuzzle", iconEmoji: "🔢", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "ratio_architect", name: "Ratio Architect", description: "Build structures using correct ratios and proportions. Engineering meets math.", categoryRaw: "StormPuzzle", iconEmoji: "🏗️", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "timeline_builder", name: "Timeline Builder", description: "Construct historical timelines by placing events in chronological order.", categoryRaw: "StormPuzzle", iconEmoji: "📅", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "proof_builder", name: "Proof Builder", description: "Construct mathematical proofs step by step. Logic and reasoning challenge.", categoryRaw: "StormPuzzle", iconEmoji: "✅", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "word_connect_storm", name: "Word Connect Storm", description: "Connect related words in a web of meanings. Find all connections to clear the board.", categoryRaw: "StormPuzzle", iconEmoji: "🕸️", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "probability_quest", name: "Probability Quest", description: "Navigate choices using probability calculations. Best odds win the quest.", categoryRaw: "StormPuzzle", iconEmoji: "🎲", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "code_breaker", name: "Code Breaker", description: "Crack coded messages using logic, math, and language skills.", categoryRaw: "StormPuzzle", iconEmoji: "🔐", supportedGrades: ["6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "logic_tower", name: "Logic Tower", description: "Build a tower of logic. Each floor requires solving increasingly complex reasoning puzzles.", categoryRaw: "StormPuzzle", iconEmoji: "🗼", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        // ═══════════════════════════════════════════
        // TYPE 4: Quick Play Mini Games (10+)
        // ═══════════════════════════════════════════
        
        GameInfo(id: "word_balloon_pop", name: "Word Balloon Pop", description: "Pop balloons containing the correct answers before they float away.", categoryRaw: "StormQuick", iconEmoji: "🎈", supportedGrades: ["K-2","3-5"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "number_catch", name: "Number Catch", description: "Catch falling numbers that match the target equation. Fast reflexes required.", categoryRaw: "StormQuick", iconEmoji: "🔢", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "grammar_clicker", name: "Grammar Clicker", description: "Rapid-fire grammar corrections. Click the right fix as fast as possible.", categoryRaw: "StormQuick", iconEmoji: "✏️", supportedGrades: ["3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "flash_fact_frenzy", name: "Flash Fact Frenzy", description: "True or false lightning round. How many facts can you judge in 60 seconds?", categoryRaw: "StormQuick", iconEmoji: "⚡", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "speed_multiplication", name: "Speed Multiplication", description: "Multiplication speed drill. Beat your personal record every round.", categoryRaw: "StormQuick", iconEmoji: "✖️", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "spelling_sniper", name: "Spelling Sniper", description: "Snipe misspelled words from a scrolling wall of text. Precision counts.", categoryRaw: "StormQuick", iconEmoji: "🎯", supportedGrades: ["3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "color_equation", name: "Color Equation", description: "Solve equations where colors represent numbers. Visual algebra training.", categoryRaw: "StormQuick", iconEmoji: "🌈", supportedGrades: ["K-2","3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "quick_sat", name: "Quick SAT", description: "60-second SAT prep blitz. Vocabulary, reading, and math in rapid succession.", categoryRaw: "StormQuick", iconEmoji: "📋", supportedGrades: ["9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "brain_boost", name: "Brain Boost", description: "Mixed skill challenges that get progressively harder. How far can you go?", categoryRaw: "StormQuick", iconEmoji: "🧠", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "memory_matrix", name: "Memory Matrix", description: "Remember patterns and sequences of increasing complexity. Train your working memory.", categoryRaw: "StormQuick", iconEmoji: "🧩", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "wordwave_survival", name: "WordWave Survival", description: "Zombie-style survival arena. Enemies only disappear when you choose the correct word definition.", categoryRaw: "StormBattle", iconEmoji: "🧟", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        // ═══════════════════════════════════════════
        // TYPE 5: 3D Games
        // ═══════════════════════════════════════════
        
        GameInfo(id: "geometry_runner_3d", name: "Geometry Runner 3D", description: "Run through a 3D geometric world. Identify shapes and solve spatial puzzles.", categoryRaw: "Storm3D", iconEmoji: "🎮", supportedGrades: ["3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "math_galaxy_3d", name: "Math Galaxy 3D", description: "Explore a 3D galaxy solving math challenges on each planet you visit.", categoryRaw: "Storm3D", iconEmoji: "🌌", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: false, isPremium: false),
        
        GameInfo(id: "word_world_3d", name: "Word World 3D", description: "Navigate a 3D word landscape. Build vocabulary by exploring themed environments.", categoryRaw: "Storm3D", iconEmoji: "🌍", supportedGrades: ["3-5","6-8"], isAvailable: true, isFeatured: false, isPremium: false),
        
        // ═══════════════════════════════════════════
        // TYPE 6: VR Games
        // ═══════════════════════════════════════════
        
        GameInfo(id: "vr_math_dojo", name: "VR Math Dojo", description: "Immersive VR math training. Solve problems in a virtual dojo environment.", categoryRaw: "StormVR", iconEmoji: "🥋", supportedGrades: ["6-8","9-12"], isAvailable: false, isFeatured: true, isPremium: true),
        
        GameInfo(id: "vr_science_lab", name: "VR Science Lab", description: "Conduct virtual experiments in a fully immersive science laboratory.", categoryRaw: "StormVR", iconEmoji: "🧫", supportedGrades: ["6-8","9-12"], isAvailable: false, isFeatured: false, isPremium: true),
        
        GameInfo(id: "vr_history_explorer", name: "VR History Explorer", description: "Walk through historical events in virtual reality. Experience history firsthand.", categoryRaw: "StormVR", iconEmoji: "🏺", supportedGrades: ["6-8","9-12"], isAvailable: false, isFeatured: false, isPremium: true),
        
        // ═══════════════════════════════════════════
        // STORM DEFENDERS (Tower Defense)
        // ═══════════════════════════════════════════
        
        GameInfo(id: "storm_defenders", name: "Storm Defenders", description: "Tower defense where you place Brain Turrets to fight zombie waves. Answer questions to place and upgrade 10 unique defenders. Survive endless waves, unlock new turrets, and outsmart boss zombies. Every question makes your defense stronger.", categoryRaw: "StormBattle", iconEmoji: "🛡️", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
        
        GameInfo(id: "storm_defenders_vr", name: "Storm Defenders VR", description: "Immersive 3D tower defense. Look down at the battlefield from above, place defenders on the grid by answering questions, and watch zombies march in real-time 3D. Full SceneKit-powered experience.", categoryRaw: "Storm3D", iconEmoji: "🥽", supportedGrades: ["K-2","3-5","6-8","9-12"], isAvailable: true, isFeatured: true, isPremium: false),
    ]
    
    static func games(for category: GameCategory) -> [GameInfo] {
        allGames.filter { $0.categoryRaw == category.rawValue }
    }
    
    static func games(for grade: GradeLevel) -> [GameInfo] {
        allGames.filter { $0.supportedGrades.contains(grade.rawValue) }
    }
    
    static func games(for category: GameCategory, grade: GradeLevel) -> [GameInfo] {
        allGames.filter { $0.categoryRaw == category.rawValue && $0.supportedGrades.contains(grade.rawValue) }
    }
    
    static func featuredGames() -> [GameInfo] {
        allGames.filter { $0.isFeatured }
    }
    
    static var availableGames: [GameInfo] {
        allGames.filter { $0.isAvailable }
    }
    
    static var totalGameCount: Int {
        allGames.count
    }
}
