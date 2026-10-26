import type { BreakoutConfig } from './config.ts';
import { BRICK_CHARS, type StageDef } from './stages.ts';
import type { Ball, Brick, Paddle } from './types.ts';

export function createPaddle(cfg: BreakoutConfig, fieldWidth: number, fieldHeight: number): Paddle {
  const x = fieldWidth / 2;
  return {
    x,
    prevX: x,
    y: fieldHeight - cfg.paddle.bottomOffset,
    width: cfg.paddle.width,
    height: cfg.paddle.height,
  };
}

export function createBall(cfg: BreakoutConfig): Ball {
  return {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    speed: cfg.ball.initialSpeed,
    radius: cfg.ball.radius,
  };
}

/** ステージ定義からブロックを生成する。横幅は列数に合わせて自動計算する。 */
export function buildBricks(stage: StageDef, cfg: BreakoutConfig, fieldWidth: number): Brick[] {
  const { top, height, gap, sideMargin, rowScores, types } = cfg.bricks;
  const cols = Math.max(...stage.layout.map((line) => line.length));
  const width = (fieldWidth - sideMargin * 2 - gap * (cols - 1)) / cols;
  const bricks: Brick[] = [];

  stage.layout.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const type = BRICK_CHARS[ch];
      if (!type) return;
      const { hp } = types[type];
      bricks.push({
        x: sideMargin + col * (width + gap),
        y: top + row * (height + gap),
        width,
        height,
        type,
        hp,
        maxHp: hp,
        score: rowScores[row] ?? rowScores[rowScores.length - 1] ?? 0,
        row,
        alive: true,
      });
    });
  });

  return bricks;
}
