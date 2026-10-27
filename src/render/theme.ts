import type { ItemKind } from '../game/config.ts';

/**
 * 配色・書体。見た目の調整はここだけで完結させる。
 *
 * 世界観: 黒に近い空間の中で、必要なものだけが細い光の線で浮かび上がる。
 * - メイン発光: シアン / 青白
 * - サブ発光: 淡いブルー
 * - 特殊状態・ボス戦の強調: オレンジ (警告にも赤ではなくオレンジを使う)
 * 色数は増やさず、明るさと透明度で差を付ける。
 */
const CYAN = '#58e6ff';
const ICE = '#dcf7ff';
const BLUE = '#6f9dff';
const ORANGE = '#ff9d42';

export const THEME = {
  cyan: CYAN,
  ice: ICE,
  blue: BLUE,
  orange: ORANGE,

  background: '#020409',
  /** 奥行き用のグリッド線 (ごく薄く) */
  grid: 'rgba(88, 200, 255, 0.07)',
  /** フィールド下部のかすかな光だまり */
  floorGlow: 'rgba(40, 150, 230, 0.10)',
  /** フィールド境界の発光ライン */
  frame: 'rgba(88, 230, 255, 0.45)',
  frameFaint: 'rgba(88, 230, 255, 0.12)',
  /** オブジェクト内部の暗色 */
  core: '#030b12',

  text: '#e2f3ff',
  subText: '#6b88a2',
  faint: '#1c2c3c',
  /** 未解放などグレーアウトした文字 */
  locked: '#2f4559',

  overlay: 'rgba(1, 3, 7, 0.82)',
  /** 情報量の多いリザルト画面用の濃いオーバーレイ */
  overlayStrong: 'rgba(1, 3, 7, 0.93)',

  ball: '#f4fdff',
  /** ブロックの輪郭 (行ごとにシアン → 淡いブルーへわずかに変える) */
  brickRows: ['#58e6ff', '#5ad8ff', '#5ecaff', '#62bcff', '#67aeff', '#6ca2ff', '#58e6ff', '#5ad8ff'],
  /** 壊れないブロック: 白に近い光の二重線と固定の格子 */
  steel: { line: ICE, grid: 'rgba(220, 247, 255, 0.16)' },
  items: {
    wide: CYAN,
    multi: ICE,
    safety: ORANGE,
  } satisfies Record<ItemKind, string>,
  safetyBar: ORANGE,
  /**
   * ボス: 手描き風の丸いうさぎ。周囲の未来的な世界とは対照的に、
   * 紙に黒ペンと淡い色で描いたような低彩度の3色で統一する (陰影・グラデーション・光沢は使わない)
   */
  boss: {
    body: '#f6eed3',
    pink: '#f2c6c6',
    line: '#231f1c',
    eyeShine: '#ffffff',
  },
  /** ボスの攻撃。赤ではなくオレンジ系で、白い芯を持つ光として描く */
  bullet: ORANGE,
  bulletCore: '#fff4e6',
  laser: ORANGE,
  laserCore: '#fff4e6',

  font: 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif',
  /** 数字用の等幅書体 */
  mono: 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Consolas, "Roboto Mono", Menlo, monospace',
} as const;

export function brickColor(row: number): string {
  const colors = THEME.brickRows;
  return colors[row % colors.length] ?? THEME.cyan;
}

/** 数字を桁数をそろえて表示する (例: 2450 → "002450") */
export function padNumber(value: number, digits: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(digits, '0');
}
