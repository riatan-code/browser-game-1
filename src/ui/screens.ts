import type { RankingEntry } from '../ranking/ranking.ts';
import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';
import type { Button } from './Button.ts';

function dim(r: Renderer, color: string = THEME.overlay): void {
  r.fillRect(0, 0, r.width, r.height, color);
}

/** ゲーム開始画面。ルールと操作方法を一目で分かるように示す。 */
export function drawTitleScreen(r: Renderer, startButton: Button): void {
  dim(r);
  const cx = r.width / 2;

  r.text('BREAKOUT', cx, 370, { size: 56, weight: 900, align: 'center', color: THEME.text });

  const rules = [
    'パドルでボールを打ち返そう',
    'ブロックをすべて壊せば CLEAR',
    'ボールを下に落とすと LIFE -1',
  ];
  rules.forEach((line, i) => {
    r.text(line, cx, 450 + i * 42, { size: 21, weight: 600, align: 'center', color: THEME.text });
  });

  r.text('マウス / 指を左右に動かして操作', cx, 600, {
    size: 17,
    align: 'center',
    color: THEME.subText,
  });

  startButton.draw(r);
}

export interface ResultView {
  kind: 'gameover' | 'clear';
  score: number;
  /** 今回の記録の順位 (0始まり、圏外・未記録なら null) */
  rank: number | null;
  ranking: readonly RankingEntry[];
  retryButton: Button;
  shareButton: Button;
}

export function drawResultScreen(r: Renderer, view: ResultView): void {
  dim(r, THEME.overlayStrong);
  const cx = r.width / 2;
  const isClear = view.kind === 'clear';

  r.text(isClear ? 'GAME CLEAR' : 'GAME OVER', cx, 165, {
    size: 52,
    weight: 900,
    align: 'center',
    color: isClear ? THEME.accent : THEME.danger,
  });

  r.text('SCORE', cx, 228, { size: 16, weight: 700, align: 'center', color: THEME.subText });
  r.text(String(view.score), cx, 268, { size: 44, weight: 800, align: 'center', color: THEME.text });

  if (view.rank !== null) {
    const label = view.rank === 0 ? 'NEW RECORD!' : `${view.rank + 1}位にランクイン!`;
    r.text(label, cx, 314, { size: 20, weight: 800, align: 'center', color: THEME.highlight });
  }

  drawRanking(r, 360, view.ranking, view.rank);

  view.retryButton.draw(r);
  view.shareButton.draw(r);
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
  const rowHeight = 38;

  r.text('RANKING', cx, top, { size: 15, weight: 700, align: 'center', color: THEME.subText });
  r.fillRect(left, top + 18, right - left, 1, THEME.divider);

  if (entries.length === 0) {
    r.text('まだ記録がありません', cx, top + 50, { size: 16, align: 'center', color: THEME.subText });
    return;
  }

  entries.forEach((entry, i) => {
    const y = top + 44 + i * rowHeight;
    const isCurrent = i === highlightRank;
    if (isCurrent) {
      r.fillRoundRect(left, y - rowHeight / 2 + 2, right - left, rowHeight - 4, 8, THEME.secondaryButton);
    }
    const color = isCurrent ? THEME.highlight : THEME.text;
    r.text(`${i + 1}`, left + 22, y, { size: 18, weight: 800, align: 'center', color });
    r.text(entry.name, left + 48, y, { size: 18, weight: 700, color, maxWidth: 190 });
    r.text(String(entry.score), left + 320, y, { size: 20, weight: 800, align: 'right', color });
    if (entry.cleared) {
      r.text('CLEAR', right - 12, y, { size: 13, weight: 800, align: 'right', color: THEME.accent });
    }
  });
}

/** 発射待ちのガイド。パドルの下 (指を置く領域) に表示する。 */
export function drawServeHint(r: Renderer, y: number): void {
  r.text('クリック / タップで発射', r.width / 2, y, {
    size: 18,
    weight: 600,
    align: 'center',
    color: THEME.subText,
  });
}
