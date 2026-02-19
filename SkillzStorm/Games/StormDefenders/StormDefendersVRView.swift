import SwiftUI
import SceneKit

// ═══════════════════════════════════════════════════════════════
// STORM DEFENDERS VR — 3D Immersive Tower Defense
// Looks down at the battlefield from above — feels like a tabletop war game
// ═══════════════════════════════════════════════════════════════

struct StormDefendersVRView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @State private var scene: SCNScene?
    @State private var cameraNode: SCNNode?
    @State private var score = 0
    @State private var wave = 1
    @State private var lives = 10
    @State private var gameOver = false
    @State private var showQuiz = false
    @State private var quizQuestion: Question?
    @State private var selectedSlot: (row: Int, col: Int)?
    @State private var timer: Timer?
    @State private var defenderNodes: [String: SCNNode] = [:]  // "row_col" -> node
    @State private var zombieNodes: [UUID: SCNNode] = [:]
    @State private var activeZombies: [VRZombie] = []
    @State private var pendingSpawns: [(delay: Double, row: Int)] = []
    @State private var spawnStart: Date = .now
    @State private var waveActive = false
    @State private var showWaveStart = true
    
    private let rows = 5
    private let cols = 9
    private let cellSize: Float = 2.0
    
    var body: some View {
        ZStack {
            if let scene = scene {
                SceneView(
                    scene: scene,
                    pointOfView: cameraNode,
                    options: [.allowsCameraControl, .autoenablesDefaultLighting]
                )
                .ignoresSafeArea()
                .gesture(
                    SpatialTapGesture()
                        .onEnded { value in
                            handleTap(at: value.location)
                        }
                )
            }
            
            // HUD Overlay
            VStack {
                // Top bar
                HStack {
                    Button(action: { onExit() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    Spacer()
                    
                    VStack(spacing: 2) {
                        Text("WAVE \(wave)")
                            .font(.caption.bold())
                            .foregroundColor(StormColors.neonPurple)
                        Text("Score: \(score)")
                            .font(.headline.bold())
                            .foregroundColor(StormColors.neonYellow)
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 2) {
                        ForEach(0..<min(lives, 10), id: \.self) { _ in
                            Image(systemName: "heart.fill")
                                .font(.caption2)
                                .foregroundColor(StormColors.neonPink)
                        }
                    }
                }
                .padding()
                .background(.ultraThinMaterial)
                
                Spacer()
                
                // Bottom instructions
                if !waveActive && !showQuiz && !gameOver {
                    Text("Tap grid cells to place defenders")
                        .font(.caption.bold())
                        .foregroundColor(.white.opacity(0.6))
                        .padding(8)
                        .background(.ultraThinMaterial)
                        .cornerRadius(10)
                        .padding(.bottom, 8)
                }
            }
            
            // Quiz overlay
            if showQuiz, let q = quizQuestion {
                vrQuizOverlay(question: q)
            }
            
            // Wave start
            if showWaveStart {
                vrWaveStartOverlay
            }
            
            // Game over
            if gameOver {
                vrGameOverOverlay
            }
        }
        .onAppear { setupScene() }
        .onDisappear { timer?.invalidate() }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Scene Setup
    // ─────────────────────────────────────────
    
    private func setupScene() {
        let newScene = SCNScene()
        newScene.background.contents = UIColor(red: 0.02, green: 0.04, blue: 0.08, alpha: 1)
        
        // Ambient light
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 400
        ambient.light?.color = UIColor(red: 0.2, green: 0.3, blue: 0.4, alpha: 1)
        newScene.rootNode.addChildNode(ambient)
        
        // Directional light (moonlight feel)
        let dirLight = SCNNode()
        dirLight.light = SCNLight()
        dirLight.light?.type = .directional
        dirLight.light?.intensity = 600
        dirLight.light?.color = UIColor(red: 0.4, green: 0.5, blue: 0.8, alpha: 1)
        dirLight.light?.castsShadow = true
        dirLight.eulerAngles = SCNVector3(-Float.pi / 3, Float.pi / 5, 0)
        newScene.rootNode.addChildNode(dirLight)
        
        // Ground plane (dark grass)
        let groundWidth = Float(cols) * cellSize + 4
        let groundDepth = Float(rows) * cellSize + 4
        let ground = SCNBox(width: CGFloat(groundWidth), height: 0.2, length: CGFloat(groundDepth), chamferRadius: 0)
        ground.firstMaterial?.diffuse.contents = UIColor(red: 0.08, green: 0.15, blue: 0.05, alpha: 1)
        let groundNode = SCNNode(geometry: ground)
        groundNode.position = SCNVector3(groundWidth / 2 - 2, -0.1, groundDepth / 2 - 2)
        newScene.rootNode.addChildNode(groundNode)
        
        // Grid cells
        for row in 0..<rows {
            for col in 0..<cols {
                let isEven = (row + col) % 2 == 0
                let cell = SCNBox(width: CGFloat(cellSize - 0.1), height: 0.05, length: CGFloat(cellSize - 0.1), chamferRadius: 0.02)
                cell.firstMaterial?.diffuse.contents = isEven
                    ? UIColor(red: 0.12, green: 0.22, blue: 0.08, alpha: 1)
                    : UIColor(red: 0.1, green: 0.18, blue: 0.06, alpha: 1)
                let cellNode = SCNNode(geometry: cell)
                cellNode.position = SCNVector3(
                    Float(col) * cellSize + cellSize / 2,
                    0.025,
                    Float(row) * cellSize + cellSize / 2
                )
                cellNode.name = "cell_\(row)_\(col)"
                newScene.rootNode.addChildNode(cellNode)
            }
        }
        
        // Home base wall (left side, glowing blue)
        let wallGeo = SCNBox(width: 0.3, height: 2, length: CGFloat(Float(rows) * cellSize), chamferRadius: 0)
        wallGeo.firstMaterial?.diffuse.contents = UIColor(red: 0, green: 0.4, blue: 1, alpha: 0.6)
        wallGeo.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.3, blue: 0.8, alpha: 0.3)
        let wallNode = SCNNode(geometry: wallGeo)
        wallNode.position = SCNVector3(-0.15, 1, Float(rows) * cellSize / 2)
        newScene.rootNode.addChildNode(wallNode)
        
        // Neon grid lines
        for row in 0...rows {
            let lineGeo = SCNBox(width: CGFloat(Float(cols) * cellSize), height: 0.02, length: 0.03, chamferRadius: 0)
            lineGeo.firstMaterial?.diffuse.contents = UIColor(red: 0, green: 0.5, blue: 0.2, alpha: 0.3)
            lineGeo.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.5, blue: 0.2, alpha: 0.2)
            let lineNode = SCNNode(geometry: lineGeo)
            lineNode.position = SCNVector3(Float(cols) * cellSize / 2, 0.06, Float(row) * cellSize)
            newScene.rootNode.addChildNode(lineNode)
        }
        for col in 0...cols {
            let lineGeo = SCNBox(width: 0.03, height: 0.02, length: CGFloat(Float(rows) * cellSize), chamferRadius: 0)
            lineGeo.firstMaterial?.diffuse.contents = UIColor(red: 0, green: 0.5, blue: 0.2, alpha: 0.3)
            lineGeo.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.5, blue: 0.2, alpha: 0.2)
            let lineNode = SCNNode(geometry: lineGeo)
            lineNode.position = SCNVector3(Float(col) * cellSize, 0.06, Float(rows) * cellSize / 2)
            newScene.rootNode.addChildNode(lineNode)
        }
        
        // Camera (looking down at angle — war room feel)
        let camera = SCNNode()
        camera.camera = SCNCamera()
        camera.camera?.zFar = 200
        camera.camera?.fieldOfView = 55
        camera.position = SCNVector3(Float(cols) * cellSize / 2, 18, Float(rows) * cellSize + 6)
        camera.eulerAngles = SCNVector3(-Float.pi / 3, 0, 0)
        newScene.rootNode.addChildNode(camera)
        cameraNode = camera
        
        // Fog for atmosphere
        newScene.fogStartDistance = 25
        newScene.fogEndDistance = 50
        newScene.fogColor = UIColor(red: 0.02, green: 0.04, blue: 0.08, alpha: 1)
        
        scene = newScene
    }
    
    // ─────────────────────────────────────────
    // MARK: - 3D Entity Creation
    // ─────────────────────────────────────────
    
    private func addDefender3D(type: DefenderType, row: Int, col: Int) {
        guard let scene = scene else { return }
        
        let defNode = SCNNode()
        
        // Base platform
        let base = SCNCylinder(radius: 0.6, height: 0.15)
        base.firstMaterial?.diffuse.contents = UIColor(type.color)
        base.firstMaterial?.emission.contents = UIColor(type.color).withAlphaComponent(0.3)
        let baseNode = SCNNode(geometry: base)
        baseNode.position = SCNVector3(0, 0.075, 0)
        defNode.addChildNode(baseNode)
        
        // Turret body (varies by type)
        let turretGeo: SCNGeometry
        switch type {
        case .brainBlaster, .doubleCannon:
            turretGeo = SCNCylinder(radius: 0.35, height: 1.0)
        case .freezeRay:
            turretGeo = SCNCone(topRadius: 0.2, bottomRadius: 0.4, height: 1.0)
        case .mathMine:
            turretGeo = SCNSphere(radius: 0.4)
        case .wordWall:
            turretGeo = SCNBox(width: 1.2, height: 1.5, length: 0.6, chamferRadius: 0.05)
        case .lightningTower:
            turretGeo = SCNCone(topRadius: 0.05, bottomRadius: 0.35, height: 1.5)
        case .healStation:
            turretGeo = SCNTorus(ringRadius: 0.4, pipeRadius: 0.12)
        case .shieldGen:
            turretGeo = SCNBox(width: 0.5, height: 0.8, length: 0.5, chamferRadius: 0.1)
        case .vocabVine:
            turretGeo = SCNCylinder(radius: 0.15, height: 1.2)
        case .grammarCannon:
            turretGeo = SCNCylinder(radius: 0.4, height: 0.8)
        }
        
        turretGeo.firstMaterial?.diffuse.contents = UIColor(type.color)
        turretGeo.firstMaterial?.emission.contents = UIColor(type.color).withAlphaComponent(0.2)
        let turretNode = SCNNode(geometry: turretGeo)
        turretNode.position = SCNVector3(0, 0.65, 0)
        defNode.addChildNode(turretNode)
        
        // Barrel/top (for shooting types)
        if type.attackSpeed > 0 && type != .vocabVine {
            let barrel = SCNCylinder(radius: 0.08, height: 0.6)
            barrel.firstMaterial?.diffuse.contents = UIColor.darkGray
            let barrelNode = SCNNode(geometry: barrel)
            barrelNode.eulerAngles = SCNVector3(0, 0, Float.pi / 2)
            barrelNode.position = SCNVector3(0.4, 0.8, 0)
            defNode.addChildNode(barrelNode)
        }
        
        defNode.position = SCNVector3(
            Float(col) * cellSize + cellSize / 2,
            0,
            Float(row) * cellSize + cellSize / 2
        )
        defNode.name = "defender_\(row)_\(col)"
        
        // Spawn animation
        defNode.scale = SCNVector3(0, 0, 0)
        defNode.runAction(SCNAction.scale(to: 1.0, duration: 0.3))
        
        scene.rootNode.addChildNode(defNode)
        defenderNodes["\(row)_\(col)"] = defNode
    }
    
    private func spawnZombie3D(type: ZombieType, row: Int) {
        guard let scene = scene else { return }
        
        let zombieId = UUID()
        let zombieNode = SCNNode()
        
        // Body
        let bodyGeo: SCNGeometry
        let bodyColor: UIColor
        let bodyHeight: Float
        
        switch type {
        case .basic:
            bodyGeo = SCNCapsule(capRadius: 0.3, height: 1.2)
            bodyColor = UIColor(red: 0.3, green: 0.5, blue: 0.2, alpha: 1)
            bodyHeight = 0.6
        case .armored:
            bodyGeo = SCNCapsule(capRadius: 0.35, height: 1.3)
            bodyColor = UIColor(red: 0.4, green: 0.4, blue: 0.4, alpha: 1)
            bodyHeight = 0.65
        case .fast:
            bodyGeo = SCNCapsule(capRadius: 0.2, height: 1.0)
            bodyColor = UIColor(red: 0.2, green: 0.7, blue: 0.3, alpha: 1)
            bodyHeight = 0.5
        case .giant:
            bodyGeo = SCNCapsule(capRadius: 0.5, height: 2.0)
            bodyColor = UIColor(red: 0.6, green: 0.2, blue: 0.2, alpha: 1)
            bodyHeight = 1.0
        case .healer:
            bodyGeo = SCNCapsule(capRadius: 0.3, height: 1.2)
            bodyColor = UIColor(red: 0.3, green: 0.8, blue: 0.5, alpha: 1)
            bodyHeight = 0.6
        case .boss:
            bodyGeo = SCNCapsule(capRadius: 0.6, height: 2.5)
            bodyColor = UIColor(red: 0.5, green: 0.0, blue: 0.5, alpha: 1)
            bodyHeight = 1.25
        }
        
        bodyGeo.firstMaterial?.diffuse.contents = bodyColor
        bodyGeo.firstMaterial?.emission.contents = bodyColor.withAlphaComponent(0.15)
        let bodyNode = SCNNode(geometry: bodyGeo)
        bodyNode.position = SCNVector3(0, bodyHeight, 0)
        zombieNode.addChildNode(bodyNode)
        
        // Eyes (glowing red)
        let eyeGeo = SCNSphere(radius: 0.08)
        eyeGeo.firstMaterial?.diffuse.contents = UIColor.red
        eyeGeo.firstMaterial?.emission.contents = UIColor.red
        let eye1 = SCNNode(geometry: eyeGeo)
        eye1.position = SCNVector3(-0.12, bodyHeight + 0.2, -0.25)
        zombieNode.addChildNode(eye1)
        let eye2 = SCNNode(geometry: eyeGeo)
        eye2.position = SCNVector3(0.12, bodyHeight + 0.2, -0.25)
        zombieNode.addChildNode(eye2)
        
        let startX = Float(cols) * cellSize + 2
        zombieNode.position = SCNVector3(
            startX,
            0,
            Float(row) * cellSize + cellSize / 2
        )
        zombieNode.name = "zombie_\(zombieId.uuidString)"
        
        // Walk animation (bob up and down)
        let bob = SCNAction.sequence([
            SCNAction.moveBy(x: 0, y: 0.1, z: 0, duration: 0.3),
            SCNAction.moveBy(x: 0, y: -0.1, z: 0, duration: 0.3)
        ])
        bodyNode.runAction(SCNAction.repeatForever(bob))
        
        scene.rootNode.addChildNode(zombieNode)
        zombieNodes[zombieId] = zombieNode
        
        let vrZombie = VRZombie(id: zombieId, type: type, row: row, x: startX, hp: Int(Double(type.baseHP) * (1.0 + Double(wave - 1) * 0.15)))
        activeZombies.append(vrZombie)
    }
    
    // ─────────────────────────────────────────
    // MARK: - Game Loop
    // ─────────────────────────────────────────
    
    private func startWave() {
        waveActive = true
        showWaveStart = false
        activeZombies = []
        
        // Generate spawns
        pendingSpawns = []
        var delay: Double = 1.0
        let count = 3 + wave * 2
        for _ in 0..<count {
            pendingSpawns.append((delay: delay, row: Int.random(in: 0..<rows)))
            delay += Double.random(in: 1.0...2.5)
        }
        if wave % 5 == 0 {
            pendingSpawns.append((delay: delay + 3, row: Int.random(in: 0..<rows)))
        }
        spawnStart = .now
        
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 20.0, repeats: true) { [self] _ in
            vrTick()
        }
    }
    
    private func vrTick() {
        guard waveActive && !gameOver else { return }
        let dt: Float = 1.0 / 20.0
        let elapsed = Date().timeIntervalSince(spawnStart)
        
        // Spawn
        let toSpawn = pendingSpawns.filter { $0.delay <= elapsed }
        for spawn in toSpawn {
            let type: ZombieType = wave % 5 == 0 && spawn.delay == pendingSpawns.last?.delay ? .boss : [.basic, .basic, .fast, .armored][Int.random(in: 0...3)]
            spawnZombie3D(type: type, row: spawn.row)
        }
        pendingSpawns.removeAll { $0.delay <= elapsed }
        
        // Move zombies
        for i in activeZombies.indices where !activeZombies[i].isDead {
            let speed = Float(activeZombies[i].type.speed) * dt * cellSize
            activeZombies[i].x -= speed
            
            if let node = zombieNodes[activeZombies[i].id] {
                node.position.x = activeZombies[i].x
            }
            
            // Check if reached base
            if activeZombies[i].x < 0 {
                activeZombies[i].isDead = true
                zombieNodes[activeZombies[i].id]?.removeFromParentNode()
                zombieNodes.removeValue(forKey: activeZombies[i].id)
                lives -= 1
                if lives <= 0 {
                    gameOver = true
                    timer?.invalidate()
                    PlayerProgress.shared.recordGamePlayed(gameId: "storm_defenders_vr", score: score)
                }
            }
        }
        
        // Simple auto-combat: defenders damage nearby zombies
        for (key, _) in defenderNodes {
            let parts = key.split(separator: "_")
            guard parts.count == 2, let dRow = Int(parts[0]), let dCol = Int(parts[1]) else { continue }
            
            let defX = Float(dCol) * cellSize + cellSize / 2
            
            for i in activeZombies.indices where !activeZombies[i].isDead {
                let z = activeZombies[i]
                if z.row == dRow && z.x > defX && z.x < defX + Float(4) * cellSize {
                    activeZombies[i].hp -= 2
                    if activeZombies[i].hp <= 0 {
                        activeZombies[i].isDead = true
                        score += z.type.reward * wave
                        PlayerProgress.shared.addCoins(z.type.reward / 2)
                        
                        // Death animation
                        if let node = zombieNodes[z.id] {
                            node.runAction(SCNAction.sequence([
                                SCNAction.group([
                                    SCNAction.scale(to: 0, duration: 0.3),
                                    SCNAction.moveBy(x: 0, y: 1, z: 0, duration: 0.3)
                                ]),
                                SCNAction.removeFromParentNode()
                            ]))
                        }
                        zombieNodes.removeValue(forKey: z.id)
                    }
                    break
                }
            }
        }
        
        // Clean up dead
        activeZombies.removeAll { $0.isDead }
        
        // Check wave end
        if pendingSpawns.isEmpty && activeZombies.isEmpty {
            waveActive = false
            timer?.invalidate()
            wave += 1
            score += wave * 10
            SoundManager.shared.playLevelUp()
            showWaveStart = true
        }
    }
    
    // ─────────────────────────────────────────
    // MARK: - Interaction
    // ─────────────────────────────────────────
    
    private func handleTap(at point: CGPoint) {
        // For simplicity, show quiz to place a defender on a random empty cell
        // In a full VR implementation, this would use hit-testing on the SCNView
        let emptySlots = (0..<rows).flatMap { row in
            (0..<(cols - 1)).compactMap { col -> (Int, Int)? in
                defenderNodes["\(row)_\(col)"] == nil ? (row, col) : nil
            }
        }
        guard let slot = emptySlots.randomElement() else { return }
        selectedSlot = (row: slot.0, col: slot.1)
        quizQuestion = QuestionBank.shared.randomQuestion(for: grade)
        showQuiz = true
    }
    
    // ─────────────────────────────────────────
    // MARK: - Overlays
    // ─────────────────────────────────────────
    
    private func vrQuizOverlay(question: Question) -> some View {
        ZStack {
            Color.black.opacity(0.8).ignoresSafeArea()
            
            VStack(spacing: 16) {
                Text("🧠 PLACE DEFENDER")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(StormColors.neonGreen)
                
                Text("Answer to defend this cell!")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                
                Text(question.prompt)
                    .font(.title3.bold())
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                VStack(spacing: 8) {
                    ForEach(question.choices.indices, id: \.self) { i in
                        Button(action: {
                            showQuiz = false
                            if i == question.correctIndex, let slot = selectedSlot {
                                let type = DefenderType.allCases.filter { $0.baseDamage > 0 || $0.baseHP > 200 }.randomElement() ?? .brainBlaster
                                addDefender3D(type: type, row: slot.row, col: slot.col)
                                SoundManager.shared.playCorrect()
                                PlayerProgress.shared.recordAnswer(correct: true)
                            } else {
                                SoundManager.shared.playIncorrect()
                                PlayerProgress.shared.recordAnswer(correct: false)
                            }
                            selectedSlot = nil
                        }) {
                            Text(question.choices[i])
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(StormColors.surface)
                                .cornerRadius(14)
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Button("Cancel") { showQuiz = false; selectedSlot = nil }
                    .font(.caption).foregroundColor(.white.opacity(0.3))
            }
            .padding(24)
        }
    }
    
    private var vrWaveStartOverlay: some View {
        ZStack {
            Color.black.opacity(0.75).ignoresSafeArea()
            
            VStack(spacing: 20) {
                Text("🧟 WAVE \(wave)")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(StormColors.fireGradient)
                
                Text("Tap the battlefield to place defenders!")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                
                Text("Answer questions correctly to build your defense.")
                    .font(.caption)
                    .foregroundColor(StormColors.neonCyan)
                
                StormButton("START WAVE", icon: "shield.fill", gradient: StormColors.heroGradient) {
                    startWave()
                }
                .pulsing()
            }
        }
    }
    
    private var vrGameOverOverlay: some View {
        ZStack {
            Color.black.opacity(0.85).ignoresSafeArea()
            
            VStack(spacing: 24) {
                Text("BRAIN OVERRUN!")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(StormColors.fireGradient)
                
                Text("🧟💀").font(.system(size: 50))
                
                Text("Wave: \(wave) • Score: \(score)")
                    .font(.title2.bold())
                    .foregroundColor(StormColors.neonYellow)
                
                VStack(spacing: 12) {
                    StormButton("Try Again", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                        resetVR()
                    }
                    StormButton("Exit", icon: "xmark") { onExit() }
                }
            }
        }
    }
    
    private func resetVR() {
        timer?.invalidate()
        score = 0; wave = 1; lives = 10; gameOver = false; waveActive = false
        defenderNodes = [:]
        zombieNodes = [:]
        activeZombies = []
        pendingSpawns = []
        showWaveStart = true
        setupScene()
    }
}

// MARK: - VR Zombie Model

struct VRZombie {
    let id: UUID
    let type: ZombieType
    let row: Int
    var x: Float
    var hp: Int
    var isDead = false
}
