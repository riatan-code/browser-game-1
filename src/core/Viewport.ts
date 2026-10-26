import { GAME_HEIGHT, GAME_WIDTH } from '../config.ts';

/**
 * 論理解像度 (GAME_WIDTH x GAME_HEIGHT) を、アスペクト比を保ったまま
 * 表示領域に収めるためのスケールとオフセットを管理する。
 * 描画 (Renderer) と入力 (Input) の両方がこの座標変換を共有する。
 */
export class Viewport {
  /** CSS ピクセル → 論理座標のスケール */
  scale = 1;
  /** 論理座標の原点がキャンバス上のどこにあるか (CSS ピクセル) */
  offsetX = 0;
  offsetY = 0;
  /** キャンバスの CSS サイズ */
  cssWidth = 0;
  cssHeight = 0;
  /** devicePixelRatio */
  dpr = 1;

  readonly width = GAME_WIDTH;
  readonly height = GAME_HEIGHT;

  update(cssWidth: number, cssHeight: number, dpr: number): void {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.dpr = dpr;
    this.scale = Math.min(cssWidth / this.width, cssHeight / this.height);
    this.offsetX = (cssWidth - this.width * this.scale) / 2;
    this.offsetY = (cssHeight - this.height * this.scale) / 2;
  }

  /** キャンバス内の CSS ピクセル座標を論理座標へ変換する。 */
  toWorld(cssX: number, cssY: number): { x: number; y: number } {
    return {
      x: (cssX - this.offsetX) / this.scale,
      y: (cssY - this.offsetY) / this.scale,
    };
  }
}
