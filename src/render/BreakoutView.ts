import type { BreakoutWorld } from '../game/BreakoutWorld.ts';
import { BREAKOUT_CONFIG, type ItemKind } from '../game/config.ts';
import type { Ball, Brick, Item, Paddle, SafetyBar } from '../game/types.ts';
import { drawBackground, drawFieldFrame } from './Background.ts';
import { drawBossBattle } from './BossView.ts';
import type { Effects } from './Effects.ts';
import type { Renderer } from './Renderer.ts';
import { brickColor, THEME } from './theme.ts';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * ゲーム盤面 (背景・ブロック・アイテム・パドル・ボール・ボス) の描画。状態は読むだけで変更しない。
 * 点滅や回転など見た目だけのアニメーションは描画側の時計 (performance.now) で動かす。
 */
export function drawWorld(r: Renderer, world: BreakoutWorld, alpha: number, fx: Effects): void {
  const top = BREAKOUT_CONFIG.field.top;
  const time = performance.now() / 1000;
  drawBackground(r, top);
  drawFieldFrame(r, top, world.battle ? THEME.orange : THEME.cyan);

  for (const brick of world.bricks) {
    if (!brick.alive) continue;
    if (brick.breakable) {
      drawBrick(r, brick);
    } else {
      drawSteel(r, brick, fx.steelFlashLevel(brick));
    }
  }
  fx.draw(r);

  if (world.battle) {
    drawBossBattle(r, world.battle, world.height, alpha, world.phase === 'stageclear' ? world.stageClearProgress : 0);
  }

  for (const item of world.items) drawItem(r, item, alpha, time);
  if (world.safetyBar) drawSafetyBar(r, world.safetyBar, world.width);

  // 被弾後の無敵時間中は点滅させる
  const blinking = world.invincibleTime > 0 && Math.floor(world.invincibleTime * 10) % 2 === 0;
  if (!blinking) drawPaddle(r, world.paddle, alpha, world.wideTimeLeft, time);

  for (const ball of world.balls) drawBall(r, ball, alpha);
}

/** 通常ブロック: 暗い内部に細い輪郭線。内側にごく薄い幾何学模様 */
function drawBrick(r: Renderer, brick: Brick): void {
  const { ctx } = r;
  const { x, y, width: w, height: h } = brick;
  const color = brickColor(brick.row);
  // 耐久力のあるブロックは残り HP に応じて薄くする
  const strength = 0.45 + 0.55 * (brick.hp / brick.maxHp);

  r.chamferRect(x, y, w, h, 5);
  ctx.fillStyle = THEME.core;
  ctx.fill();
  // 外側の弱い光 + 内側の細い線で、控えめな発光にする
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.16 * strength;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = 0.9 * strength;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.globalAlpha = 0.14 * strength;
  ctx.lineWidth = 1;
  r.chamferRect(x + 5, y + 5, w - 10, h - 10, 3);
  ctx.stroke();
  ctx.globalAlpha = 0.35 * strength;
  r.strokeLine(x + 5, y + h - 9, x + 9, y + h - 5, color);
  ctx.globalAlpha = 1;
}

/** 壊れないブロック: 白に近い二重線と固定の格子。衝突時に一瞬強く光る */
function drawSteel(r: Renderer, brick: Brick, flash: number): void {
  const { ctx } = r;
  const { x, y, width: w, height: h } = brick;
  const s = THEME.steel;

  r.fillRect(x, y, w, h, THEME.core);
  ctx.strokeStyle = s.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = x + 8; gx < x + w - 2; gx += 8) {
    ctx.moveTo(gx, y + 3);
    ctx.lineTo(gx, y + h - 3);
  }
  for (let gy = y + 8; gy < y + h - 2; gy += 8) {
    ctx.moveTo(x + 3, gy);
    ctx.lineTo(x + w - 3, gy);
  }
  ctx.stroke();

  if (flash > 0) {
    ctx.globalAlpha = 0.35 * flash;
    r.fillRect(x, y, w, h, s.line);
    r.setGlow(s.line, 14 * flash);
  }
  ctx.globalAlpha = 0.85 + 0.15 * flash;
  ctx.strokeStyle = s.line;
  ctx.lineWidth = 1.2 + flash;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  r.setGlow();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
  ctx.globalAlpha = 1;
}

/**
 * アイテム: ゆっくり回転するひし形の発光フレームの中に、効果を表す幾何学記号を置く。
 * 記号自体は回転させず、落下中でも読み取れるようにする。
 */
function drawItem(r: Renderer, item: Item, alpha: number, time: number): void {
  const { ctx } = r;
  const y = lerp(item.prevY, item.y, alpha);
  const color = THEME.items[item.kind];
  const blink = 0.75 + 0.25 * Math.sin(time * 6);

  ctx.save();
  ctx.translate(item.x, y);
  ctx.globalAlpha = blink;

  ctx.save();
  ctx.rotate(time * 1.2);
  const s = 15;
  r.polygon([
    [0, -s],
    [s, 0],
    [0, s],
    [-s, 0],
  ]);
  ctx.fillStyle = THEME.core;
  ctx.fill();
  r.setGlow(color, 10);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  r.setGlow();
  ctx.restore();

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawItemSymbol(ctx, item.kind);
  ctx.restore();
}

/** アイテムの記号 (中心原点、約 ±8px) */
function drawItemSymbol(ctx: CanvasRenderingContext2D, kind: ItemKind): void {
  ctx.beginPath();
  switch (kind) {
    case 'wide':
      // 左右へ伸びる: 両端に矢じりの付いた横線
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(-5, -3);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-5, 3);
      ctx.moveTo(5, -3);
      ctx.lineTo(8, 0);
      ctx.lineTo(5, 3);
      ctx.stroke();
      break;
    case 'multi':
      // 1つの光が3つに分かれる
      ctx.moveTo(0, -3);
      ctx.lineTo(-6, 5);
      ctx.moveTo(0, -3);
      ctx.lineTo(0, 6);
      ctx.moveTo(0, -3);
      ctx.lineTo(6, 5);
      ctx.stroke();
      for (const [px, py, pr] of [[0, -5, 2.2], [-6, 5, 1.6], [0, 6, 1.6], [6, 5, 1.6]] as const) {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'safety':
      // 下を守る: 床の線と、上へ跳ね返す山形
      ctx.moveTo(-8, 5);
      ctx.lineTo(8, 5);
      ctx.moveTo(-5, 1);
      ctx.lineTo(0, -4);
      ctx.lineTo(5, 1);
      ctx.stroke();
      break;
  }
}

/** セーフティバー: 画面幅の細い発光ライン。残り回数を小さな目盛りで示す */
function drawSafetyBar(r: Renderer, bar: SafetyBar, width: number): void {
  // 残り時間が少なくなったら点滅して知らせる
  if (bar.timeLeft < 3 && Math.floor(bar.timeLeft * 6) % 2 === 0) return;
  const { ctx } = r;
  const ratio = bar.charges / bar.maxCharges;
  const y = bar.y + bar.height / 2;
  ctx.globalAlpha = 0.5 + 0.5 * ratio;
  r.setGlow(THEME.safetyBar, 10);
  r.strokeLine(6, y, width - 6, y, THEME.safetyBar, 2);
  r.setGlow();
  ctx.globalAlpha = 0.25;
  r.strokeLine(6, y + 4, width - 6, y + 4, THEME.safetyBar, 1);

  ctx.globalAlpha = 1;
  const pip = 14;
  const gap = 6;
  const total = bar.maxCharges * pip + (bar.maxCharges - 1) * gap;
  for (let i = 0; i < bar.maxCharges; i++) {
    const px = (width - total) / 2 + i * (pip + gap);
    r.fillRect(px, y - 8, pip, 2, i < bar.charges ? THEME.safetyBar : THEME.faint);
  }
}

/**
 * パドル: 両端を尖らせた薄い六角形。内部は暗く、外周の光の線が形を作る。
 * WIDE PADDLE 中は発光が強くなり、ゆっくり脈打つ。
 */
function drawPaddle(r: Renderer, p: Paddle, alpha: number, wideTimeLeft: number, time: number): void {
  const { ctx } = r;
  const x = lerp(p.prevX, p.x, alpha);
  const half = p.width / 2;
  const h = 10;
  const tip = 9;
  const top = p.y;
  r.polygon([
    [x - half, top + h / 2],
    [x - half + tip, top],
    [x + half - tip, top],
    [x + half, top + h / 2],
    [x + half - tip, top + h],
    [x - half + tip, top + h],
  ]);
  ctx.fillStyle = THEME.core;
  ctx.fill();

  const wide = wideTimeLeft > 0;
  const pulse = wide ? 0.5 + 0.5 * Math.sin(time * 8) : 0;
  r.setGlow(THEME.cyan, wide ? 16 + 8 * pulse : 9);
  ctx.strokeStyle = wide ? THEME.ice : THEME.cyan;
  ctx.lineWidth = wide ? 2 : 1.5;
  ctx.stroke();
  r.setGlow();

  // 中央の芯線
  ctx.globalAlpha = wide ? 0.8 : 0.45;
  r.strokeLine(x - half + tip + 4, top + h / 2, x + half - tip - 4, top + h / 2, THEME.cyan, 1);
  ctx.globalAlpha = 1;
}

/** ボール: 白に近い芯と弱いシアンの光。進行方向の逆側にごく短い残光を付ける */
function drawBall(r: Renderer, ball: Ball, alpha: number): void {
  const { ctx } = r;
  const x = lerp(ball.prevX, ball.x, alpha);
  const y = lerp(ball.prevY, ball.y, alpha);
  const tail = 0.03;

  ctx.globalAlpha = 0.28;
  ctx.lineCap = 'round';
  r.strokeLine(x - ball.vx * tail, y - ball.vy * tail, x, y, THEME.cyan, ball.radius * 1.2);
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 0.18;
  r.fillCircle(x, y, ball.radius * 1.8, THEME.cyan);
  ctx.globalAlpha = 1;

  r.setGlow(THEME.cyan, 12);
  r.fillCircle(x, y, ball.radius * 0.85, THEME.ball);
  r.setGlow();
}
