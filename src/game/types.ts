import type { BossAttackKind, BrickType, ItemKind } from './config.ts';

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
  /** アイテム効果などで目指している幅。width はこの値へ徐々に近づく */
  targetWidth: number;
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
  /** false なら何度当てても壊れない */
  breakable: boolean;
  dropsItems: boolean;
  score: number;
  /** 配置された行 (色分けに使用) */
  row: number;
  alive: boolean;
}

/** 落下中のアイテム。座標は中心 */
export interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  prevY: number;
  width: number;
  height: number;
}

/** パドルの下に出る、ボールを一時的に跳ね返すバー */
export interface SafetyBar {
  /** 上端の y */
  y: number;
  height: number;
  timeLeft: number;
}

export interface Boss {
  /** 中心の x */
  x: number;
  prevX: number;
  /** 上端の y */
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  /** 被弾時の点滅の残り時間 */
  flashTime: number;
}

/** ボスの攻撃の予告。表示中に避ける判断をしてもらう */
export interface Telegraph {
  kind: BossAttackKind;
  time: number;
  duration: number;
  /** レーザー系の照射範囲 (中心 x と幅)。弾の攻撃では空 */
  zones: { x: number; width: number }[];
}

export interface Bullet {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
}

/** 照射中のレーザー (ボス下端から画面下まで) */
export interface Laser {
  x: number;
  width: number;
  timeLeft: number;
  /** 照射時間 (描画で開き・閉じの演出に使う) */
  duration: number;
}

/**
 * title     : 開始画面
 * serve     : ボールがパドル上で発射待ち
 * playing   : プレイ中
 * stageclear: ステージクリア演出 (一定時間後に次のステージへ)
 * gameover  : ライフ / HP 切れ
 * clear     : 全ステージクリア
 */
export type Phase = 'title' | 'serve' | 'playing' | 'stageclear' | 'gameover' | 'clear';

/** ロジックへの入力。デバイス (マウス/タッチ/キーボード) を抽象化したもの */
export interface Controls {
  /** パドルを移動させたい x 座標 (ポインタ操作)。指定なしは null */
  paddleX: number | null;
  /** キーボードによる移動方向 (-1..1) */
  paddleDir: number;
  /** ボール発射 */
  launch: boolean;
}
