import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';

export type ButtonVariant = 'primary' | 'secondary';

/**
 * Canvas 上のボタン。座標は中心基準。タッチしやすいよう大きめに作る。
 * 見た目は角を斜めに落とした暗いパネルに細い発光線。ポインタが乗ると発光が強くなる。
 */
export class Button {
  constructor(
    public label: string,
    public x: number,
    public y: number,
    public width = 240,
    public height = 64,
    public variant: ButtonVariant = 'primary',
  ) {}

  contains(px: number, py: number): boolean {
    return (
      Math.abs(px - this.x) <= this.width / 2 && Math.abs(py - this.y) <= this.height / 2
    );
  }

  draw(r: Renderer, hover = false): void {
    const { ctx } = r;
    const primary = this.variant === 'primary';
    const color = primary ? THEME.cyan : THEME.blue;
    r.chamferRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height, 10);
    ctx.fillStyle = 'rgba(3, 11, 18, 0.92)';
    ctx.fill();
    if (hover) r.setGlow(color, 14);
    ctx.strokeStyle = color;
    ctx.globalAlpha = hover ? 1 : primary ? 0.85 : 0.5;
    ctx.lineWidth = hover ? 1.6 : 1.2;
    ctx.stroke();
    r.setGlow();
    ctx.globalAlpha = 1;

    r.text(this.label, this.x, this.y + 1, {
      size: primary ? 18 : 15,
      weight: 500,
      align: 'center',
      spacing: 3,
      color: primary || hover ? THEME.ice : THEME.text,
      glow: hover ? 8 : 0,
      glowColor: color,
    });
  }
}
