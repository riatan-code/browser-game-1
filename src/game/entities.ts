import type { BreakoutConfig, ItemKind } from './config.ts';
import { BRICK_CHARS, type BrickStageDef } from './stages.ts';
import type { Ball, Boss, Brick, Item, Paddle, SafetyBar } from './types.ts';

export function createPaddle(cfg: BreakoutConfig, fieldWidth: number, fieldHeight: number): Paddle {
  const x = fieldWidth / 2;
  return {
    x,
    prevX: x,
    y: fieldHeight - cfg.paddle.bottomOffset,
    width: cfg.paddle.width,
    height: cfg.paddle.height,
    targetWidth: cfg.paddle.width,
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

/** ステージ定義からブロックを生成する。ブロックの大きさは全ステージ共通の格子で決まる。 */
export function buildBricks(stage: BrickStageDef, cfg: BreakoutConfig, fieldWidth: number): Brick[] {
  const { top, columns, height, gap, sideMargin, steelInflate, rowScores, types } = cfg.bricks;
  const width = (fieldWidth - sideMargin * 2 - gap * (columns - 1)) / columns;
  const bricks: Brick[] = [];

  stage.layout.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const type = BRICK_CHARS[ch];
      if (!type || col >= columns) return;
      const { hp, breakable, dropsItems } = types[type];
      // 壊れないブロックは左右に広げて、隣同士を継ぎ目のない壁にする
      const inflate = breakable ? 0 : steelInflate;
      bricks.push({
        x: sideMargin + col * (width + gap) - inflate,
        y: top + row * (height + gap),
        width: width + inflate * 2,
        height,
        type,
        hp,
        maxHp: hp,
        breakable,
        dropsItems,
        score: breakable ? (rowScores[row] ?? rowScores[rowScores.length - 1] ?? 0) : 0,
        row,
        alive: true,
      });
    });
  });

  return bricks;
}

export function createItem(cfg: BreakoutConfig, kind: ItemKind, x: number, y: number): Item {
  return { kind, x, y, prevY: y, width: cfg.items.width, height: cfg.items.height };
}

export function createSafetyBar(cfg: BreakoutConfig, paddle: Paddle): SafetyBar {
  const { charges, duration, offsetBelowPaddle, height } = cfg.items.safety;
  return {
    y: paddle.y + offsetBelowPaddle,
    height,
    charges,
    maxCharges: charges,
    timeLeft: duration,
  };
}

export function createBoss(cfg: BreakoutConfig, fieldWidth: number): Boss {
  const { hp, width, height, top } = cfg.boss;
  const x = fieldWidth / 2;
  return { x, prevX: x, y: top, width, height, hp, maxHp: hp, flashTime: 0 };
}
