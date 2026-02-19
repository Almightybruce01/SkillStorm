/* ═══════════════════════════════════════════════════════════
   SKILLZSTORM QUESTION BANK
   Grade-scaled questions for all subjects
   ═══════════════════════════════════════════════════════════ */

export type Grade = 'K-2' | '3-5' | '6-8' | '9-12';
export type Subject = 'math' | 'vocabulary' | 'grammar' | 'science' | 'history' | 'chemistry' | 'financial';

export interface Question {
  text: string;
  answer: string;
  options: string[];
  subject: Subject;
}

// ── MATH ──────────────────────────────────────────────────
function genMath(grade: Grade): Question[] {
  if (grade === 'K-2') {
    return shuffle([
      q('2 + 3', '5', ['3','4','5','6']),
      q('7 - 4', '3', ['2','3','4','5']),
      q('5 + 5', '10', ['8','9','10','11']),
      q('9 - 2', '7', ['5','6','7','8']),
      q('4 + 6', '10', ['9','10','11','12']),
      q('8 - 3', '5', ['4','5','6','7']),
      q('1 + 9', '10', ['8','9','10','11']),
      q('6 + 3', '9', ['7','8','9','10']),
      q('10 - 5', '5', ['3','4','5','6']),
      q('3 + 4', '7', ['5','6','7','8']),
      q('7 + 2', '9', ['8','9','10','11']),
      q('6 - 1', '5', ['4','5','6','7']),
    ]).map(x => ({ ...x, subject: 'math' as Subject }));
  }
  if (grade === '3-5') {
    return shuffle([
      q('12 × 4', '48', ['36','44','48','52']),
      q('56 ÷ 8', '7', ['6','7','8','9']),
      q('15 × 3', '45', ['35','40','45','50']),
      q('¾ + ¼', '1', ['½','¾','1','1¼']),
      q('144 ÷ 12', '12', ['10','11','12','14']),
      q('23 × 5', '115', ['100','105','115','125']),
      q('½ of 80', '40', ['30','35','40','45']),
      q('9 × 9', '81', ['72','79','81','90']),
      q('100 - 37', '63', ['57','63','67','73']),
      q('⅓ of 27', '9', ['7','8','9','10']),
      q('8 × 7', '56', ['48','54','56','63']),
      q('250 + 175', '425', ['400','415','425','450']),
    ]).map(x => ({ ...x, subject: 'math' as Subject }));
  }
  if (grade === '6-8') {
    return shuffle([
      q('Solve: 3x = 27', 'x = 9', ['x = 6','x = 8','x = 9','x = 12']),
      q('√144', '12', ['10','11','12','14']),
      q('15% of 200', '30', ['20','25','30','35']),
      q('-8 + 13', '5', ['3','4','5','6']),
      q('2³ × 3', '24', ['18','20','24','27']),
      q('Ratio 3:5, total 40', '15 and 25', ['12 and 28','15 and 25','16 and 24','18 and 22']),
      q('(-4) × (-6)', '24', ['-24','-10','10','24']),
      q('Area: 8 × 5.5', '44', ['40','42','44','48']),
      q('30% of 150', '45', ['35','40','45','50']),
      q('x + 7 = 19', 'x = 12', ['x = 10','x = 11','x = 12','x = 13']),
      q('5² - 3²', '16', ['14','15','16','17']),
      q('GCF of 24, 36', '12', ['6','8','12','18']),
    ]).map(x => ({ ...x, subject: 'math' as Subject }));
  }
  return shuffle([
    q('Factor: x² - 9', '(x+3)(x-3)', ['(x+3)²','(x-3)²','(x+3)(x-3)','(x+9)(x-1)']),
    q('sin(90°)', '1', ['0','½','√2/2','1']),
    q('lim x→0 (sin x)/x', '1', ['0','½','1','∞']),
    q('d/dx (x³)', '3x²', ['x²','2x²','3x²','3x³']),
    q('log₂(64)', '6', ['4','5','6','8']),
    q('∫ 2x dx', 'x² + C', ['2x + C','x² + C','x³ + C','2x² + C']),
    q('Slope: (3,7) to (5,11)', '2', ['1','2','3','4']),
    q('i² = ?', '-1', ['-1','1','i','-i']),
    q('cos(0°)', '1', ['0','½','√2/2','1']),
    q('Solve: 2x² = 50', 'x = ±5', ['x = 5','x = ±5','x = 25','x = ±25']),
    q('P(6) on a die', '1/6', ['1/2','1/3','1/6','1/12']),
    q('tan(45°)', '1', ['0','½','1','√3']),
  ]).map(x => ({ ...x, subject: 'math' as Subject }));
}

// ── VOCABULARY ────────────────────────────────────────────
function genVocab(grade: Grade): Question[] {
  if (grade === 'K-2') {
    return shuffle([
      q('What is "big"?', 'Large', ['Small','Large','Fast','Old']),
      q('Opposite of "hot"', 'Cold', ['Warm','Cold','Dry','Wet']),
      q('"Happy" means...', 'Glad', ['Sad','Glad','Mad','Tired']),
      q('What is a "puppy"?', 'Young dog', ['Cat','Young dog','Bird','Fish']),
      q('Opposite of "up"', 'Down', ['Left','Right','Down','Around']),
      q('"Fast" means...', 'Quick', ['Slow','Quick','Heavy','Tiny']),
    ]).map(x => ({ ...x, subject: 'vocabulary' as Subject }));
  }
  if (grade === '3-5') {
    return shuffle([
      q('"Enormous" means...', 'Very large', ['Tiny','Very large','Normal','Average']),
      q('Synonym of "brave"', 'Courageous', ['Scared','Courageous','Weak','Quiet']),
      q('"Famished" means...', 'Very hungry', ['Full','Tired','Very hungry','Happy']),
      q('Antonym of "ancient"', 'Modern', ['Old','Modern','Broken','Pretty']),
      q('"Observe" means...', 'Watch closely', ['Ignore','Watch closely','Run','Hide']),
      q('"Expand" means...', 'Get bigger', ['Shrink','Get bigger','Freeze','Melt']),
    ]).map(x => ({ ...x, subject: 'vocabulary' as Subject }));
  }
  if (grade === '6-8') {
    return shuffle([
      q('"Ambiguous" means...', 'Unclear', ['Clear','Unclear','Angry','Calm']),
      q('"Benevolent" means...', 'Kind', ['Mean','Kind','Lazy','Smart']),
      q('Synonym of "meticulous"', 'Careful', ['Sloppy','Careful','Quick','Bold']),
      q('"Omnivore" eats...', 'Plants and meat', ['Only plants','Only meat','Plants and meat','Nothing']),
      q('"Hypothesis" means...', 'Educated guess', ['Fact','Educated guess','Law','Theory']),
      q('"Resilient" means...', 'Able to recover', ['Weak','Able to recover','Fragile','Stiff']),
    ]).map(x => ({ ...x, subject: 'vocabulary' as Subject }));
  }
  return shuffle([
    q('"Ubiquitous" means...', 'Found everywhere', ['Rare','Found everywhere','Hidden','Small']),
    q('"Ephemeral" means...', 'Short-lived', ['Eternal','Short-lived','Strong','Heavy']),
    q('"Sycophant" means...', 'Flatterer', ['Critic','Flatterer','Leader','Artist']),
    q('"Pragmatic" means...', 'Practical', ['Idealistic','Practical','Emotional','Random']),
    q('"Paradigm" means...', 'Model/Pattern', ['Question','Model/Pattern','Error','Process']),
    q('"Dichotomy" means...', 'Division into two', ['Unity','Division into two','Triple','Single']),
  ]).map(x => ({ ...x, subject: 'vocabulary' as Subject }));
}

// ── GRAMMAR ───────────────────────────────────────────────
function genGrammar(grade: Grade): Question[] {
  if (grade === 'K-2' || grade === '3-5') {
    return shuffle([
      q('Pick the noun: "The cat sat."', 'cat', ['the','cat','sat','on']),
      q('Pick the verb: "She runs fast."', 'runs', ['she','runs','fast','the']),
      q('"I ___ to school." (go/goes)', 'go', ['go','goes','going','gone']),
      q('Which is correct?', 'They are happy.', ['They is happy.','They are happy.','They am happy.','Them are happy.']),
      q('Past tense of "run"', 'ran', ['runned','ran','runed','running']),
      q('"She ___ a book." (read/readed)', 'read', ['read','readed','reeding','reads']),
    ]).map(x => ({ ...x, subject: 'grammar' as Subject }));
  }
  return shuffle([
    q('Identify: "Running quickly, he..."', 'Participle phrase', ['Clause','Participle phrase','Noun','Adjective']),
    q('"Their/There/They\'re" — ___ coming.', "They're", ['Their',"They're",'There','Theyre']),
    q('"Who/Whom" did you call?', 'Whom', ['Who','Whom','Which','That']),
    q('"Effect" is a ___', 'Noun', ['Verb','Noun','Adjective','Adverb']),
    q('"Less/Fewer" — ___ items', 'Fewer', ['Less','Fewer','Lesser','Least']),
    q('Subjunctive: "If I ___ you..."', 'were', ['was','were','am','be']),
  ]).map(x => ({ ...x, subject: 'grammar' as Subject }));
}

// ── SCIENCE ───────────────────────────────────────────────
function genScience(grade: Grade): Question[] {
  if (grade === 'K-2') {
    return shuffle([
      q('Which is a solid?', 'Rock', ['Water','Rock','Air','Steam']),
      q('Plants need ___ to grow', 'Sunlight', ['Darkness','Sunlight','Ice','Metal']),
      q('How many legs does a spider have?', '8', ['4','6','8','10']),
      q('Where does rain come from?', 'Clouds', ['Ground','Clouds','Sun','Moon']),
    ]).map(x => ({ ...x, subject: 'science' as Subject }));
  }
  if (grade === '3-5') {
    return shuffle([
      q('What is the closest star?', 'The Sun', ['Moon','The Sun','Mars','Polaris']),
      q('Water freezes at...', '32°F / 0°C', ['100°F','32°F / 0°C','50°F','0°F']),
      q('Herbivores eat...', 'Plants', ['Meat','Plants','Both','Nothing']),
      q('Largest planet?', 'Jupiter', ['Saturn','Jupiter','Earth','Mars']),
    ]).map(x => ({ ...x, subject: 'science' as Subject }));
  }
  if (grade === '6-8') {
    return shuffle([
      q('Mitochondria is the...', 'Powerhouse of cell', ['Brain','Powerhouse of cell','Wall','Skin']),
      q('Speed = Distance / ...', 'Time', ['Mass','Time','Force','Area']),
      q('Photosynthesis needs...', 'CO₂ + Sunlight', ['O₂ + Dark','CO₂ + Sunlight','N₂ + Heat','H₂ + Cold']),
      q('How many chromosomes in human?', '46', ['23','44','46','48']),
    ]).map(x => ({ ...x, subject: 'science' as Subject }));
  }
  return shuffle([
    q('F = ma is Newton\'s ___ law', 'Second', ['First','Second','Third','Fourth']),
    q('pH of pure water', '7', ['0','5','7','14']),
    q('DNA stands for...', 'Deoxyribonucleic acid', ['Deoxyribonucleic acid','Dinitro acid','Dynamic nucleic acid','None']),
    q('Speed of light (approx)', '3×10⁸ m/s', ['3×10⁶','3×10⁸ m/s','3×10¹⁰','3×10⁴']),
  ]).map(x => ({ ...x, subject: 'science' as Subject }));
}

// ── HELPERS ───────────────────────────────────────────────
function q(text: string, answer: string, options: string[]): Omit<Question, 'subject'> {
  return { text, answer, options: shuffle([...options]) };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── PUBLIC API ────────────────────────────────────────────
export function getQuestions(grade: Grade, subject?: Subject, count = 20): Question[] {
  let pool: Question[] = [];
  if (!subject || subject === 'math') pool.push(...genMath(grade));
  if (!subject || subject === 'vocabulary') pool.push(...genVocab(grade));
  if (!subject || subject === 'grammar') pool.push(...genGrammar(grade));
  if (!subject || subject === 'science') pool.push(...genScience(grade));
  return shuffle(pool).slice(0, count);
}

export function getRandomQuestion(grade: Grade, subject?: Subject): Question {
  const pool = getQuestions(grade, subject, 100);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Generate a random math problem dynamically */
export function generateMathQuestion(grade: Grade): Question {
  if (grade === 'K-2') {
    const a = rand(1, 10), b = rand(1, 10);
    const ops = ['+', '-'];
    const op = ops[rand(0, 1)];
    let answer: number, text: string;
    if (op === '+') { answer = a + b; text = `${a} + ${b}`; }
    else { const [x, y] = a > b ? [a, b] : [b, a]; answer = x - y; text = `${x} − ${y}`; }
    return makeNumQ(text, answer);
  }
  if (grade === '3-5') {
    const type = rand(0, 2);
    if (type === 0) { const a = rand(2, 12), b = rand(2, 12); return makeNumQ(`${a} × ${b}`, a * b); }
    if (type === 1) { const b = rand(2, 12), ans = rand(2, 12); return makeNumQ(`${b * ans} ÷ ${b}`, ans); }
    const a = rand(10, 99), b = rand(10, 99); return makeNumQ(`${a} + ${b}`, a + b);
  }
  if (grade === '6-8') {
    const type = rand(0, 2);
    if (type === 0) { const a = rand(2, 15), b = rand(1, 20); return makeNumQ(`${a}x = ${a * b}  →  x = ?`, b); }
    if (type === 1) { const pct = [10, 15, 20, 25, 50][rand(0, 4)]; const n = rand(2, 20) * 10; return makeNumQ(`${pct}% of ${n}`, (pct / 100) * n); }
    const a = rand(-10, 10), b = rand(-10, 10); return makeNumQ(`(${a}) + (${b})`, a + b);
  }
  // 9-12
  const type = rand(0, 2);
  if (type === 0) { const a = rand(2, 10); return makeNumQ(`${a}² = ?`, a * a); }
  if (type === 1) { const m = rand(1, 8), b = rand(-5, 10); const x = rand(1, 5); return makeNumQ(`f(x) = ${m}x + ${b}, f(${x}) = ?`, m * x + b); }
  const base = [4, 9, 16, 25, 36, 49, 64, 81, 100][rand(0, 8)]; return makeNumQ(`√${base} = ?`, Math.sqrt(base));
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeNumQ(text: string, answer: number): Question {
  const opts = new Set<number>([answer]);
  while (opts.size < 4) {
    const off = rand(1, Math.max(5, Math.abs(answer)));
    const wrong = answer + (Math.random() > 0.5 ? off : -off);
    if (wrong !== answer) opts.add(Math.round(wrong));
  }
  return {
    text,
    answer: String(answer),
    options: shuffle(Array.from(opts).map(String)),
    subject: 'math',
  };
}
