import type { ItemKind } from './config.ts';
import type { Ball, Brick, Item, Phase } from './types.ts';

/**
 * ゲーム内で発生する出来事。サウンドやエフェクトはこれを購読して実装する。
 */
export interface GameEventMap {
  phaseChange: { phase: Phase };
  stageStart: { stageIndex: number };
  ballLaunch: { ball: Ball };
  wallHit: { ball: Ball };
  paddleHit: { ball: Ball };
  brickHit: { brick: Brick; ball: Ball };
  brickDestroyed: { brick: Brick; ball: Ball };
  itemSpawn: { item: Item };
  itemCollected: { kind: ItemKind; x: number; y: number };
  safetyBounce: { ball: Ball };
  lifeLost: { lives: number };
  bossHit: { hp: number; ball: Ball };
  playerDamaged: { hp: number };
  stageClear: { stageIndex: number; bonus: number };
}
