import { EventBus } from '../core/EventBus.ts';
import { BossBattle } from './BossBattle.ts';
import { circleRect, type Hit } from './collision.ts';
import { BREAKOUT_CONFIG, type BreakoutConfig, type ItemKind } from './config.ts';
import {
  buildBricks,
  createBall,
  createItem,
  createPaddle,
  createSafetyBar,
} from './entities.ts';
import type { GameEventMap } from './events.ts';
import { rollItem, type DropTable } from './items.ts';
import {
  bounceOffBar,
  bounceOffHit,
  bounceOffPaddle,
  bounceOffWalls,
  enforceMinVertical,
  launchAtAngle,
  rotate,
  setSpeed,
  type Bounds,
} from './physics.ts';
import { STAGES, type StageDef } from './stages.ts';
import type { Ball, Brick, Controls, Item, Paddle, Phase, SafetyBar } from './types.ts';

/** ルールの上書き (開発時のテスト用)。指定しなければ通常のルール */
export interface WorldOptions {
  /** LIFE / PLAYER HP が減らない */
  infiniteLife?: boolean;
}

/**
 * ブロック崩しのゲーム状態と進行。DOM や描画には依存しない。
 * ステージは STAGES の順に進み、ブロックステージとボス戦で勝敗条件が切り替わる。
 */
export class BreakoutWorld {
  readonly events = new EventBus<GameEventMap>();

  phase: Phase = 'title';
  score = 0;
  lives: number;
  stageIndex = 0;
  /** 今回のゲームを開始したステージ (ステージ選択で途中から始めた場合は 0 以外) */
  startStageIndex = 0;

  readonly paddle: Paddle;
  /** 複数ボールに対応できるよう配列で保持する */
  balls: Ball[] = [];
  bricks: Brick[] = [];
  items: Item[] = [];
  safetyBar: SafetyBar | null = null;
  /** WIDE PADDLE の残り時間 (0 なら効果なし) */
  wideTimeLeft = 0;

  /** ボス戦のときだけ存在する */
  battle: BossBattle | null = null;
  /** ボス戦のプレイヤー HP */
  playerHp = 0;
  playerMaxHp = 0;
  /** 被弾後の無敵時間の残り */
  invincibleTime = 0;

  private stageClearTimer = 0;
  private readonly bounds: Bounds;
  private readonly brickDropTable: DropTable;
  private readonly bossDropTable: DropTable;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly cfg: BreakoutConfig = BREAKOUT_CONFIG,
    private readonly options: WorldOptions = {},
  ) {
    this.lives = cfg.lives;
    this.bounds = { left: 0, right: width, top: cfg.field.top };
    this.paddle = createPaddle(cfg, width, height);
    this.brickDropTable = { chance: cfg.items.dropChance, weights: cfg.items.weights };
    this.bossDropTable = { chance: cfg.boss.items.dropChance, weights: cfg.boss.items.weights };
    this.returnToTitle();
  }

  get maxLives(): number {
    return this.cfg.lives;
  }

  get stage(): StageDef {
    const stage = STAGES[this.stageIndex];
    if (!stage) throw new Error(`Stage ${this.stageIndex} is not defined`);
    return stage;
  }

  get stageCount(): number {
    return STAGES.length;
  }

  /** ステージクリア演出の経過割合 (0..1) */
  get stageClearProgress(): number {
    return 1 - Math.max(0, this.stageClearTimer) / this.cfg.stageClearDelay;
  }

  /**
   * ゲームを開始する。
   * @param stageIndex 開始ステージ (0 始まり)。範囲外は最も近いステージに丸める
   */
  newGame(stageIndex = 0): void {
    this.score = 0;
    this.lives = this.cfg.lives;
    this.invincibleTime = 0;
    this.paddle.x = this.paddle.prevX = this.width / 2;
    this.startStageIndex = Math.max(0, Math.min(STAGES.length - 1, Math.floor(stageIndex)));
    this.loadStage(this.startStageIndex);
  }

  /** 開始画面に戻る。背景として STAGE 1 の盤面を表示しておく */
  returnToTitle(): void {
    this.loadStage(0);
    this.setPhase('title');
  }

  update(dt: number, controls: Controls): void {
    if (this.phase === 'stageclear') {
      this.updateStageClear(dt);
      return;
    }
    if (this.phase !== 'serve' && this.phase !== 'playing') return;

    this.movePaddle(dt, controls);
    this.updateEffects(dt);
    this.battle?.update(dt, this.paddle, this.phase === 'playing');

    if (this.phase === 'serve') {
      for (const ball of this.balls) this.placeOnPaddle(ball);
      if (controls.launch) this.launch();
      return;
    }

    const survivors: Ball[] = [];
    for (const ball of this.balls) {
      ball.prevX = ball.x;
      ball.prevY = ball.y;
      if (this.stepBall(ball, dt)) survivors.push(ball);
    }
    this.balls = survivors;

    this.updateItems(dt);
    this.checkBossAttacks();
    if (this.phase !== 'playing') return;

    if (this.isStageCleared()) {
      this.clearStage();
    } else if (this.balls.length === 0) {
      this.missBall();
    }
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.events.emit('phaseChange', { phase });
  }

  private loadStage(index: number): void {
    const stage = STAGES[index];
    if (!stage) throw new Error(`Stage ${index} is not defined`);
    this.stageIndex = index;
    this.resetEffects();
    this.paddle.width = this.paddle.targetWidth;

    if (stage.kind === 'bricks') {
      this.bricks = buildBricks(stage, this.cfg, this.width);
      this.battle = null;
    } else {
      this.bricks = [];
      this.battle = new BossBattle(this.cfg, this.width, this.height);
      // 残りライフがボス戦の HP に上乗せされる
      const base = this.cfg.boss.playerBaseHp;
      this.playerMaxHp = base + this.cfg.lives;
      this.playerHp = base + this.lives;
      this.invincibleTime = 0;
    }

    this.events.emit('stageStart', { stageIndex: index });
    this.serve();
  }

  private isStageCleared(): boolean {
    if (this.battle) return this.battle.defeated;
    return this.bricks.every((b) => !b.alive || !b.breakable);
  }

  private serve(): void {
    const ball = createBall(this.cfg);
    this.placeOnPaddle(ball);
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    this.balls = [ball];
    this.battle?.clearAttacks();
    this.setPhase('serve');
  }

  private launch(): void {
    const spread = this.cfg.ball.launchAngle;
    for (const ball of this.balls) {
      launchAtAngle(ball, (Math.random() * 2 - 1) * spread);
      this.events.emit('ballLaunch', { ball });
    }
    this.setPhase('playing');
  }

  private placeOnPaddle(ball: Ball): void {
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    ball.x = this.paddle.x;
    ball.y = this.paddle.y - ball.radius - 1;
  }

  private movePaddle(dt: number, controls: Controls): void {
    const p = this.paddle;
    p.prevX = p.x;
    if (controls.paddleX !== null) {
      p.x = controls.paddleX;
    } else if (controls.paddleDir !== 0) {
      p.x += controls.paddleDir * this.cfg.paddle.keyboardSpeed * dt;
    }
    this.clampPaddle();
  }

  private clampPaddle(): void {
    const p = this.paddle;
    const half = p.width / 2;
    p.x = Math.max(half, Math.min(this.width - half, p.x));
  }

  /** アイテム効果・無敵時間などの時間経過 */
  private updateEffects(dt: number): void {
    const p = this.paddle;
    if (this.wideTimeLeft > 0) {
      this.wideTimeLeft = Math.max(0, this.wideTimeLeft - dt);
      if (this.wideTimeLeft === 0) p.targetWidth = this.cfg.paddle.width;
    }
    if (p.width !== p.targetWidth) {
      const step = this.cfg.paddle.resizeSpeed * dt;
      const diff = p.targetWidth - p.width;
      p.width = Math.abs(diff) <= step ? p.targetWidth : p.width + Math.sign(diff) * step;
      this.clampPaddle();
    }

    const bar = this.safetyBar;
    if (bar) {
      bar.timeLeft -= dt;
      if (bar.timeLeft <= 0 || bar.charges <= 0) this.safetyBar = null;
    }

    this.invincibleTime = Math.max(0, this.invincibleTime - dt);
  }

  /** ミスやステージ切り替えで、アイテム効果をすべて解除する */
  private resetEffects(): void {
    this.items = [];
    this.safetyBar = null;
    this.wideTimeLeft = 0;
    this.paddle.targetWidth = this.cfg.paddle.width;
  }

  /** ボールを1ステップ進める。画面外に落ちたら false。 */
  private stepBall(ball: Ball, dt: number): boolean {
    // すり抜け防止: 1回の移動量が半径の半分以下になるよう分割する
    const steps = Math.max(1, Math.ceil((ball.speed * dt) / (ball.radius * 0.5)));
    const h = dt / steps;
    const { maxBounceAngle, bounceCurve, minVerticalRatio } = this.cfg.ball;

    for (let i = 0; i < steps; i++) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;

      if (bounceOffWalls(ball, this.bounds)) {
        enforceMinVertical(ball, minVerticalRatio);
        this.events.emit('wallHit', { ball });
      }

      const bar = this.safetyBar;
      if (bar && bar.charges > 0 && bounceOffBar(ball, bar)) {
        bar.charges -= 1;
        enforceMinVertical(ball, minVerticalRatio);
        this.events.emit('safetyBounce', { ball });
      }

      if (ball.y - ball.radius > this.height) return false;

      if (bounceOffPaddle(ball, this.paddle, maxBounceAngle, bounceCurve)) {
        this.events.emit('paddleHit', { ball });
      }

      if (this.battle) {
        this.collideBoss(ball);
      } else {
        this.collideBricks(ball);
      }
    }
    return true;
  }

  /** 最も深く重なっているブロック1つとだけ衝突させる (継ぎ目での二重反射を防ぐ) */
  private collideBricks(ball: Ball): void {
    let target: Brick | null = null;
    let targetHit: Hit | null = null;
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const hit = circleRect(ball.x, ball.y, ball.radius, brick.x, brick.y, brick.width, brick.height);
      if (hit && (!targetHit || hit.depth > targetHit.depth)) {
        target = brick;
        targetHit = hit;
      }
    }
    if (!target || !targetHit) return;

    bounceOffHit(ball, targetHit);
    this.damageBrick(target, ball);
  }

  private damageBrick(brick: Brick, ball: Ball): void {
    this.events.emit('brickHit', { brick, ball });
    if (!brick.breakable) return;

    brick.hp -= 1;
    if (brick.hp > 0) return;

    brick.alive = false;
    this.score += brick.score;
    const { speedUpPerHit, maxSpeed } = this.cfg.ball;
    setSpeed(ball, Math.min(maxSpeed, ball.speed + speedUpPerHit));
    this.events.emit('brickDestroyed', { brick, ball });

    if (brick.dropsItems) {
      this.trySpawnItem(this.brickDropTable, brick.x + brick.width / 2, brick.y + brick.height / 2);
    }
  }

  private collideBoss(ball: Ball): void {
    const battle = this.battle;
    if (!battle) return;
    const contact = battle.collideBall(ball);
    if (!contact) return;

    bounceOffHit(ball, contact.hit);
    if (!contact.damaged) return;

    this.score += this.cfg.boss.hitScore;
    this.events.emit('bossHit', { hp: battle.boss.hp, ball });
    if (!battle.defeated) {
      this.trySpawnItem(this.bossDropTable, ball.x, battle.boss.y + battle.boss.height);
    }
  }

  private trySpawnItem(table: DropTable, x: number, y: number): void {
    if (this.items.length >= this.cfg.items.maxFalling) return;
    const kind = rollItem(table);
    if (!kind) return;
    const half = this.cfg.items.width / 2;
    const item = createItem(this.cfg, kind, Math.max(half, Math.min(this.width - half, x)), y);
    this.items.push(item);
    this.events.emit('itemSpawn', { item });
  }

  /** 落下中のアイテムを動かし、パドルに触れたら効果を発動する */
  private updateItems(dt: number): void {
    const p = this.paddle;
    const { fallSpeed } = this.cfg.items;
    this.items = this.items.filter((item) => {
      item.prevY = item.y;
      item.y += fallSpeed * dt;

      const caught =
        Math.abs(item.x - p.x) <= (item.width + p.width) / 2 &&
        item.y + item.height / 2 >= p.y &&
        item.y - item.height / 2 <= p.y + p.height;
      if (caught) {
        this.applyItem(item.kind);
        this.events.emit('itemCollected', { kind: item.kind, x: item.x, y: p.y });
        return false;
      }
      return item.y - item.height / 2 <= this.height;
    });
  }

  private applyItem(kind: ItemKind): void {
    const { items } = this.cfg;
    switch (kind) {
      case 'multi':
        this.multiplyBalls(this.battle ? this.cfg.boss.items.maxBalls : items.multi.maxBalls);
        break;
      case 'wide':
        // 効果中に取り直すと時間が最初からになる
        this.wideTimeLeft = items.wide.duration;
        this.paddle.targetWidth = items.wide.width;
        break;
      case 'safety':
        this.safetyBar = createSafetyBar(this.cfg, this.paddle);
        break;
    }
  }

  /** 各ボールを元の向きと左右の3つに分裂させ、ボール数を3倍にする (上限あり) */
  private multiplyBalls(maxBalls: number): void {
    const { splitAngle } = this.cfg.items.multi;
    const { minVerticalRatio } = this.cfg.ball;
    const sources = [...this.balls];
    for (const source of sources) {
      for (const angle of [-splitAngle, splitAngle]) {
        if (this.balls.length >= maxBalls) return;
        const twin: Ball = { ...source };
        rotate(twin, angle);
        enforceMinVertical(twin, minVerticalRatio);
        this.balls.push(twin);
      }
    }
  }

  /** ボスの弾・レーザーがパドルに当たったか */
  private checkBossAttacks(): void {
    const battle = this.battle;
    if (!battle || battle.defeated || this.invincibleTime > 0) return;
    if (battle.hitsPaddle(this.paddle)) this.damagePlayer(this.cfg.boss.attackDamage);
  }

  private damagePlayer(amount: number): void {
    // LIFE ∞ でも被弾演出と無敵時間は通常どおり発生させ、当たり判定を確認できるようにする
    if (!this.options.infiniteLife) this.playerHp = Math.max(0, this.playerHp - amount);
    this.invincibleTime = this.cfg.boss.playerInvincible;
    this.events.emit('playerDamaged', { hp: this.playerHp });
    if (this.playerHp <= 0) {
      this.battle?.clearAttacks();
      this.setPhase('gameover');
    }
  }

  private missBall(): void {
    if (this.battle) {
      // ボス戦ではライフの代わりに HP が減る
      this.damagePlayer(this.cfg.boss.ballDropDamage);
      if (this.playerHp > 0) {
        this.resetEffects();
        this.serve();
      }
      return;
    }

    if (!this.options.infiniteLife) this.lives -= 1;
    this.events.emit('lifeLost', { lives: this.lives });
    if (this.lives <= 0) {
      this.setPhase('gameover');
    } else {
      this.resetEffects();
      this.serve();
    }
  }

  private clearStage(): void {
    const bonus = this.battle
      ? this.cfg.boss.defeatScore + this.playerHp * this.cfg.boss.hpBonus
      : this.cfg.stageClearBonus;
    this.score += bonus;
    this.balls = [];
    this.items = [];
    this.safetyBar = null;
    this.battle?.clearAttacks();
    this.events.emit('stageClear', { stageIndex: this.stageIndex, bonus });
    this.stageClearTimer = this.cfg.stageClearDelay;
    this.setPhase('stageclear');
  }

  private updateStageClear(dt: number): void {
    // ボスの撃破演出 (点滅) のために、ボスの時間だけは進める
    this.battle?.update(dt, this.paddle, false);
    this.stageClearTimer -= dt;
    if (this.stageClearTimer > 0) return;

    const next = this.stageIndex + 1;
    if (next < STAGES.length) {
      this.loadStage(next);
    } else {
      this.setPhase('clear');
    }
  }
}
