import SpriteKit
import SwiftUI

// MARK: - AstroMath Wars SpriteKit Scene

class AstroMathWarsScene: SKScene, SKPhysicsContactDelegate {
    
    // Game State
    var grade: GradeLevel = .k2
    var score = 0
    var lives = 3
    var level = 1
    var correctAnswer = ""
    var questionPrompt = ""
    var isGameOver = false
    var isGamePaused = false
    var gateCallback: (() -> Void)?
    var gameOverCallback: ((Int, Int) -> Void)?
    
    // Nodes
    private var ship: SKSpriteNode!
    private var scoreLabel: SKLabelNode!
    private var livesLabel: SKLabelNode!
    private var levelLabel: SKLabelNode!
    private var questionLabel: SKLabelNode!
    
    // Physics categories
    private let shipCategory: UInt32 = 0x1 << 0
    private let asteroidCategory: UInt32 = 0x1 << 1
    private let bulletCategory: UInt32 = 0x1 << 2
    private let coinCategory: UInt32 = 0x1 << 3
    
    // Timers
    private var spawnTimer: TimeInterval = 0
    private var spawnInterval: TimeInterval = 2.0
    private var difficultyTimer: TimeInterval = 0
    private var gateTimer: TimeInterval = 0
    private var gateInterval: TimeInterval = 30.0 // Knowledge Gate every 30 seconds
    
    // Stars
    private var starField: SKEmitterNode?
    
    override func didMove(to view: SKView) {
        backgroundColor = .black
        physicsWorld.contactDelegate = self
        physicsWorld.gravity = .zero
        
        setupStarField()
        setupShip()
        setupHUD()
        generateNewQuestion()
    }
    
    // MARK: - Setup
    
    private func setupStarField() {
        // Create star particles
        let emitter = SKEmitterNode()
        emitter.particleBirthRate = 80
        emitter.particleLifetime = 14
        emitter.particlePosition = CGPoint(x: size.width / 2, y: size.height)
        emitter.particlePositionRange = CGVector(dx: size.width, dy: 0)
        emitter.particleSpeed = 80
        emitter.particleSpeedRange = 40
        emitter.emissionAngle = .pi * 1.5
        emitter.particleAlpha = 0.8
        emitter.particleAlphaRange = 0.3
        emitter.particleScale = 0.05
        emitter.particleScaleRange = 0.03
        emitter.particleColor = .white
        emitter.particleColorBlendFactor = 1
        emitter.position = CGPoint(x: size.width / 2, y: size.height)
        emitter.zPosition = -10
        addChild(emitter)
    }
    
    private func setupShip() {
        // Create ship from shapes (no image needed)
        ship = SKSpriteNode(color: .clear, size: CGSize(width: 50, height: 50))
        
        let shipBody = SKShapeNode(path: createShipPath())
        shipBody.fillColor = UIColor(red: 0, green: 0.6, blue: 1, alpha: 1)
        shipBody.strokeColor = UIColor(red: 0, green: 0.9, blue: 1, alpha: 1)
        shipBody.lineWidth = 2
        shipBody.glowWidth = 3
        ship.addChild(shipBody)
        
        // Engine glow
        let glow = SKShapeNode(circleOfRadius: 8)
        glow.fillColor = UIColor(red: 0, green: 0.8, blue: 1, alpha: 0.5)
        glow.strokeColor = .clear
        glow.position = CGPoint(x: 0, y: -20)
        glow.run(SKAction.repeatForever(SKAction.sequence([
            SKAction.fadeAlpha(to: 0.3, duration: 0.3),
            SKAction.fadeAlpha(to: 0.8, duration: 0.3)
        ])))
        ship.addChild(glow)
        
        ship.position = CGPoint(x: size.width / 2, y: 100)
        ship.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 40, height: 40))
        ship.physicsBody?.categoryBitMask = shipCategory
        ship.physicsBody?.contactTestBitMask = asteroidCategory | coinCategory
        ship.physicsBody?.collisionBitMask = 0
        ship.physicsBody?.isDynamic = true
        ship.zPosition = 10
        
        addChild(ship)
    }
    
    private func createShipPath() -> CGPath {
        let path = CGMutablePath()
        path.move(to: CGPoint(x: 0, y: 25))
        path.addLine(to: CGPoint(x: -20, y: -20))
        path.addLine(to: CGPoint(x: -8, y: -12))
        path.addLine(to: CGPoint(x: 0, y: -18))
        path.addLine(to: CGPoint(x: 8, y: -12))
        path.addLine(to: CGPoint(x: 20, y: -20))
        path.closeSubpath()
        return path
    }
    
    private func setupHUD() {
        scoreLabel = createLabel(text: "Score: 0", position: CGPoint(x: 80, y: size.height - 50))
        scoreLabel.fontSize = 18
        addChild(scoreLabel)
        
        livesLabel = createLabel(text: "❤️❤️❤️", position: CGPoint(x: size.width - 60, y: size.height - 50))
        livesLabel.fontSize = 18
        addChild(livesLabel)
        
        levelLabel = createLabel(text: "Level 1", position: CGPoint(x: size.width / 2, y: size.height - 50))
        levelLabel.fontSize = 18
        levelLabel.fontColor = UIColor(red: 0, green: 0.8, blue: 1, alpha: 1)
        addChild(levelLabel)
        
        // Question display at top
        questionLabel = createLabel(text: "", position: CGPoint(x: size.width / 2, y: size.height - 80))
        questionLabel.fontSize = 16
        questionLabel.fontColor = UIColor(red: 0, green: 1, blue: 0.8, alpha: 1)
        addChild(questionLabel)
    }
    
    private func createLabel(text: String, position: CGPoint) -> SKLabelNode {
        let label = SKLabelNode(fontNamed: "AvenirNext-Bold")
        label.text = text
        label.fontSize = 20
        label.fontColor = .white
        label.position = position
        label.zPosition = 100
        return label
    }
    
    // MARK: - Question Generation
    
    private func generateNewQuestion() {
        let question = QuestionBank.shared.generateMathQuestion(for: grade)
        questionPrompt = question.prompt
        correctAnswer = question.correctAnswer
        questionLabel.text = "🎯 \(questionPrompt) — Shoot: \(correctAnswer)"
    }
    
    // MARK: - Game Loop
    
    override func update(_ currentTime: TimeInterval) {
        guard !isGameOver && !isGamePaused else { return }
        
        let dt = 1.0 / 60.0
        
        // Spawn asteroids
        spawnTimer += dt
        if spawnTimer >= spawnInterval {
            spawnTimer = 0
            spawnAsteroid()
        }
        
        // Difficulty scaling
        difficultyTimer += dt
        if difficultyTimer >= 15 {
            difficultyTimer = 0
            spawnInterval = max(0.5, spawnInterval - 0.2)
        }
        
        // Knowledge Gate timer
        gateTimer += dt
        if gateTimer >= gateInterval {
            gateTimer = 0
            triggerKnowledgeGate()
        }
        
        updateHUD()
    }
    
    private func updateHUD() {
        scoreLabel.text = "Score: \(score)"
        livesLabel.text = String(repeating: "❤️", count: max(0, lives))
        levelLabel.text = "Level \(level)"
    }
    
    // MARK: - Spawn Asteroids
    
    private func spawnAsteroid() {
        let question = QuestionBank.shared.generateMathQuestion(for: grade)
        let allChoices = question.choices.shuffled()
        
        // Spawn a correct and incorrect asteroid
        let correctX = CGFloat.random(in: 40...size.width-40)
        spawnSingleAsteroid(at: correctX, answer: question.correctAnswer, isCorrect: true)
        
        if let wrongAnswer = allChoices.first(where: { $0 != question.correctAnswer }) {
            let wrongX = CGFloat.random(in: 40...size.width-40)
            spawnSingleAsteroid(at: wrongX, answer: wrongAnswer, isCorrect: false)
        }
        
        // Update the displayed question
        correctAnswer = question.correctAnswer
        questionLabel.text = "🎯 \(question.prompt) → \(question.correctAnswer)"
    }
    
    private func spawnSingleAsteroid(at x: CGFloat, answer: String, isCorrect: Bool) {
        let asteroidSize = CGFloat.random(in: 35...55)
        let asteroid = SKShapeNode(circleOfRadius: asteroidSize / 2)
        asteroid.fillColor = isCorrect ? UIColor(red: 0, green: 0.5, blue: 0, alpha: 0.4) : UIColor(red: 0.5, green: 0, blue: 0, alpha: 0.4)
        asteroid.strokeColor = isCorrect ? UIColor(red: 0, green: 0.8, blue: 0.3, alpha: 0.8) : UIColor(red: 0.8, green: 0.2, blue: 0.2, alpha: 0.8)
        asteroid.lineWidth = 2
        asteroid.position = CGPoint(x: x, y: size.height + asteroidSize)
        asteroid.name = isCorrect ? "correct" : "wrong"
        
        // Label
        let label = SKLabelNode(fontNamed: "AvenirNext-Bold")
        label.text = answer
        label.fontSize = 14
        label.fontColor = .white
        label.verticalAlignmentMode = .center
        asteroid.addChild(label)
        
        // Physics
        asteroid.physicsBody = SKPhysicsBody(circleOfRadius: asteroidSize / 2)
        asteroid.physicsBody?.categoryBitMask = asteroidCategory
        asteroid.physicsBody?.contactTestBitMask = bulletCategory | shipCategory
        asteroid.physicsBody?.collisionBitMask = 0
        asteroid.physicsBody?.isDynamic = true
        asteroid.physicsBody?.velocity = CGVector(dx: 0, dy: CGFloat(-80 - level * 10))
        
        // Rotation
        asteroid.run(SKAction.repeatForever(SKAction.rotate(byAngle: .pi, duration: Double.random(in: 2...4))))
        
        // Remove when off-screen
        asteroid.run(SKAction.sequence([
            SKAction.wait(forDuration: 10),
            SKAction.removeFromParent()
        ]))
        
        addChild(asteroid)
    }
    
    // MARK: - Shooting
    
    private func shoot() {
        let bullet = SKShapeNode(rectOf: CGSize(width: 4, height: 16), cornerRadius: 2)
        bullet.fillColor = UIColor(red: 0, green: 1, blue: 0.5, alpha: 1)
        bullet.strokeColor = UIColor(red: 0, green: 1, blue: 0.8, alpha: 1)
        bullet.glowWidth = 3
        bullet.position = CGPoint(x: ship.position.x, y: ship.position.y + 30)
        bullet.name = "bullet"
        
        bullet.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 4, height: 16))
        bullet.physicsBody?.categoryBitMask = bulletCategory
        bullet.physicsBody?.contactTestBitMask = asteroidCategory
        bullet.physicsBody?.collisionBitMask = 0
        bullet.physicsBody?.isDynamic = true
        bullet.physicsBody?.velocity = CGVector(dx: 0, dy: 500)
        
        bullet.run(SKAction.sequence([
            SKAction.wait(forDuration: 2),
            SKAction.removeFromParent()
        ]))
        
        addChild(bullet)
    }
    
    // MARK: - Contacts
    
    func didBegin(_ contact: SKPhysicsContact) {
        let bodyA = contact.bodyA
        let bodyB = contact.bodyB
        
        // Bullet hits asteroid
        if (bodyA.categoryBitMask == bulletCategory && bodyB.categoryBitMask == asteroidCategory) {
            handleBulletHit(bullet: bodyA.node, asteroid: bodyB.node)
        } else if (bodyB.categoryBitMask == bulletCategory && bodyA.categoryBitMask == asteroidCategory) {
            handleBulletHit(bullet: bodyB.node, asteroid: bodyA.node)
        }
        
        // Ship hits asteroid
        if (bodyA.categoryBitMask == shipCategory && bodyB.categoryBitMask == asteroidCategory) {
            handleShipHit(asteroid: bodyB.node)
        } else if (bodyB.categoryBitMask == shipCategory && bodyA.categoryBitMask == asteroidCategory) {
            handleShipHit(asteroid: bodyA.node)
        }
    }
    
    private func handleBulletHit(bullet: SKNode?, asteroid: SKNode?) {
        guard let asteroid = asteroid else { return }
        
        let isCorrect = asteroid.name == "correct"
        
        // Explosion effect
        createExplosion(at: asteroid.position, color: isCorrect ? .green : .red)
        
        bullet?.removeFromParent()
        asteroid.removeFromParent()
        
        if isCorrect {
            score += 10 * level
            PlayerProgress.shared.addCoins(5)
            generateNewQuestion()
            
            // Level up check
            if score > level * 100 {
                level += 1
                spawnInterval = max(0.5, 2.0 - Double(level) * 0.15)
            }
        } else {
            lives -= 1
            flashScreen(color: .red)
            if lives <= 0 {
                triggerGameOver()
            }
        }
    }
    
    private func handleShipHit(asteroid: SKNode?) {
        guard let asteroid = asteroid else { return }
        
        createExplosion(at: asteroid.position, color: .red)
        asteroid.removeFromParent()
        
        lives -= 1
        flashScreen(color: .red)
        
        if lives <= 0 {
            triggerGameOver()
        }
    }
    
    // MARK: - Effects
    
    private func createExplosion(at position: CGPoint, color: UIColor) {
        for _ in 0..<12 {
            let particle = SKShapeNode(circleOfRadius: CGFloat.random(in: 2...6))
            particle.fillColor = color
            particle.strokeColor = .clear
            particle.position = position
            particle.zPosition = 50
            
            let angle = CGFloat.random(in: 0...(2 * .pi))
            let dist = CGFloat.random(in: 30...80)
            let dx = cos(angle) * dist
            let dy = sin(angle) * dist
            
            addChild(particle)
            particle.run(SKAction.group([
                SKAction.move(by: CGVector(dx: dx, dy: dy), duration: 0.5),
                SKAction.fadeOut(withDuration: 0.5),
                SKAction.scale(to: 0, duration: 0.5)
            ])) {
                particle.removeFromParent()
            }
        }
    }
    
    private func flashScreen(color: UIColor) {
        let flash = SKShapeNode(rectOf: size)
        flash.fillColor = color
        flash.alpha = 0.3
        flash.position = CGPoint(x: size.width / 2, y: size.height / 2)
        flash.zPosition = 200
        addChild(flash)
        flash.run(SKAction.sequence([
            SKAction.fadeOut(withDuration: 0.2),
            SKAction.removeFromParent()
        ]))
    }
    
    // MARK: - Knowledge Gate
    
    private func triggerKnowledgeGate() {
        isGamePaused = true
        self.scene?.isPaused = true
        gateCallback?()
    }
    
    func resumeFromGate(success: Bool) {
        isGamePaused = false
        self.scene?.isPaused = false
        if success {
            score += 50
            level += 1
        } else {
            lives -= 1
            if lives <= 0 {
                triggerGameOver()
            }
        }
    }
    
    // MARK: - Game Over
    
    private func triggerGameOver() {
        isGameOver = true
        PlayerProgress.shared.recordGamePlayed(gameId: "astromath_wars", score: score)
        
        // Slow-mo effect
        self.speed = 0.3
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            guard let self = self else { return }
            self.gameOverCallback?(self.score, self.level)
        }
    }
    
    // MARK: - Touch Handling
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !isGameOver else { return }
        let location = touch.location(in: self)
        
        // Shoot on tap
        shoot()
        
        // Move ship toward tap x position
        let moveAction = SKAction.moveTo(x: max(30, min(size.width - 30, location.x)), duration: 0.15)
        ship.run(moveAction)
    }
    
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !isGameOver else { return }
        let location = touch.location(in: self)
        ship.position.x = max(30, min(size.width - 30, location.x))
    }
}

// MARK: - SwiftUI Wrapper

struct AstroMathWarsView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @State private var scene: AstroMathWarsScene?
    @State private var showGate = false
    @State private var showGameOver = false
    @State private var finalScore = 0
    @State private var finalLevel = 0
    
    var body: some View {
        ZStack {
            if let scene = scene {
                SpriteView(scene: scene)
                    .ignoresSafeArea()
            }
            
            if showGate {
                KnowledgeGateView(engine: gateEngine, grade: grade) { result in
                    showGate = false
                    scene?.resumeFromGate(success: result == .correct)
                }
            }
            
            if showGameOver {
                gameOverOverlay
            }
        }
        .onAppear {
            let screenSize = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.screen.bounds.size ?? CGSize(width: 390, height: 844)
            let gameScene = AstroMathWarsScene(size: screenSize)
            gameScene.scaleMode = .resizeFill
            gameScene.grade = grade
            gameScene.gateCallback = {
                gateEngine.activateCheckpoint(grade: grade)
                showGate = true
            }
            gameScene.gameOverCallback = { score, level in
                finalScore = score
                finalLevel = level
                showGameOver = true
            }
            self.scene = gameScene
        }
    }
    
    private var gameOverOverlay: some View {
        VStack(spacing: 24) {
            Text("MISSION COMPLETE")
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.heroGradient)
            
            Text("🚀")
                .font(.system(size: 60))
            
            VStack(spacing: 8) {
                Text("Score: \(finalScore)")
                    .font(.title.bold())
                    .foregroundColor(StormColors.neonYellow)
                Text("Level Reached: \(finalLevel)")
                    .font(.title3)
                    .foregroundColor(.white)
            }
            
            VStack(spacing: 12) {
                StormButton("Play Again", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                    showGameOver = false
                    let screenSize = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.screen.bounds.size ?? CGSize(width: 390, height: 844)
                    let gameScene = AstroMathWarsScene(size: screenSize)
                    gameScene.scaleMode = .resizeFill
                    gameScene.grade = grade
                    gameScene.gateCallback = {
                        gateEngine.activateCheckpoint(grade: grade)
                        showGate = true
                    }
                    gameScene.gameOverCallback = { score, level in
                        finalScore = score
                        finalLevel = level
                        showGameOver = true
                    }
                    scene = gameScene
                }
                
                StormButton("Exit", icon: "xmark") {
                    onExit()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.85))
    }
}
