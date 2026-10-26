import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';

export type ButtonVariant = 'primary' | 'secondary';

/** Canvas 上のボタン。座標は中心基準。タッチしやすいよう大きめに作る。 */
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

  draw(r: Renderer): void {
    const primary = this.variant === 'primary';
    r.fillRoundRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height,
      this.height / 2,
      primary ? THEME.accent : THEME.secondaryButton,
    );
    r.text(this.label, this.x, this.y + 1, {
      size: primary ? 24 : 20,
      weight: 800,
      align: 'center',
      color: primary ? THEME.buttonText : THEME.text,
    });
  }
}
