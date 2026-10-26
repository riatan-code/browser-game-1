import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';

/** Canvas 上のボタン。座標は中心基準。タッチしやすいよう大きめに作る。 */
export class Button {
  constructor(
    public label: string,
    public x: number,
    public y: number,
    public width = 240,
    public height = 64,
  ) {}

  contains(px: number, py: number): boolean {
    return (
      Math.abs(px - this.x) <= this.width / 2 && Math.abs(py - this.y) <= this.height / 2
    );
  }

  draw(r: Renderer): void {
    r.fillRoundRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height,
      this.height / 2,
      THEME.accent,
    );
    r.text(this.label, this.x, this.y + 1, {
      size: 24,
      weight: 800,
      align: 'center',
      color: THEME.buttonText,
    });
  }
}
