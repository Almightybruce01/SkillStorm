import SpriteKit
import SwiftUI

// MARK: - SkillDash (Geometry Dash Inspired Auto-Runner)

class SkillDashScene: SKScene, SKPhysicsContactDelegate {
    
    var grade: GradeLevel = .k2
    var score = 0
    var coins = 0
    var level = 1
    var distance: CGFloat = 0
    var isGameOver = false
    var gateCallback: (() -> Void)?
    var gameOverCallback: ((Int, Int, Int) -> Void)?
    
    // Player
    private var player: SKShapeNode!
    private var isJumping = false
    private var groundY: CGFloat = 150
    
    // Game state
    private var scrollSpeed: CGFloat = 4
    private var obstacleTimer: TimeInterval = 0
    private var coinTimer: TimeInterval = 0
    private var checkpointDistance: CGFloat = 500
    private var nextCheckpoint: CGFloat = 500
    
    // Physics categories
    private let playerCat: UInt32 = 0x1 << 0
    private let obstacleCat: UInt32 = 0x1 << 1
    private let coinCat: UInt32 = 0x1 << 2
    private let groundCat: UInt32 = 0x1 << 3
    
    // Colors
    private let neonBlue = UIColor(red: 0, green: 0.6, blue: 1, alpha: 1)
    private let neonPurple = UIColor(red: 0.6, green: 0.2, blue: 1, alpha: 1)
    private let neonGreen = UIColor(red: 0, green: 1, blue: 0.5, alpha: 1)
    private let neonPink = UIColor(red: 1, green: 0.2, blue: 0.6, alpha: 1)
    private let neonYellow = UIColor(red: 1, green: 0.9, blue: 0, alpha: 1)
    
    // HUD
    private var scoreLabel: SKLabelNode!
    private var coinLabel: SKLabelNode!
    private var levelLabel: SKLabelNode!
    
    override func didMove(to view: SKView) {
        backgroundColor = UIColor(red: 0.05, green: 0.02, blue: 0.1, alpha: 1)
        physicsWorld.contactDelegate = self
        physicsWorld.gravity = CGVector(dx: 0, dy: -20)
        
        setupGround()
        setupPlayer()
        setupHUD()
        setupBackground()
    }
    
    // MARK: - Setup
    
    private func setupGround() {
        // Ground platform
        let ground = SKShapeNode(rectOf: CGSize(width: size.width * 3, height: 4))
        ground.fillColor = neonBlue
        ground.strokeColor = neonBlue
        ground.glowWidth = 4
        ground.position = CGPoint(x: size.width / 2, y: groundY)
        ground.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: size.width * 3, height: 4))
        ground.physicsBody?.isDynamic = false
        ground.physicsBody?.categoryBitMask = groundCat
        ground.physicsBody?.restitution = 0
        ground.zPosition = 5
        addChild(ground)
        
        // Ground fill below the line
        let groundFill = SKShapeNode(rectOf: CGSize(width: size.width * 3, height: groundY))
        groundFill.fillColor = UIColor(red: 0.03, green: 0.01, blue: 0.08, alpha: 1)
        groundFill.strokeColor = .clear
        groundFill.position = CGPoint(x: size.width / 2, y: groundY / 2)
        groundFill.zPosition = 4
        addChild(groundFill)
        
        // Grid pattern on ground
        for i in stride(from: 0, to: Int(size.width), by: 30) {
            let line = SKShapeNode(rectOf: CGSize(width: 1, height: groundY))
            line.fillColor = neonBlue.withAlphaComponent(0.1)
            line.strokeColor = .clear
            line.position = CGPoint(x: CGFloat(i), y: groundY / 2)
            line.zPosition = 4
            addChild(line)
        }
    }
    
    private func setupPlayer() {
        // Player is a square (Geometry Dash style)
        let size: CGFloat = 36
        player = SKShapeNode(rectOf: CGSize(width: size, height: size), cornerRadius: 4)
        player.fillColor = neonBlue
        player.strokeColor = UIColor(red: 0, green: 0.9, blue: 1, alpha: 1)
        player.lineWidth = 2
        player.glowWidth = 4
        player.position = CGPoint(x: 100, y: groundY + size / 2 + 4)
        player.zPosition = 20
        
        // Face on the cube
        let eye1 = SKShapeNode(circleOfRadius: 3)
        eye1.fillColor = .white
        eye1.strokeColor = .clear
        eye1.position = CGPoint(x: -6, y: 4)
        player.addChild(eye1)
        
        let eye2 = SKShapeNode(circleOfRadius: 3)
        eye2.fillColor = .white
        eye2.strokeColor = .clear
        eye2.position = CGPoint(x: 6, y: 4)
        player.addChild(eye2)
        
        // Physics
        player.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: size, height: size))
        player.physicsBody?.categoryBitMask = playerCat
        player.physicsBody?.contactTestBitMask = obstacleCat | coinCat
        player.physicsBody?.collisionBitMask = groundCat
        player.physicsBody?.isDynamic = true
        player.physicsBody?.allowsRotation = false
        player.physicsBody?.restitution = 0
        player.physicsBody?.friction = 0.5
        
        addChild(player)
    }
    
    private func setupHUD() {
        scoreLabel = SKLabelNode(fontNamed: "AvenirNext-Bold")
        scoreLabel.text = "0m"
        scoreLabel.fontSize = 18
        scoreLabel.fontColor = .white
        scoreLabel.position = CGPoint(x: 60, y: self.size.height - 50)
        scoreLabel.zPosition = 100
        addChild(scoreLabel)
        
        coinLabel = SKLabelNode(fontNamed: "AvenirNext-Bold")
        coinLabel.text = "🪙 0"
        coinLabel.fontSize = 18
        coinLabel.fontColor = neonYellow
        coinLabel.position = CGPoint(x: self.size.width / 2, y: self.size.height - 50)
        coinLabel.zPosition = 100
        addChild(coinLabel)
        
        levelLabel = SKLabelNode(fontNamed: "AvenirNext-Bold")
        levelLabel.text = "LVL 1"
        levelLabel.fontSize = 18
        levelLabel.fontColor = neonBlue
        levelLabel.position = CGPoint(x: self.size.width - 60, y: self.size.height - 50)
        levelLabel.zPosition = 100
        addChild(levelLabel)
    }
    
    private func setupBackground() {
        // Scrolling city silhouette
        for i in 0..<3 {
            createBackgroundLayer(at: CGFloat(i) * size.width, speed: 1.0)
        }
    }
    
    private func createBackgroundLayer(at x: CGFloat, speed: CGFloat) {
        let bg = SKNode()
        bg.name = "bgLayer"
        bg.position = CGPoint(x: x, y: 0)
        bg.zPosition = 1
        
        // Random buildings
        var bx: CGFloat = 0
        while bx < size.width {
            let height = CGFloat.random(in: 60...200)
            let width = CGFloat.random(in: 20...50)
            let building = SKShapeNode(rectOf: CGSize(width: width, height: height))
            building.fillColor = UIColor(red: 0.08, green: 0.04, blue: 0.15, alpha: 1)
            building.strokeColor = neonPurple.withAlphaComponent(0.15)
            building.lineWidth = 1
            building.position = CGPoint(x: bx + width / 2, y: groundY + height / 2)
            bg.addChild(building)
            
            // Windows
            for wy in stride(from: CGFloat(10), to: height - 10, by: 15) {
                for wx in stride(from: CGFloat(-width/2 + 5), to: width/2 - 5, by: 10) {
                    if Bool.random() {
                        let window = SKShapeNode(rectOf: CGSize(width: 4, height: 6))
                        window.fillColor = neonPurple.withAlphaComponent(CGFloat.random(in: 0.1...0.4))
                        window.strokeColor = .clear
                        window.position = CGPoint(x: wx, y: -height/2 + wy)
                        building.addChild(window)
                    }
                }
            }
            
            bx += width + CGFloat.random(in: 5...20)
        }
        
        addChild(bg)
    }
    
    // MARK: - Game Loop
    
    override func update(_ currentTime: TimeInterval) {
        guard !isGameOver else { return }
        
        let dt = 1.0 / 60.0
        distance += scrollSpeed
        score = Int(distance / 10)
        
        // Scroll backgrounds
        enumerateChildNodes(withName: "bgLayer") { node, _ in
            node.position.x -= self.scrollSpeed * 0.5
            if node.position.x < -self.size.width {
                node.position.x += self.size.width * 3
            }
        }
        
        // Scroll obstacles and coins
        enumerateChildNodes(withName: "obstacle") { node, _ in
            node.position.x -= self.scrollSpeed
            if node.position.x < -50 {
                node.removeFromParent()
            }
        }
        
        enumerateChildNodes(withName: "coin") { node, _ in
            node.position.x -= self.scrollSpeed
            if node.position.x < -50 {
                node.removeFromParent()
            }
        }
        
        // Spawn obstacles
        obstacleTimer += dt
        if obstacleTimer >= 1.5 / Double(1 + level / 3) {
            obstacleTimer = 0
            spawnObstacle()
        }
        
        // Spawn coins
        coinTimer += dt
        if coinTimer >= 0.8 {
            coinTimer = 0
            if Bool.random() { spawnCoin() }
        }
        
        // Check for knowledge gate
        if distance >= nextCheckpoint {
            nextCheckpoint += checkpointDistance
            triggerGate()
        }
        
        // Speed increase
        scrollSpeed = 4 + CGFloat(level) * 0.5
        
        // Check if player fell
        if player.position.y < 0 {
            triggerGameOver()
        }
        
        // Update HUD
        scoreLabel.text = "\(score)m"
        coinLabel.text = "🪙 \(coins)"
        levelLabel.text = "LVL \(level)"
        
        // Landing check
        if player.position.y <= groundY + 22 {
            isJumping = false
        }
    }
    
    // MARK: - Obstacles
    
    private func spawnObstacle() {
        let obstacleType = Int.random(in: 0...2)
        
        switch obstacleType {
        case 0: // Spike
            let spike = createSpike()
            spike.position = CGPoint(x: size.width + 50, y: groundY + 20)
            spike.name = "obstacle"
            addChild(spike)
            
        case 1: // Wall
            let height = CGFloat.random(in: 40...80)
            let wall = SKShapeNode(rectOf: CGSize(width: 20, height: height))
            wall.fillColor = neonPink
            wall.strokeColor = neonPink
            wall.glowWidth = 2
            wall.position = CGPoint(x: size.width + 50, y: groundY + height / 2 + 2)
            wall.name = "obstacle"
            wall.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 20, height: height))
            wall.physicsBody?.isDynamic = false
            wall.physicsBody?.categoryBitMask = obstacleCat
            addChild(wall)
            
        default: // Double spike
            let spike1 = createSpike()
            spike1.position = CGPoint(x: size.width + 50, y: groundY + 20)
            spike1.name = "obstacle"
            addChild(spike1)
            
            let spike2 = createSpike()
            spike2.position = CGPoint(x: size.width + 90, y: groundY + 20)
            spike2.name = "obstacle"
            addChild(spike2)
        }
    }
    
    private func createSpike() -> SKShapeNode {
        let path = CGMutablePath()
        path.move(to: CGPoint(x: -15, y: 0))
        path.addLine(to: CGPoint(x: 0, y: 30))
        path.addLine(to: CGPoint(x: 15, y: 0))
        path.closeSubpath()
        
        let spike = SKShapeNode(path: path)
        spike.fillColor = neonPink
        spike.strokeColor = UIColor(red: 1, green: 0.4, blue: 0.7, alpha: 1)
        spike.lineWidth = 2
        spike.glowWidth = 3
        spike.physicsBody = SKPhysicsBody(polygonFrom: path)
        spike.physicsBody?.isDynamic = false
        spike.physicsBody?.categoryBitMask = obstacleCat
        spike.zPosition = 15
        
        return spike
    }
    
    // MARK: - Coins
    
    private func spawnCoin() {
        let coin = SKShapeNode(circleOfRadius: 10)
        coin.fillColor = neonYellow
        coin.strokeColor = UIColor(red: 1, green: 1, blue: 0.3, alpha: 1)
        coin.lineWidth = 2
        coin.glowWidth = 3
        coin.name = "coin"
        coin.position = CGPoint(x: size.width + 30, y: groundY + CGFloat.random(in: 40...180))
        coin.zPosition = 15
        
        coin.physicsBody = SKPhysicsBody(circleOfRadius: 10)
        coin.physicsBody?.isDynamic = false
        coin.physicsBody?.categoryBitMask = coinCat
        
        // Spin
        coin.run(SKAction.repeatForever(
            SKAction.sequence([
                SKAction.scaleX(to: 0.3, duration: 0.3),
                SKAction.scaleX(to: 1.0, duration: 0.3)
            ])
        ))
        
        addChild(coin)
    }
    
    // MARK: - Player Actions
    
    private func jump() {
        guard !isJumping && !isGameOver else { return }
        isJumping = true
        player.physicsBody?.velocity = CGVector(dx: 0, dy: 0)
        player.physicsBody?.applyImpulse(CGVector(dx: 0, dy: 55))
        
        // Rotation effect
        player.run(SKAction.rotate(byAngle: -.pi * 2, duration: 0.5))
    }
    
    // MARK: - Contacts
    
    func didBegin(_ contact: SKPhysicsContact) {
        let masks = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask
        
        if masks == playerCat | obstacleCat {
            triggerGameOver()
        }
        
        if masks == playerCat | coinCat {
            let coinNode = contact.bodyA.categoryBitMask == coinCat ? contact.bodyA.node : contact.bodyB.node
            collectCoin(coinNode)
        }
    }
    
    private func collectCoin(_ node: SKNode?) {
        guard let node = node else { return }
        coins += 1
        PlayerProgress.shared.addCoins(1)
        
        // Collection effect
        let popup = SKLabelNode(fontNamed: "AvenirNext-Bold")
        popup.text = "+1"
        popup.fontSize = 16
        popup.fontColor = neonYellow
        popup.position = node.position
        popup.zPosition = 50
        addChild(popup)
        popup.run(SKAction.group([
            SKAction.moveBy(x: 0, y: 40, duration: 0.5),
            SKAction.fadeOut(withDuration: 0.5)
        ])) {
            popup.removeFromParent()
        }
        
        node.removeFromParent()
    }
    
    // MARK: - Gates
    
    private func triggerGate() {
        isPaused = true
        gateCallback?()
    }
    
    func resumeFromGate(success: Bool) {
        isPaused = false
        if success {
            level += 1
        }
    }
    
    // MARK: - Game Over
    
    private func triggerGameOver() {
        guard !isGameOver else { return }
        isGameOver = true
        
        // Player explosion
        let pos = player.position
        player.removeFromParent()
        
        for _ in 0..<20 {
            let piece = SKShapeNode(rectOf: CGSize(width: 8, height: 8))
            piece.fillColor = neonBlue
            piece.strokeColor = .clear
            piece.position = pos
            piece.zPosition = 50
            
            let angle = CGFloat.random(in: 0...(2 * .pi))
            let dist = CGFloat.random(in: 40...120)
            
            addChild(piece)
            piece.run(SKAction.group([
                SKAction.move(by: CGVector(dx: cos(angle) * dist, dy: sin(angle) * dist), duration: 0.6),
                SKAction.fadeOut(withDuration: 0.6),
                SKAction.rotate(byAngle: .pi * 4, duration: 0.6)
            ])) {
                piece.removeFromParent()
            }
        }
        
        PlayerProgress.shared.recordGamePlayed(gameId: "skilldash", score: score)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            guard let self = self else { return }
            self.gameOverCallback?(self.score, self.coins, self.level)
        }
    }
    
    // MARK: - Touch
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        jump()
    }
}

// MARK: - SwiftUI Wrapper

struct SkillDashGameView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @State private var scene: SkillDashScene?
    @State private var showGate = false
    @State private var showGameOver = false
    @State private var finalScore = 0
    @State private var finalCoins = 0
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
            createScene()
        }
    }
    
    private func createScene() {
        let screenSize = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.screen.bounds.size ?? CGSize(width: 390, height: 844)
        let gameScene = SkillDashScene(size: screenSize)
        gameScene.scaleMode = .resizeFill
        gameScene.grade = grade
        gameScene.gateCallback = {
            gateEngine.activateCheckpoint(grade: grade)
            showGate = true
        }
        gameScene.gameOverCallback = { score, coins, level in
            finalScore = score
            finalCoins = coins
            finalLevel = level
            showGameOver = true
        }
        scene = gameScene
    }
    
    private var gameOverOverlay: some View {
        VStack(spacing: 24) {
            Text("GAME OVER")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(StormColors.fireGradient)
            
            Text("💨")
                .font(.system(size: 60))
            
            HStack(spacing: 30) {
                VStack {
                    Text("\(finalScore)m")
                        .font(.title.bold())
                        .foregroundColor(StormColors.neonBlue)
                    Text("Distance")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
                VStack {
                    Text("\(finalCoins)")
                        .font(.title.bold())
                        .foregroundColor(StormColors.neonYellow)
                    Text("Coins")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
                VStack {
                    Text("Lv.\(finalLevel)")
                        .font(.title.bold())
                        .foregroundColor(StormColors.neonGreen)
                    Text("Level")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
            }
            
            VStack(spacing: 12) {
                StormButton("Try Again", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                    showGameOver = false
                    createScene()
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
