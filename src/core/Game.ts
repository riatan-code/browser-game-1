import { FIXED_DT } from '../config.ts';
import { Input } from '../input/Input.ts';
import { Renderer } from '../render/Renderer.ts';
import { GameLoop } from './GameLoop.ts';
import type { Scene } from './Scene.ts';
import { SceneManager } from './SceneManager.ts';
import { Viewport } from './Viewport.ts';

/** 描画・入力・ループ・シーンを束ねるエントリポイント。 */
export class Game {
  readonly viewport = new Viewport();
  readonly renderer: Renderer;
  readonly input: Input;
  readonly scenes = new SceneManager();
  private readonly loop: GameLoop;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, this.viewport);
    this.input = new Input(canvas, this.viewport);
    this.loop = new GameLoop(
      FIXED_DT,
      (dt) => {
        this.scenes.scene?.update(dt, this.input);
        this.input.endFrame();
      },
      (alpha) => {
        this.renderer.beginFrame();
        this.scenes.scene?.render(this.renderer, alpha);
        this.renderer.endFrame();
      },
    );

    // バックグラウンドタブでは停止し、復帰時に再開する
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.loop.stop();
        this.input.reset();
      } else {
        this.loop.start();
      }
    });
  }

  start(scene: Scene): void {
    this.scenes.change(scene);
    this.loop.start();
  }
}
