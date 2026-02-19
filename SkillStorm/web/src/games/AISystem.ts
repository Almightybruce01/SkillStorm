/* ═══════════════════════════════════════════════════════════════════════════════
   AI SYSTEM — Game AI & Behavior Trees for Arcade Games
   Provides intelligent opponents for Pong, Chess, Checkers, Connect Four,
   Tic-Tac-Toe, and other competitive games.
   Features: Minimax with alpha-beta pruning, Monte Carlo Tree Search,
   difficulty scaling, personality profiles, adaptive difficulty,
   pathfinding (A*, BFS, DFS), state machines, behavior trees,
   flocking/steering behaviors for enemy AI.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── AI Difficulty Levels ── */
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'impossible';

export interface AIConfig {
  difficulty: AIDifficulty;
  thinkTimeMs: number;
  randomness: number;
  lookAhead: number;
  personality?: AIPersonality;
}

export interface AIPersonality {
  aggression: number;    // 0-1: How aggressively the AI plays
  defense: number;       // 0-1: How defensively the AI plays
  risk: number;          // 0-1: Willingness to take risky moves
  patience: number;      // 0-1: How willing to wait for better positions
  adaptability: number;  // 0-1: How quickly it adapts to player style
}

export const AI_DIFFICULTY_CONFIG: Record<AIDifficulty, AIConfig> = {
  easy: {
    difficulty: 'easy',
    thinkTimeMs: 100,
    randomness: 0.4,
    lookAhead: 1,
    personality: { aggression: 0.3, defense: 0.3, risk: 0.5, patience: 0.2, adaptability: 0.1 },
  },
  medium: {
    difficulty: 'medium',
    thinkTimeMs: 300,
    randomness: 0.2,
    lookAhead: 3,
    personality: { aggression: 0.5, defense: 0.5, risk: 0.4, patience: 0.5, adaptability: 0.3 },
  },
  hard: {
    difficulty: 'hard',
    thinkTimeMs: 500,
    randomness: 0.08,
    lookAhead: 5,
    personality: { aggression: 0.7, defense: 0.7, risk: 0.3, patience: 0.7, adaptability: 0.6 },
  },
  expert: {
    difficulty: 'expert',
    thinkTimeMs: 800,
    randomness: 0.03,
    lookAhead: 7,
    personality: { aggression: 0.8, defense: 0.85, risk: 0.2, patience: 0.85, adaptability: 0.8 },
  },
  impossible: {
    difficulty: 'impossible',
    thinkTimeMs: 1000,
    randomness: 0,
    lookAhead: 10,
    personality: { aggression: 0.9, defense: 0.95, risk: 0.15, patience: 0.95, adaptability: 0.95 },
  },
};

/* ══════════════════════════════════════════════════════════════
   MINIMAX WITH ALPHA-BETA PRUNING
   Generic game tree search for 2-player zero-sum games
   ══════════════════════════════════════════════════════════════ */

export interface GameState<Move> {
  getPossibleMoves(): Move[];
  makeMove(move: Move): GameState<Move>;
  isTerminal(): boolean;
  evaluate(maximizingPlayer: boolean): number;
  getCurrentPlayer(): 1 | 2;
}

export function minimax<Move>(
  state: GameState<Move>,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  config: AIConfig
): { score: number; move: Move | null } {
  if (depth === 0 || state.isTerminal()) {
    return { score: state.evaluate(maximizingPlayer), move: null };
  }

  const moves = state.getPossibleMoves();
  if (moves.length === 0) {
    return { score: state.evaluate(maximizingPlayer), move: null };
  }

  let bestMove = moves[0];

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = state.makeMove(move);
      const { score } = minimax(newState, depth - 1, alpha, beta, false, config);

      const noise = (Math.random() - 0.5) * config.randomness * 100;
      const adjustedScore = score + noise;

      if (adjustedScore > maxEval) {
        maxEval = adjustedScore;
        bestMove = move;
      }
      alpha = Math.max(alpha, maxEval);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = state.makeMove(move);
      const { score } = minimax(newState, depth - 1, alpha, beta, true, config);

      const noise = (Math.random() - 0.5) * config.randomness * 100;
      const adjustedScore = score + noise;

      if (adjustedScore < minEval) {
        minEval = adjustedScore;
        bestMove = move;
      }
      beta = Math.min(beta, minEval);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

export function getBestMove<Move>(state: GameState<Move>, config: AIConfig): Move | null {
  const { move } = minimax(state, config.lookAhead, -Infinity, Infinity, true, config);
  return move;
}

/* ══════════════════════════════════════════════════════════════
   MONTE CARLO TREE SEARCH (MCTS)
   For more complex games where minimax is too slow
   ══════════════════════════════════════════════════════════════ */

class MCTSNode<Move> {
  state: GameState<Move>;
  parent: MCTSNode<Move> | null;
  children: MCTSNode<Move>[];
  move: Move | null;
  visits: number;
  wins: number;
  untriedMoves: Move[];

  constructor(state: GameState<Move>, parent: MCTSNode<Move> | null = null, move: Move | null = null) {
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.move = move;
    this.visits = 0;
    this.wins = 0;
    this.untriedMoves = state.getPossibleMoves();
  }

  get isFullyExpanded(): boolean { return this.untriedMoves.length === 0; }
  get isTerminal(): boolean { return this.state.isTerminal(); }

  ucb1(explorationParam: number = 1.41): number {
    if (this.visits === 0) return Infinity;
    const exploitation = this.wins / this.visits;
    const exploration = explorationParam * Math.sqrt(Math.log(this.parent!.visits) / this.visits);
    return exploitation + exploration;
  }

  bestChild(): MCTSNode<Move> {
    return this.children.reduce((best, child) =>
      child.ucb1() > best.ucb1() ? child : best
    );
  }

  expand(): MCTSNode<Move> {
    const idx = Math.floor(Math.random() * this.untriedMoves.length);
    const move = this.untriedMoves.splice(idx, 1)[0];
    const newState = this.state.makeMove(move);
    const child = new MCTSNode(newState, this, move);
    this.children.push(child);
    return child;
  }
}

export function mcts<Move>(rootState: GameState<Move>, iterations: number = 1000, config: AIConfig): Move | null {
  const root = new MCTSNode(rootState);

  for (let i = 0; i < iterations; i++) {
    /* Selection */
    let node = root;
    while (!node.isTerminal && node.isFullyExpanded) {
      node = node.bestChild();
    }

    /* Expansion */
    if (!node.isTerminal && !node.isFullyExpanded) {
      node = node.expand();
    }

    /* Simulation */
    let simState = node.state;
    let depth = 0;
    const maxSimDepth = 50;
    while (!simState.isTerminal() && depth < maxSimDepth) {
      const moves = simState.getPossibleMoves();
      if (moves.length === 0) break;
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      simState = simState.makeMove(randomMove);
      depth++;
    }

    /* Backpropagation */
    const result = simState.evaluate(true);
    let backNode: MCTSNode<Move> | null = node;
    while (backNode !== null) {
      backNode.visits++;
      backNode.wins += result > 0 ? 1 : result === 0 ? 0.5 : 0;
      backNode = backNode.parent;
    }
  }

  if (root.children.length === 0) return null;

  const bestChild = root.children.reduce((best, child) =>
    child.visits > best.visits ? child : best
  );

  return bestChild.move;
}

/* ══════════════════════════════════════════════════════════════
   PATHFINDING — A*, BFS, Dijkstra
   For maze games, enemy AI navigation, etc.
   ══════════════════════════════════════════════════════════════ */

export interface GridPos {
  x: number;
  y: number;
}

export interface PathfindingGrid {
  width: number;
  height: number;
  isWalkable(x: number, y: number): boolean;
  getCost?(x: number, y: number): number;
}

function heuristic(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(cameFrom: Map<string, string>, current: string): GridPos[] {
  const path: GridPos[] = [];
  let c = current;
  while (cameFrom.has(c)) {
    const [x, y] = c.split(',').map(Number);
    path.unshift({ x, y });
    c = cameFrom.get(c)!;
  }
  const [x, y] = c.split(',').map(Number);
  path.unshift({ x, y });
  return path;
}

const DIRECTIONS_4: GridPos[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];

const DIRECTIONS_8: GridPos[] = [
  ...DIRECTIONS_4,
  { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
];

export function astar(
  grid: PathfindingGrid,
  start: GridPos,
  goal: GridPos,
  allowDiagonal: boolean = false
): GridPos[] | null {
  const key = (p: GridPos) => `${p.x},${p.y}`;
  const dirs = allowDiagonal ? DIRECTIONS_8 : DIRECTIONS_4;

  const openSet = new Map<string, { pos: GridPos; f: number; g: number }>();
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, string>();

  const startKey = key(start);
  openSet.set(startKey, { pos: start, f: heuristic(start, goal), g: 0 });

  while (openSet.size > 0) {
    let currentKey = '';
    let currentNode = { pos: start, f: Infinity, g: 0 };
    for (const [k, v] of openSet) {
      if (v.f < currentNode.f) {
        currentKey = k;
        currentNode = v;
      }
    }

    if (currentNode.pos.x === goal.x && currentNode.pos.y === goal.y) {
      return reconstructPath(cameFrom, currentKey);
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    for (const dir of dirs) {
      const nx = currentNode.pos.x + dir.x;
      const ny = currentNode.pos.y + dir.y;

      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      if (!grid.isWalkable(nx, ny)) continue;

      const nKey = key({ x: nx, y: ny });
      if (closedSet.has(nKey)) continue;

      const moveCost = allowDiagonal && dir.x !== 0 && dir.y !== 0 ? 1.414 : 1;
      const terrainCost = grid.getCost ? grid.getCost(nx, ny) : 1;
      const tentativeG = currentNode.g + moveCost * terrainCost;

      const existing = openSet.get(nKey);
      if (existing && tentativeG >= existing.g) continue;

      cameFrom.set(nKey, currentKey);
      openSet.set(nKey, {
        pos: { x: nx, y: ny },
        f: tentativeG + heuristic({ x: nx, y: ny }, goal),
        g: tentativeG,
      });
    }
  }

  return null;
}

export function bfs(
  grid: PathfindingGrid,
  start: GridPos,
  goal: GridPos
): GridPos[] | null {
  const key = (p: GridPos) => `${p.x},${p.y}`;
  const queue: GridPos[] = [start];
  const visited = new Set<string>([key(start)]);
  const cameFrom = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const ck = key(current);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, ck);
    }

    for (const dir of DIRECTIONS_4) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nk = key({ x: nx, y: ny });

      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      if (!grid.isWalkable(nx, ny)) continue;
      if (visited.has(nk)) continue;

      visited.add(nk);
      cameFrom.set(nk, ck);
      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

export function floodFill(
  grid: PathfindingGrid,
  start: GridPos,
  maxDist: number = Infinity
): Map<string, number> {
  const key = (p: GridPos) => `${p.x},${p.y}`;
  const distances = new Map<string, number>();
  const queue: { pos: GridPos; dist: number }[] = [{ pos: start, dist: 0 }];

  distances.set(key(start), 0);

  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    if (dist >= maxDist) continue;

    for (const dir of DIRECTIONS_4) {
      const nx = pos.x + dir.x;
      const ny = pos.y + dir.y;
      const nk = key({ x: nx, y: ny });

      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      if (!grid.isWalkable(nx, ny)) continue;
      if (distances.has(nk)) continue;

      distances.set(nk, dist + 1);
      queue.push({ pos: { x: nx, y: ny }, dist: dist + 1 });
    }
  }

  return distances;
}

/* ══════════════════════════════════════════════════════════════
   FINITE STATE MACHINE — For enemy AI behavior
   ══════════════════════════════════════════════════════════════ */

export type StateAction = (dt: number, context: any) => void;
export type TransitionCondition = (context: any) => boolean;

export interface FSMTransition {
  to: string;
  condition: TransitionCondition;
  priority?: number;
}

export interface FSMState {
  name: string;
  onEnter?: (context: any) => void;
  onUpdate?: StateAction;
  onExit?: (context: any) => void;
  transitions: FSMTransition[];
}

export class FiniteStateMachine {
  states = new Map<string, FSMState>();
  currentState: string = '';
  previousState: string = '';
  context: any;
  stateTime: number = 0;

  constructor(context: any = {}) {
    this.context = context;
  }

  addState(state: FSMState): this {
    this.states.set(state.name, state);
    if (!this.currentState) this.currentState = state.name;
    return this;
  }

  setState(name: string) {
    if (name === this.currentState) return;

    const current = this.states.get(this.currentState);
    if (current?.onExit) current.onExit(this.context);

    this.previousState = this.currentState;
    this.currentState = name;
    this.stateTime = 0;

    const next = this.states.get(name);
    if (next?.onEnter) next.onEnter(this.context);
  }

  update(dt: number) {
    this.stateTime += dt;
    const state = this.states.get(this.currentState);
    if (!state) return;

    state.onUpdate?.(dt, this.context);

    const sortedTransitions = [...state.transitions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const t of sortedTransitions) {
      if (t.condition(this.context)) {
        this.setState(t.to);
        break;
      }
    }
  }

  isInState(name: string): boolean { return this.currentState === name; }
  getStateTime(): number { return this.stateTime; }
}

/* ══════════════════════════════════════════════════════════════
   BEHAVIOR TREES — More complex AI decision-making
   ══════════════════════════════════════════════════════════════ */

export type BTStatus = 'running' | 'success' | 'failure';

export interface BTNode {
  tick(context: any, dt: number): BTStatus;
  reset?(): void;
}

export class BTAction implements BTNode {
  constructor(private action: (context: any, dt: number) => BTStatus) {}
  tick(context: any, dt: number): BTStatus { return this.action(context, dt); }
}

export class BTCondition implements BTNode {
  constructor(private condition: (context: any) => boolean) {}
  tick(context: any): BTStatus { return this.condition(context) ? 'success' : 'failure'; }
}

export class BTSequence implements BTNode {
  private currentIndex = 0;
  constructor(private children: BTNode[]) {}

  tick(context: any, dt: number): BTStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context, dt);
      if (status === 'running') return 'running';
      if (status === 'failure') { this.currentIndex = 0; return 'failure'; }
      this.currentIndex++;
    }
    this.currentIndex = 0;
    return 'success';
  }

  reset() {
    this.currentIndex = 0;
    this.children.forEach(c => c.reset?.());
  }
}

export class BTSelector implements BTNode {
  private currentIndex = 0;
  constructor(private children: BTNode[]) {}

  tick(context: any, dt: number): BTStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context, dt);
      if (status === 'running') return 'running';
      if (status === 'success') { this.currentIndex = 0; return 'success'; }
      this.currentIndex++;
    }
    this.currentIndex = 0;
    return 'failure';
  }

  reset() {
    this.currentIndex = 0;
    this.children.forEach(c => c.reset?.());
  }
}

export class BTInverter implements BTNode {
  constructor(private child: BTNode) {}
  tick(context: any, dt: number): BTStatus {
    const status = this.child.tick(context, dt);
    if (status === 'success') return 'failure';
    if (status === 'failure') return 'success';
    return 'running';
  }
  reset() { this.child.reset?.(); }
}

export class BTRepeater implements BTNode {
  private count = 0;
  constructor(private child: BTNode, private times: number = Infinity) {}

  tick(context: any, dt: number): BTStatus {
    if (this.count >= this.times) { this.count = 0; return 'success'; }
    const status = this.child.tick(context, dt);
    if (status === 'running') return 'running';
    this.count++;
    return this.count >= this.times ? 'success' : 'running';
  }

  reset() { this.count = 0; this.child.reset?.(); }
}

export class BTParallel implements BTNode {
  constructor(private children: BTNode[], private requiredSuccesses: number = -1) {
    if (requiredSuccesses === -1) this.requiredSuccesses = children.length;
  }

  tick(context: any, dt: number): BTStatus {
    let successes = 0;
    let failures = 0;

    for (const child of this.children) {
      const status = child.tick(context, dt);
      if (status === 'success') successes++;
      if (status === 'failure') failures++;
    }

    if (successes >= this.requiredSuccesses) return 'success';
    if (failures > this.children.length - this.requiredSuccesses) return 'failure';
    return 'running';
  }

  reset() { this.children.forEach(c => c.reset?.()); }
}

export class BTWait implements BTNode {
  private elapsed = 0;
  constructor(private duration: number) {}

  tick(_context: any, dt: number): BTStatus {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.elapsed = 0;
      return 'success';
    }
    return 'running';
  }

  reset() { this.elapsed = 0; }
}

/* ══════════════════════════════════════════════════════════════
   STEERING BEHAVIORS — For movement AI (enemies, NPCs)
   ══════════════════════════════════════════════════════════════ */

export interface SteeringAgent {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  maxSpeed: number;
  maxForce: number;
  radius: number;
}

function vec2(x: number, y: number) { return { x, y }; }
function vadd(a: { x: number; y: number }, b: { x: number; y: number }) { return vec2(a.x + b.x, a.y + b.y); }
function vsub(a: { x: number; y: number }, b: { x: number; y: number }) { return vec2(a.x - b.x, a.y - b.y); }
function vmul(a: { x: number; y: number }, s: number) { return vec2(a.x * s, a.y * s); }
function vlen(a: { x: number; y: number }) { return Math.sqrt(a.x * a.x + a.y * a.y); }
function vnorm(a: { x: number; y: number }) { const l = vlen(a); return l > 0 ? vmul(a, 1 / l) : vec2(0, 0); }
function vlimit(a: { x: number; y: number }, max: number) { const l = vlen(a); return l > max ? vmul(vnorm(a), max) : a; }

export function seek(agent: SteeringAgent, target: { x: number; y: number }): { x: number; y: number } {
  const desired = vsub(target, agent.position);
  const desiredNorm = vmul(vnorm(desired), agent.maxSpeed);
  const steer = vsub(desiredNorm, agent.velocity);
  return vlimit(steer, agent.maxForce);
}

export function flee(agent: SteeringAgent, target: { x: number; y: number }): { x: number; y: number } {
  const desired = vsub(agent.position, target);
  const desiredNorm = vmul(vnorm(desired), agent.maxSpeed);
  const steer = vsub(desiredNorm, agent.velocity);
  return vlimit(steer, agent.maxForce);
}

export function arrive(agent: SteeringAgent, target: { x: number; y: number }, slowRadius: number = 100): { x: number; y: number } {
  const toTarget = vsub(target, agent.position);
  const dist = vlen(toTarget);

  if (dist < 1) return vec2(0, 0);

  let speed = agent.maxSpeed;
  if (dist < slowRadius) {
    speed = agent.maxSpeed * (dist / slowRadius);
  }

  const desired = vmul(vnorm(toTarget), speed);
  const steer = vsub(desired, agent.velocity);
  return vlimit(steer, agent.maxForce);
}

export function pursue(agent: SteeringAgent, target: SteeringAgent): { x: number; y: number } {
  const dist = vlen(vsub(target.position, agent.position));
  const lookAhead = dist / agent.maxSpeed;
  const futurePos = vadd(target.position, vmul(target.velocity, lookAhead));
  return seek(agent, futurePos);
}

export function evade(agent: SteeringAgent, target: SteeringAgent): { x: number; y: number } {
  const dist = vlen(vsub(target.position, agent.position));
  const lookAhead = dist / agent.maxSpeed;
  const futurePos = vadd(target.position, vmul(target.velocity, lookAhead));
  return flee(agent, futurePos);
}

export function wander(agent: SteeringAgent, wanderRadius: number = 50, wanderDist: number = 80, jitter: number = 20): { x: number; y: number } {
  const wanderTarget = vec2(
    (Math.random() - 0.5) * jitter * 2,
    (Math.random() - 0.5) * jitter * 2
  );
  const norm = vnorm(wanderTarget);
  const circle = vmul(norm, wanderRadius);
  const ahead = vmul(vnorm(agent.velocity.x === 0 && agent.velocity.y === 0 ? vec2(1, 0) : agent.velocity), wanderDist);
  return vadd(ahead, circle);
}

export function separate(agent: SteeringAgent, neighbors: SteeringAgent[], desiredSeparation: number = 25): { x: number; y: number } {
  let steer = vec2(0, 0);
  let count = 0;

  for (const other of neighbors) {
    const d = vlen(vsub(agent.position, other.position));
    if (d > 0 && d < desiredSeparation) {
      const diff = vnorm(vsub(agent.position, other.position));
      steer = vadd(steer, vmul(diff, 1 / d));
      count++;
    }
  }

  if (count > 0) {
    steer = vmul(steer, 1 / count);
    steer = vmul(vnorm(steer), agent.maxSpeed);
    steer = vsub(steer, agent.velocity);
    steer = vlimit(steer, agent.maxForce);
  }

  return steer;
}

export function align(agent: SteeringAgent, neighbors: SteeringAgent[], neighborRadius: number = 50): { x: number; y: number } {
  let avgVel = vec2(0, 0);
  let count = 0;

  for (const other of neighbors) {
    const d = vlen(vsub(agent.position, other.position));
    if (d > 0 && d < neighborRadius) {
      avgVel = vadd(avgVel, other.velocity);
      count++;
    }
  }

  if (count > 0) {
    avgVel = vmul(avgVel, 1 / count);
    avgVel = vmul(vnorm(avgVel), agent.maxSpeed);
    const steer = vsub(avgVel, agent.velocity);
    return vlimit(steer, agent.maxForce);
  }

  return vec2(0, 0);
}

export function cohesion(agent: SteeringAgent, neighbors: SteeringAgent[], neighborRadius: number = 50): { x: number; y: number } {
  let center = vec2(0, 0);
  let count = 0;

  for (const other of neighbors) {
    const d = vlen(vsub(agent.position, other.position));
    if (d > 0 && d < neighborRadius) {
      center = vadd(center, other.position);
      count++;
    }
  }

  if (count > 0) {
    center = vmul(center, 1 / count);
    return seek(agent, center);
  }

  return vec2(0, 0);
}

export function flock(
  agent: SteeringAgent,
  neighbors: SteeringAgent[],
  separationWeight: number = 1.5,
  alignmentWeight: number = 1.0,
  cohesionWeight: number = 1.0
): { x: number; y: number } {
  const sep = separate(agent, neighbors);
  const ali = align(agent, neighbors);
  const coh = cohesion(agent, neighbors);

  return vec2(
    sep.x * separationWeight + ali.x * alignmentWeight + coh.x * cohesionWeight,
    sep.y * separationWeight + ali.y * alignmentWeight + coh.y * cohesionWeight
  );
}

/* ══════════════════════════════════════════════════════════════
   ADAPTIVE DIFFICULTY SYSTEM
   Monitors player performance and adjusts difficulty in real-time
   ══════════════════════════════════════════════════════════════ */

export interface AdaptiveState {
  playerSkillEstimate: number;
  recentScores: number[];
  recentDeaths: number[];
  windowSize: number;
  targetSuccessRate: number;
  adjustmentRate: number;
  minDifficulty: number;
  maxDifficulty: number;
  currentDifficulty: number;
}

export function createAdaptiveState(options: Partial<AdaptiveState> = {}): AdaptiveState {
  return {
    playerSkillEstimate: 0.5,
    recentScores: [],
    recentDeaths: [],
    windowSize: 10,
    targetSuccessRate: 0.6,
    adjustmentRate: 0.05,
    minDifficulty: 0.1,
    maxDifficulty: 1.0,
    currentDifficulty: 0.5,
    ...options,
  };
}

export function recordAdaptiveSuccess(state: AdaptiveState): AdaptiveState {
  state.recentScores.push(1);
  if (state.recentScores.length > state.windowSize) state.recentScores.shift();

  const successRate = state.recentScores.reduce((a, b) => a + b, 0) / state.recentScores.length;

  if (successRate > state.targetSuccessRate + 0.1) {
    state.currentDifficulty = Math.min(state.maxDifficulty, state.currentDifficulty + state.adjustmentRate);
  }

  state.playerSkillEstimate = Math.min(1, state.playerSkillEstimate + 0.02);
  return state;
}

export function recordAdaptiveFailure(state: AdaptiveState): AdaptiveState {
  state.recentScores.push(0);
  if (state.recentScores.length > state.windowSize) state.recentScores.shift();

  state.recentDeaths.push(Date.now());
  const recentDeathWindow = 30000;
  state.recentDeaths = state.recentDeaths.filter(t => Date.now() - t < recentDeathWindow);

  const successRate = state.recentScores.reduce((a, b) => a + b, 0) / Math.max(1, state.recentScores.length);

  if (successRate < state.targetSuccessRate - 0.1) {
    state.currentDifficulty = Math.max(state.minDifficulty, state.currentDifficulty - state.adjustmentRate);
  }

  if (state.recentDeaths.length >= 3) {
    state.currentDifficulty = Math.max(state.minDifficulty, state.currentDifficulty - state.adjustmentRate * 2);
  }

  state.playerSkillEstimate = Math.max(0, state.playerSkillEstimate - 0.03);
  return state;
}

export function getAdaptedValue(state: AdaptiveState, baseValue: number, scaling: number = 1): number {
  return baseValue * (1 + (state.currentDifficulty - 0.5) * scaling);
}

/* ══════════════════════════════════════════════════════════════
   PONG AI — Specialized high-quality Pong opponent
   ══════════════════════════════════════════════════════════════ */

export interface PongAIState {
  targetY: number;
  reactionDelay: number;
  lastUpdate: number;
  predictionError: number;
  difficultyMultiplier: number;
  personality: AIPersonality;
}

export function createPongAI(difficulty: AIDifficulty): PongAIState {
  const config = AI_DIFFICULTY_CONFIG[difficulty];
  return {
    targetY: 0,
    reactionDelay: config.thinkTimeMs,
    lastUpdate: 0,
    predictionError: config.randomness * 80,
    difficultyMultiplier: 1 - config.randomness,
    personality: config.personality ?? { aggression: 0.5, defense: 0.5, risk: 0.3, patience: 0.5, adaptability: 0.5 },
  };
}

export function updatePongAI(
  ai: PongAIState,
  ballX: number, ballY: number, ballVX: number, ballVY: number,
  paddleX: number, paddleY: number, paddleH: number,
  canvasH: number, now: number
): number {
  if (now - ai.lastUpdate < ai.reactionDelay) return paddleY;
  ai.lastUpdate = now;

  let predictedY = ballY;

  if ((paddleX > canvasH / 2 && ballVX > 0) || (paddleX < canvasH / 2 && ballVX < 0)) {
    const timeToReach = Math.abs((paddleX - ballX) / (ballVX || 1));
    predictedY = ballY + ballVY * timeToReach;

    while (predictedY < 0 || predictedY > canvasH) {
      if (predictedY < 0) predictedY = -predictedY;
      if (predictedY > canvasH) predictedY = 2 * canvasH - predictedY;
    }

    predictedY += (Math.random() - 0.5) * ai.predictionError * 2;
  } else {
    predictedY = canvasH / 2 + (Math.random() - 0.5) * 60;
  }

  ai.targetY = predictedY;

  const diff = ai.targetY - (paddleY + paddleH / 2);
  const speed = 4 * ai.difficultyMultiplier;

  if (Math.abs(diff) < 5) return paddleY;
  return paddleY + Math.sign(diff) * Math.min(Math.abs(diff), speed);
}

/* ══════════════════════════════════════════════════════════════
   SPACE INVADERS AI — Enemy movement patterns
   ══════════════════════════════════════════════════════════════ */

export type InvaderPattern = 'standard' | 'zigzag' | 'sine' | 'dive' | 'scatter' | 'formation';

export interface InvaderBehavior {
  pattern: InvaderPattern;
  speed: number;
  phase: number;
  amplitude: number;
  diveChance: number;
  fireRate: number;
}

export function createInvaderBehavior(pattern: InvaderPattern, difficulty: number): InvaderBehavior {
  return {
    pattern,
    speed: 1 + difficulty * 2,
    phase: Math.random() * Math.PI * 2,
    amplitude: 20 + difficulty * 15,
    diveChance: 0.001 + difficulty * 0.005,
    fireRate: 0.002 + difficulty * 0.003,
  };
}

export function getInvaderOffset(behavior: InvaderBehavior, time: number, index: number): { dx: number; dy: number } {
  switch (behavior.pattern) {
    case 'sine':
      return {
        dx: Math.sin(time * behavior.speed + behavior.phase + index * 0.5) * behavior.amplitude,
        dy: 0,
      };
    case 'zigzag':
      return {
        dx: ((time * behavior.speed + index * 0.3) % 2 - 1) * behavior.amplitude,
        dy: 0,
      };
    case 'dive':
      return { dx: 0, dy: Math.sin(time * 2) * 10 };
    case 'scatter':
      return {
        dx: Math.sin(time + index) * behavior.amplitude * 0.5,
        dy: Math.cos(time + index * 1.5) * behavior.amplitude * 0.3,
      };
    default:
      return { dx: 0, dy: 0 };
  }
}

/* ══════════════════════════════════════════════════════════════
   TETRIS AI — Automated piece placement for demo/opponent mode
   ══════════════════════════════════════════════════════════════ */

export interface BlockStackPlacement {
  rotation: number;
  column: number;
  score: number;
}

export function evaluateBlockStackPlacement(
  board: (number | null)[][],
  rows: number,
  cols: number
): { holes: number; height: number; bumpiness: number; completedLines: number } {
  let holes = 0;
  let bumpiness = 0;
  let maxHeight = 0;
  let completedLines = 0;
  const heights: number[] = [];

  for (let c = 0; c < cols; c++) {
    let columnHeight = 0;
    let foundBlock = false;
    let columnHoles = 0;

    for (let r = 0; r < rows; r++) {
      if (board[r][c] !== null) {
        if (!foundBlock) columnHeight = rows - r;
        foundBlock = true;
      } else if (foundBlock) {
        columnHoles++;
      }
    }

    heights.push(columnHeight);
    holes += columnHoles;
    maxHeight = Math.max(maxHeight, columnHeight);
  }

  for (let i = 0; i < heights.length - 1; i++) {
    bumpiness += Math.abs(heights[i] - heights[i + 1]);
  }

  for (let r = 0; r < rows; r++) {
    if (board[r].every(cell => cell !== null)) completedLines++;
  }

  return { holes, height: maxHeight, bumpiness, completedLines };
}

export function scoreBlockStackPlacement(
  holes: number,
  height: number,
  bumpiness: number,
  completedLines: number,
  difficulty: AIDifficulty
): number {
  const weights = {
    easy: { holes: -3, height: -1, bumpiness: -1, lines: 5 },
    medium: { holes: -5, height: -2, bumpiness: -2, lines: 8 },
    hard: { holes: -8, height: -3, bumpiness: -3, lines: 12 },
    expert: { holes: -10, height: -4, bumpiness: -4, lines: 15 },
    impossible: { holes: -15, height: -5, bumpiness: -5, lines: 20 },
  };

  const w = weights[difficulty];
  return holes * w.holes + height * w.height + bumpiness * w.bumpiness + completedLines * w.lines;
}
