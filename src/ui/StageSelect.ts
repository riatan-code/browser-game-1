import type { Renderer } from '../render/Renderer.ts';
import { padNumber, THEME } from '../render/theme.ts';

export interface StageCard {
  title: string;
  unlocked: boolean;
  cleared: boolean;
  /** ボスの EX モードとして表示する (強調色をオレンジにする) */
  ex: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 開始画面のステージ選択。ステージごとのカードを横に並べる。
 * 未解放のステージはグレーアウトし、選択できない。
 * ボスを倒すと、そのボスのカードが EX モードの表示に切り替わる。座標は中心 y 基準。
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
    for (let i = 0; i < count; i++) {
      const { x, y, w, h } = this.rect(count, i);
      if (px >= x && px <= x + w && py >= y && py <= y + h) return i;
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
    cards.forEach((card, i) => {
      const lit = card.unlocked && (i === this.selected || i === hover);
      this.drawCard(r, this.rect(cards.length, i), card, i, lit);
    });
  }

  private drawCard(r: Renderer, rect: Rect, card: StageCard, index: number, lit: boolean): void {
    const { x: left, y: top, w } = rect;
    const cx = left + w / 2;
    const accent = card.ex ? THEME.orange : THEME.cyan;
    drawPanel(r, rect, card.unlocked, lit, accent);

    const dim = THEME.locked;
    r.text(card.ex ? 'STAGE  EX' : 'STAGE', cx, top + 22, {
      size: 10,
      weight: 500,
      spacing: 3,
      align: 'center',
      color: card.ex ? THEME.orange : card.unlocked ? THEME.subText : dim,
    });
    r.text(padNumber(index + 1, 2), cx, top + 54, {
      size: 34,
      weight: 300,
      font: THEME.mono,
      align: 'center',
      color: card.ex ? THEME.orange : card.unlocked ? THEME.ice : dim,
      glow: lit ? 10 : 0,
      glowColor: accent,
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
      r.text('CLEAR', cx, top + 106, { size: 10, weight: 600, spacing: 3, align: 'center', color: accent });
    }
  }

  private rect(count: number, index: number): Rect {
    const rowWidth = count * this.cardWidth + (count - 1) * this.gap;
    return {
      x: this.centerX - rowWidth / 2 + index * (this.cardWidth + this.gap),
      y: this.centerY - this.cardHeight / 2,
      w: this.cardWidth,
      h: this.cardHeight,
    };
  }
}

/** カードの土台: 角を落とした暗いパネルに細い発光線 */
function drawPanel(r: Renderer, rect: Rect, unlocked: boolean, lit: boolean, color: string): void {
  const { ctx } = r;
  r.chamferRect(rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = 'rgba(3, 11, 18, 0.92)';
  ctx.fill();
  if (lit) r.setGlow(color, 14);
  ctx.strokeStyle = unlocked ? color : THEME.faint;
  ctx.globalAlpha = lit ? 1 : unlocked ? 0.45 : 1;
  ctx.lineWidth = lit ? 1.6 : 1;
  ctx.stroke();
  r.setGlow();
  ctx.globalAlpha = 1;
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
