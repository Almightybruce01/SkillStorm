import Foundation
import Combine

class QuestionBank: ObservableObject {
    
    static let shared = QuestionBank()
    private var allQuestions: [Question] = []
    
    init() {
        loadAllQuestions()
    }
    
    // MARK: - Query Methods
    
    func questions(for grade: GradeLevel) -> [Question] {
        allQuestions.filter { $0.gradeLevel == grade.rawValue }
    }
    
    func questions(for grade: GradeLevel, type: QuestionType) -> [Question] {
        allQuestions.filter { $0.gradeLevel == grade.rawValue && $0.type == type }
    }
    
    func randomQuestion(for grade: GradeLevel) -> Question {
        let gradeQs = questions(for: grade)
        return gradeQs.randomElement() ?? allQuestions.randomElement()!
    }
    
    func randomQuestion(for grade: GradeLevel, type: QuestionType) -> Question {
        let filtered = questions(for: grade, type: type)
        return filtered.randomElement() ?? randomQuestion(for: grade)
    }
    
    func randomQuestions(for grade: GradeLevel, count: Int) -> [Question] {
        let gradeQs = questions(for: grade).shuffled()
        return Array(gradeQs.prefix(count))
    }
    
    func bossQuestions(for grade: GradeLevel) -> BossQuestion {
        let qs = randomQuestions(for: grade, count: 3)
        return BossQuestion(
            id: UUID().uuidString,
            title: "BOSS GATE",
            questions: qs,
            bonusPoints: 100,
            timeLimit: 45
        )
    }
    
    // MARK: - Dynamic Question Generator
    
    func generateMathQuestion(for grade: GradeLevel) -> Question {
        switch grade {
        case .k2:
            let a = Int.random(in: 1...10)
            let b = Int.random(in: 1...10)
            let answer = a + b
            let wrong1 = answer + Int.random(in: 1...3)
            let wrong2 = max(1, answer - Int.random(in: 1...3))
            let wrong3 = answer + Int.random(in: 4...6)
            let choices = ["\(answer)", "\(wrong1)", "\(wrong2)", "\(wrong3)"].shuffled()
            let correctIdx = choices.firstIndex(of: "\(answer)")!
            return Question(id: UUID().uuidString, type: .math, gradeLevel: grade.rawValue, prompt: "What is \(a) + \(b)?", choices: choices, correctIndex: correctIdx, difficulty: 1, points: 10)
            
        case .three5:
            let a = Int.random(in: 2...12)
            let b = Int.random(in: 2...12)
            let answer = a * b
            let wrong1 = answer + Int.random(in: 1...10)
            let wrong2 = max(1, answer - Int.random(in: 1...10))
            let wrong3 = (a + 1) * b
            let choices = ["\(answer)", "\(wrong1)", "\(wrong2)", "\(wrong3)"].shuffled()
            let correctIdx = choices.firstIndex(of: "\(answer)")!
            return Question(id: UUID().uuidString, type: .math, gradeLevel: grade.rawValue, prompt: "What is \(a) × \(b)?", choices: choices, correctIndex: correctIdx, difficulty: 3, points: 15)
            
        case .six8:
            let a = Int.random(in: 2...8)
            let x = a * Int.random(in: 2...5)
            let prompt = "If \(a)x = \(a * x), then x = ?"
            let choices = ["\(x)", "\(x+1)", "\(x-1)", "\(x*2)"].shuffled()
            let correctIdx = choices.firstIndex(of: "\(x)")!
            return Question(id: UUID().uuidString, type: .algebra, gradeLevel: grade.rawValue, prompt: prompt, choices: choices, correctIndex: correctIdx, difficulty: 5, explanation: "\(a)x = \(a * x), divide both sides by \(a), x = \(x)", points: 20)
            
        case .nine12:
            let a = Int.random(in: 1...5)
            let b = Int.random(in: 1...10)
            let prompt = "Factor: x² + \(a + b)x + \(a * b)"
            let choices = ["(x + \(a))(x + \(b))", "(x - \(a))(x - \(b))", "(x + \(a))(x - \(b))", "(x + \(a*b))(x + 1)"].shuffled()
            let correctIdx = choices.firstIndex(of: "(x + \(a))(x + \(b))")!
            return Question(id: UUID().uuidString, type: .algebra, gradeLevel: grade.rawValue, prompt: prompt, choices: choices, correctIndex: correctIdx, difficulty: 8, points: 30)
        }
    }
    
    // MARK: - Load Static Questions
    
    private func loadAllQuestions() {
        allQuestions = []
        allQuestions.append(contentsOf: k2Questions())
        allQuestions.append(contentsOf: three5Questions())
        allQuestions.append(contentsOf: six8Questions())
        allQuestions.append(contentsOf: nine12Questions())
    }
    
    // ═══════════════════════════════════════════
    // K-2 QUESTIONS
    // ═══════════════════════════════════════════
    
    private func k2Questions() -> [Question] {
        let g = "K-2"
        return [
            // Math
            Question(id: "k2_m1", type: .math, gradeLevel: g, prompt: "What is 2 + 3?", choices: ["4","5","6","3"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_m2", type: .math, gradeLevel: g, prompt: "What is 5 + 4?", choices: ["8","10","9","7"], correctIndex: 2, difficulty: 1, points: 10),
            Question(id: "k2_m3", type: .math, gradeLevel: g, prompt: "What is 7 - 3?", choices: ["5","3","4","2"], correctIndex: 2, difficulty: 1, points: 10),
            Question(id: "k2_m4", type: .math, gradeLevel: g, prompt: "What is 10 - 6?", choices: ["4","5","3","6"], correctIndex: 0, difficulty: 1, points: 10),
            Question(id: "k2_m5", type: .math, gradeLevel: g, prompt: "What is 3 + 3?", choices: ["5","7","6","8"], correctIndex: 2, difficulty: 1, points: 10),
            Question(id: "k2_m6", type: .math, gradeLevel: g, prompt: "What is 8 + 2?", choices: ["10","9","11","8"], correctIndex: 0, difficulty: 1, points: 10),
            Question(id: "k2_m7", type: .math, gradeLevel: g, prompt: "What is 6 - 2?", choices: ["3","5","4","2"], correctIndex: 2, difficulty: 1, points: 10),
            Question(id: "k2_m8", type: .math, gradeLevel: g, prompt: "What is 1 + 9?", choices: ["11","10","9","8"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_m9", type: .math, gradeLevel: g, prompt: "Which number is bigger: 7 or 4?", choices: ["4","7","Same","Neither"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_m10", type: .math, gradeLevel: g, prompt: "Count: 2, 4, 6, __?", choices: ["7","9","8","10"], correctIndex: 2, difficulty: 2, points: 15),
            
            // Vocabulary
            Question(id: "k2_v1", type: .vocabulary, gradeLevel: g, prompt: "What is the opposite of HOT?", choices: ["Warm","Cold","Big","Fast"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_v2", type: .vocabulary, gradeLevel: g, prompt: "What is the opposite of BIG?", choices: ["Tall","Small","Wide","Long"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_v3", type: .vocabulary, gradeLevel: g, prompt: "Which word means HAPPY?", choices: ["Sad","Angry","Glad","Tired"], correctIndex: 2, difficulty: 1, points: 10),
            Question(id: "k2_v4", type: .vocabulary, gradeLevel: g, prompt: "A cat is a type of:", choices: ["Plant","Animal","Food","Toy"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_v5", type: .vocabulary, gradeLevel: g, prompt: "Which word rhymes with CAT?", choices: ["Dog","Hat","Cup","Run"], correctIndex: 1, difficulty: 1, points: 10),
            
            // Grammar
            Question(id: "k2_g1", type: .grammar, gradeLevel: g, prompt: "Which sentence is correct?", choices: ["i like dogs","I like dogs","i Like Dogs","I like Dogs"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_g2", type: .grammar, gradeLevel: g, prompt: "What goes at the end of a sentence?", choices: ["Comma","Period","Star","Nothing"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_g3", type: .grammar, gradeLevel: g, prompt: "Which is a complete sentence?", choices: ["The dog.","Running fast.","The dog runs.","Dog runs fast the."], correctIndex: 2, difficulty: 2, points: 15),
            
            // Science
            Question(id: "k2_s1", type: .science, gradeLevel: g, prompt: "What do plants need to grow?", choices: ["Candy","Water and sunlight","Toys","Darkness"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_s2", type: .science, gradeLevel: g, prompt: "How many legs does a spider have?", choices: ["6","4","8","10"], correctIndex: 2, difficulty: 1, points: 10),
            Question(id: "k2_s3", type: .science, gradeLevel: g, prompt: "What is the closest star to Earth?", choices: ["Moon","Mars","The Sun","Jupiter"], correctIndex: 2, difficulty: 2, points: 15),
            
            // Logic
            Question(id: "k2_l1", type: .logic, gradeLevel: g, prompt: "What comes next? 🔴🔵🔴🔵🔴__", choices: ["🔴","🔵","🟢","🟡"], correctIndex: 1, difficulty: 1, points: 10),
            Question(id: "k2_l2", type: .logic, gradeLevel: g, prompt: "If all dogs bark, and Spot is a dog, does Spot bark?", choices: ["Yes","No","Maybe","Sometimes"], correctIndex: 0, difficulty: 2, points: 15),
        ]
    }
    
    // ═══════════════════════════════════════════
    // 3-5 QUESTIONS
    // ═══════════════════════════════════════════
    
    private func three5Questions() -> [Question] {
        let g = "3-5"
        return [
            // Math
            Question(id: "35_m1", type: .math, gradeLevel: g, prompt: "What is 12 × 8?", choices: ["84","96","88","108"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_m2", type: .math, gradeLevel: g, prompt: "What is 144 ÷ 12?", choices: ["11","13","12","10"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_m3", type: .math, gradeLevel: g, prompt: "What is ½ + ¼?", choices: ["¾","½","⅓","1"], correctIndex: 0, difficulty: 4, points: 20),
            Question(id: "35_m4", type: .math, gradeLevel: g, prompt: "What is 25% of 80?", choices: ["15","20","25","40"], correctIndex: 1, difficulty: 4, points: 20),
            Question(id: "35_m5", type: .math, gradeLevel: g, prompt: "What is 7 × 9?", choices: ["56","72","63","54"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_m6", type: .math, gradeLevel: g, prompt: "Round 4,567 to the nearest hundred.", choices: ["4,500","4,600","4,570","5,000"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_m7", type: .math, gradeLevel: g, prompt: "What is the perimeter of a square with side 5?", choices: ["10","15","20","25"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_m8", type: .math, gradeLevel: g, prompt: "What is 3/5 as a decimal?", choices: ["0.35","0.6","0.53","0.3"], correctIndex: 1, difficulty: 4, points: 20),
            Question(id: "35_m9", type: .math, gradeLevel: g, prompt: "15 × 15 = ?", choices: ["215","225","235","200"], correctIndex: 1, difficulty: 4, points: 20),
            Question(id: "35_m10", type: .math, gradeLevel: g, prompt: "What is the area of a rectangle 8 × 5?", choices: ["26","35","40","45"], correctIndex: 2, difficulty: 3, points: 15),
            
            // Vocabulary
            Question(id: "35_v1", type: .vocabulary, gradeLevel: g, prompt: "Choose the synonym for QUICK:", choices: ["Slow","Fast","Heavy","Late"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_v2", type: .vocabulary, gradeLevel: g, prompt: "What does ENORMOUS mean?", choices: ["Tiny","Very large","Medium","Normal"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_v3", type: .vocabulary, gradeLevel: g, prompt: "What is the antonym of BRAVE?", choices: ["Strong","Cowardly","Smart","Fast"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_v4", type: .vocabulary, gradeLevel: g, prompt: "What does ANCIENT mean?", choices: ["New","Very old","Shiny","Small"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_v5", type: .vocabulary, gradeLevel: g, prompt: "Choose the synonym for FURIOUS:", choices: ["Happy","Calm","Angry","Sleepy"], correctIndex: 2, difficulty: 3, points: 15),
            
            // Grammar
            Question(id: "35_g1", type: .grammar, gradeLevel: g, prompt: "Fix the punctuation:", choices: ["Lets go","Let's go","Lets' go","Let s go"], correctIndex: 1, difficulty: 3, points: 15),
            Question(id: "35_g2", type: .grammar, gradeLevel: g, prompt: "Which is the correct plural?", choices: ["Childs","Childrens","Children","Childs'"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_g3", type: .grammar, gradeLevel: g, prompt: "Choose the correct verb: She ___ to school.", choices: ["goed","go","goes","going"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_g4", type: .grammar, gradeLevel: g, prompt: "Identify the noun: 'The dog ran fast.'", choices: ["ran","fast","The","dog"], correctIndex: 3, difficulty: 3, points: 15),
            Question(id: "35_g5", type: .grammar, gradeLevel: g, prompt: "Which sentence uses a comma correctly?", choices: ["I like, dogs","I like dogs, cats, and fish","I, like dogs","I like dogs cats and, fish"], correctIndex: 1, difficulty: 4, points: 20),
            
            // Science
            Question(id: "35_s1", type: .science, gradeLevel: g, prompt: "What is the largest planet in our solar system?", choices: ["Saturn","Earth","Jupiter","Mars"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_s2", type: .science, gradeLevel: g, prompt: "What type of animal is a frog?", choices: ["Mammal","Reptile","Amphibian","Fish"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_s3", type: .science, gradeLevel: g, prompt: "What is H₂O?", choices: ["Oxygen","Carbon","Water","Hydrogen"], correctIndex: 2, difficulty: 3, points: 15),
            Question(id: "35_s4", type: .science, gradeLevel: g, prompt: "How many bones does an adult human have?", choices: ["106","206","306","156"], correctIndex: 1, difficulty: 4, points: 20),
            Question(id: "35_s5", type: .science, gradeLevel: g, prompt: "Which force pulls objects toward Earth?", choices: ["Magnetism","Friction","Gravity","Wind"], correctIndex: 2, difficulty: 3, points: 15),
            
            // Logic
            Question(id: "35_l1", type: .logic, gradeLevel: g, prompt: "What comes next? 2, 4, 8, 16, __", choices: ["20","24","32","30"], correctIndex: 2, difficulty: 4, points: 20),
            Question(id: "35_l2", type: .logic, gradeLevel: g, prompt: "If A=1, B=2, C=3, what is A+B+C?", choices: ["5","6","7","8"], correctIndex: 1, difficulty: 3, points: 15),
        ]
    }
    
    // ═══════════════════════════════════════════
    // 6-8 QUESTIONS
    // ═══════════════════════════════════════════
    
    private func six8Questions() -> [Question] {
        let g = "6-8"
        return [
            // Algebra
            Question(id: "68_a1", type: .algebra, gradeLevel: g, prompt: "Solve: 3x + 5 = 20", choices: ["3","5","7","4"], correctIndex: 1, difficulty: 5, explanation: "3x = 15, x = 5", points: 20),
            Question(id: "68_a2", type: .algebra, gradeLevel: g, prompt: "Solve: 2(x - 3) = 10", choices: ["5","6","7","8"], correctIndex: 3, difficulty: 5, explanation: "2x - 6 = 10, 2x = 16, x = 8", points: 20),
            Question(id: "68_a3", type: .algebra, gradeLevel: g, prompt: "What is the value of x if x/4 = 7?", choices: ["24","28","32","21"], correctIndex: 1, difficulty: 5, points: 20),
            Question(id: "68_a4", type: .algebra, gradeLevel: g, prompt: "Simplify: 5x + 3x - 2x", choices: ["6x","8x","4x","10x"], correctIndex: 0, difficulty: 5, points: 20),
            Question(id: "68_a5", type: .algebra, gradeLevel: g, prompt: "Solve: -4 + x = 12", choices: ["8","16","14","12"], correctIndex: 1, difficulty: 5, points: 20),
            
            // Geometry
            Question(id: "68_geo1", type: .geometry, gradeLevel: g, prompt: "What is the area of a triangle with base 10 and height 6?", choices: ["60","30","16","36"], correctIndex: 1, difficulty: 5, explanation: "A = ½ × b × h = ½ × 10 × 6 = 30", points: 20),
            Question(id: "68_geo2", type: .geometry, gradeLevel: g, prompt: "How many degrees in a triangle?", choices: ["90°","180°","270°","360°"], correctIndex: 1, difficulty: 5, points: 20),
            Question(id: "68_geo3", type: .geometry, gradeLevel: g, prompt: "What is the circumference of a circle with radius 7? (π ≈ 3.14)", choices: ["21.98","43.96","153.86","14"], correctIndex: 1, difficulty: 6, points: 25),
            
            // Vocabulary
            Question(id: "68_v1", type: .vocabulary, gradeLevel: g, prompt: "What does AMBIGUOUS mean?", choices: ["Clear","Uncertain","Angry","Beautiful"], correctIndex: 1, difficulty: 5, points: 20),
            Question(id: "68_v2", type: .vocabulary, gradeLevel: g, prompt: "Choose the synonym for BENEVOLENT:", choices: ["Cruel","Kind","Lazy","Nervous"], correctIndex: 1, difficulty: 5, points: 20),
            Question(id: "68_v3", type: .vocabulary, gradeLevel: g, prompt: "What does INEVITABLE mean?", choices: ["Avoidable","Impossible","Certain to happen","Surprising"], correctIndex: 2, difficulty: 6, points: 25),
            Question(id: "68_v4", type: .vocabulary, gradeLevel: g, prompt: "What is the antonym of ELOQUENT?", choices: ["Inarticulate","Graceful","Powerful","Smooth"], correctIndex: 0, difficulty: 6, points: 25),
            
            // Grammar
            Question(id: "68_g1", type: .grammar, gradeLevel: g, prompt: "Choose the correct word: Their/There/They're going to the park.", choices: ["Their","There","They're","Theyre"], correctIndex: 2, difficulty: 5, points: 20),
            Question(id: "68_g2", type: .grammar, gradeLevel: g, prompt: "Identify the adverb: 'She ran quickly.'", choices: ["She","ran","quickly","the"], correctIndex: 2, difficulty: 5, points: 20),
            Question(id: "68_g3", type: .grammar, gradeLevel: g, prompt: "Which sentence is in passive voice?", choices: ["The dog bit the man.","The man was bitten by the dog.","The dog is biting.","Dogs bite people."], correctIndex: 1, difficulty: 6, points: 25),
            
            // Science
            Question(id: "68_s1", type: .science, gradeLevel: g, prompt: "What is the chemical symbol for gold?", choices: ["Go","Gd","Au","Ag"], correctIndex: 2, difficulty: 5, points: 20),
            Question(id: "68_s2", type: .science, gradeLevel: g, prompt: "What organelle is the powerhouse of the cell?", choices: ["Nucleus","Ribosome","Mitochondria","Golgi body"], correctIndex: 2, difficulty: 5, points: 20),
            Question(id: "68_s3", type: .science, gradeLevel: g, prompt: "What is Newton's 1st Law about?", choices: ["Gravity","Inertia","Acceleration","Reaction"], correctIndex: 1, difficulty: 6, points: 25),
            
            // Logic
            Question(id: "68_l1", type: .logic, gradeLevel: g, prompt: "If all roses are flowers and some flowers fade quickly, which is true?", choices: ["All roses fade quickly","Some roses may fade quickly","No roses fade","Roses aren't flowers"], correctIndex: 1, difficulty: 6, points: 25),
            Question(id: "68_l2", type: .logic, gradeLevel: g, prompt: "What is the next prime number after 13?", choices: ["14","15","17","19"], correctIndex: 2, difficulty: 5, points: 20),
        ]
    }
    
    // ═══════════════════════════════════════════
    // 9-12 QUESTIONS
    // ═══════════════════════════════════════════
    
    private func nine12Questions() -> [Question] {
        let g = "9-12"
        return [
            // Algebra
            Question(id: "912_a1", type: .algebra, gradeLevel: g, prompt: "Factor: x² + 5x + 6", choices: ["(x+2)(x+3)","(x+1)(x+6)","(x-2)(x-3)","(x+5)(x+1)"], correctIndex: 0, difficulty: 8, explanation: "Find two numbers that multiply to 6 and add to 5: 2 and 3", points: 30),
            Question(id: "912_a2", type: .algebra, gradeLevel: g, prompt: "Solve: x² - 9 = 0", choices: ["x = ±3","x = 3","x = 9","x = ±9"], correctIndex: 0, difficulty: 8, points: 30),
            Question(id: "912_a3", type: .algebra, gradeLevel: g, prompt: "What is the slope of y = 3x - 7?", choices: ["7","3","-7","-3"], correctIndex: 1, difficulty: 7, points: 25),
            Question(id: "912_a4", type: .algebra, gradeLevel: g, prompt: "Simplify: (2x³)(3x²)", choices: ["5x⁵","6x⁵","6x⁶","5x⁶"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_a5", type: .algebra, gradeLevel: g, prompt: "Solve: |2x - 4| = 8", choices: ["x = 6 or x = -2","x = 6","x = -2","x = 4"], correctIndex: 0, difficulty: 9, points: 35),
            
            // Statistics
            Question(id: "912_st1", type: .statistics, gradeLevel: g, prompt: "Find the median: 3, 7, 9, 12, 15", choices: ["7","9","12","10"], correctIndex: 1, difficulty: 7, points: 25),
            Question(id: "912_st2", type: .statistics, gradeLevel: g, prompt: "What is the standard deviation measuring?", choices: ["Center","Spread","Shape","Outliers"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_st3", type: .statistics, gradeLevel: g, prompt: "A coin is flipped 3 times. P(all heads)?", choices: ["1/2","1/4","1/8","1/6"], correctIndex: 2, difficulty: 8, points: 30),
            
            // Vocabulary (SAT Level)
            Question(id: "912_v1", type: .vocabulary, gradeLevel: g, prompt: "What does UBIQUITOUS mean?", choices: ["Rare","Present everywhere","Unique","Ancient"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_v2", type: .vocabulary, gradeLevel: g, prompt: "Choose the synonym for EPHEMERAL:", choices: ["Eternal","Fleeting","Solid","Bright"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_v3", type: .vocabulary, gradeLevel: g, prompt: "What does PRAGMATIC mean?", choices: ["Idealistic","Practical","Dramatic","Artistic"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_v4", type: .vocabulary, gradeLevel: g, prompt: "SYCOPHANT means:", choices: ["A prophet","A healer","A flatterer","A leader"], correctIndex: 2, difficulty: 9, points: 35),
            Question(id: "912_v5", type: .vocabulary, gradeLevel: g, prompt: "RECALCITRANT means:", choices: ["Obedient","Stubbornly resistant","Calculating","Peaceful"], correctIndex: 1, difficulty: 9, points: 35),
            
            // Chemistry
            Question(id: "912_c1", type: .chemistry, gradeLevel: g, prompt: "What is the atomic number of Carbon?", choices: ["4","6","8","12"], correctIndex: 1, difficulty: 7, points: 25),
            Question(id: "912_c2", type: .chemistry, gradeLevel: g, prompt: "Balance: _H₂ + _O₂ → _H₂O", choices: ["1,1,1","2,1,2","2,2,2","1,2,1"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_c3", type: .chemistry, gradeLevel: g, prompt: "What type of bond shares electrons?", choices: ["Ionic","Covalent","Metallic","Hydrogen"], correctIndex: 1, difficulty: 7, points: 25),
            
            // Physics
            Question(id: "912_p1", type: .physics, gradeLevel: g, prompt: "F = ma. If m=5kg and a=3m/s², F=?", choices: ["8N","15N","2N","1.67N"], correctIndex: 1, difficulty: 7, points: 25),
            Question(id: "912_p2", type: .physics, gradeLevel: g, prompt: "What is the speed of light (approx)?", choices: ["300 km/s","3,000 km/s","300,000 km/s","30,000 km/s"], correctIndex: 2, difficulty: 7, points: 25),
            
            // Finance
            Question(id: "912_f1", type: .finance, gradeLevel: g, prompt: "You invest $1000 at 5% annual interest. After 1 year?", choices: ["$1,005","$1,050","$1,500","$1,100"], correctIndex: 1, difficulty: 7, points: 25),
            Question(id: "912_f2", type: .finance, gradeLevel: g, prompt: "If a stock drops 20% from $50, new price?", choices: ["$30","$45","$40","$35"], correctIndex: 2, difficulty: 7, points: 25),
            Question(id: "912_f3", type: .finance, gradeLevel: g, prompt: "What is compound interest?", choices: ["Interest on principal only","Interest on principal + accumulated interest","A type of loan","A tax"], correctIndex: 1, difficulty: 8, points: 30),
            Question(id: "912_f4", type: .finance, gradeLevel: g, prompt: "Inflation causes prices to:", choices: ["Decrease","Stay the same","Increase","Fluctuate randomly"], correctIndex: 2, difficulty: 7, points: 25),
            
            // Logic
            Question(id: "912_l1", type: .logic, gradeLevel: g, prompt: "If P → Q and Q → R, then:", choices: ["P → R","R → P","P → Q only","No conclusion"], correctIndex: 0, difficulty: 8, points: 30),
            Question(id: "912_l2", type: .logic, gradeLevel: g, prompt: "What is the contrapositive of 'If it rains, the ground is wet'?", choices: ["If ground is wet, it rained","If no rain, ground is dry","If ground is not wet, it didn't rain","None of these"], correctIndex: 2, difficulty: 9, points: 35),
        ]
    }
}
