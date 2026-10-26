import { RANKING_CONFIG, SHARE_CONFIG } from '../config.ts';
import type { Scene } from '../core/Scene.ts';
import { BreakoutWorld } from '../game/BreakoutWorld.ts';
import { BREAKOUT_CONFIG } from '../game/config.ts';
import type { Controls } from '../game/types.ts';
import type { Input } from '../input/Input.ts';
import { DEFAULT_PLAYER_NAME, sanitizeName } from '../ranking/ranking.ts';
import { RankingStore } from '../ranking/RankingStore.ts';
import { drawWorld } from '../render/BreakoutView.ts';
import type { Renderer } from '../render/Renderer.ts';
import { gameUrl, openXShare } from '../share/shareToX.ts';
import { Button } from '../ui/Button.ts';
import { drawHud } from '../ui/Hud.ts';
import { NameEntryDialog } from '../ui/NameEntryDialog.ts';
import { drawResultScreen, drawServeHint, drawTitleScreen } from '../ui/screens.ts';

/** リザルト画面で、プレイ中の連打による誤操作を防ぐ待ち時間 (秒) */
const RESULT_INPUT_DELAY = 0.6;

/**
 * ブロック崩しのシーン。
 * 入力を Controls に変換して World に渡し、World の状態を描画・UI に渡す橋渡し役。
 */
export class BreakoutScene implements Scene {
  private readonly world: BreakoutWorld;
  private readonly ranking = new RankingStore(
    RANKING_CONFIG.storageKey,
    RANKING_CONFIG.nameKey,
    RANKING_CONFIG.size,
  );
  private readonly nameDialog: NameEntryDialog;
  private readonly startButton: Button;
  private readonly retryButton: Button;
  private readonly shareButton: Button;
  private phaseTime = 0;
  /** 直近のゲームの順位 (0始まり、圏外・未登録なら null) */
  private lastRank: number | null = null;
  private unsubscribeTap: (() => void) | null = null;

  /**
   * @param uiRoot 名前入力ダイアログなど HTML の UI を配置する要素
   */
  constructor(
    width: number,
    height: number,
    private readonly input: Input,
    uiRoot: HTMLElement,
  ) {
    this.world = new BreakoutWorld(width, height);
    this.nameDialog = new NameEntryDialog(uiRoot, RANKING_CONFIG.nameMaxLength);
    this.startButton = new Button('START', width / 2, 680);
    this.retryButton = new Button('RETRY', width / 2, 655);
    this.shareButton = new Button('X でシェア', width / 2, 740, 240, 60, 'secondary');
    this.world.events.on('phaseChange', ({ phase }) => {
      this.phaseTime = 0;
      if (phase === 'gameover' || phase === 'clear') this.onGameEnd(phase === 'clear');
    });
  }

  enter(): void {
    // window.open はユーザー操作のイベント内でしか許可されないため、クリック時に直接処理する
    this.unsubscribeTap = this.input.onTap((x, y) => {
      if (this.isResultInteractive() && this.shareButton.contains(x, y)) this.share();
    });
  }

  exit(): void {
    this.unsubscribeTap?.();
    this.unsubscribeTap = null;
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
        if (!this.isResultInteractive()) return;
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
      best: this.ranking.best,
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
        drawResultScreen(r, {
          kind: world.phase,
          score: world.score,
          rank: this.lastRank,
          ranking: this.ranking.list,
          retryButton: this.retryButton,
          shareButton: this.shareButton,
        });
        break;
    }
  }

  private isResultInteractive(): boolean {
    const { phase } = this.world;
    return (
      (phase === 'gameover' || phase === 'clear') &&
      this.phaseTime >= RESULT_INPUT_DELAY &&
      !this.nameDialog.isOpen
    );
  }

  /** ランクインしていれば名前入力を求め、登録されたらランキングに記録する */
  private onGameEnd(cleared: boolean): void {
    this.lastRank = null;
    const { score } = this.world;
    const rank = this.ranking.previewRank(score);
    if (rank === null) return;

    this.nameDialog.open({
      score,
      rank,
      defaultName: this.ranking.lastName,
      onSubmit: (rawName) => {
        const name = sanitizeName(rawName, RANKING_CONFIG.nameMaxLength) || DEFAULT_PLAYER_NAME;
        this.lastRank = this.ranking.add({ name, score, date: Date.now(), cleared });
        // ダイアログを閉じた操作がそのままリトライ等に繋がらないよう、待ち時間を取り直す
        this.phaseTime = 0;
      },
      onCancel: () => {
        this.phaseTime = 0;
      },
    });
  }

  private share(): void {
    const { score, phase } = this.world;
    const result = phase === 'clear' ? 'GAME CLEAR！' : '';
    openXShare(`BREAKOUT で ${score} 点を記録！${result}`, gameUrl(), SHARE_CONFIG.hashtags);
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
