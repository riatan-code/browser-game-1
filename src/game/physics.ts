import { circleRect, type Hit } from './collision.ts';
import type { Ball, Paddle } from './types.ts';

const DEG = Math.PI / 180;

export interface Bounds {
  left: number;
  right: number;
  top: number;
}

/** 垂直上向きからの角度 (度、右が正) で速度を設定する。 */
export function launchAtAngle(ball: Ball, angleDeg: number): void {
  const a = angleDeg * DEG;
  ball.vx = ball.speed * Math.sin(a);
  ball.vy = -ball.speed * Math.cos(a);
}

/** 進行方向を保ったまま速さを変更する。 */
export function setSpeed(ball: Ball, speed: number): void {
  const current = Math.hypot(ball.vx, ball.vy) || 1;
  ball.speed = speed;
  ball.vx = (ball.vx / current) * speed;
  ball.vy = (ball.vy / current) * speed;
}

/** 水平に近すぎる軌道を補正する。 */
export function enforceMinVertical(ball: Ball, minRatio: number): void {
  const minVy = ball.speed * minRatio;
  if (Math.abs(ball.vy) >= minVy) return;
  const sy = ball.vy > 0 ? 1 : -1;
  const sx = ball.vx < 0 ? -1 : 1;
  ball.vy = sy * minVy;
  ball.vx = sx * Math.sqrt(ball.speed * ball.speed - minVy * minVy);
}

/** 左右・天井の壁で反射する。反射したら true。 */
export function bounceOffWalls(ball: Ball, bounds: Bounds): boolean {
  const r = ball.radius;
  let hit = false;
  if (ball.x - r < bounds.left) {
    ball.x = bounds.left + r;
    ball.vx = Math.abs(ball.vx);
    hit = true;
  } else if (ball.x + r > bounds.right) {
    ball.x = bounds.right - r;
    ball.vx = -Math.abs(ball.vx);
    hit = true;
  }
  if (ball.y - r < bounds.top) {
    ball.y = bounds.top + r;
    ball.vy = Math.abs(ball.vy);
    hit = true;
  }
  return hit;
}

/**
 * パドルでの反射。当たった位置 (中心からのずれ) で反射角が決まる。
 * 下向きに進んでいて、ボール中心がパドル下端より上にあるときだけ反射する。
 */
export function bounceOffPaddle(ball: Ball, paddle: Paddle, maxAngleDeg: number): boolean {
  if (ball.vy <= 0) return false;
  if (ball.y > paddle.y + paddle.height) return false;

  const left = paddle.x - paddle.width / 2;
  const hit = circleRect(ball.x, ball.y, ball.radius, left, paddle.y, paddle.width, paddle.height);
  if (!hit) return false;

  const half = paddle.width / 2 + ball.radius;
  const offset = Math.max(-1, Math.min(1, (ball.x - paddle.x) / half));
  launchAtAngle(ball, offset * maxAngleDeg);
  ball.y = paddle.y - ball.radius;
  return true;
}

/**
 * ブロックなど矩形との衝突解決。
 * 法線の主軸方向の速度成分だけを反転させ、角度が不自然に変わらないようにする。
 */
export function bounceOffHit(ball: Ball, hit: Hit): void {
  if (Math.abs(hit.nx) > Math.abs(hit.ny)) {
    if (ball.vx * hit.nx < 0) ball.vx = -ball.vx;
  } else if (ball.vy * hit.ny < 0) {
    ball.vy = -ball.vy;
  }
  ball.x += hit.nx * hit.depth;
  ball.y += hit.ny * hit.depth;
}
