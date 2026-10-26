/**
 * ゲーム内の論理解像度。描画・入力座標はすべてこの座標系で扱う。
 * モバイルファーストのため縦長。PC では左右にレターボックスが付く。
 */
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 900;

/** ロジック更新の固定ステップ (秒)。 */
export const FIXED_DT = 1 / 60;

/** 画面の余白 (レターボックス) の色。 */
export const LETTERBOX_COLOR = '#07080f';
