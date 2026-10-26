import type { Ball, Brick, Phase } from './types.ts';

/**
 * ゲーム内で発生する出来事。サウンドやエフェクトはこれを購読して実装する。
 */
export interface GameEventMap {
  phaseChange: { phase: Phase };
  ballLaunch: { ball: Ball };
  wallHit: { ball: Ball };
  paddleHit: { ball: Ball };
  brickHit: { brick: Brick; ball: Ball };
  brickDestroyed: { brick: Brick; ball: Ball };
  lifeLost: { lives: number };
  stageClear: { stageIndex: number };
}
