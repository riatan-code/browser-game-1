/**
 * ブロック崩しのゲームパラメータ。
 * 座標・サイズは論理解像度 (src/config.ts) 基準、速度は px/秒、角度は度。
 */
export const BREAKOUT_CONFIG = {
  lives: 3,

  field: {
    /** HUD の下端 = 天井の壁の位置 */
    top: 72,
  },

  paddle: {
    width: 100,
    height: 14,
    /** 画面下端からパドル上端までの距離。下側は指を置くスペースになる */
    bottomOffset: 130,
    /** キーボード操作時の移動速度 */
    keyboardSpeed: 760,
  },

  ball: {
    radius: 8,
    initialSpeed: 430,
    maxSpeed: 700,
    /** ブロックを壊すたびに加算される速度 */
    speedUpPerHit: 5,
    /** 発射角のばらつき (垂直からの最大角度) */
    launchAngle: 25,
    /** パドル端に当たったときの反射角 (垂直からの最大角度) */
    maxBounceAngle: 60,
    /** 水平に近い軌道でラリーが終わらなくなるのを防ぐ、垂直方向速度の最小比率 */
    minVerticalRatio: 0.3,
  },

  bricks: {
    top: 130,
    height: 24,
    gap: 6,
    sideMargin: 18,
    /** 行ごとの得点 (上の行ほど高得点)。行数を超えた分は末尾の値 */
    rowScores: [60, 50, 40, 30, 20, 10],
    /** ブロック種別ごとの性能。特殊ブロックはここに追加する */
    types: {
      normal: { hp: 1 },
    },
  },
} as const;

export type BreakoutConfig = typeof BREAKOUT_CONFIG;
export type BrickType = keyof BreakoutConfig['bricks']['types'];
