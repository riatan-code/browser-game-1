import type { Renderer } from '../render/Renderer.ts';
import { padNumber, THEME } from '../render/theme.ts';

export interface StageCard {
  title: string;
  unlocked: boolean;
  cleared: boolean;
}

/**
 * 開始画面のステージ選択。ステージごとのカードを横に並べる。
 * 未解放のステージはグレーアウトし、選択できない。座標は中心 y 基準。
 */
export class StageSelect {
  /** キーボード操作で選んでいるステージ */
  selected = 0;

  constructor(
    private readonly centerX: number,
    private readonly centerY: number,
    private readonly cardWidth = 150,
    private readonly cardHeight = 124,
    private readonly gap = 14,
  ) {}

  /** その座標にあるカードの番号。カード外なら null */
  hitTest(count: number, px: number, py: number): number | null {
    if (Math.abs(py - this.centerY) > this.cardHeight / 2) return null;
    for (let i = 0; i < count; i++) {
      const left = this.cardLeft(count, i);
      if (px >= left && px <= left + this.cardWidth) return i;
    }
    return null;
  }

  /** 解放済みのステージの中で、選択を dir (-1 / 1) 方向へ動かす */
  move(cards: readonly StageCard[], dir: number): void {
    for (let i = this.selected + dir; i >= 0 && i < cards.length; i += dir) {
      if (cards[i]?.unlocked) {
        this.selected = i;
        return;
      }
    }
  }

  /** @param hover ポインタが乗っているカード (なければ null) */
  draw(r: Renderer, cards: readonly StageCard[], hover: number | null = null): void {
    const { ctx } = r;
    const top = this.centerY - this.cardHeight / 2;
    const w = this.cardWidth;
    const h = this.cardHeight;

    cards.forEach((card, i) => {
      const left = this.cardLeft(cards.length, i);
      const cx = left + w / 2;
      const lit = card.unlocked && (i === this.selected || i === hover);

      r.chamferRect(left, top, w, h, 12);
      ctx.fillStyle = 'rgba(3, 11, 18, 0.92)';
      ctx.fill();
      if (lit) r.setGlow(THEME.cyan, 14);
      ctx.strokeStyle = card.unlocked ? THEME.cyan : THEME.faint;
      ctx.globalAlpha = lit ? 1 : card.unlocked ? 0.45 : 1;
      ctx.lineWidth = lit ? 1.6 : 1;
      ctx.stroke();
      r.setGlow();
      ctx.globalAlpha = 1;

      const dim = THEME.locked;
      r.text('STAGE', cx, top + 22, {
        size: 10,
        weight: 500,
        spacing: 3,
        align: 'center',
        color: card.unlocked ? THEME.subText : dim,
      });
      r.text(padNumber(i + 1, 2), cx, top + 54, {
        size: 34,
        weight: 300,
        font: THEME.mono,
        align: 'center',
        color: card.unlocked ? THEME.ice : dim,
        glow: lit ? 10 : 0,
        glowColor: THEME.cyan,
      });
      r.text(card.title, cx, top + 86, {
        size: 12,
        weight: 500,
        spacing: 2,
        align: 'center',
        color: card.unlocked ? THEME.text : dim,
        maxWidth: w - 16,
      });

      if (!card.unlocked) {
        drawLock(r, cx, top + 106);
      } else if (card.cleared) {
        r.text('CLEAR', cx, top + 106, { size: 10, weight: 600, spacing: 3, align: 'center', color: THEME.cyan });
      }
    });
  }

  private cardLeft(count: number, index: number): number {
    const total = count * this.cardWidth + (count - 1) * this.gap;
    return this.centerX - total / 2 + index * (this.cardWidth + this.gap);
  }
}

/** 南京錠のアイコン (絵文字はフォント依存で見た目が揃わないため細い線で描く) */
function drawLock(r: Renderer, cx: number, cy: number): void {
  const { ctx } = r;
  ctx.strokeStyle = THEME.subText;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy - 3, 4, Math.PI, 0);
  ctx.stroke();
  ctx.strokeRect(cx - 6.5, cy - 3, 13, 9);
}
