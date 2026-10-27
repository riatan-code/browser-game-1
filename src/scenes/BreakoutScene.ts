import { PROGRESS_CONFIG, RANKING_CONFIG, SHARE_CONFIG } from '../config.ts';
import type { Scene } from '../core/Scene.ts';
import { DEV_OPTIONS, devModeLabel, isDevModeActive } from '../debug/devOptions.ts';
import { BreakoutWorld } from '../game/BreakoutWorld.ts';
import { BREAKOUT_CONFIG } from '../game/config.ts';
import { STAGES } from '../game/stages.ts';
import type { Controls } from '../game/types.ts';
import type { Input } from '../input/Input.ts';
import { ProgressStore } from '../progress/ProgressStore.ts';
import { DEFAULT_PLAYER_NAME, sanitizeName } from '../ranking/ranking.ts';
import { RankingStore } from '../ranking/RankingStore.ts';
import { drawWorld } from '../render/BreakoutView.ts';
import { Effects } from '../render/Effects.ts';
import { FloatingTexts } from '../render/FloatingTexts.ts';
import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';
import { gameUrl, openXShare } from '../share/shareToX.ts';
import { Button } from '../ui/Button.ts';
import { drawBossHp, drawDebugBadge, drawEffectStatus, drawHud, type EffectStatus, type HudVitals } from '../ui/Hud.ts';
import { NameEntryDialog } from '../ui/NameEntryDialog.ts';
import { StageSelect, type StageCard } from '../ui/StageSelect.ts';
import {
  drawResultScreen,
  drawStageBanner,
  drawStageClearBanner,
  drawTitleScreen,
  STAGE_BANNER_DURATION,
} from '../ui/screens.ts';

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
  private readonly progress = new ProgressStore(
    PROGRESS_CONFIG.storageKey,
    PROGRESS_CONFIG.exStorageKey,
    STAGES.length,
  );
  private readonly nameDialog: NameEntryDialog;
  private readonly stageSelect: StageSelect;
  private readonly retryButton: Button;
  private readonly shareButton: Button;
  private readonly stageSelectButton: Button;
  private phaseTime = 0;
  /** 直近のゲームの順位 (0始まり、圏外・未登録なら null) */
  private lastRank: number | null = null;
  /** ランキングに記録しなかった理由 (結果画面に表示) */
  private rankingNote: string | null = null;
  private unsubscribeTap: (() => void) | null = null;
  private readonly floatingTexts = new FloatingTexts();
  private readonly fx = new Effects();
  /** ステージ開始直後の最初の発射まで (最大 STAGE_BANNER_DURATION 秒)、ステージ名を出す */
  private showStageBanner = true;
  private bannerTime = 0;
  /** HP ゲージを滑らかに減らすための表示用の値 */
  private bossHpDisplay = 0;
  private playerHpDisplay = 0;
  private lastClearBonus = 0;

  /**
   * @param uiRoot 名前入力ダイアログなど HTML の UI を配置する要素
   */
  constructor(
    width: number,
    height: number,
    private readonly input: Input,
    uiRoot: HTMLElement,
  ) {
    this.world = new BreakoutWorld(width, height, BREAKOUT_CONFIG, DEV_OPTIONS);
    this.nameDialog = new NameEntryDialog(uiRoot, RANKING_CONFIG.nameMaxLength);
    this.stageSelect = new StageSelect(width / 2, 585);
    this.retryButton = new Button('RETRY', width / 2, 655);
    this.shareButton = new Button('SHARE ON X', width / 2, 740, 240, 60, 'secondary');
    this.stageSelectButton = new Button('STAGE SELECT', width / 2, 820, 240, 56, 'secondary');
    this.selectDefaultStage();
    this.world.events.on('phaseChange', ({ phase }) => {
      this.phaseTime = 0;
      if (phase === 'gameover' || phase === 'clear') this.onGameEnd(phase === 'clear');
    });
    this.subscribeEffects();
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
    this.floatingTexts.update(dt);
    this.fx.update(dt);
    this.bannerTime += dt;
    this.easeGauges(dt);
    const { world } = this;
    const confirmKey = input.isPressed('Space') || input.isPressed('Enter');

    switch (world.phase) {
      case 'title':
        this.updateTitle(input, confirmKey);
        return;
      case 'gameover':
      case 'clear': {
        if (!this.isResultInteractive()) return;
        const { x, y } = input.pointer;
        const pressed = input.isPointerPressed;
        if ((pressed && this.retryButton.contains(x, y)) || confirmKey) {
          // 同じステージからやり直す
          world.newGame(world.startStageIndex, world.isExStage);
        } else if ((pressed && this.stageSelectButton.contains(x, y)) || input.isPressed('Escape')) {
          world.returnToTitle();
          this.selectDefaultStage();
        }
        return;
      }
      default:
        world.update(dt, this.readControls(input));
    }
  }

  render(r: Renderer, alpha: number): void {
    const { world } = this;
    const { field } = BREAKOUT_CONFIG;
    drawWorld(r, world, alpha, this.fx);
    if (world.battle) {
      // 目盛りは攻撃パターンが変わる HP の割合 (最初の段階は除く)
      const markers = BREAKOUT_CONFIG.boss.phases.slice(1).map((p) => p.hpRatio);
      drawBossHp(r, field.top + 14, this.bossHpDisplay, world.battle.boss.maxHp, markers);
    }
    drawEffectStatus(r, r.height - 26, this.effectStatus());
    this.floatingTexts.draw(r);
    drawHud(r, field.top, {
      score: world.score,
      best: this.ranking.best,
      stageLabel: String(world.stageIndex + 1).padStart(2, '0') + (world.isExStage ? ' EX' : ''),
      bossStage: world.battle !== null,
      vitals: this.vitals(),
    });
    if (import.meta.env.DEV && isDevModeActive(DEV_OPTIONS)) drawDebugBadge(r, devModeLabel(DEV_OPTIONS));

    const bannerY = 600;
    switch (world.phase) {
      case 'title':
        drawTitleScreen(r, this.stageSelect, this.stageCards(), this.hoverCard());
        break;
      case 'serve':
        if (this.showStageBanner && this.bannerTime < STAGE_BANNER_DURATION) {
          drawStageBanner(
            r,
            bannerY,
            {
              stageNumber: world.stageIndex + 1,
              stageCount: world.stageCount,
              ex: world.isExStage,
              title: world.stageInfo.title,
            },
            this.bannerTime,
          );
        }
        break;
      case 'stageclear': {
        const label = world.battle
          ? 'BOSS DEFEATED'
          : `STAGE ${String(world.stageIndex + 1).padStart(2, '0')} CLEAR`;
        const t = world.stageClearProgress * BREAKOUT_CONFIG.stageClearDelay;
        drawStageClearBanner(r, bannerY, label, this.lastClearBonus, t);
        break;
      }
      case 'gameover':
      case 'clear':
        drawResultScreen(r, {
          kind: world.phase,
          stageLabel: world.isExStage
            ? `STAGE ${world.stageIndex + 1} EX`
            : `STAGE ${world.stageIndex + 1} / ${world.stageCount}`,
          score: world.score,
          rank: this.lastRank,
          note: this.rankingNote,
          ranking: this.ranking.list,
          retryButton: this.retryButton,
          shareButton: this.shareButton,
          stageSelectButton: this.stageSelectButton,
          hover: this.hoverButton(),
        });
        break;
    }
  }

  /** 演出用にゲームイベントを購読する */
  private subscribeEffects(): void {
    const { events } = this.world;
    events.on('stageStart', () => {
      this.showStageBanner = true;
      this.bannerTime = 0;
      this.floatingTexts.clear();
      this.fx.clear();
      this.bossHpDisplay = this.world.battle?.boss.hp ?? 0;
      this.playerHpDisplay = this.world.playerHp;
    });
    events.on('brickDestroyed', ({ brick }) => this.fx.brickBroken(brick));
    events.on('brickHit', ({ brick }) => {
      if (!brick.breakable) this.fx.steelHit(brick);
    });
    events.on('ballLaunch', () => {
      this.showStageBanner = false;
    });
    events.on('stageClear', ({ stageIndex, bonus }) => {
      this.lastClearBonus = bonus;
      if (this.world.isExStage) {
        this.progress.markExCleared(stageIndex);
      } else {
        this.progress.markCleared(stageIndex);
      }
    });
    events.on('playerDamaged', ({ hp }) => {
      const { paddle } = this.world;
      this.floatingTexts.add(hp > 0 ? 'DAMAGE' : 'DOWN', paddle.x, paddle.y - 30, THEME.orange);
    });
  }

  /** 開始画面: カードのタップで開始。キーボードは ←→ で選び Space / Enter で開始 */
  private updateTitle(input: Input, confirmKey: boolean): void {
    const cards = this.stageCards();
    if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) this.stageSelect.move(cards, -1);
    if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) this.stageSelect.move(cards, 1);

    let start: number | null = confirmKey ? this.stageSelect.selected : null;
    if (input.isPointerPressed) {
      start = this.stageSelect.hitTest(cards.length, input.pointer.x, input.pointer.y);
    }
    const card = start === null ? undefined : cards[start];
    if (start === null || !card?.unlocked) return;
    this.stageSelect.selected = start;
    this.world.newGame(start, card.ex);
  }

  /**
   * ステージ選択のカード。
   * EX モードを持つボスは、倒すとカードが EX 表示に切り替わり、そこから EX モードを始める。
   * その場合の CLEAR は EX モードをクリアしたときに付く
   */
  private stageCards(): StageCard[] {
    return STAGES.map((stage, i) => {
      const exDef = stage.kind === 'boss' ? stage.ex : undefined;
      const ex = exDef !== undefined && this.progress.isCleared(i);
      return {
        title: ex && exDef ? exDef.title : stage.title,
        unlocked: this.progress.isUnlocked(i) || this.isDevUnlocked(i),
        cleared: exDef ? this.progress.isExCleared(i) : this.progress.isCleared(i),
        ex,
      };
    });
  }

  /** 開発用オプション ?stage=N で、STAGE N までを選択可能にする */
  private isDevUnlocked(index: number): boolean {
    return import.meta.env.DEV && DEV_OPTIONS.startStage !== null && index <= DEV_OPTIONS.startStage;
  }

  /** 開始画面で最初に選んでおくステージ: 解放済みの最も先のステージ */
  private selectDefaultStage(): void {
    const cards = this.stageCards();
    let index = 0;
    cards.forEach((card, i) => {
      if (card.unlocked) index = i;
    });
    if (import.meta.env.DEV && DEV_OPTIONS.startStage !== null) {
      index = Math.min(DEV_OPTIONS.startStage, cards.length - 1);
    }
    this.stageSelect.selected = index;
  }

  /** HP ゲージの表示値を実際の値へ素早く近づける */
  private easeGauges(dt: number): void {
    const k = Math.min(1, dt * 10);
    const bossHp = this.world.battle?.boss.hp ?? 0;
    this.bossHpDisplay += (bossHp - this.bossHpDisplay) * k;
    this.playerHpDisplay += (this.world.playerHp - this.playerHpDisplay) * k;
  }

  /** ポインタが乗っているステージカード (ホバー表示用) */
  private hoverCard(): number | null {
    const { x, y } = this.input.pointer;
    return this.stageSelect.hitTest(STAGES.length, x, y);
  }

  /** ポインタが乗っている結果画面のボタン (ホバー表示用) */
  private hoverButton(): Button | null {
    if (!this.isResultInteractive()) return null;
    const { x, y } = this.input.pointer;
    return [this.retryButton, this.shareButton, this.stageSelectButton].find((b) => b.contains(x, y)) ?? null;
  }

  private vitals(): HudVitals {
    const { world } = this;
    if (world.battle) return { kind: 'hp', hp: this.playerHpDisplay, maxHp: world.playerMaxHp };
    return { kind: 'lives', lives: world.lives, maxLives: world.maxLives };
  }

  /** 発動中のアイテム効果 (画面下に表示) */
  private effectStatus(): EffectStatus[] {
    const { world } = this;
    const { items } = BREAKOUT_CONFIG;
    const list: EffectStatus[] = [];
    if (world.wideTimeLeft > 0) {
      list.push({
        label: 'WIDE',
        color: THEME.items.wide,
        ratio: world.wideTimeLeft / items.wide.duration,
      });
    }
    const bar = world.safetyBar;
    if (bar) {
      list.push({
        label: 'SAFETY',
        color: THEME.items.safety,
        ratio: bar.timeLeft / items.safety.duration,
      });
    }
    return list;
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
    this.rankingNote = null;
    // テスト用オプションで出したスコアは、端末内ランキングを汚さないよう記録しない
    if (import.meta.env.DEV && isDevModeActive(DEV_OPTIONS)) {
      this.rankingNote = 'DEBUG 中のためランキング対象外';
      return;
    }
    // 途中のステージから始めたスコアは、通しプレイと比べられないため記録しない
    if (this.world.startStageIndex !== 0) {
      this.rankingNote = 'STAGE 1 から始めるとランキングに記録されます';
      return;
    }
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
    const result =
      this.world.isExStage
        ? phase === 'clear'
          ? `STAGE ${this.world.stageIndex + 1} の EX ボスを倒した！`
          : `(STAGE ${this.world.stageIndex + 1} EX に挑戦)`
        : phase === 'clear'
          ? 'ボスを倒して GAME CLEAR！'
          : `(STAGE ${this.world.stageIndex + 1} まで到達)`;
    openXShare(`BREAKOUT で ${score} 点を記録！
${result}
`, gameUrl(), SHARE_CONFIG.hashtags);
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
