import Foundation
import Combine

// MARK: - Player Progress (Local Only - No Account Required)

class PlayerProgress: ObservableObject {
    static let shared = PlayerProgress()
    
    @Published var totalCoins: Int {
        didSet { save("totalCoins", value: totalCoins) }
    }
    @Published var totalXP: Int {
        didSet { save("totalXP", value: totalXP) }
    }
    @Published var currentStreak: Int {
        didSet { save("currentStreak", value: currentStreak) }
    }
    @Published var highScores: [String: Int] {
        didSet { saveDict("highScores", value: highScores) }
    }
    @Published var gamesPlayed: Int {
        didSet { save("gamesPlayed", value: gamesPlayed) }
    }
    @Published var questionsAnswered: Int {
        didSet { save("questionsAnswered", value: questionsAnswered) }
    }
    @Published var questionsCorrect: Int {
        didSet { save("questionsCorrect", value: questionsCorrect) }
    }
    @Published var selectedGrade: GradeLevel {
        didSet { UserDefaults.standard.set(selectedGrade.rawValue, forKey: "selectedGrade") }
    }
    @Published var isAdFree: Bool {
        didSet { save("isAdFree", value: isAdFree) }
    }
    @Published var unlockedGames: Set<String> {
        didSet { UserDefaults.standard.set(Array(unlockedGames), forKey: "unlockedGames") }
    }
    @Published var dailyChallengeCompleted: Bool {
        didSet { save("dailyChallengeCompleted", value: dailyChallengeCompleted) }
    }
    @Published var lastPlayDate: Date? {
        didSet { UserDefaults.standard.set(lastPlayDate, forKey: "lastPlayDate") }
    }
    @Published var powerUps: [String: Int] {
        didSet { saveDict("powerUps", value: powerUps) }
    }
    @Published var isPremium: Bool {
        didSet { save("isPremium", value: isPremium) }
    }
    @Published var hasSeasonPass: Bool {
        didSet { save("hasSeasonPass", value: hasSeasonPass) }
    }
    
    /// Alias for totalCoins
    var coins: Int {
        get { totalCoins }
        set { totalCoins = newValue }
    }
    
    private init() {
        let ud = UserDefaults.standard
        totalCoins = ud.integer(forKey: "totalCoins")
        totalXP = ud.integer(forKey: "totalXP")
        currentStreak = ud.integer(forKey: "currentStreak")
        highScores = ud.dictionary(forKey: "highScores") as? [String: Int] ?? [:]
        gamesPlayed = ud.integer(forKey: "gamesPlayed")
        questionsAnswered = ud.integer(forKey: "questionsAnswered")
        questionsCorrect = ud.integer(forKey: "questionsCorrect")
        selectedGrade = GradeLevel(rawValue: ud.string(forKey: "selectedGrade") ?? "K-2") ?? .k2
        isAdFree = ud.bool(forKey: "isAdFree")
        unlockedGames = Set(ud.stringArray(forKey: "unlockedGames") ?? [])
        dailyChallengeCompleted = ud.bool(forKey: "dailyChallengeCompleted")
        lastPlayDate = ud.object(forKey: "lastPlayDate") as? Date
        powerUps = ud.dictionary(forKey: "powerUps") as? [String: Int] ?? [
            "slowTime": 3,
            "hintShield": 3,
            "doublePoints": 3,
            "extraLife": 3,
            "skipQuestion": 1
        ]
        isPremium = ud.bool(forKey: "isPremium")
        hasSeasonPass = ud.bool(forKey: "hasSeasonPass")
        
        checkDailyReset()
    }
    
    // MARK: - Actions
    
    func addCoins(_ amount: Int) {
        totalCoins += amount
    }
    
    func addXP(_ amount: Int) {
        totalXP += amount
    }
    
    func recordGamePlayed(gameId: String, score: Int) {
        gamesPlayed += 1
        lastPlayDate = Date()
        if score > (highScores[gameId] ?? 0) {
            highScores[gameId] = score
        }
    }
    
    func recordAnswer(correct: Bool) {
        questionsAnswered += 1
        if correct {
            questionsCorrect += 1
        }
    }
    
    func usePowerUp(_ type: String) -> Bool {
        guard let count = powerUps[type], count > 0 else { return false }
        powerUps[type] = count - 1
        return true
    }
    
    func addPowerUp(_ type: String, count: Int = 1) {
        powerUps[type] = (powerUps[type] ?? 0) + count
    }
    
    var accuracy: Double {
        guard questionsAnswered > 0 else { return 0 }
        return Double(questionsCorrect) / Double(questionsAnswered) * 100
    }
    
    var level: Int {
        return max(1, totalXP / 500 + 1)
    }
    
    var xpToNextLevel: Int {
        return 500 - (totalXP % 500)
    }
    
    var xpProgress: Double {
        return Double(totalXP % 500) / 500.0
    }
    
    // MARK: - Daily Reset
    
    private func checkDailyReset() {
        guard let last = lastPlayDate else { return }
        if !Calendar.current.isDateInToday(last) {
            dailyChallengeCompleted = false
            // Streak management
            if Calendar.current.isDateInYesterday(last) {
                currentStreak += 1
            } else {
                currentStreak = 0
            }
        }
    }
    
    // MARK: - Persistence Helpers
    
    private func save(_ key: String, value: Int) {
        UserDefaults.standard.set(value, forKey: key)
    }
    
    private func save(_ key: String, value: Bool) {
        UserDefaults.standard.set(value, forKey: key)
    }
    
    private func saveDict(_ key: String, value: [String: Int]) {
        UserDefaults.standard.set(value, forKey: key)
    }
}
