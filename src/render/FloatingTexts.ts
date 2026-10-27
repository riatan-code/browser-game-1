import type { Renderer } from './Renderer.ts';

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  age: number;
}

/** アイテム取得時などに、その場から浮かび上がって消える文字の演出 */
export class FloatingTexts {
  private list: FloatingText[] = [];

  constructor(
    private readonly life = 1.1,
    private readonly riseSpeed = 50,
  ) {}

  add(text: string, x: number, y: number, color: string): void {
    this.list.push({ text, x, y, color, age: 0 });
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    for (const t of this.list) {
      t.age += dt;
      t.y -= this.riseSpeed * dt;
    }
    this.list = this.list.filter((t) => t.age < this.life);
  }

  draw(r: Renderer): void {
    for (const t of this.list) {
      r.ctx.globalAlpha = Math.max(0, 1 - t.age / this.life);
      // 画面端で文字が切れないよう、中心を内側に寄せる
      const x = Math.max(90, Math.min(r.width - 90, t.x));
      r.text(t.text, x, t.y, { size: 14, weight: 600, spacing: 3, align: 'center', color: t.color, glow: 8 });
    }
    r.ctx.globalAlpha = 1;
  }
}
