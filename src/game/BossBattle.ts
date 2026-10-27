import { circleRect, type Hit } from './collision.ts';
import type { BossAttackKind, BreakoutConfig } from './config.ts';
import { createBoss } from './entities.ts';
import type { Ball, Boss, Bullet, Laser, Paddle, Telegraph } from './types.ts';

const DEG = Math.PI / 180;

export interface BossBallContact {
  hit: Hit;
  /** ボスにダメージが入ったか (無敵時間中は false) */
  damaged: boolean;
}

export interface BossPhase {
  hpRatio: number;
  moveSpeed: number;
  interval: number;
  pattern: readonly BossAttackKind[];
}

interface SpreadParams {
  telegraph: number;
  bullets: number;
  spreadAngle: number;
  speed: number;
}

/** 攻撃の性能。ボスごとに使う攻撃だけを定義する */
export interface BossAttacks {
  aimed?: { telegraph: number; speed: number };
  spread?: SpreadParams;
  fan?: SpreadParams;
  laser?: { telegraph: number; duration: number; width: number };
  burst?: { telegraph: number; count: number; interval: number; speed: number };
  spiral?: {
    telegraph: number;
    duration: number;
    interval: number;
    arms: number;
    turnSpeed: number;
    speed: number;
  };
  laserWall?: { telegraph: number; duration: number; gapMargin: number };
  bulletRadius: number;
}

/** ボスの行動パターン一式 (通常ボス: config.boss / 裏ボス: config.boss.ex) */
export interface BossProfile {
  phases: readonly BossPhase[];
  attacks: BossAttacks;
}

/** 予告のあと一定時間撃ち続ける攻撃 (連射・螺旋) の進行状態 */
interface Emitter {
  kind: 'burst' | 'spiral';
  time: number;
  /** 次の発射までの時間 */
  next: number;
  shots: number;
  angle: number;
}

/**
 * ボス戦の状態 (ボス本体・予告・弾・レーザー) と進行。
 * ボスは左右に往復し、一定間隔で「予告 → 攻撃」を行う。
 * 予告中と撃ち続けている間は移動を止めて光るので、プレイヤーは見てから避けられる。
 */
export class BossBattle {
  readonly boss: Boss;
  bullets: Bullet[] = [];
  lasers: Laser[] = [];
  telegraph: Telegraph | null = null;

  private emitter: Emitter | null = null;
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
    private readonly profile: BossProfile = cfg.boss,
  ) {
    this.boss = createBoss(cfg, fieldWidth);
    this.attackTimer = this.phase.interval;
  }

  /** 残り HP で決まる現在の段階 (0 始まり) */
  get phaseIndex(): number {
    const ratio = this.boss.hp / this.boss.maxHp;
    let index = 0;
    this.profile.phases.forEach((p, i) => {
      if (ratio <= p.hpRatio) index = i;
    });
    return index;
  }

  get defeated(): boolean {
    return this.boss.hp <= 0;
  }

  private get phase(): BossPhase {
    const { phases } = this.profile;
    const phase = phases[this.phaseIndex] ?? phases[0];
    if (!phase) throw new Error('Boss profile has no phases');
    return phase;
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

    if (!this.telegraph && !this.emitter && !this.defeated) this.move(dt);
    this.updateProjectiles(dt);

    if (this.defeated) return;

    if (this.emitter) {
      this.updateEmitter(dt, paddle);
    } else if (this.telegraph) {
      this.telegraph.time += dt;
      if (this.telegraph.time >= this.telegraph.duration) {
        const telegraph = this.telegraph;
        this.telegraph = null;
        this.fire(telegraph, paddle);
        if (!this.emitter) this.attackTimer = this.phase.interval;
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
    this.emitter = null;
    this.attackTimer = this.phase.interval;
  }

  /** 撃ち続ける攻撃の最中か (予告と同じく、ボスが構えた姿勢で描く) */
  get emitting(): boolean {
    return this.emitter !== null;
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
      (b) =>
        b.y - b.radius < this.fieldHeight &&
        b.y + b.radius > 0 &&
        b.x + b.radius > 0 &&
        b.x - b.radius < this.fieldWidth,
    );

    for (const laser of this.lasers) laser.timeLeft -= dt;
    this.lasers = this.lasers.filter((l) => l.timeLeft > 0);
  }

  private startAttack(paddle: Paddle): void {
    const { pattern } = this.phase;
    const { attacks } = this.profile;
    const kind: BossAttackKind = pattern[this.patternStep % pattern.length] ?? 'aimed';
    this.patternStep += 1;
    const params = attacks[kind];
    if (!params) return;

    this.telegraph = { kind, time: 0, duration: params.telegraph, zones: this.laserZones(kind, paddle) };
  }

  /**
   * レーザー系の照射範囲を予告開始時点で決める (以後は動かない)。
   * - laser: パドルの位置を狙う1本
   * - laserWall: 画面全体を覆い、パドルから遠い側に1か所だけ安全地帯を残す
   */
  private laserZones(kind: BossAttackKind, paddle: Paddle): Telegraph['zones'] {
    const w = this.fieldWidth;
    const { attacks } = this.profile;
    if (kind === 'laser' && attacks.laser) {
      const half = attacks.laser.width / 2;
      return [{ x: Math.max(half, Math.min(w - half, paddle.x)), width: attacks.laser.width }];
    }
    if (kind === 'laserWall' && attacks.laserWall) {
      const gap = paddle.width + attacks.laserWall.gapMargin;
      const margin = gap / 2 + 10;
      // 安全地帯はパドルと反対側の半分のどこか
      const onLeft = paddle.x > w / 2;
      const min = onLeft ? margin : w * 0.55;
      const max = onLeft ? w * 0.45 : w - margin;
      const center = min + Math.random() * Math.max(0, max - min);
      const left = center - gap / 2;
      const right = center + gap / 2;
      return [
        { x: left / 2, width: left },
        { x: (right + w) / 2, width: w - right },
      ];
    }
    return [];
  }

  private fire(telegraph: Telegraph, paddle: Paddle): void {
    const { attacks } = this.profile;
    const originX = this.boss.x;
    const originY = this.boss.y + this.boss.height;

    switch (telegraph.kind) {
      case 'aimed':
        if (attacks.aimed) this.spawnBullet(originX, originY, this.angleTo(originX, originY, paddle), attacks.aimed.speed);
        break;
      case 'spread':
      case 'fan': {
        const params = attacks[telegraph.kind];
        if (!params) break;
        const { bullets, spreadAngle, speed } = params;
        const center = this.angleTo(originX, originY, paddle);
        for (let i = 0; i < bullets; i++) {
          this.spawnBullet(originX, originY, center + (i - (bullets - 1) / 2) * spreadAngle, speed);
        }
        break;
      }
      case 'laser':
      case 'laserWall': {
        const duration = attacks[telegraph.kind]?.duration ?? 0;
        for (const zone of telegraph.zones) this.lasers.push({ ...zone, timeLeft: duration, duration });
        break;
      }
      case 'burst':
      case 'spiral':
        this.emitter = { kind: telegraph.kind, time: 0, next: 0, shots: 0, angle: Math.random() * 360 };
        break;
    }
  }

  /** 連射・螺旋弾を撃ち続け、終わったら次の攻撃までの待ちに入る */
  private updateEmitter(dt: number, paddle: Paddle): void {
    const e = this.emitter;
    if (!e) return;
    const { attacks } = this.profile;
    const originX = this.boss.x;
    const originY = this.boss.y + this.boss.height;
    e.time += dt;
    e.next -= dt;

    let done = true;
    if (e.kind === 'burst' && attacks.burst) {
      const { count, interval, speed } = attacks.burst;
      // 1発ごとにパドルを狙い直す
      while (e.next <= 0 && e.shots < count) {
        this.spawnBullet(originX, originY, this.angleTo(originX, originY, paddle), speed);
        e.shots += 1;
        e.next += interval;
      }
      done = e.shots >= count;
    } else if (e.kind === 'spiral' && attacks.spiral) {
      const { duration, interval, arms, turnSpeed, speed } = attacks.spiral;
      e.angle += turnSpeed * dt;
      while (e.next <= 0) {
        for (let i = 0; i < arms; i++) {
          // 真下を 0 度とする角度。上向きの弾は誰にも当たらないので撃たない
          const a = ((((e.angle + (360 / arms) * i) % 360) + 540) % 360) - 180;
          if (Math.abs(a) <= 80) this.spawnBullet(originX, originY, a, speed);
        }
        e.next += interval;
      }
      done = e.time >= duration;
    }

    if (done) {
      this.emitter = null;
      this.attackTimer = this.phase.interval;
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
      radius: this.profile.attacks.bulletRadius,
    });
  }
}
