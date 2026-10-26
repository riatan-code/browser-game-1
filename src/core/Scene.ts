import type { Input } from '../input/Input.ts';
import type { Renderer } from '../render/Renderer.ts';

/**
 * 画面単位 (タイトル / プレイ / リザルトなど) の処理のまとまり。
 * update はロジック、render は描画のみを担当し、互いに依存させない。
 */
export interface Scene {
  enter?(): void;
  exit?(): void;
  /** 固定ステップで呼ばれるロジック更新 */
  update(dt: number, input: Input): void;
  /** 描画。alpha は固定ステップ間の補間係数 (0..1) */
  render(renderer: Renderer, alpha: number): void;
}
