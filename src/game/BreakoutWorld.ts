import { EventBus } from '../core/EventBus.ts';
import { circleRect, type Hit } from './collision.ts';
import { BREAKOUT_CONFIG, type BreakoutConfig } from './config.ts';
import { buildBricks, createBall, createPaddle } from './entities.ts';
import type { GameEventMap } from './events.ts';
import {
  bounceOffHit,
  bounceOffPaddle,
  bounceOffWalls,
  enforceMinVertical,
  launchAtAngle,
  setSpeed,
  type Bounds,
} from './physics.ts';
import { STAGES } from './stages.ts';
import type { Ball, Brick, Controls, Paddle, Phase } from './types.ts';

/**
 * ブロック崩しのゲーム状態と進行。DOM や描画には依存しない。
 */
export class BreakoutWorld {
  readonly events = new EventBus<GameEventMap>();

  phase: Phase = 'title';
  score = 0;
  lives: number;
  stageIndex = 0;

  readonly paddle: Paddle;
  /** 複数ボールに対応できるよう配列で保持する */
  balls: Ball[] = [];
  bricks: Brick[] = [];

  private readonly bounds: Bounds;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly cfg: BreakoutConfig = BREAKOUT_CONFIG,
  ) {
    this.lives = cfg.lives;
    this.bounds = { left: 0, right: width, top: cfg.field.top };
    this.paddle = createPaddle(cfg, width, height);
    // 開始画面の背景として盤面を表示しておく
    this.loadStage(0);
    this.setPhase('title');
  }

  get maxLives(): number {
    return this.cfg.lives;
  }

  newGame(): void {
    this.score = 0;
    this.lives = this.cfg.lives;
    this.paddle.x = this.paddle.prevX = this.width / 2;
    this.loadStage(0);
  }

  update(dt: number, controls: Controls): void {
    if (this.phase !== 'serve' && this.phase !== 'playing') return;

    this.movePaddle(dt, controls);

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

    if (this.bricks.every((b) => !b.alive)) {
      this.clearStage();
    } else if (this.balls.length === 0) {
      this.loseLife();
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
    this.bricks = buildBricks(stage, this.cfg, this.width);
    this.serve();
  }

  private serve(): void {
    const ball = createBall(this.cfg);
    this.placeOnPaddle(ball);
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    this.balls = [ball];
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
    const half = p.width / 2;
    p.x = Math.max(half, Math.min(this.width - half, p.x));
  }

  /** ボールを1ステップ進める。画面外に落ちたら false。 */
  private stepBall(ball: Ball, dt: number): boolean {
    // すり抜け防止: 1回の移動量が半径の半分以下になるよう分割する
    const steps = Math.max(1, Math.ceil((ball.speed * dt) / (ball.radius * 0.5)));
    const h = dt / steps;
    const { maxBounceAngle, minVerticalRatio } = this.cfg.ball;

    for (let i = 0; i < steps; i++) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;

      if (bounceOffWalls(ball, this.bounds)) {
        enforceMinVertical(ball, minVerticalRatio);
        this.events.emit('wallHit', { ball });
      }

      if (ball.y - ball.radius > this.height) return false;

      if (bounceOffPaddle(ball, this.paddle, maxBounceAngle)) {
        this.events.emit('paddleHit', { ball });
      }

      this.collideBricks(ball);
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
    brick.hp -= 1;
    this.events.emit('brickHit', { brick, ball });
    if (brick.hp > 0) return;

    brick.alive = false;
    this.score += brick.score;
    const { speedUpPerHit, maxSpeed } = this.cfg.ball;
    setSpeed(ball, Math.min(maxSpeed, ball.speed + speedUpPerHit));
    this.events.emit('brickDestroyed', { brick, ball });
  }

  private loseLife(): void {
    this.lives -= 1;
    this.events.emit('lifeLost', { lives: this.lives });
    if (this.lives <= 0) {
      this.setPhase('gameover');
    } else {
      this.serve();
    }
  }

  private clearStage(): void {
    this.events.emit('stageClear', { stageIndex: this.stageIndex });
    const next = this.stageIndex + 1;
    if (next < STAGES.length) {
      this.loadStage(next);
    } else {
      this.balls = [];
      this.setPhase('clear');
    }
  }
}
