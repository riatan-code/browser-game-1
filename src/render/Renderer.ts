import { LETTERBOX_COLOR } from '../config.ts';
import type { Viewport } from '../core/Viewport.ts';

/**
 * Canvas 2D のラッパー。
 * - 高DPI (Retina 等) 対応
 * - ウィンドウ/画面回転に追従したリサイズ
 * - 論理解像度へのスケーリングとレターボックス
 * シーンは論理座標 (GAME_WIDTH x GAME_HEIGHT) だけを意識して描画すればよい。
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not supported');
    this.ctx = ctx;

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    // ResizeObserver は DPR のみの変化 (ブラウザズーム/モニタ移動) を検知しないため併用する
    window.addEventListener('resize', () => this.resize());
  }

  get width(): number {
    return this.viewport.width;
  }

  get height(): number {
    return this.viewport.height;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.viewport.update(rect.width, rect.height, dpr);

    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /** フレーム開始: 画面全体をクリアし、論理座標系へ変換して描画範囲をクリップする。 */
  beginFrame(): void {
    const { ctx, viewport: vp } = this;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = LETTERBOX_COLOR;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const s = vp.scale * vp.dpr;
    ctx.save();
    ctx.setTransform(s, 0, 0, s, vp.offsetX * vp.dpr, vp.offsetY * vp.dpr);
    ctx.beginPath();
    ctx.rect(0, 0, vp.width, vp.height);
    ctx.clip();
  }

  endFrame(): void {
    this.ctx.restore();
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  fillRoundRect(x: number, y: number, w: number, h: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, radius);
    this.ctx.fill();
  }

  fillCircle(x: number, y: number, r: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  strokeCircle(x: number, y: number, r: number, color: string, lineWidth = 2): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  text(
    str: string,
    x: number,
    y: number,
    options: {
      color?: string;
      size?: number;
      weight?: number;
      align?: CanvasTextAlign;
      font?: string;
    } = {},
  ): void {
    const {
      color = '#fff',
      size = 16,
      weight = 400,
      align = 'left',
      font = 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif',
    } = options;
    this.ctx.fillStyle = color;
    this.ctx.font = `${weight} ${size}px ${font}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(str, x, y);
  }
}
