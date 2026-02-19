/* ═══════════════════════════════════════════════════════════
   EDUCATIONAL GAME DATA
   55 educational games across 8 subjects
   Premium descriptions & themed cover art
   ═══════════════════════════════════════════════════════════ */

export type Subject = 'math' | 'science' | 'reading' | 'vocabulary' | 'history' | 'geography' | 'coding' | 'art';

export interface GameDef {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  engine: string;
  icon: string;
  grades: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  coverGradient: string;
  coverScene?: string;
}

export type EducationalGame = GameDef;

// Cover art gradient fallbacks with unique color pairs per game
const g = {
  pinkPurple: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  blueGreen: 'linear-gradient(135deg, #3b82f6, #10b981)',
  orangeRed: 'linear-gradient(135deg, #f97316, #ef4444)',
  purpleBlue: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
  greenTeal: 'linear-gradient(135deg, #22c55e, #14b8a6)',
  yellowOrange: 'linear-gradient(135deg, #eab308, #f97316)',
  cyanBlue: 'linear-gradient(135deg, #06b6d4, #6366f1)',
  roseRed: 'linear-gradient(135deg, #f43f5e, #dc2626)',
  tealCyan: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
  indigoViolet: 'linear-gradient(135deg, #6366f1, #7c3aed)',
  limeGreen: 'linear-gradient(135deg, #84cc16, #22c55e)',
  amberYellow: 'linear-gradient(135deg, #f59e0b, #eab308)',
  skyIndigo: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  fuchsiaPink: 'linear-gradient(135deg, #d946ef, #ec4899)',
  emeraldTeal: 'linear-gradient(135deg, #10b981, #14b8a6)',
};

export const GAMES: GameDef[] = [
  // ── MATH (12 games) ──
  {
    id: 'multiplication_meteors',
    title: 'Multiplication Meteors',
    description: 'Blazing meteors hurtle toward Earth — blast them by solving multiplication problems before impact! Fast-paced space combat meets arithmetic mastery in this adrenaline-pumping math adventure.',
    subject: 'math', engine: 'SpaceShooter', icon: '☄️', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.purpleBlue,
  },
  {
    id: 'fraction_frenzy',
    title: 'Fraction Frenzy',
    description: 'Step into a chaotic kitchen where pizzas and pies need slicing! Master fractions by cutting food into precise portions as orders fly in faster and faster. Every cut counts!',
    subject: 'math', engine: 'BalloonPop', icon: '🍕', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.orangeRed,
  },
  {
    id: 'algebra_blaster',
    title: 'Algebra Blaster',
    description: 'Enter a neon-lit cyber arena where solving equations is your weapon. Defeat the math boss by cracking algebraic expressions — from simple linear equations to complex quadratics.',
    subject: 'math', engine: 'SpaceShooter', icon: '🔢', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.cyanBlue,
  },
  {
    id: 'geometry_dash_edu',
    title: 'Geometry Dash',
    description: 'Jump, flip, and fly through obstacle courses built from geometric shapes. Identify angles, calculate areas, and recognize patterns while racing through increasingly complex levels.',
    subject: 'math', engine: 'DashRunner', icon: '📐', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.blueGreen,
  },
  {
    id: 'number_ninja',
    title: 'Number Ninja',
    description: 'Channel your inner warrior and slash through numbers with lightning-speed arithmetic! Addition, subtraction, and early multiplication fly at you — react fast to earn the highest combo.',
    subject: 'math', engine: 'TargetRange', icon: '🥷', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.roseRed,
  },
  {
    id: 'math_defense',
    title: 'Math Defense',
    description: 'Build powerful towers and fortifications to defend your castle against waves of math-themed enemies. Solve problems correctly to upgrade weapons and unlock devastating special abilities.',
    subject: 'math', engine: 'ZombieDefense', icon: '🏰', grades: ['3-5', '6-8'], difficulty: 'hard', coverGradient: g.greenTeal,
  },
  {
    id: 'decimal_dash',
    title: 'Decimal Dash',
    description: 'Sprint through a vibrant racecourse where decimal challenges are your hurdles. Compare, order, and calculate with decimals at breakneck speed to cross the finish line first.',
    subject: 'math', engine: 'DashRunner', icon: '🏃', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.yellowOrange,
  },
  {
    id: 'division_duel',
    title: 'Division Duel',
    description: 'Face off against a cunning AI opponent in rapid-fire division rounds. Each correct answer powers up your attacks while wrong answers give your rival the advantage. Think fast!',
    subject: 'math', engine: 'SpeedQuiz', icon: '⚔️', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.indigoViolet,
  },
  {
    id: 'percentage_pop',
    title: 'Percentage Pop',
    description: 'Colorful balloons float upward carrying percentage problems — pop the correct ones before they escape! Convert fractions, calculate discounts, and master percentages through play.',
    subject: 'math', engine: 'BalloonPop', icon: '🎈', grades: ['6-8', '9-12'], difficulty: 'medium', coverGradient: g.fuchsiaPink,
  },
  {
    id: 'calculus_cosmos',
    title: 'Calculus Cosmos',
    description: 'Navigate through the cosmos solving derivatives, integrals, and limits to chart your course between galaxies. A visually stunning space adventure that makes calculus feel like exploration.',
    subject: 'math', engine: 'SpaceShooter', icon: '🌌', grades: ['9-12'], difficulty: 'hard', coverGradient: g.skyIndigo,
  },
  {
    id: 'stats_showdown',
    title: 'Stats Showdown',
    description: 'Analyze datasets, calculate probabilities, and interpret graphs in a high-stakes quiz format. Mean, median, mode, and standard deviation challenges await aspiring statisticians.',
    subject: 'math', engine: 'SpeedQuiz', icon: '📊', grades: ['9-12'], difficulty: 'hard', coverGradient: g.tealCyan,
  },
  {
    id: 'mental_math_blitz',
    title: 'Mental Math Blitz',
    description: 'How fast can your brain crunch numbers? No pencils, no calculators — just pure mental agility. Timed challenges escalate from simple sums to multi-step problems. Beat your personal best!',
    subject: 'math', engine: 'SpeedQuiz', icon: '🧠', grades: ['K-2', '3-5', '6-8'], difficulty: 'easy', coverGradient: g.amberYellow,
  },

  // ── SCIENCE (8 games) ──
  {
    id: 'cell_defender',
    title: 'Cell Defender',
    description: 'Shrink down to microscopic scale and defend a living cell from invading viruses and bacteria! Deploy antibodies, activate immune responses, and learn cell biology through epic tower defense.',
    subject: 'science', engine: 'ZombieDefense', icon: '🦠', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.greenTeal,
  },
  {
    id: 'chemistry_chaos',
    title: 'Chemistry Chaos',
    description: 'Don your lab coat and step into a chaotic chemistry lab! Balance equations, mix elements, and trigger spectacular reactions. Discover the periodic table through explosive hands-on experiments.',
    subject: 'science', engine: 'BalloonPop', icon: '⚗️', grades: ['9-12'], difficulty: 'hard', coverGradient: g.purpleBlue,
  },
  {
    id: 'physics_flight',
    title: 'Physics Flight',
    description: 'Apply real physics principles — gravity, thrust, drag, and momentum — to pilot your craft through increasingly challenging obstacle courses. Science is your engine!',
    subject: 'science', engine: 'DashRunner', icon: '🚀', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.cyanBlue,
  },
  {
    id: 'space_explorer',
    title: 'Space Explorer',
    description: 'Embark on an interplanetary voyage through our solar system. Visit each planet, learn about their atmospheres, moons, and unique features while defending your ship from asteroids.',
    subject: 'science', engine: 'SpaceShooter', icon: '🪐', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.indigoViolet,
  },
  {
    id: 'animal_kingdom',
    title: 'Animal Kingdom',
    description: 'Match fascinating animals to their natural habitats, diets, and survival adaptations. From the deep ocean to the African savanna — discover the incredible diversity of life on Earth.',
    subject: 'science', engine: 'MemoryMatrix', icon: '🦁', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.emeraldTeal,
  },
  {
    id: 'weather_watcher',
    title: 'Weather Watcher',
    description: 'Become a meteorologist! Predict weather patterns, understand cloud types, and learn how temperature, pressure, and humidity create storms, sunshine, and everything in between.',
    subject: 'science', engine: 'SpeedQuiz', icon: '🌦️', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.blueGreen,
  },
  {
    id: 'ecosystem_builder',
    title: 'Ecosystem Builder',
    description: 'Design and manage a living ecosystem from scratch. Balance predators and prey, manage resources, and learn about food webs and environmental science through immersive strategy gameplay.',
    subject: 'science', engine: 'ZombieDefense', icon: '🌿', grades: ['6-8'], difficulty: 'medium', coverGradient: g.limeGreen,
  },
  {
    id: 'human_body_hero',
    title: 'Human Body Hero',
    description: 'Journey through the human body as a tiny hero navigating the circulatory, nervous, and digestive systems. Learn anatomy and physiology on an epic adventure through yourself!',
    subject: 'science', engine: 'DashRunner', icon: '🫀', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.roseRed,
  },

  // ── READING (7 games) ──
  {
    id: 'speed_reader',
    title: 'Speed Reader',
    description: 'Race through engaging passages and answer rapid-fire comprehension questions. Improve your reading speed and understanding with progressively challenging texts from fiction to non-fiction.',
    subject: 'reading', engine: 'SpeedQuiz', icon: '📖', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.yellowOrange,
  },
  {
    id: 'story_builder',
    title: 'Story Builder',
    description: 'Scrambled story elements need your help! Arrange characters, settings, and plot events in the right sequence to rebuild beloved tales and create your own narrative masterpieces.',
    subject: 'reading', engine: 'WordBuilder', icon: '📝', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.pinkPurple,
  },
  {
    id: 'reading_rescue',
    title: 'Reading Rescue',
    description: 'Beloved book characters are trapped! Answer reading comprehension questions to power up your rescue ship and save them. Every correct answer brings you closer to becoming a literacy hero.',
    subject: 'reading', engine: 'SpaceShooter', icon: '📚', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.blueGreen,
  },
  {
    id: 'poetry_dash',
    title: 'Poetry Dash',
    description: 'Sprint through beautiful landscapes of poetry, identifying metaphors, similes, alliteration, and rhyme schemes. Discover how literary devices transform ordinary words into art.',
    subject: 'reading', engine: 'DashRunner', icon: '🎭', grades: ['6-8', '9-12'], difficulty: 'medium', coverGradient: g.fuchsiaPink,
  },
  {
    id: 'context_clues_pop',
    title: 'Context Clues Pop',
    description: 'Unknown words appear in colorful balloons with surrounding context. Pop the balloon that best defines the mystery word using only the clues in the sentence. Sharpen your inference skills!',
    subject: 'reading', engine: 'BalloonPop', icon: '🔍', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.tealCyan,
  },
  {
    id: 'author_purpose',
    title: "Author's Purpose",
    description: "Why did the author write this? Identify whether passages are meant to persuade, inform, or entertain in this rapid-fire quiz that builds critical reading and analytical thinking skills.",
    subject: 'reading', engine: 'SpeedQuiz', icon: '✍️', grades: ['6-8', '9-12'], difficulty: 'medium', coverGradient: g.orangeRed,
  },
  {
    id: 'inference_island',
    title: 'Inference Island',
    description: 'You\'re stranded on a mystery island! Read clues, make inferences, and draw conclusions to unlock each chapter of an unfolding adventure story. Your brain is the key to escape.',
    subject: 'reading', engine: 'TargetRange', icon: '🏝️', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.emeraldTeal,
  },

  // ── VOCABULARY (7 games) ──
  {
    id: 'vocab_voyage',
    title: 'Vocab Voyage',
    description: 'Set sail across vast seas of language! Each island holds new words to discover, define, and add to your expanding vocabulary treasure chest. Charts and maps track your word mastery.',
    subject: 'vocabulary', engine: 'SpaceShooter', icon: '⛵', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.cyanBlue,
  },
  {
    id: 'synonym_shooter',
    title: 'Synonym Shooter',
    description: 'Asteroids labelled with words streak across the screen — blast the one that matches the synonym target! Quick vocabulary recall meets fast-twitch shooting in deep space.',
    subject: 'vocabulary', engine: 'SpaceShooter', icon: '🎯', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.purpleBlue,
  },
  {
    id: 'antonym_attack',
    title: 'Antonym Attack',
    description: 'Waves of antonym invaders march toward your fortress! Match each word with its opposite to fire your cannons. Strong vocabulary knowledge is your ultimate defense.',
    subject: 'vocabulary', engine: 'ZombieDefense', icon: '🛡️', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.roseRed,
  },
  {
    id: 'word_memory',
    title: 'Word Memory',
    description: 'Flip cards to match vocabulary words with their definitions in this brain-boosting memory game. The twist? Cards shuffle and multiply as you advance through difficulty tiers.',
    subject: 'vocabulary', engine: 'MemoryMatrix', icon: '🃏', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.amberYellow,
  },
  {
    id: 'prefix_suffix_pop',
    title: 'Prefix & Suffix Pop',
    description: 'Colorful balloons carry prefixes, suffixes, and root words — pop the right combination to build complete words! Learn how word parts combine to create meaning.',
    subject: 'vocabulary', engine: 'BalloonPop', icon: '💬', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.pinkPurple,
  },
  {
    id: 'root_word_runner',
    title: 'Root Word Runner',
    description: 'Race through ancient Greek and Latin landscapes powered by root word knowledge. Identify word origins to boost your speed and unlock shortcuts through linguistic history.',
    subject: 'vocabulary', engine: 'DashRunner', icon: '🌱', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.greenTeal,
  },
  {
    id: 'sat_vocab_blitz',
    title: 'SAT Vocab Blitz',
    description: 'Prepare for the SAT with rapid-fire vocabulary rounds featuring college-level words. Context clues, definitions, and usage examples build the verbal arsenal you need to score high.',
    subject: 'vocabulary', engine: 'SpeedQuiz', icon: '🎓', grades: ['9-12'], difficulty: 'hard', coverGradient: g.indigoViolet,
  },

  // ── HISTORY (5 games) ──
  {
    id: 'timeline_runner',
    title: 'Timeline Runner',
    description: 'Sprint through the corridors of history placing pivotal events in chronological order. From ancient civilizations to modern revolutions — run the timeline before time runs out!',
    subject: 'history', engine: 'DashRunner', icon: '⏳', grades: ['6-8', '9-12'], difficulty: 'medium', coverGradient: g.orangeRed,
  },
  {
    id: 'history_defense',
    title: 'History Defense',
    description: 'Defend your civilization through the ages! Answer history questions to build armies, fortify walls, and deploy legendary generals. From Rome to the Renaissance — knowledge is power.',
    subject: 'history', engine: 'ZombieDefense', icon: '🏛️', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.yellowOrange,
  },
  {
    id: 'era_explorer',
    title: 'Era Explorer',
    description: 'Journey through prehistoric caves, medieval castles, and futuristic cities. Interactive quizzes at each era test your knowledge and unlock hidden historical artifacts and bonus content.',
    subject: 'history', engine: 'SpeedQuiz', icon: '🗿', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.amberYellow,
  },
  {
    id: 'presidents_quiz',
    title: 'Presidents Quiz',
    description: 'From Washington to the present day — how well do you know the leaders of the United States? Match presidents to their eras, policies, and pivotal moments in American history.',
    subject: 'history', engine: 'SpeedQuiz', icon: '🇺🇸', grades: ['3-5', '6-8', '9-12'], difficulty: 'medium', coverGradient: g.blueGreen,
  },
  {
    id: 'ancient_civ_memory',
    title: 'Ancient Civilizations',
    description: 'Match ancient civilizations with their legendary achievements, inventions, and architectural marvels. Egypt, Mesopotamia, Greece, Rome — uncover the foundations of the modern world.',
    subject: 'history', engine: 'MemoryMatrix', icon: '🏺', grades: ['6-8'], difficulty: 'medium', coverGradient: g.tealCyan,
  },

  // ── GEOGRAPHY (5 games) ──
  {
    id: 'world_map_shooter',
    title: 'World Map Shooter',
    description: 'Targets appear on an interactive world map — hit the bullseye by naming the correct country, capital, or landmark! Accuracy improves as you learn the geography of every continent.',
    subject: 'geography', engine: 'TargetRange', icon: '🌍', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.greenTeal,
  },
  {
    id: 'capital_quiz',
    title: 'Capital Quiz',
    description: 'Race against the clock to name world capitals from every continent. Start with well-known capitals and advance to obscure ones as you become a true geography champion.',
    subject: 'geography', engine: 'SpeedQuiz', icon: '🏙️', grades: ['3-5', '6-8', '9-12'], difficulty: 'medium', coverGradient: g.cyanBlue,
  },
  {
    id: 'continent_dash',
    title: 'Continent Dash',
    description: 'Dash across all seven continents collecting geography facts, landmarks, and cultural treasures. Each continent is a new world to explore with unique challenges and discoveries.',
    subject: 'geography', engine: 'DashRunner', icon: '🗺️', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.blueGreen,
  },
  {
    id: 'flag_match',
    title: 'Flag Match',
    description: 'Test your knowledge of world flags in this colorful memory challenge. Flip cards to match flags with their countries — from the stars and stripes to the most exotic national banners.',
    subject: 'geography', engine: 'MemoryMatrix', icon: '🏁', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.roseRed,
  },
  {
    id: 'landmark_pop',
    title: 'Landmark Pop',
    description: 'Pop balloons to reveal and identify famous world landmarks — from the Eiffel Tower to the Great Wall of China. Learn about the history and culture behind each architectural wonder.',
    subject: 'geography', engine: 'BalloonPop', icon: '🗽', grades: ['3-5', '6-8'], difficulty: 'easy', coverGradient: g.skyIndigo,
  },

  // ── CODING (5 games) ──
  {
    id: 'code_runner',
    title: 'Code Runner',
    description: 'Write code snippets in a visual editor to guide your character through algorithmic obstacle courses. Learn loops, conditionals, and functions through hands-on problem solving.',
    subject: 'coding', engine: 'DashRunner', icon: '💻', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.purpleBlue,
  },
  {
    id: 'bug_blaster',
    title: 'Bug Blaster',
    description: 'Code bugs are infesting the system! Scan code snippets, identify syntax errors and logic flaws, then blast the bugs before they crash the program. Debug under pressure!',
    subject: 'coding', engine: 'SpaceShooter', icon: '🐛', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.limeGreen,
  },
  {
    id: 'algorithm_arena',
    title: 'Algorithm Arena',
    description: 'Enter the arena where algorithms battle for supremacy. Build sorting algorithms, design search strategies, and optimize solutions to conquer increasingly complex computational puzzles.',
    subject: 'coding', engine: 'WordBuilder', icon: '🧩', grades: ['9-12'], difficulty: 'hard', coverGradient: g.indigoViolet,
  },
  {
    id: 'binary_defense',
    title: 'Binary Defense',
    description: 'Convert decimal to binary, master logic gates, and deploy boolean operations to build an impenetrable digital fortress. Computer science fundamentals become your weapons of choice.',
    subject: 'coding', engine: 'ZombieDefense', icon: '🔐', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.cyanBlue,
  },
  {
    id: 'pattern_match',
    title: 'Pattern Match',
    description: 'Identify coding patterns hidden in a matrix of symbols and snippets. Train your pattern recognition — the core skill behind every great programmer — in this visual memory challenge.',
    subject: 'coding', engine: 'MemoryMatrix', icon: '🔄', grades: ['3-5', '6-8'], difficulty: 'medium', coverGradient: g.fuchsiaPink,
  },

  // ── ART (3 games) ──
  {
    id: 'color_theory_pop',
    title: 'Color Theory Pop',
    description: 'Explore the color wheel through vibrant balloon-popping gameplay! Mix primary colors, discover complementary pairs, and learn about hue, saturation, and value in a rainbow of fun.',
    subject: 'art', engine: 'BalloonPop', icon: '🎨', grades: ['K-2', '3-5'], difficulty: 'easy', coverGradient: g.pinkPurple,
  },
  {
    id: 'art_history_quiz',
    title: 'Art History Quiz',
    description: 'Journey through centuries of artistic masterpieces — match paintings to their creators, identify art movements, and discover the stories behind works from Da Vinci to Warhol.',
    subject: 'art', engine: 'SpeedQuiz', icon: '🖼️', grades: ['6-8', '9-12'], difficulty: 'medium', coverGradient: g.amberYellow,
  },
  {
    id: 'art_memory',
    title: 'Art Memory',
    description: 'Flip cards featuring famous paintings and match each masterpiece to its companion. Train your visual memory while learning about the greatest artworks in human history.',
    subject: 'art', engine: 'MemoryMatrix', icon: '🎭', grades: ['3-5', '6-8'], difficulty: 'easy', coverGradient: g.emeraldTeal,
  },

  // ── GRAMMAR / WRITING (3 games) ──
  {
    id: 'sentence_builder_pro',
    title: 'Sentence Builder Pro',
    description: 'Scrambled words need reassembling into grammatically perfect sentences! Drag and drop words into the right order, mastering syntax, punctuation, and sentence structure through play.',
    subject: 'vocabulary', engine: 'WordBuilder', icon: '📝', grades: ['K-2', '3-5', '6-8'], difficulty: 'medium', coverGradient: g.purpleBlue,
  },
  {
    id: 'grammar_gladiator',
    title: 'Grammar Gladiator',
    description: 'Enter the grammar arena as a word warrior! Battle through rounds of sentence construction, identifying parts of speech, fixing run-ons, and wielding punctuation like a true gladiator.',
    subject: 'vocabulary', engine: 'WordBuilder', icon: '⚔️', grades: ['3-5', '6-8', '9-12'], difficulty: 'medium', coverGradient: g.orangeRed,
  },
  {
    id: 'essay_builder_rush',
    title: 'Essay Builder Rush',
    description: 'Race against the clock to construct well-organized essay paragraphs. Choose topic sentences, supporting details, and conclusions to build compelling arguments at top speed.',
    subject: 'vocabulary', engine: 'WordBuilder', icon: '✏️', grades: ['6-8', '9-12'], difficulty: 'hard', coverGradient: g.greenTeal,
  },
];

export function getGameById(id: string): GameDef | undefined {
  return GAMES.find(g => g.id === id);
}

export function getGamesBySubject(subject: Subject): GameDef[] {
  return GAMES.filter(g => g.subject === subject);
}

export function getGamesByEngine(engine: string): GameDef[] {
  return GAMES.filter(g => g.engine === engine);
}

export const SUBJECTS: { id: Subject; label: string; icon: string; color: string }[] = [
  { id: 'math', label: 'Mathematics', icon: '🔢', color: '#8b5cf6' },
  { id: 'science', label: 'Science', icon: '🔬', color: '#10b981' },
  { id: 'reading', label: 'Reading', icon: '📖', color: '#f59e0b' },
  { id: 'vocabulary', label: 'Vocabulary', icon: '📝', color: '#3b82f6' },
  { id: 'history', label: 'History', icon: '🏛️', color: '#ef4444' },
  { id: 'geography', label: 'Geography', icon: '🌍', color: '#06b6d4' },
  { id: 'coding', label: 'Coding', icon: '💻', color: '#6366f1' },
  { id: 'art', label: 'Art', icon: '🎨', color: '#ec4899' },
];
