import type { Renderer } from '../render/Renderer.ts';
import { THEME } from '../render/theme.ts';

export interface HudState {
  score: number;
  best: number;
  lives: number;
  maxLives: number;
}

/** 画面上部の SCORE / LIFE 表示 */
export function drawHud(r: Renderer, height: number, state: HudState): void {
  r.fillRect(0, 0, r.width, height, THEME.hudBackground);
  r.fillRect(0, height - 1, r.width, 1, THEME.divider);

  const pad = 22;
  const labelY = height * 0.33;
  const valueY = height * 0.68;

  r.text('SCORE', pad, labelY, { size: 13, weight: 700, color: THEME.subText });
  r.text(String(state.score), pad, valueY, { size: 26, weight: 800, color: THEME.text });

  r.text('BEST', r.width / 2, labelY, { size: 13, weight: 700, color: THEME.subText, align: 'center' });
  r.text(String(Math.max(state.best, state.score)), r.width / 2, valueY, {
    size: 20,
    weight: 700,
    color: THEME.subText,
    align: 'center',
  });

  r.text('LIFE', r.width - pad, labelY, {
    size: 13,
    weight: 700,
    color: THEME.subText,
    align: 'right',
  });
  // 残りライフを●、失ったライフを○で表示
  const radius = 8;
  const spacing = 24;
  for (let i = 0; i < state.maxLives; i++) {
    const x = r.width - pad - radius - (state.maxLives - 1 - i) * spacing;
    if (i < state.lives) {
      r.fillCircle(x, valueY, radius, THEME.ball);
    } else {
      r.strokeCircle(x, valueY, radius - 1, THEME.divider, 2);
    }
  }
}
