import AVFoundation
import SwiftUI
import Combine

class SoundManager: ObservableObject {
    static let shared = SoundManager()
    
    @Published var isMuted: Bool {
        didSet { UserDefaults.standard.set(isMuted, forKey: "isMuted") }
    }
    @Published var musicVolume: Float {
        didSet { UserDefaults.standard.set(musicVolume, forKey: "musicVolume") }
    }
    @Published var sfxVolume: Float {
        didSet { UserDefaults.standard.set(sfxVolume, forKey: "sfxVolume") }
    }
    
    private var audioPlayers: [String: AVAudioPlayer] = [:]
    private var musicPlayer: AVAudioPlayer?
    
    private init() {
        isMuted = UserDefaults.standard.bool(forKey: "isMuted")
        musicVolume = UserDefaults.standard.object(forKey: "musicVolume") as? Float ?? 0.5
        sfxVolume = UserDefaults.standard.object(forKey: "sfxVolume") as? Float ?? 0.7
    }
    
    // MARK: - Sound Effects (Using System Sounds as Fallback)
    
    func playCorrect() {
        guard !isMuted else { return }
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
        playSystemSound(id: 1025) // Positive chime
    }
    
    func playIncorrect() {
        guard !isMuted else { return }
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
        #endif
        playSystemSound(id: 1053) // Error sound
    }
    
    func playLevelUp() {
        guard !isMuted else { return }
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
        playSystemSound(id: 1026)
    }
    
    func playCoinCollect() {
        guard !isMuted else { return }
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        #endif
        playSystemSound(id: 1004)
    }
    
    func playButtonTap() {
        guard !isMuted else { return }
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        #endif
    }
    
    func playExplosion() {
        guard !isMuted else { return }
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
        #endif
        playSystemSound(id: 1070)
    }
    
    func playGameOver() {
        guard !isMuted else { return }
        playSystemSound(id: 1073)
    }
    
    func playCountdown() {
        guard !isMuted else { return }
        playSystemSound(id: 1057)
    }
    
    private func playSystemSound(id: UInt32) {
        AudioServicesPlaySystemSound(SystemSoundID(id))
    }
    
    // MARK: - Toggle
    
    func toggleMute() {
        isMuted.toggle()
    }
}
