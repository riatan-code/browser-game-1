import type { Scene } from '../core/Scene.ts';
import { BreakoutWorld } from '../game/BreakoutWorld.ts';
import { BREAKOUT_CONFIG } from '../game/config.ts';
import type { Controls } from '../game/types.ts';
import type { Input } from '../input/Input.ts';
import { drawWorld } from '../render/BreakoutView.ts';
import type { Renderer } from '../render/Renderer.ts';
import { Button } from '../ui/Button.ts';
import { drawHud } from '../ui/Hud.ts';
import { drawResultScreen, drawServeHint, drawTitleScreen } from '../ui/screens.ts';

/** リザルト画面で、プレイ中の連打による誤リトライを防ぐ待ち時間 (秒) */
const RESULT_INPUT_DELAY = 0.6;

/**
 * ブロック崩しのシーン。
 * 入力を Controls に変換して World に渡し、World の状態を描画・UI に渡す橋渡し役。
 */
export class BreakoutScene implements Scene {
  private readonly world: BreakoutWorld;
  private readonly startButton: Button;
  private readonly retryButton: Button;
  private phaseTime = 0;

  constructor(width: number, height: number) {
    this.world = new BreakoutWorld(width, height);
    this.startButton = new Button('START', width / 2, 680);
    this.retryButton = new Button('RETRY', width / 2, 640);
    this.world.events.on('phaseChange', () => {
      this.phaseTime = 0;
    });
  }

  update(dt: number, input: Input): void {
    this.phaseTime += dt;
    const { world } = this;
    const confirmKey = input.isPressed('Space') || input.isPressed('Enter');

    switch (world.phase) {
      case 'title':
        // 開始画面はどこをタップしても開始できる
        if (input.isPointerPressed || confirmKey) world.newGame();
        return;
      case 'gameover':
      case 'clear': {
        if (this.phaseTime < RESULT_INPUT_DELAY) return;
        const onButton =
          input.isPointerPressed && this.retryButton.contains(input.pointer.x, input.pointer.y);
        if (onButton || confirmKey) world.newGame();
        return;
      }
      default:
        world.update(dt, this.readControls(input));
    }
  }

  render(r: Renderer, alpha: number): void {
    const { world } = this;
    drawWorld(r, world, alpha);
    drawHud(r, BREAKOUT_CONFIG.field.top, {
      score: world.score,
      lives: world.lives,
      maxLives: world.maxLives,
    });

    switch (world.phase) {
      case 'title':
        drawTitleScreen(r, this.startButton);
        break;
      case 'serve':
        drawServeHint(r, world.paddle.y + 70);
        break;
      case 'gameover':
      case 'clear':
        drawResultScreen(r, world.phase, world.score, this.retryButton);
        break;
    }
  }

  private readControls(input: Input): Controls {
    let dir = 0;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dir -= 1;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) dir += 1;

    return {
      // マウスはホバー、タッチはドラッグでパドルの x 座標を指定する
      paddleX: input.isPointerMoved || input.isPointerPressed ? input.pointer.x : null,
      paddleDir: dir,
      launch: input.isPointerPressed || input.isPressed('Space') || input.isPressed('ArrowUp'),
    };
  }
}
