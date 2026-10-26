import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';
import type { Button } from './Button.ts';

function dim(r: Renderer): void {
  r.fillRect(0, 0, r.width, r.height, THEME.overlay);
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

export function drawResultScreen(
  r: Renderer,
  kind: 'gameover' | 'clear',
  score: number,
  retryButton: Button,
): void {
  dim(r);
  const cx = r.width / 2;
  const isClear = kind === 'clear';

  r.text(isClear ? 'GAME CLEAR' : 'GAME OVER', cx, 400, {
    size: 52,
    weight: 900,
    align: 'center',
    color: isClear ? THEME.accent : THEME.danger,
  });

  r.text('SCORE', cx, 480, { size: 16, weight: 700, align: 'center', color: THEME.subText });
  r.text(String(score), cx, 522, { size: 44, weight: 800, align: 'center', color: THEME.text });

  retryButton.draw(r);
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
