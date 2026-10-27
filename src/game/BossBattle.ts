import { circleRect, type Hit } from './collision.ts';
import type { BossAttackKind, BreakoutConfig } from './config.ts';
import { createBoss } from './entities.ts';
import type { Ball, Boss, Bullet, Laser, Paddle, Telegraph } from './types.ts';

const DEG = Math.PI / 180;

export interface BossBallContact {
  hit: Hit;
  /** ボスにダメージが入ったか (上面への接触や無敵時間中は false) */
  damaged: boolean;
}

/**
 * ボス戦の状態 (ボス本体・予告・弾・レーザー) と進行。
 * ボスは左右に往復し、一定間隔で「予告 → 攻撃」を行う。
 * 予告中は移動を止めて光るので、プレイヤーは見てから避けられる。
 */
export class BossBattle {
  readonly boss: Boss;
  bullets: Bullet[] = [];
  lasers: Laser[] = [];
  telegraph: Telegraph | null = null;

  private attackTimer: number;
  private patternStep = 0;
  private lastPhaseIndex = 0;
  /** 往復運動の位相 */
  private movePhase = 0;
  private hitCooldown = 0;

  constructor(
    private readonly cfg: BreakoutConfig,
    private readonly fieldWidth: number,
    private readonly fieldHeight: number,
  ) {
    this.boss = createBoss(cfg, fieldWidth);
    this.attackTimer = this.phase.interval;
  }

  /** 残り HP で決まる現在の段階 (0 始まり) */
  get phaseIndex(): number {
    const ratio = this.boss.hp / this.boss.maxHp;
    let index = 0;
    this.cfg.boss.phases.forEach((p, i) => {
      if (ratio <= p.hpRatio) index = i;
    });
    return index;
  }

  get defeated(): boolean {
    return this.boss.hp <= 0;
  }

  private get phase(): BreakoutConfig['boss']['phases'][number] {
    const { phases } = this.cfg.boss;
    return phases[this.phaseIndex] ?? phases[0];
  }

  /**
   * @param attacking false の間は移動だけ行い、新しい攻撃を始めない (発射待ち中など)
   */
  update(dt: number, paddle: Paddle, attacking: boolean): void {
    const { boss } = this;
    boss.prevX = boss.x;
    boss.flashTime = Math.max(0, boss.flashTime - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);

    // 段階が上がったら攻撃パターンを最初から始める
    if (this.phaseIndex !== this.lastPhaseIndex) {
      this.lastPhaseIndex = this.phaseIndex;
      this.patternStep = 0;
    }

    if (!this.telegraph && !this.defeated) this.move(dt);
    this.updateProjectiles(dt);

    if (this.defeated) return;

    if (this.telegraph) {
      this.telegraph.time += dt;
      if (this.telegraph.time >= this.telegraph.duration) {
        this.fire(this.telegraph, paddle);
        this.telegraph = null;
        this.attackTimer = this.phase.interval;
      }
    } else if (attacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.startAttack(paddle);
    }
  }

  /** ボールとボスの接触判定。ダメージ処理まで行い、反射はワールド側で行う */
  collideBall(ball: Ball): BossBallContact | null {
    const { boss } = this;
    if (this.defeated) return null;
    const hit = circleRect(
      ball.x,
      ball.y,
      ball.radius,
      boss.x - boss.width / 2,
      boss.y,
      boss.width,
      boss.height,
    );
    if (!hit) return null;

    const damaged = this.hitCooldown <= 0;
    if (damaged) {
      boss.hp = Math.max(0, boss.hp - 1);
      boss.flashTime = 0.15;
      this.hitCooldown = this.cfg.boss.hitCooldown;
      if (this.defeated) this.clearAttacks();
    }
    return { hit, damaged };
  }

  /**
   * 弾・レーザーがパドルに当たっているか。当たった弾は消える。
   * 無敵時間中は呼ばないことで、弾がすり抜けるようにしている。
   */
  hitsPaddle(paddle: Paddle): boolean {
    const left = paddle.x - paddle.width / 2;
    let hit = false;

    this.bullets = this.bullets.filter((b) => {
      const touching = circleRect(b.x, b.y, b.radius, left, paddle.y, paddle.width, paddle.height);
      if (touching) hit = true;
      return !touching;
    });

    for (const laser of this.lasers) {
      if (Math.abs(laser.x - paddle.x) < (laser.width + paddle.width) / 2) hit = true;
    }
    return hit;
  }

  /** 弾・レーザー・予告をすべて消す (ミス後の仕切り直しや撃破時) */
  clearAttacks(): void {
    this.bullets = [];
    this.lasers = [];
    this.telegraph = null;
    this.attackTimer = this.phase.interval;
  }

  get laserWidth(): number {
    return this.cfg.boss.attacks.laser.width;
  }

  /** レーザーが伸びる上端 (ボスの下端) */
  get laserTop(): number {
    return this.boss.y + this.boss.height;
  }

  private move(dt: number): void {
    const { boss, cfg, fieldWidth } = this;
    const amplitude = fieldWidth / 2 - cfg.boss.wallMargin - boss.width / 2;
    this.movePhase += dt * this.phase.moveSpeed;
    boss.x = fieldWidth / 2 + Math.sin(this.movePhase) * amplitude;
  }

  private updateProjectiles(dt: number): void {
    for (const b of this.bullets) {
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.bullets = this.bullets.filter(
      (b) => b.y - b.radius < this.fieldHeight && b.x + b.radius > 0 && b.x - b.radius < this.fieldWidth,
    );

    for (const laser of this.lasers) laser.timeLeft -= dt;
    this.lasers = this.lasers.filter((l) => l.timeLeft > 0);
  }

  private startAttack(paddle: Paddle): void {
    const { pattern } = this.phase;
    const kind: BossAttackKind = pattern[this.patternStep % pattern.length] ?? 'aimed';
    this.patternStep += 1;

    const { width } = this.cfg.boss.attacks.laser;
    const half = width / 2;
    this.telegraph = {
      kind,
      time: 0,
      duration: this.cfg.boss.attacks[kind].telegraph,
      // レーザーは予告開始時点のパドル位置を狙い、照準はその後動かない
      targetX: Math.max(half, Math.min(this.fieldWidth - half, paddle.x)),
    };
  }

  private fire(telegraph: Telegraph, paddle: Paddle): void {
    const { attacks } = this.cfg.boss;
    const originX = this.boss.x;
    const originY = this.boss.y + this.boss.height;

    switch (telegraph.kind) {
      case 'aimed': {
        const angle = this.angleTo(originX, originY, paddle);
        this.spawnBullet(originX, originY, angle, attacks.aimed.speed);
        break;
      }
      case 'spread': {
        const { bullets, spreadAngle, speed } = attacks.spread;
        const center = this.angleTo(originX, originY, paddle);
        for (let i = 0; i < bullets; i++) {
          this.spawnBullet(originX, originY, center + (i - (bullets - 1) / 2) * spreadAngle, speed);
        }
        break;
      }
      case 'laser':
        this.lasers.push({
          x: telegraph.targetX,
          width: attacks.laser.width,
          timeLeft: attacks.laser.duration,
        });
        break;
    }
  }

  /** 真下を 0 度とした、パドル中心への角度。真横に近い弾にならないよう制限する */
  private angleTo(x: number, y: number, paddle: Paddle): number {
    const angle = Math.atan2(paddle.x - x, Math.max(1, paddle.y - y)) / DEG;
    return Math.max(-50, Math.min(50, angle));
  }

  private spawnBullet(x: number, y: number, angleDeg: number, speed: number): void {
    const a = angleDeg * DEG;
    this.bullets.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx: Math.sin(a) * speed,
      vy: Math.cos(a) * speed,
      radius: this.cfg.boss.attacks.bulletRadius,
    });
  }
}
