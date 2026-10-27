import type { RankingEntry } from '../ranking/ranking.ts';
import type { Renderer } from '../render/Renderer.ts';
import { padNumber, THEME } from '../render/theme.ts';
import type { Button } from './Button.ts';
import type { StageCard, StageSelect } from './StageSelect.ts';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOut = (t: number): number => 1 - (1 - clamp01(t)) ** 3;

function dim(r: Renderer, color: string = THEME.overlay): void {
  r.fillRect(0, 0, r.width, r.height, color);
}

/** 文字の左右に伸びる細い光の線 (見出しの装飾) */
function sideLines(r: Renderer, y: number, innerHalf: number, length: number, color: string, alpha = 0.6): void {
  const cx = r.width / 2;
  r.ctx.globalAlpha = alpha;
  r.strokeLine(cx - innerHalf - length, y, cx - innerHalf, y, color);
  r.strokeLine(cx + innerHalf, y, cx + innerHalf + length, y, color);
  r.ctx.globalAlpha = 1;
}

/** ゲーム開始画面。タイトルとステージ選択だけを置く。 */
export function drawTitleScreen(
  r: Renderer,
  stageSelect: StageSelect,
  cards: readonly StageCard[],
  hoverCard: number | null,
): void {
  dim(r);
  const cx = r.width / 2;

  r.text('BREAKOUT', cx, 340, {
    size: 50,
    weight: 200,
    spacing: 12,
    align: 'center',
    color: THEME.ice,
    glow: 16,
    glowColor: THEME.cyan,
  });
  sideLines(r, 386, 6, 150, THEME.cyan);

  r.text('STAGE SELECT', cx, 500, { size: 11, weight: 500, spacing: 4, align: 'center', color: THEME.subText });
  stageSelect.draw(r, cards, hoverCard);
}

export interface ResultView {
  kind: 'gameover' | 'clear';
  /** 到達したステージの表示 (例: "STAGE 2 / 3") */
  stageLabel: string;
  score: number;
  /** 今回の記録の順位 (0始まり、圏外・未記録なら null) */
  rank: number | null;
  /** 順位の代わりに表示する補足 (ランキング対象外の理由など) */
  note: string | null;
  ranking: readonly RankingEntry[];
  retryButton: Button;
  shareButton: Button;
  stageSelectButton: Button;
  /** ポインタが乗っているボタン */
  hover: Button | null;
}

export function drawResultScreen(r: Renderer, view: ResultView): void {
  dim(r, THEME.overlayStrong);
  const cx = r.width / 2;
  const isClear = view.kind === 'clear';
  const color = isClear ? THEME.cyan : THEME.orange;

  r.text(isClear ? 'ALL STAGES CLEAR' : `${view.stageLabel} で終了`, cx, 112, {
    size: 12,
    weight: 500,
    spacing: 3,
    align: 'center',
    color: THEME.subText,
  });

  r.text(isClear ? 'GAME CLEAR' : 'GAME OVER', cx, 160, {
    size: 42,
    weight: 200,
    spacing: 8,
    align: 'center',
    color: THEME.ice,
    glow: 16,
    glowColor: color,
  });
  sideLines(r, 196, 50, 110, color);

  r.text('SCORE', cx, 228, { size: 11, weight: 500, spacing: 4, align: 'center', color: THEME.subText });
  r.text(padNumber(view.score, 6), cx, 264, {
    size: 38,
    weight: 300,
    font: THEME.mono,
    spacing: 2,
    align: 'center',
    color: THEME.text,
    glow: 10,
    glowColor: THEME.cyan,
  });

  if (view.rank !== null) {
    const label = view.rank === 0 ? 'NEW RECORD' : `${view.rank + 1}位にランクイン`;
    r.text(label, cx, 308, { size: 15, weight: 600, spacing: 3, align: 'center', color: THEME.orange, glow: 8 });
  } else if (view.note) {
    r.text(view.note, cx, 308, { size: 13, weight: 500, align: 'center', color: THEME.subText });
  }

  drawRanking(r, 356, view.ranking, view.rank);

  for (const button of [view.retryButton, view.shareButton, view.stageSelectButton]) {
    button.draw(r, button === view.hover);
  }
}

/** 端末内ランキングの表 */
function drawRanking(
  r: Renderer,
  top: number,
  entries: readonly RankingEntry[],
  highlightRank: number | null,
): void {
  const cx = r.width / 2;
  const left = 40;
  const right = r.width - 40;
  const rowHeight = 36;

  r.text('RANKING', cx, top, { size: 11, weight: 500, spacing: 4, align: 'center', color: THEME.subText });
  r.strokeLine(left, top + 16, right, top + 16, THEME.faint);

  if (entries.length === 0) {
    r.text('まだ記録がありません', cx, top + 48, { size: 14, align: 'center', color: THEME.subText });
    return;
  }

  entries.forEach((entry, i) => {
    const y = top + 42 + i * rowHeight;
    const isCurrent = i === highlightRank;
    if (isCurrent) {
      r.chamferRect(left, y - rowHeight / 2 + 3, right - left, rowHeight - 6, 6);
      r.ctx.strokeStyle = THEME.orange;
      r.ctx.lineWidth = 1;
      r.ctx.stroke();
    }
    const color = isCurrent ? THEME.orange : THEME.text;
    r.text(padNumber(i + 1, 2), left + 20, y, { size: 14, font: THEME.mono, align: 'center', color: THEME.subText });
    r.text(entry.name, left + 48, y, { size: 16, weight: 500, color, maxWidth: 180 });
    r.text(padNumber(entry.score, 6), left + 320, y, { size: 16, font: THEME.mono, align: 'right', color });
    if (entry.cleared) {
      r.text('CLEAR', right - 10, y, { size: 10, weight: 600, spacing: 2, align: 'right', color: THEME.cyan });
    }
    r.strokeLine(left, y + rowHeight / 2, right, y + rowHeight / 2, 'rgba(28, 44, 60, 0.6)');
  });
}

export interface StageBannerView {
  stageNumber: number;
  stageCount: number;
  /** ボスの EX モード */
  ex: boolean;
  title: string;
}

/** ステージ開始の表示時間 (秒)。発射するとそれより前に消える */
export const STAGE_BANNER_DURATION = 2.6;

/**
 * ステージ開始の表示。細い線が中央から左右へ伸び、文字が静かに現れて、短時間で消える。
 * 最終ステージは「FINAL STAGE」とし、オレンジの WARNING を短く点滅させて緊張感を出す。
 * @param t 表示開始からの経過秒
 */
export function drawStageBanner(r: Renderer, y: number, view: StageBannerView, t: number): void {
  const cx = r.width / 2;
  const final = view.ex || view.stageNumber === view.stageCount;
  const color = final ? THEME.orange : THEME.cyan;
  const fadeOut = clamp01((STAGE_BANNER_DURATION - t) / 0.3);
  const line = easeOut(t / 0.35);
  const textIn = clamp01((t - 0.15) / 0.3);
  const { ctx } = r;

  ctx.globalAlpha = 0.6 * fadeOut;
  r.fillRect(0, y - 48, r.width, 96, THEME.background);

  ctx.globalAlpha = fadeOut;
  const half = (r.width / 2 - 24) * line;
  r.setGlow(color, 8);
  r.strokeLine(cx - half, y - 38, cx + half, y - 38, color, 1);
  r.strokeLine(cx - half, y + 38, cx + half, y + 38, color, 1);
  r.setGlow();

  ctx.globalAlpha = textIn * fadeOut;
  const label = view.ex
    ? `STAGE ${padNumber(view.stageNumber, 2)} EX`
    : final
      ? 'FINAL STAGE'
      : `STAGE ${padNumber(view.stageNumber, 2)}`;
  r.text(label, cx, y - 10, {
    size: 32,
    weight: 200,
    spacing: 8,
    align: 'center',
    color: THEME.ice,
    glow: 14,
    glowColor: color,
  });
  r.text(view.title, cx, y + 20, { size: 11, weight: 500, spacing: 5, align: 'center', color });

  if (final && t < 1.2 && Math.floor(t * 5) % 2 === 0) {
    ctx.globalAlpha = fadeOut;
    r.text('WARNING', cx, y - 58, { size: 12, weight: 600, spacing: 6, align: 'center', color: THEME.orange, glow: 8 });
    sideLines(r, y - 58, 64, 40, THEME.orange, 0.8);
  }
  ctx.globalAlpha = 1;
}

/**
 * ステージクリアの表示。開始時と同じ線の演出で、ボーナスを添える。
 * @param t 表示開始からの経過秒
 */
export function drawStageClearBanner(r: Renderer, y: number, label: string, bonus: number, t: number): void {
  const cx = r.width / 2;
  const line = easeOut(t / 0.35);
  const textIn = clamp01((t - 0.1) / 0.25);
  const half = (r.width / 2 - 24) * line;

  r.ctx.globalAlpha = 0.6;
  r.fillRect(0, y - 46, r.width, 92, THEME.background);
  r.ctx.globalAlpha = 1;
  r.setGlow(THEME.cyan, 8);
  r.strokeLine(cx - half, y - 40, cx + half, y - 40, THEME.cyan, 1);
  r.strokeLine(cx - half, y + 40, cx + half, y + 40, THEME.cyan, 1);
  r.setGlow();

  r.ctx.globalAlpha = textIn;
  r.text(label, cx, y - 10, {
    size: 26,
    weight: 200,
    spacing: 6,
    align: 'center',
    color: THEME.ice,
    glow: 14,
    glowColor: THEME.cyan,
  });
  r.text(`BONUS +${bonus}`, cx, y + 20, { size: 14, font: THEME.mono, spacing: 2, align: 'center', color: THEME.orange });
  r.ctx.globalAlpha = 1;
}
