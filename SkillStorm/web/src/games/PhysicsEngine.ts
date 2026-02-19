/* ═══════════════════════════════════════════════════════════════════════════════
   PHYSICS ENGINE — Elite Game Physics System v1
   A comprehensive 2D physics engine for arcade games.
   Features: Rigid body dynamics, collision detection/response, spatial hashing,
   constraints, springs, gravity, friction, restitution, joints, raycasting,
   AABB + Circle + Polygon colliders, broad/narrow phase collision pipeline.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Vector2D ── */
export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static zero() { return new Vec2(0, 0); }
  static one() { return new Vec2(1, 1); }
  static up() { return new Vec2(0, -1); }
  static down() { return new Vec2(0, 1); }
  static left() { return new Vec2(-1, 0); }
  static right() { return new Vec2(1, 0); }
  static fromAngle(angle: number, length: number = 1) {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }
  static random(minX: number, maxX: number, minY: number, maxY: number) {
    return new Vec2(minX + Math.random() * (maxX - minX), minY + Math.random() * (maxY - minY));
  }

  clone() { return new Vec2(this.x, this.y); }
  set(x: number, y: number) { this.x = x; this.y = y; return this; }
  copy(v: Vec2) { this.x = v.x; this.y = v.y; return this; }

  add(v: Vec2) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s: number) { return new Vec2(this.x * s, this.y * s); }
  div(s: number) { return s !== 0 ? new Vec2(this.x / s, this.y / s) : Vec2.zero(); }

  addSelf(v: Vec2) { this.x += v.x; this.y += v.y; return this; }
  subSelf(v: Vec2) { this.x -= v.x; this.y -= v.y; return this; }
  mulSelf(s: number) { this.x *= s; this.y *= s; return this; }
  divSelf(s: number) { if (s !== 0) { this.x /= s; this.y /= s; } return this; }

  dot(v: Vec2) { return this.x * v.x + this.y * v.y; }
  cross(v: Vec2) { return this.x * v.y - this.y * v.x; }

  lengthSq() { return this.x * this.x + this.y * this.y; }
  length() { return Math.sqrt(this.lengthSq()); }

  normalize() {
    const len = this.length();
    return len > 0 ? this.div(len) : Vec2.zero();
  }
  normalizeSelf() {
    const len = this.length();
    if (len > 0) { this.x /= len; this.y /= len; }
    return this;
  }

  distTo(v: Vec2) { return this.sub(v).length(); }
  distSqTo(v: Vec2) { return this.sub(v).lengthSq(); }

  angle() { return Math.atan2(this.y, this.x); }
  angleTo(v: Vec2) { return Math.atan2(v.y - this.y, v.x - this.x); }

  rotate(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }
  rotateSelf(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx; this.y = ny;
    return this;
  }

  lerp(v: Vec2, t: number) {
    return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  reflect(normal: Vec2) {
    const d = this.dot(normal) * 2;
    return this.sub(normal.mul(d));
  }

  perpCW() { return new Vec2(this.y, -this.x); }
  perpCCW() { return new Vec2(-this.y, this.x); }

  clampLength(max: number) {
    const len = this.length();
    return len > max ? this.normalize().mul(max) : this.clone();
  }

  toString() { return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`; }
}

/* ── AABB (Axis-Aligned Bounding Box) ── */
export class AABB {
  constructor(
    public min: Vec2 = Vec2.zero(),
    public max: Vec2 = Vec2.zero()
  ) {}

  get width() { return this.max.x - this.min.x; }
  get height() { return this.max.y - this.min.y; }
  get center() { return this.min.add(this.max).div(2); }
  get halfExtents() { return new Vec2(this.width / 2, this.height / 2); }

  static fromCenterSize(center: Vec2, width: number, height: number) {
    return new AABB(
      new Vec2(center.x - width / 2, center.y - height / 2),
      new Vec2(center.x + width / 2, center.y + height / 2)
    );
  }

  containsPoint(p: Vec2) {
    return p.x >= this.min.x && p.x <= this.max.x && p.y >= this.min.y && p.y <= this.max.y;
  }

  intersects(other: AABB) {
    return this.min.x <= other.max.x && this.max.x >= other.min.x &&
           this.min.y <= other.max.y && this.max.y >= other.min.y;
  }

  merge(other: AABB) {
    return new AABB(
      new Vec2(Math.min(this.min.x, other.min.x), Math.min(this.min.y, other.min.y)),
      new Vec2(Math.max(this.max.x, other.max.x), Math.max(this.max.y, other.max.y))
    );
  }

  expand(amount: number) {
    return new AABB(
      new Vec2(this.min.x - amount, this.min.y - amount),
      new Vec2(this.max.x + amount, this.max.y + amount)
    );
  }

  perimeter() { return 2 * (this.width + this.height); }
  area() { return this.width * this.height; }
}

/* ── Collider Types ── */
export type ColliderShape = 'circle' | 'aabb' | 'polygon';

export interface CircleCollider {
  shape: 'circle';
  radius: number;
  offset: Vec2;
}

export interface AABBCollider {
  shape: 'aabb';
  halfWidth: number;
  halfHeight: number;
  offset: Vec2;
}

export interface PolygonCollider {
  shape: 'polygon';
  vertices: Vec2[];
  offset: Vec2;
}

export type Collider = CircleCollider | AABBCollider | PolygonCollider;

/* ── Material ── */
export interface PhysMaterial {
  density: number;       // kg/m² — determines mass
  restitution: number;   // 0..1 — bounciness
  friction: number;      // 0..1 — surface friction
}

export const MATERIALS: Record<string, PhysMaterial> = {
  default:  { density: 1, restitution: 0.3, friction: 0.4 },
  rubber:   { density: 1, restitution: 0.8, friction: 0.8 },
  ice:      { density: 0.9, restitution: 0.05, friction: 0.02 },
  metal:    { density: 7.8, restitution: 0.15, friction: 0.3 },
  wood:     { density: 0.6, restitution: 0.2, friction: 0.5 },
  bouncy:   { density: 0.5, restitution: 0.95, friction: 0.1 },
  sticky:   { density: 1, restitution: 0, friction: 0.95 },
  ball:     { density: 0.4, restitution: 0.6, friction: 0.2 },
  paddle:   { density: 999, restitution: 0.5, friction: 0.1 },
  brick:    { density: 2, restitution: 0.4, friction: 0.3 },
  stone:    { density: 2.5, restitution: 0.1, friction: 0.6 },
};

/* ── Rigid Body ── */
export interface RigidBodyConfig {
  position: Vec2;
  velocity?: Vec2;
  angle?: number;
  angularVelocity?: number;
  collider: Collider;
  material?: PhysMaterial;
  isStatic?: boolean;
  isSensor?: boolean;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  tag?: string;
  userData?: any;
  group?: number;
  mask?: number;
}

let bodyIdCounter = 0;

export class RigidBody {
  id: number;
  position: Vec2;
  velocity: Vec2;
  force: Vec2;
  angle: number;
  angularVelocity: number;
  torque: number;
  collider: Collider;
  material: PhysMaterial;
  mass: number;
  invMass: number;
  inertia: number;
  invInertia: number;
  isStatic: boolean;
  isSensor: boolean;
  gravityScale: number;
  linearDamping: number;
  angularDamping: number;
  fixedRotation: boolean;
  tag: string;
  userData: any;
  group: number;
  mask: number;
  sleeping: boolean;
  sleepTimer: number;
  aabb: AABB;

  constructor(config: RigidBodyConfig) {
    this.id = bodyIdCounter++;
    this.position = config.position.clone();
    this.velocity = config.velocity?.clone() ?? Vec2.zero();
    this.force = Vec2.zero();
    this.angle = config.angle ?? 0;
    this.angularVelocity = config.angularVelocity ?? 0;
    this.torque = 0;
    this.collider = config.collider;
    this.material = config.material ?? MATERIALS.default;
    this.isStatic = config.isStatic ?? false;
    this.isSensor = config.isSensor ?? false;
    this.gravityScale = config.gravityScale ?? 1;
    this.linearDamping = config.linearDamping ?? 0.01;
    this.angularDamping = config.angularDamping ?? 0.01;
    this.fixedRotation = config.fixedRotation ?? false;
    this.tag = config.tag ?? '';
    this.userData = config.userData ?? null;
    this.group = config.group ?? 0;
    this.mask = config.mask ?? 0xFFFFFFFF;
    this.sleeping = false;
    this.sleepTimer = 0;

    this.mass = 0;
    this.invMass = 0;
    this.inertia = 0;
    this.invInertia = 0;
    this.aabb = new AABB();

    this.computeMass();
    this.updateAABB();
  }

  private computeMass() {
    if (this.isStatic) {
      this.mass = 0;
      this.invMass = 0;
      this.inertia = 0;
      this.invInertia = 0;
      return;
    }

    const c = this.collider;
    switch (c.shape) {
      case 'circle': {
        const area = Math.PI * c.radius * c.radius;
        this.mass = area * this.material.density;
        this.inertia = this.mass * c.radius * c.radius * 0.5;
        break;
      }
      case 'aabb': {
        const area = c.halfWidth * 2 * c.halfHeight * 2;
        this.mass = area * this.material.density;
        this.inertia = this.mass * (c.halfWidth * c.halfWidth + c.halfHeight * c.halfHeight) / 3;
        break;
      }
      case 'polygon': {
        let area = 0;
        let inertia = 0;
        const verts = c.vertices;
        for (let i = 0; i < verts.length; i++) {
          const a = verts[i];
          const b = verts[(i + 1) % verts.length];
          const crossVal = a.cross(b);
          area += crossVal;
          inertia += crossVal * (a.dot(a) + a.dot(b) + b.dot(b));
        }
        area = Math.abs(area) / 2;
        this.mass = area * this.material.density;
        this.inertia = Math.abs(inertia / 6) * this.material.density;
        break;
      }
    }

    this.invMass = this.mass > 0 ? 1 / this.mass : 0;
    this.invInertia = this.inertia > 0 && !this.fixedRotation ? 1 / this.inertia : 0;
  }

  updateAABB() {
    const c = this.collider;
    const pos = this.position.add(c.offset.rotate(this.angle));

    switch (c.shape) {
      case 'circle':
        this.aabb = new AABB(
          new Vec2(pos.x - c.radius, pos.y - c.radius),
          new Vec2(pos.x + c.radius, pos.y + c.radius)
        );
        break;
      case 'aabb': {
        const cos = Math.abs(Math.cos(this.angle));
        const sin = Math.abs(Math.sin(this.angle));
        const hw = c.halfWidth * cos + c.halfHeight * sin;
        const hh = c.halfWidth * sin + c.halfHeight * cos;
        this.aabb = new AABB(new Vec2(pos.x - hw, pos.y - hh), new Vec2(pos.x + hw, pos.y + hh));
        break;
      }
      case 'polygon': {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of c.vertices) {
          const rotated = v.rotate(this.angle).addSelf(pos);
          minX = Math.min(minX, rotated.x);
          minY = Math.min(minY, rotated.y);
          maxX = Math.max(maxX, rotated.x);
          maxY = Math.max(maxY, rotated.y);
        }
        this.aabb = new AABB(new Vec2(minX, minY), new Vec2(maxX, maxY));
        break;
      }
    }
  }

  applyForce(force: Vec2) {
    this.force.addSelf(force);
    this.wake();
  }

  applyImpulse(impulse: Vec2, contactPoint?: Vec2) {
    this.velocity.addSelf(impulse.mul(this.invMass));
    if (contactPoint && !this.fixedRotation) {
      const r = contactPoint.sub(this.position);
      this.angularVelocity += r.cross(impulse) * this.invInertia;
    }
    this.wake();
  }

  applyTorque(t: number) {
    this.torque += t;
    this.wake();
  }

  setPosition(pos: Vec2) {
    this.position.copy(pos);
    this.updateAABB();
    this.wake();
  }

  setVelocity(vel: Vec2) {
    this.velocity.copy(vel);
    this.wake();
  }

  setAngle(angle: number) {
    this.angle = angle;
    this.updateAABB();
    this.wake();
  }

  wake() {
    this.sleeping = false;
    this.sleepTimer = 0;
  }

  getWorldPoint(localPoint: Vec2): Vec2 {
    return localPoint.rotate(this.angle).addSelf(this.position);
  }

  getLocalPoint(worldPoint: Vec2): Vec2 {
    return worldPoint.sub(this.position).rotateSelf(-this.angle);
  }

  getVelocityAtPoint(worldPoint: Vec2): Vec2 {
    const r = worldPoint.sub(this.position);
    return this.velocity.add(new Vec2(-this.angularVelocity * r.y, this.angularVelocity * r.x));
  }
}

/* ── Contact / Manifold ── */
export interface ContactPoint {
  position: Vec2;
  normal: Vec2;
  depth: number;
}

export interface CollisionManifold {
  bodyA: RigidBody;
  bodyB: RigidBody;
  contacts: ContactPoint[];
  normal: Vec2;
  depth: number;
}

/* ── Collision Detection: Narrow Phase ── */
function circleVsCircle(a: RigidBody, b: RigidBody): CollisionManifold | null {
  const ca = a.collider as CircleCollider;
  const cb = b.collider as CircleCollider;
  const posA = a.position.add(ca.offset.rotate(a.angle));
  const posB = b.position.add(cb.offset.rotate(b.angle));

  const diff = posB.sub(posA);
  const distSq = diff.lengthSq();
  const radSum = ca.radius + cb.radius;

  if (distSq > radSum * radSum) return null;

  const dist = Math.sqrt(distSq);
  const normal = dist > 0.0001 ? diff.div(dist) : new Vec2(1, 0);
  const depth = radSum - dist;
  const contact = posA.add(normal.mul(ca.radius));

  return {
    bodyA: a, bodyB: b,
    contacts: [{ position: contact, normal, depth }],
    normal, depth,
  };
}

function circleVsAABB(circle: RigidBody, aabb: RigidBody): CollisionManifold | null {
  const cc = circle.collider as CircleCollider;
  const ac = aabb.collider as AABBCollider;
  const circPos = circle.position.add(cc.offset.rotate(circle.angle));
  const boxPos = aabb.position.add(ac.offset.rotate(aabb.angle));

  const local = circPos.sub(boxPos).rotateSelf(-aabb.angle);
  const clampedX = Math.max(-ac.halfWidth, Math.min(ac.halfWidth, local.x));
  const clampedY = Math.max(-ac.halfHeight, Math.min(ac.halfHeight, local.y));
  const closest = new Vec2(clampedX, clampedY);

  const diff = local.sub(closest);
  const distSq = diff.lengthSq();

  if (distSq > cc.radius * cc.radius) return null;

  const dist = Math.sqrt(distSq);
  let normal: Vec2;
  let depth: number;

  if (dist > 0.0001) {
    normal = diff.div(dist).rotateSelf(aabb.angle);
    depth = cc.radius - dist;
  } else {
    const dx = ac.halfWidth - Math.abs(local.x);
    const dy = ac.halfHeight - Math.abs(local.y);
    if (dx < dy) {
      normal = new Vec2(local.x > 0 ? 1 : -1, 0).rotateSelf(aabb.angle);
      depth = dx + cc.radius;
    } else {
      normal = new Vec2(0, local.y > 0 ? 1 : -1).rotateSelf(aabb.angle);
      depth = dy + cc.radius;
    }
  }

  const contact = circPos.sub(normal.mul(cc.radius));

  return {
    bodyA: circle, bodyB: aabb,
    contacts: [{ position: contact, normal, depth }],
    normal, depth,
  };
}

function aabbVsAABB(a: RigidBody, b: RigidBody): CollisionManifold | null {
  const ac = a.collider as AABBCollider;
  const bc = b.collider as AABBCollider;
  const posA = a.position.add(ac.offset);
  const posB = b.position.add(bc.offset);

  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const overlapX = (ac.halfWidth + bc.halfWidth) - Math.abs(dx);
  const overlapY = (ac.halfHeight + bc.halfHeight) - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) return null;

  let normal: Vec2;
  let depth: number;
  if (overlapX < overlapY) {
    normal = new Vec2(dx > 0 ? 1 : -1, 0);
    depth = overlapX;
  } else {
    normal = new Vec2(0, dy > 0 ? 1 : -1);
    depth = overlapY;
  }

  const contact = posA.add(normal.mul(ac.halfWidth));

  return {
    bodyA: a, bodyB: b,
    contacts: [{ position: contact, normal, depth }],
    normal, depth,
  };
}

function detectCollision(a: RigidBody, b: RigidBody): CollisionManifold | null {
  const sa = a.collider.shape;
  const sb = b.collider.shape;

  if (sa === 'circle' && sb === 'circle') return circleVsCircle(a, b);
  if (sa === 'circle' && sb === 'aabb') return circleVsAABB(a, b);
  if (sa === 'aabb' && sb === 'circle') {
    const m = circleVsAABB(b, a);
    if (m) { m.normal = m.normal.mul(-1); const tmp = m.bodyA; m.bodyA = m.bodyB; m.bodyB = tmp; }
    return m;
  }
  if (sa === 'aabb' && sb === 'aabb') return aabbVsAABB(a, b);

  return null;
}

/* ── Spatial Hash Grid for Broad Phase ── */
export class SpatialHashGrid {
  private cellSize: number;
  private cells = new Map<string, RigidBody[]>();

  constructor(cellSize: number = 64) {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  clear() { this.cells.clear(); }

  insert(body: RigidBody) {
    const minCX = Math.floor(body.aabb.min.x / this.cellSize);
    const minCY = Math.floor(body.aabb.min.y / this.cellSize);
    const maxCX = Math.floor(body.aabb.max.x / this.cellSize);
    const maxCY = Math.floor(body.aabb.max.y / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const k = this.key(cx, cy);
        const cell = this.cells.get(k);
        if (cell) cell.push(body);
        else this.cells.set(k, [body]);
      }
    }
  }

  query(aabb: AABB): Set<RigidBody> {
    const result = new Set<RigidBody>();
    const minCX = Math.floor(aabb.min.x / this.cellSize);
    const minCY = Math.floor(aabb.min.y / this.cellSize);
    const maxCX = Math.floor(aabb.max.x / this.cellSize);
    const maxCY = Math.floor(aabb.max.y / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) cell.forEach(b => result.add(b));
      }
    }
    return result;
  }

  getPairs(): [RigidBody, RigidBody][] {
    const checked = new Set<string>();
    const pairs: [RigidBody, RigidBody][] = [];

    for (const [, cell] of this.cells) {
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          const a = cell[i], b = cell[j];
          const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
          if (!checked.has(pairKey)) {
            checked.add(pairKey);
            if (a.aabb.intersects(b.aabb)) {
              pairs.push([a, b]);
            }
          }
        }
      }
    }
    return pairs;
  }
}

/* ── Constraint ── */
export interface DistanceConstraint {
  type: 'distance';
  bodyA: RigidBody;
  bodyB: RigidBody;
  anchorA: Vec2;
  anchorB: Vec2;
  distance: number;
  stiffness: number;
  damping: number;
}

export interface PinConstraint {
  type: 'pin';
  body: RigidBody;
  anchor: Vec2;
  worldPoint: Vec2;
  stiffness: number;
  damping: number;
}

export type Constraint = DistanceConstraint | PinConstraint;

/* ── Collision Event ── */
export interface CollisionEvent {
  bodyA: RigidBody;
  bodyB: RigidBody;
  manifold: CollisionManifold;
}

export type CollisionCallback = (event: CollisionEvent) => void;

/* ── Raycasting ── */
export interface RaycastHit {
  body: RigidBody;
  point: Vec2;
  normal: Vec2;
  distance: number;
}

function raycastCircle(origin: Vec2, direction: Vec2, maxDist: number, body: RigidBody): RaycastHit | null {
  const cc = body.collider as CircleCollider;
  const center = body.position.add(cc.offset);
  const oc = origin.sub(center);

  const a = direction.dot(direction);
  const b = 2 * oc.dot(direction);
  const c = oc.dot(oc) - cc.radius * cc.radius;
  const disc = b * b - 4 * a * c;

  if (disc < 0) return null;

  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0 || t > maxDist) return null;

  const point = origin.add(direction.mul(t));
  const normal = point.sub(center).normalize();

  return { body, point, normal, distance: t };
}

function raycastAABB(origin: Vec2, direction: Vec2, maxDist: number, body: RigidBody): RaycastHit | null {
  const ac = body.collider as AABBCollider;
  const center = body.position.add(ac.offset);
  const min = new Vec2(center.x - ac.halfWidth, center.y - ac.halfHeight);
  const max = new Vec2(center.x + ac.halfWidth, center.y + ac.halfHeight);

  const invDx = direction.x !== 0 ? 1 / direction.x : Infinity;
  const invDy = direction.y !== 0 ? 1 / direction.y : Infinity;

  let tmin = (min.x - origin.x) * invDx;
  let tmax = (max.x - origin.x) * invDx;
  if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

  let tymin = (min.y - origin.y) * invDy;
  let tymax = (max.y - origin.y) * invDy;
  if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

  if (tmin > tymax || tymin > tmax) return null;

  const tNear = Math.max(tmin, tymin);
  const tFar = Math.min(tmax, tymax);

  if (tNear < 0 || tNear > maxDist) return null;

  const point = origin.add(direction.mul(tNear));
  let normal = Vec2.zero();
  if (tmin > tymin) normal = new Vec2(direction.x > 0 ? -1 : 1, 0);
  else normal = new Vec2(0, direction.y > 0 ? -1 : 1);

  return { body, point, normal, distance: tNear };
}

/* ── PhysicsWorld ── */
export interface PhysicsWorldConfig {
  gravity?: Vec2;
  iterations?: number;
  sleepEnabled?: boolean;
  sleepVelocityThreshold?: number;
  sleepTimeThreshold?: number;
  broadPhaseCellSize?: number;
}

export class PhysicsWorld {
  gravity: Vec2;
  bodies: RigidBody[] = [];
  constraints: Constraint[] = [];
  private broadPhase: SpatialHashGrid;
  private iterations: number;
  private sleepEnabled: boolean;
  private sleepVelocityThreshold: number;
  private sleepTimeThreshold: number;
  private onCollision: CollisionCallback[] = [];
  private onSensor: CollisionCallback[] = [];

  constructor(config: PhysicsWorldConfig = {}) {
    this.gravity = config.gravity ?? new Vec2(0, 980);
    this.iterations = config.iterations ?? 8;
    this.sleepEnabled = config.sleepEnabled ?? true;
    this.sleepVelocityThreshold = config.sleepVelocityThreshold ?? 0.5;
    this.sleepTimeThreshold = config.sleepTimeThreshold ?? 0.5;
    this.broadPhase = new SpatialHashGrid(config.broadPhaseCellSize ?? 64);
  }

  addBody(body: RigidBody): RigidBody {
    this.bodies.push(body);
    return body;
  }

  removeBody(body: RigidBody) {
    const idx = this.bodies.indexOf(body);
    if (idx >= 0) this.bodies.splice(idx, 1);
  }

  addConstraint(constraint: Constraint) {
    this.constraints.push(constraint);
  }

  removeConstraint(constraint: Constraint) {
    const idx = this.constraints.indexOf(constraint);
    if (idx >= 0) this.constraints.splice(idx, 1);
  }

  onCollisionStart(callback: CollisionCallback) { this.onCollision.push(callback); }
  onSensorTrigger(callback: CollisionCallback) { this.onSensor.push(callback); }

  createCircleBody(x: number, y: number, radius: number, options: Partial<RigidBodyConfig> = {}): RigidBody {
    return this.addBody(new RigidBody({
      position: new Vec2(x, y),
      collider: { shape: 'circle', radius, offset: Vec2.zero() },
      ...options,
    }));
  }

  createBoxBody(x: number, y: number, width: number, height: number, options: Partial<RigidBodyConfig> = {}): RigidBody {
    return this.addBody(new RigidBody({
      position: new Vec2(x, y),
      collider: { shape: 'aabb', halfWidth: width / 2, halfHeight: height / 2, offset: Vec2.zero() },
      ...options,
    }));
  }

  createStaticBox(x: number, y: number, width: number, height: number, material?: PhysMaterial): RigidBody {
    return this.createBoxBody(x, y, width, height, { isStatic: true, material: material ?? MATERIALS.default });
  }

  createStaticCircle(x: number, y: number, radius: number, material?: PhysMaterial): RigidBody {
    return this.createCircleBody(x, y, radius, { isStatic: true, material: material ?? MATERIALS.default });
  }

  raycast(origin: Vec2, direction: Vec2, maxDist: number = 1000, filter?: (body: RigidBody) => boolean): RaycastHit | null {
    let closest: RaycastHit | null = null;

    for (const body of this.bodies) {
      if (filter && !filter(body)) continue;

      let hit: RaycastHit | null = null;
      switch (body.collider.shape) {
        case 'circle': hit = raycastCircle(origin, direction, maxDist, body); break;
        case 'aabb': hit = raycastAABB(origin, direction, maxDist, body); break;
      }

      if (hit && (!closest || hit.distance < closest.distance)) {
        closest = hit;
      }
    }

    return closest;
  }

  queryAABB(aabb: AABB): RigidBody[] {
    return this.bodies.filter(b => b.aabb.intersects(aabb));
  }

  queryPoint(point: Vec2): RigidBody[] {
    return this.bodies.filter(b => {
      if (!b.aabb.containsPoint(point)) return false;
      if (b.collider.shape === 'circle') {
        const cc = b.collider as CircleCollider;
        return b.position.add(cc.offset).distSqTo(point) <= cc.radius * cc.radius;
      }
      return true;
    });
  }

  step(dt: number) {
    if (dt <= 0) return;
    dt = Math.min(dt, 1 / 30);

    /* 1. Integrate forces → velocity */
    for (const body of this.bodies) {
      if (body.isStatic || body.sleeping) continue;

      const grav = this.gravity.mul(body.gravityScale * dt);
      body.velocity.addSelf(grav);

      const accel = body.force.mul(body.invMass * dt);
      body.velocity.addSelf(accel);
      body.angularVelocity += body.torque * body.invInertia * dt;

      body.velocity.mulSelf(1 - body.linearDamping);
      body.angularVelocity *= (1 - body.angularDamping);

      body.force.set(0, 0);
      body.torque = 0;
    }

    /* 2. Broad phase */
    this.broadPhase.clear();
    for (const body of this.bodies) {
      body.updateAABB();
      this.broadPhase.insert(body);
    }

    const pairs = this.broadPhase.getPairs();

    /* 3. Narrow phase + resolve */
    const manifolds: CollisionManifold[] = [];
    for (const [a, b] of pairs) {
      if (a.isStatic && b.isStatic) continue;
      if (a.sleeping && b.sleeping) continue;

      if ((a.group & b.mask) === 0 || (b.group & a.mask) === 0) continue;

      const manifold = detectCollision(a, b);
      if (!manifold) continue;

      if (a.isSensor || b.isSensor) {
        const event: CollisionEvent = { bodyA: a, bodyB: b, manifold };
        for (const cb of this.onSensor) cb(event);
        continue;
      }

      manifolds.push(manifold);
      const event: CollisionEvent = { bodyA: a, bodyB: b, manifold };
      for (const cb of this.onCollision) cb(event);
    }

    /* 4. Resolve collisions iteratively */
    for (let iter = 0; iter < this.iterations; iter++) {
      for (const m of manifolds) {
        this.resolveCollision(m);
      }
    }

    /* 5. Positional correction */
    for (const m of manifolds) {
      this.positionalCorrection(m);
    }

    /* 6. Solve constraints */
    for (let iter = 0; iter < this.iterations; iter++) {
      for (const c of this.constraints) {
        this.solveConstraint(c, dt);
      }
    }

    /* 7. Integrate velocity → position */
    for (const body of this.bodies) {
      if (body.isStatic) continue;
      if (body.sleeping) continue;

      body.position.addSelf(body.velocity.mul(dt));
      body.angle += body.angularVelocity * dt;

      body.updateAABB();

      /* Sleep check */
      if (this.sleepEnabled) {
        const speed = body.velocity.length() + Math.abs(body.angularVelocity);
        if (speed < this.sleepVelocityThreshold) {
          body.sleepTimer += dt;
          if (body.sleepTimer > this.sleepTimeThreshold) {
            body.sleeping = true;
            body.velocity.set(0, 0);
            body.angularVelocity = 0;
          }
        } else {
          body.sleepTimer = 0;
        }
      }
    }
  }

  private resolveCollision(m: CollisionManifold) {
    const a = m.bodyA;
    const b = m.bodyB;

    for (const contact of m.contacts) {
      const rA = contact.position.sub(a.position);
      const rB = contact.position.sub(b.position);

      const velA = a.velocity.add(new Vec2(-a.angularVelocity * rA.y, a.angularVelocity * rA.x));
      const velB = b.velocity.add(new Vec2(-b.angularVelocity * rB.y, b.angularVelocity * rB.x));
      const relVel = velA.sub(velB);

      const contactVel = relVel.dot(contact.normal);
      if (contactVel > 0) continue;

      const e = Math.min(a.material.restitution, b.material.restitution);

      const rACrossN = rA.cross(contact.normal);
      const rBCrossN = rB.cross(contact.normal);
      const invMassSum = a.invMass + b.invMass +
        rACrossN * rACrossN * a.invInertia +
        rBCrossN * rBCrossN * b.invInertia;

      const j = -(1 + e) * contactVel / (invMassSum || 1);
      const impulse = contact.normal.mul(j);

      a.velocity.addSelf(impulse.mul(a.invMass));
      b.velocity.subSelf(impulse.mul(b.invMass));
      if (!a.fixedRotation) a.angularVelocity += rA.cross(impulse) * a.invInertia;
      if (!b.fixedRotation) b.angularVelocity -= rB.cross(impulse) * b.invInertia;

      /* Friction */
      const tangent = relVel.sub(contact.normal.mul(contactVel)).normalize();
      const jt = -relVel.dot(tangent) / (invMassSum || 1);
      const mu = Math.sqrt(a.material.friction * b.material.friction);

      let frictionImpulse: Vec2;
      if (Math.abs(jt) < j * mu) {
        frictionImpulse = tangent.mul(jt);
      } else {
        frictionImpulse = tangent.mul(-j * mu);
      }

      a.velocity.addSelf(frictionImpulse.mul(a.invMass));
      b.velocity.subSelf(frictionImpulse.mul(b.invMass));

      a.wake();
      b.wake();
    }
  }

  private positionalCorrection(m: CollisionManifold) {
    const a = m.bodyA;
    const b = m.bodyB;
    const percent = 0.4;
    const slop = 0.01;
    const correction = m.normal.mul(Math.max(m.depth - slop, 0) / ((a.invMass + b.invMass) || 1) * percent);

    a.position.subSelf(correction.mul(a.invMass));
    b.position.addSelf(correction.mul(b.invMass));
  }

  private solveConstraint(c: Constraint, dt: number) {
    if (c.type === 'distance') {
      const { bodyA, bodyB, anchorA, anchorB, distance, stiffness, damping } = c;
      const worldA = bodyA.getWorldPoint(anchorA);
      const worldB = bodyB.getWorldPoint(anchorB);
      const delta = worldB.sub(worldA);
      const currentDist = delta.length();
      if (currentDist < 0.0001) return;

      const dir = delta.div(currentDist);
      const stretch = currentDist - distance;

      const relVel = bodyB.getVelocityAtPoint(worldB).sub(bodyA.getVelocityAtPoint(worldA));
      const dampForce = relVel.dot(dir) * damping;

      const force = dir.mul((stretch * stiffness + dampForce) * dt);

      bodyA.applyImpulse(force, worldA);
      bodyB.applyImpulse(force.mul(-1), worldB);
    } else if (c.type === 'pin') {
      const { body, anchor, worldPoint, stiffness, damping } = c;
      const bodyAnchor = body.getWorldPoint(anchor);
      const delta = worldPoint.sub(bodyAnchor);
      const vel = body.getVelocityAtPoint(bodyAnchor);

      const force = delta.mul(stiffness * dt).sub(vel.mul(damping * dt));
      body.applyImpulse(force, bodyAnchor);
    }
  }

  clear() {
    this.bodies = [];
    this.constraints = [];
  }
}

/* ── Helper: Create common physics setups ── */
export function createBreakoutPhysics(width: number, height: number): PhysicsWorld {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 0), iterations: 6 });
  world.createStaticBox(width / 2, -5, width, 10, MATERIALS.metal);
  world.createStaticBox(-5, height / 2, 10, height, MATERIALS.metal);
  world.createStaticBox(width + 5, height / 2, 10, height, MATERIALS.metal);
  return world;
}

export function createPongPhysics(width: number, height: number): PhysicsWorld {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 0), iterations: 4 });
  world.createStaticBox(width / 2, -5, width, 10, MATERIALS.bouncy);
  world.createStaticBox(width / 2, height + 5, width, 10, MATERIALS.bouncy);
  return world;
}

export function createPlatformPhysics(): PhysicsWorld {
  return new PhysicsWorld({ gravity: new Vec2(0, 1200), iterations: 6, sleepEnabled: true });
}

/* ── Verlet Rope/Chain ── */
export class VerletRope {
  points: Vec2[];
  prevPoints: Vec2[];
  locked: boolean[];
  segmentLength: number;
  gravity: Vec2;
  iterations: number;
  damping: number;

  constructor(start: Vec2, end: Vec2, segments: number, gravity: Vec2 = new Vec2(0, 400), iterations: number = 5) {
    this.points = [];
    this.prevPoints = [];
    this.locked = [];
    this.segmentLength = start.distTo(end) / segments;
    this.gravity = gravity;
    this.iterations = iterations;
    this.damping = 0.99;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = start.lerp(end, t);
      this.points.push(p.clone());
      this.prevPoints.push(p.clone());
      this.locked.push(false);
    }
    this.locked[0] = true;
  }

  lockPoint(index: number, pos?: Vec2) {
    this.locked[index] = true;
    if (pos) this.points[index].copy(pos);
  }

  unlockPoint(index: number) {
    this.locked[index] = false;
  }

  update(dt: number) {
    for (let i = 0; i < this.points.length; i++) {
      if (this.locked[i]) continue;

      const p = this.points[i];
      const prev = this.prevPoints[i];
      const vel = p.sub(prev).mulSelf(this.damping);

      this.prevPoints[i].copy(p);
      p.addSelf(vel);
      p.addSelf(this.gravity.mul(dt * dt));
    }

    for (let iter = 0; iter < this.iterations; iter++) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const a = this.points[i];
        const b = this.points[i + 1];
        const diff = b.sub(a);
        const dist = diff.length();
        if (dist < 0.0001) continue;

        const error = (dist - this.segmentLength) / dist;
        const correction = diff.mul(error * 0.5);

        if (!this.locked[i]) a.addSelf(correction);
        if (!this.locked[i + 1]) b.subSelf(correction);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, color: string = '#ffffff', lineWidth: number = 2) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/* ── Simple Spring-Damper System ── */
export class SpringDamper {
  position: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;

  constructor(initial: number = 0, stiffness: number = 300, damping: number = 20) {
    this.position = initial;
    this.velocity = 0;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target: number) {
    this.target = target;
  }

  update(dt: number): number {
    const force = (this.target - this.position) * this.stiffness;
    const dampForce = -this.velocity * this.damping;
    this.velocity += (force + dampForce) * dt;
    this.position += this.velocity * dt;
    return this.position;
  }

  isSettled(threshold: number = 0.01): boolean {
    return Math.abs(this.velocity) < threshold && Math.abs(this.position - this.target) < threshold;
  }
}

/* ── 2D Spring Damper ── */
export class SpringDamper2D {
  position: Vec2;
  velocity: Vec2;
  target: Vec2;
  stiffness: number;
  damping: number;

  constructor(initial: Vec2 = Vec2.zero(), stiffness: number = 300, damping: number = 20) {
    this.position = initial.clone();
    this.velocity = Vec2.zero();
    this.target = initial.clone();
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target: Vec2) { this.target.copy(target); }

  update(dt: number): Vec2 {
    const force = this.target.sub(this.position).mul(this.stiffness);
    const dampForce = this.velocity.mul(-this.damping);
    const accel = force.add(dampForce);
    this.velocity.addSelf(accel.mul(dt));
    this.position.addSelf(this.velocity.mul(dt));
    return this.position;
  }
}
