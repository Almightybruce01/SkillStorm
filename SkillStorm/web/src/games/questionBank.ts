/* ═══════════════════════════════════════════════════════════
   QUESTION BANK
   Shared types and question data for educational games
   ═══════════════════════════════════════════════════════════ */

export type Grade = 'K-2' | '3-5' | '6-8' | '9-12';

export interface Question {
  question: string;
  options: string[];
  correct: number;
  subject: string;
}

export const MATH_QUESTIONS: Record<Grade, Question[]> = {
  'K-2': [
    { question: 'What is 2 + 3?', options: ['4', '5', '6', '7'], correct: 1, subject: 'math' },
    { question: 'What is 7 - 4?', options: ['2', '3', '4', '5'], correct: 1, subject: 'math' },
    { question: 'What is 5 + 5?', options: ['8', '9', '10', '11'], correct: 2, subject: 'math' },
    { question: 'What is 9 - 6?', options: ['2', '3', '4', '1'], correct: 1, subject: 'math' },
    { question: 'What is 4 + 4?', options: ['6', '7', '8', '9'], correct: 2, subject: 'math' },
    { question: 'What is 10 - 5?', options: ['4', '5', '6', '3'], correct: 1, subject: 'math' },
    { question: 'What is 3 + 6?', options: ['8', '9', '10', '7'], correct: 1, subject: 'math' },
    { question: 'What is 8 - 3?', options: ['4', '5', '6', '7'], correct: 1, subject: 'math' },
  ],
  '3-5': [
    { question: 'What is 12 x 3?', options: ['33', '36', '39', '42'], correct: 1, subject: 'math' },
    { question: 'What is 144 / 12?', options: ['10', '11', '12', '13'], correct: 2, subject: 'math' },
    { question: 'What is 25 x 4?', options: ['80', '90', '100', '110'], correct: 2, subject: 'math' },
    { question: 'What is 3/4 + 1/4?', options: ['1/2', '3/4', '1', '4/4'], correct: 2, subject: 'math' },
    { question: 'What is 56 / 8?', options: ['6', '7', '8', '9'], correct: 1, subject: 'math' },
    { question: 'What is 15 x 6?', options: ['80', '85', '90', '95'], correct: 2, subject: 'math' },
  ],
  '6-8': [
    { question: 'Solve: 3x + 7 = 22', options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'], correct: 2, subject: 'math' },
    { question: 'What is 15% of 200?', options: ['25', '30', '35', '40'], correct: 1, subject: 'math' },
    { question: 'What is the area of a circle with radius 5? (use π≈3.14)', options: ['31.4', '78.5', '157', '25'], correct: 1, subject: 'math' },
    { question: 'Simplify: 2(3x + 4) - 5', options: ['6x + 3', '6x - 1', '6x + 8', '5x + 3'], correct: 0, subject: 'math' },
    { question: 'What is √144?', options: ['10', '11', '12', '13'], correct: 2, subject: 'math' },
  ],
  '9-12': [
    { question: 'What is the derivative of x³?', options: ['x²', '2x²', '3x²', '3x'], correct: 2, subject: 'math' },
    { question: 'Solve: x² - 9 = 0', options: ['x = ±3', 'x = ±9', 'x = 3', 'x = 9'], correct: 0, subject: 'math' },
    { question: 'What is sin(90°)?', options: ['0', '0.5', '1', '-1'], correct: 2, subject: 'math' },
    { question: 'What is log₁₀(1000)?', options: ['2', '3', '4', '10'], correct: 1, subject: 'math' },
    { question: 'What is the integral of 2x?', options: ['x²', 'x² + C', '2x²', '2x² + C'], correct: 1, subject: 'math' },
  ],
};

export const SCIENCE_QUESTIONS: Record<Grade, Question[]> = {
  'K-2': [
    { question: 'What do plants need to grow?', options: ['Darkness', 'Sunlight & water', 'Only air', 'Sand'], correct: 1, subject: 'science' },
    { question: 'How many legs does a spider have?', options: ['6', '8', '10', '4'], correct: 1, subject: 'science' },
    { question: 'What is the closest star to Earth?', options: ['Moon', 'Sun', 'Mars', 'Polaris'], correct: 1, subject: 'science' },
    { question: 'What state of matter is ice?', options: ['Gas', 'Liquid', 'Solid', 'Plasma'], correct: 2, subject: 'science' },
  ],
  '3-5': [
    { question: 'What is photosynthesis?', options: ['Eating food', 'Plants making food from sunlight', 'Breathing', 'Sleeping'], correct: 1, subject: 'science' },
    { question: 'What planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correct: 2, subject: 'science' },
    { question: 'What is the water cycle?', options: ['A bicycle made of water', 'How water moves through the environment', 'A water game', 'Ocean waves'], correct: 1, subject: 'science' },
    { question: 'What force keeps us on the ground?', options: ['Magnetism', 'Friction', 'Gravity', 'Wind'], correct: 2, subject: 'science' },
  ],
  '6-8': [
    { question: 'What is the chemical formula for water?', options: ['CO₂', 'H₂O', 'NaCl', 'O₂'], correct: 1, subject: 'science' },
    { question: 'What organelle is the "powerhouse" of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi'], correct: 2, subject: 'science' },
    { question: 'What type of rock forms from lava?', options: ['Sedimentary', 'Metamorphic', 'Igneous', 'Limestone'], correct: 2, subject: 'science' },
    { question: 'What is Newton\'s first law about?', options: ['Gravity', 'Inertia', 'Acceleration', 'Energy'], correct: 1, subject: 'science' },
  ],
  '9-12': [
    { question: 'What is Avogadro\'s number?', options: ['6.022 × 10²³', '3.14', '9.8', '1.6 × 10⁻¹⁹'], correct: 0, subject: 'science' },
    { question: 'What is the structure of DNA?', options: ['Single helix', 'Triple helix', 'Double helix', 'Flat sheet'], correct: 2, subject: 'science' },
    { question: 'What is E = mc² about?', options: ['Momentum', 'Mass-energy equivalence', 'Electric current', 'Gravity'], correct: 1, subject: 'science' },
  ],
};

export const VOCAB_QUESTIONS: Record<Grade, Question[]> = {
  'K-2': [
    { question: 'What does "happy" mean?', options: ['Sad', 'Angry', 'Glad', 'Tired'], correct: 2, subject: 'vocabulary' },
    { question: 'What is the opposite of "big"?', options: ['Huge', 'Small', 'Tall', 'Wide'], correct: 1, subject: 'vocabulary' },
    { question: 'What does "swift" mean?', options: ['Slow', 'Fast', 'Heavy', 'Quiet'], correct: 1, subject: 'vocabulary' },
  ],
  '3-5': [
    { question: 'What does "benevolent" mean?', options: ['Mean', 'Kind', 'Lazy', 'Angry'], correct: 1, subject: 'vocabulary' },
    { question: 'What is a synonym for "enormous"?', options: ['Tiny', 'Huge', 'Normal', 'Medium'], correct: 1, subject: 'vocabulary' },
    { question: 'What does "peculiar" mean?', options: ['Normal', 'Strange', 'Pretty', 'Fast'], correct: 1, subject: 'vocabulary' },
  ],
  '6-8': [
    { question: 'What does "ubiquitous" mean?', options: ['Rare', 'Found everywhere', 'Ancient', 'Dangerous'], correct: 1, subject: 'vocabulary' },
    { question: 'What does "ephemeral" mean?', options: ['Lasting forever', 'Short-lived', 'Powerful', 'Visible'], correct: 1, subject: 'vocabulary' },
    { question: 'What does "pragmatic" mean?', options: ['Idealistic', 'Practical', 'Dramatic', 'Romantic'], correct: 1, subject: 'vocabulary' },
  ],
  '9-12': [
    { question: 'What does "sycophant" mean?', options: ['A flatterer', 'A leader', 'A musician', 'A scientist'], correct: 0, subject: 'vocabulary' },
    { question: 'What does "juxtaposition" mean?', options: ['Separation', 'Placing side by side', 'Rotation', 'Elimination'], correct: 1, subject: 'vocabulary' },
    { question: 'What does "obfuscate" mean?', options: ['Clarify', 'Confuse', 'Beautify', 'Simplify'], correct: 1, subject: 'vocabulary' },
  ],
};

export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getQuestions(grade: Grade, subject: 'math' | 'science' | 'vocabulary', count: number = 10): Question[] {
  const bank = subject === 'math' ? MATH_QUESTIONS : subject === 'science' ? SCIENCE_QUESTIONS : VOCAB_QUESTIONS;
  const questions = [...(bank[grade] || [])];
  // Shuffle and return
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions.slice(0, count);
}
