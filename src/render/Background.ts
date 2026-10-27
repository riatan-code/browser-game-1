import type { Renderer } from './Renderer.ts';
import { THEME } from './theme.ts';

/**
 * 背景: ほぼ黒の空間に、奥へ消えていく薄いグリッドとかすかな光だまりを置く。
 * ゲームオブジェクトの視認性を最優先し、どれもごく薄くしている。
 * @param top フィールド上端 (HUD の下)
 */
export function drawBackground(r: Renderer, top: number): void {
  const { ctx } = r;
  const w = r.width;
  const h = r.height;
  r.clear(THEME.background);

  // 床の光だまり
  const glow = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.75);
  glow.addColorStop(0, THEME.floorGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, top, w, h - top);

  // 遠近グリッド: 消失点はフィールド上端の中央
  const vx = w / 2;
  const vy = top + 30;
  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // 消失点付近は線が密集して光って見えるため、少し手前から描き始める
  const start = 0.12;
  for (let i = -9; i <= 9; i++) {
    const ex = vx + i * 95;
    ctx.moveTo(vx + (ex - vx) * start, vy + (h - vy) * start);
    ctx.lineTo(ex, h);
  }
  // 横線は手前 (下) ほど間隔を広くして奥行きを出す
  const rows = 14;
  for (let i = 1; i <= rows; i++) {
    const y = vy + (h - vy) * (i / rows) ** 2;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

/**
 * フィールドの境界。太い枠ではなく細い発光ラインで輪郭を作る。
 * - 左右は二重線 (外側が明るく、内側はかすか)
 * - 天井のラインは中央で途切れ、両端のコーナーだけ強く光る
 * @param accent コーナーの色 (ボス戦ではオレンジにして緊張感を出す)
 */
export function drawFieldFrame(r: Renderer, top: number, accent: string): void {
  const w = r.width;
  const h = r.height;
  const gap = 70;

  r.strokeLine(0.5, top, 0.5, h, THEME.frame);
  r.strokeLine(w - 0.5, top, w - 0.5, h, THEME.frame);
  r.strokeLine(4.5, top + 24, 4.5, h - 40, THEME.frameFaint);
  r.strokeLine(w - 4.5, top + 24, w - 4.5, h - 40, THEME.frameFaint);

  r.strokeLine(0, top + 0.5, w / 2 - gap, top + 0.5, THEME.frame);
  r.strokeLine(w / 2 + gap, top + 0.5, w, top + 0.5, THEME.frame);
  // 途切れた部分の端に小さな目印
  r.strokeLine(w / 2 - gap + 8, top + 3.5, w / 2 + gap - 8, top + 3.5, THEME.frameFaint);

  r.setGlow(accent, 8);
  const c = 22;
  r.ctx.lineCap = 'square';
  r.strokeLine(1, top + 1, 1 + c, top + 1, accent, 2);
  r.strokeLine(1, top + 1, 1, top + 1 + c, accent, 2);
  r.strokeLine(w - 1, top + 1, w - 1 - c, top + 1, accent, 2);
  r.strokeLine(w - 1, top + 1, w - 1, top + 1 + c, accent, 2);
  r.ctx.lineCap = 'butt';
  r.setGlow();
}
