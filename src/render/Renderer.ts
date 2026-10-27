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

  fillEllipse(x: number, y: number, rx: number, ry: number, rotation: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
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
      /** 超える場合は横方向に縮めて収める */
      maxWidth?: number;
      /** 字間 (px)。未対応のブラウザでは無視される */
      spacing?: number;
      /** 文字の発光の強さ (shadowBlur)。0 で発光なし */
      glow?: number;
      glowColor?: string;
    } = {},
  ): void {
    const {
      color = '#fff',
      size = 16,
      weight = 400,
      align = 'left',
      font = 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif',
      maxWidth,
      spacing = 0,
      glow = 0,
      glowColor = color,
    } = options;
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (spacing) ctx.letterSpacing = `${spacing}px`;
    if (glow) this.setGlow(glowColor, glow);
    // 字間を空けると末尾にも余白が付くため、中央揃えのときは半分ずらして中心を合わせる
    const dx = align === 'center' ? spacing / 2 : align === 'right' ? spacing : 0;
    if (maxWidth === undefined) {
      ctx.fillText(str, x + dx, y);
    } else {
      ctx.fillText(str, x + dx, y, maxWidth);
    }
    if (glow) this.setGlow();
    if (spacing) ctx.letterSpacing = '0px';
  }

  /** 以降の描画を発光させる。引数なしで解除 */
  setGlow(color = 'transparent', blur = 0): void {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
  }

  strokeLine(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth = 1): void {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /** 点列で多角形のパスを作る (塗り・線は呼び出し側で行う) */
  polygon(points: readonly (readonly [number, number])[]): void {
    const { ctx } = this;
    ctx.beginPath();
    points.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }

  /** 角を斜めに落とした矩形のパス */
  chamferRect(x: number, y: number, w: number, h: number, cut: number): void {
    const c = Math.min(cut, w / 2, h / 2);
    this.polygon([
      [x + c, y],
      [x + w - c, y],
      [x + w, y + c],
      [x + w, y + h - c],
      [x + w - c, y + h],
      [x + c, y + h],
      [x, y + h - c],
      [x, y + c],
    ]);
  }
}
