import type { BrickType } from './config.ts';

export interface Ball {
  x: number;
  y: number;
  /** 前ステップの位置 (描画の補間用) */
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  /** 速さ (vx, vy の大きさ) */
  speed: number;
  radius: number;
}

export interface Paddle {
  /** 中心の x */
  x: number;
  /** 上端の y */
  y: number;
  prevX: number;
  width: number;
  height: number;
}

export interface Brick {
  /** 左上座標 */
  x: number;
  y: number;
  width: number;
  height: number;
  type: BrickType;
  hp: number;
  maxHp: number;
  score: number;
  /** 配置された行 (色分けに使用) */
  row: number;
  alive: boolean;
}

/**
 * title   : 開始画面
 * serve   : ボールがパドル上で発射待ち
 * playing : プレイ中
 * gameover: ライフ切れ
 * clear   : 全ステージクリア
 */
export type Phase = 'title' | 'serve' | 'playing' | 'gameover' | 'clear';

/** ロジックへの入力。デバイス (マウス/タッチ/キーボード) を抽象化したもの */
export interface Controls {
  /** パドルを移動させたい x 座標 (ポインタ操作)。指定なしは null */
  paddleX: number | null;
  /** キーボードによる移動方向 (-1..1) */
  paddleDir: number;
  /** ボール発射 */
  launch: boolean;
}
