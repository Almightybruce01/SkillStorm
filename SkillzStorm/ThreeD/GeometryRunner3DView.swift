import SwiftUI
import SceneKit

// MARK: - Geometry Runner 3D (SceneKit-based 3D runner)

struct GeometryRunner3DView: View {
    let grade: GradeLevel
    let onExit: () -> Void
    
    @StateObject private var gateEngine = KnowledgeGateEngine()
    @State private var scene: SCNScene?
    @State private var score = 0
    @State private var lives = 3
    @State private var level = 1
    @State private var gameOver = false
    @State private var showGate = false
    @State private var timer: Timer?
    @State private var playerNode: SCNNode?
    @State private var cameraNode: SCNNode?
    @State private var distance: Float = 0
    @State private var isRunning = true
    
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
                    DragGesture()
                        .onChanged { value in
                            movePlayer(dx: Float(value.translation.width) * 0.01)
                        }
                )
                .onTapGesture {
                    jumpPlayer()
                }
            }
            
            // HUD Overlay
            VStack {
                HStack {
                    VStack(alignment: .leading) {
                        Text("\(score)m").font(.title.bold()).foregroundColor(.white)
                        Text("Level \(level)").font(.caption.bold()).foregroundColor(StormColors.neonBlue)
                    }
                    Spacer()
                    HStack(spacing: 4) {
                        ForEach(0..<lives, id: \.self) { _ in
                            Image(systemName: "heart.fill").foregroundColor(StormColors.neonPink)
                        }
                    }
                }
                .padding()
                .background(.ultraThinMaterial)
                
                Spacer()
            }
            
            if showGate {
                KnowledgeGateView(engine: gateEngine, grade: grade) { result in
                    showGate = false
                    if result == .correct {
                        level += 1
                        score += 50
                    } else {
                        lives -= 1
                        if lives <= 0 { gameOver = true }
                    }
                    isRunning = true
                }
            }
            
            if gameOver {
                VStack(spacing: 24) {
                    Text("GAME OVER").font(.system(size: 36, weight: .black, design: .rounded)).foregroundStyle(StormColors.fireGradient)
                    Text("🎮").font(.system(size: 60))
                    Text("Distance: \(score)m").font(.title.bold()).foregroundColor(StormColors.neonYellow)
                    
                    VStack(spacing: 12) {
                        StormButton("Retry", icon: "arrow.counterclockwise", gradient: StormColors.heroGradient) {
                            resetGame()
                        }
                        StormButton("Exit", icon: "xmark") {
                            PlayerProgress.shared.recordGamePlayed(gameId: "geometry_runner_3d", score: score)
                            onExit()
                        }
                    }
                }.frame(maxWidth: .infinity, maxHeight: .infinity).background(Color.black.opacity(0.8))
            }
        }
        .onAppear { setupScene() }
        .onDisappear { timer?.invalidate() }
    }
    
    // MARK: - Scene Setup
    
    private func setupScene() {
        let newScene = SCNScene()
        newScene.background.contents = UIColor(red: 0.02, green: 0.02, blue: 0.08, alpha: 1)
        
        // Ambient light
        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light?.type = .ambient
        ambientLight.light?.intensity = 500
        ambientLight.light?.color = UIColor(red: 0.3, green: 0.3, blue: 0.5, alpha: 1)
        newScene.rootNode.addChildNode(ambientLight)
        
        // Directional light
        let dirLight = SCNNode()
        dirLight.light = SCNLight()
        dirLight.light?.type = .directional
        dirLight.light?.intensity = 800
        dirLight.light?.color = UIColor(red: 0.5, green: 0.7, blue: 1.0, alpha: 1)
        dirLight.eulerAngles = SCNVector3(-Float.pi / 3, Float.pi / 4, 0)
        newScene.rootNode.addChildNode(dirLight)
        
        // Ground plane (neon grid)
        let ground = SCNFloor()
        ground.reflectivity = 0.3
        ground.firstMaterial?.diffuse.contents = UIColor(red: 0.02, green: 0.02, blue: 0.06, alpha: 1)
        ground.firstMaterial?.emission.contents = UIColor(red: 0.0, green: 0.1, blue: 0.3, alpha: 1)
        let groundNode = SCNNode(geometry: ground)
        newScene.rootNode.addChildNode(groundNode)
        
        // Grid lines
        for i in -20...20 {
            let lineGeo = SCNBox(width: 0.02, height: 0.01, length: 100, chamferRadius: 0)
            lineGeo.firstMaterial?.diffuse.contents = UIColor(red: 0, green: 0.3, blue: 0.8, alpha: 0.3)
            lineGeo.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.3, blue: 0.8, alpha: 0.3)
            let lineNode = SCNNode(geometry: lineGeo)
            lineNode.position = SCNVector3(Float(i) * 2, 0.01, 0)
            newScene.rootNode.addChildNode(lineNode)
            
            let lineGeo2 = SCNBox(width: 100, height: 0.01, length: 0.02, chamferRadius: 0)
            lineGeo2.firstMaterial?.diffuse.contents = UIColor(red: 0, green: 0.3, blue: 0.8, alpha: 0.3)
            lineGeo2.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.3, blue: 0.8, alpha: 0.3)
            let lineNode2 = SCNNode(geometry: lineGeo2)
            lineNode2.position = SCNVector3(0, 0.01, Float(i) * 2)
            newScene.rootNode.addChildNode(lineNode2)
        }
        
        // Player (glowing cube)
        let playerGeo = SCNBox(width: 0.8, height: 0.8, length: 0.8, chamferRadius: 0.1)
        playerGeo.firstMaterial?.diffuse.contents = UIColor(red: 0, green: 0.6, blue: 1, alpha: 1)
        playerGeo.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.4, blue: 0.8, alpha: 1)
        let player = SCNNode(geometry: playerGeo)
        player.position = SCNVector3(0, 0.5, 0)
        newScene.rootNode.addChildNode(player)
        playerNode = player
        
        // Camera
        let camera = SCNNode()
        camera.camera = SCNCamera()
        camera.camera?.zFar = 200
        camera.camera?.fieldOfView = 70
        camera.position = SCNVector3(0, 5, 8)
        camera.eulerAngles = SCNVector3(-Float.pi / 6, 0, 0)
        newScene.rootNode.addChildNode(camera)
        cameraNode = camera
        
        // Spawn initial obstacles
        spawnObstacles(scene: newScene, from: 10, to: 100)
        
        scene = newScene
        startRunning()
    }
    
    private func spawnObstacles(scene: SCNScene, from startZ: Int, to endZ: Int) {
        for z in stride(from: startZ, to: endZ, by: 5 + Int.random(in: 0...3)) {
            let obstacleType = Int.random(in: 0...3)
            let obstacle: SCNGeometry
            let color: UIColor
            
            switch obstacleType {
            case 0:
                obstacle = SCNPyramid(width: 1.5, height: 2, length: 1.5)
                color = UIColor(red: 1, green: 0.2, blue: 0.4, alpha: 1)
            case 1:
                obstacle = SCNCylinder(radius: 0.5, height: 2)
                color = UIColor(red: 1, green: 0.5, blue: 0, alpha: 1)
            case 2:
                obstacle = SCNSphere(radius: 0.7)
                color = UIColor(red: 0.8, green: 0, blue: 1, alpha: 1)
            default:
                obstacle = SCNBox(width: 1, height: 1, length: 1, chamferRadius: 0)
                color = UIColor(red: 0, green: 0.8, blue: 0.3, alpha: 1)
            }
            
            obstacle.firstMaterial?.diffuse.contents = color
            obstacle.firstMaterial?.emission.contents = color.withAlphaComponent(0.4)
            
            let node = SCNNode(geometry: obstacle)
            node.position = SCNVector3(Float.random(in: -3...3), 0.5, Float(-z))
            node.name = "obstacle"
            scene.rootNode.addChildNode(node)
            
            // Coin nearby
            if Bool.random() {
                let coinGeo = SCNCylinder(radius: 0.3, height: 0.1)
                coinGeo.firstMaterial?.diffuse.contents = UIColor.yellow
                coinGeo.firstMaterial?.emission.contents = UIColor(red: 1, green: 0.9, blue: 0, alpha: 0.5)
                let coinNode = SCNNode(geometry: coinGeo)
                coinNode.position = SCNVector3(Float.random(in: -2...2), 1.5, Float(-z - 2))
                coinNode.name = "coin"
                coinNode.runAction(SCNAction.repeatForever(SCNAction.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 1)))
                scene.rootNode.addChildNode(coinNode)
            }
        }
    }
    
    // MARK: - Game Loop
    
    private func startRunning() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { _ in
            guard isRunning && !gameOver else { return }
            
            let speed: Float = 0.1 + Float(level) * 0.02
            distance += speed
            score = Int(distance * 2)
            
            // Move camera and player forward
            playerNode?.position.z -= speed
            cameraNode?.position.z -= speed
            
            // Check collisions roughly
            checkCollisions()
            
            // Knowledge gate every 100m
            if Int(distance) % 50 == 0 && Int(distance) > 0 && Int(distance * 10) % 500 < 2 {
                isRunning = false
                gateEngine.activateCheckpoint(grade: grade)
                showGate = true
            }
        }
    }
    
    private func checkCollisions() {
        guard let player = playerNode, let scene = scene else { return }
        
        scene.rootNode.enumerateChildNodes { node, _ in
            guard let name = node.name else { return }
            let dist = simd_distance(
                simd_float3(player.position.x, player.position.y, player.position.z),
                simd_float3(node.position.x, node.position.y, node.position.z)
            )
            
            if name == "obstacle" && dist < 1.0 {
                node.removeFromParentNode()
                lives -= 1
                SoundManager.shared.playExplosion()
                if lives <= 0 { gameOver = true; timer?.invalidate() }
            }
            
            if name == "coin" && dist < 1.5 {
                node.removeFromParentNode()
                PlayerProgress.shared.addCoins(5)
                SoundManager.shared.playCoinCollect()
            }
        }
    }
    
    private func movePlayer(dx: Float) {
        guard let player = playerNode else { return }
        let newX = player.position.x + dx
        player.position.x = max(-4, min(4, newX))
    }
    
    private func jumpPlayer() {
        guard let player = playerNode else { return }
        let jumpUp = SCNAction.moveBy(x: 0, y: 2, z: 0, duration: 0.3)
        let jumpDown = SCNAction.moveBy(x: 0, y: -2, z: 0, duration: 0.3)
        jumpUp.timingMode = .easeOut
        jumpDown.timingMode = .easeIn
        player.runAction(SCNAction.sequence([jumpUp, jumpDown]))
    }
    
    private func resetGame() {
        timer?.invalidate()
        score = 0; lives = 3; level = 1; distance = 0; gameOver = false; isRunning = true
        setupScene()
    }
}
