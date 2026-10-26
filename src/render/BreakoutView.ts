import type { BreakoutWorld } from '../game/BreakoutWorld.ts';
import type { Renderer } from './Renderer.ts';
import { brickColor, THEME } from './theme.ts';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** ゲーム盤面 (ブロック・パドル・ボール) の描画。状態は読むだけで変更しない。 */
export function drawWorld(r: Renderer, world: BreakoutWorld, alpha: number): void {
  r.clear(THEME.background);

  for (const brick of world.bricks) {
    if (!brick.alive) continue;
    const ctx = r.ctx;
    // 耐久力のあるブロックは残り HP に応じて薄くする
    ctx.globalAlpha = 0.45 + 0.55 * (brick.hp / brick.maxHp);
    r.fillRoundRect(brick.x, brick.y, brick.width, brick.height, 4, brickColor(brick.row));
    ctx.globalAlpha = 1;
  }

  const p = world.paddle;
  const px = lerp(p.prevX, p.x, alpha);
  r.fillRoundRect(px - p.width / 2, p.y, p.width, p.height, p.height / 2, THEME.paddle);

  for (const ball of world.balls) {
    r.fillCircle(lerp(ball.prevX, ball.x, alpha), lerp(ball.prevY, ball.y, alpha), ball.radius, THEME.ball);
  }
}
