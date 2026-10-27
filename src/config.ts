/**
 * ゲーム内の論理解像度。描画・入力座標はすべてこの座標系で扱う。
 * モバイルファーストのため縦長。PC では左右にレターボックスが付く。
 */
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 900;

/** ロジック更新の固定ステップ (秒)。 */
export const FIXED_DT = 1 / 60;

/** 画面の余白 (レターボックス) の色。 */
export const LETTERBOX_COLOR = '#010204';

/** ランキング (端末内保存) */
export const RANKING_CONFIG = {
  /** 保存形式を変えたら末尾のバージョンを上げる */
  storageKey: 'browser-game-1:breakout:ranking:v1',
  /** 前回入力した名前の保存先 */
  nameKey: 'browser-game-1:breakout:player-name',
  size: 5,
  /** 名前の最大文字数 */
  nameMaxLength: 10,
} as const;

/** ステージのクリア状況 (端末内保存)。クリアしたステージの次がステージ選択で解放される */
export const PROGRESS_CONFIG = {
  /** 保存形式を変えたら末尾のバージョンを上げる */
  storageKey: 'browser-game-1:breakout:progress:v1',
  /** ボスの EX モードをクリアしたステージ */
  exStorageKey: 'browser-game-1:breakout:progress-ex:v1',
} as const;

/** X への投稿 */
export const SHARE_CONFIG = {
  hashtags: ['ブロック崩し'],
} as const;
