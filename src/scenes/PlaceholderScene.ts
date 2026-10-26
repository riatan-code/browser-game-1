import type { Scene } from '../core/Scene.ts';
import type { Input } from '../input/Input.ts';
import type { Renderer } from '../render/Renderer.ts';

/**
 * 動作確認用の仮シーン。描画・入力・座標変換が機能していることを確認する。
 * 実際のゲームを作る際に置き換える。
 */
export class PlaceholderScene implements Scene {
  private pointerX = 0;
  private pointerY = 0;
  private touching = false;

  update(_dt: number, input: Input): void {
    this.pointerX = input.pointer.x;
    this.pointerY = input.pointer.y;
    this.touching = input.isPointerDown;
  }

  render(r: Renderer): void {
    r.clear('#1e1e2e');
    r.text('Ready', r.width / 2, r.height / 2 - 20, { size: 48, align: 'center' });
    r.text(`${r.width} x ${r.height}`, r.width / 2, r.height / 2 + 30, {
      size: 18,
      align: 'center',
      color: '#888',
    });
    r.fillCircle(this.pointerX, this.pointerY, this.touching ? 16 : 8, '#4fc3f7');
  }
}
