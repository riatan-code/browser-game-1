import type { Renderer } from '../render/Renderer.ts';
import { padNumber, THEME } from '../render/theme.ts';

/**
 * 右上に出すプレイヤーの残り。ブロックステージは LIFE、ボス戦は PLAYER HP。
 * hp は滑らかに減らすための表示用の値 (小数可)
 */
export type HudVitals =
  | { kind: 'lives'; lives: number; maxLives: number }
  | { kind: 'hp'; hp: number; maxHp: number };

export interface HudState {
  score: number;
  best: number;
  stageNumber: number;
  /** ボス戦中は強調色をオレンジにする */
  bossStage: boolean;
  vitals: HudVitals;
}

const LABEL = { size: 11, weight: 500, spacing: 3, color: THEME.subText, font: THEME.font } as const;

/**
 * 画面上部の HUD。大きな背景パネルは置かず、細い文字と光る数字、小さな区切り線だけで構成する。
 *   SCORE 002450   |   STAGE 02   |   LIFE ● ● ●
 */
export function drawHud(r: Renderer, height: number, state: HudState): void {
  // HUD の領域だけ背景グリッドを隠す (パネルとしては見せない)
  r.fillRect(0, 0, r.width, height, THEME.background);

  const pad = 20;
  const labelY = height * 0.34;
  const valueY = height * 0.68;
  const accent = state.bossStage ? THEME.orange : THEME.cyan;

  r.text('SCORE', pad, labelY, LABEL);
  r.text(`BEST ${padNumber(Math.max(state.best, state.score), 6)}`, pad + 66, labelY, {
    ...LABEL,
    size: 10,
    spacing: 1,
    font: THEME.mono,
  });
  r.text(padNumber(state.score, 6), pad, valueY, {
    size: 24,
    weight: 300,
    font: THEME.mono,
    color: THEME.text,
    spacing: 1,
    glow: 8,
    glowColor: THEME.cyan,
  });

  const cx = r.width / 2;
  r.text('STAGE', cx, labelY, { ...LABEL, align: 'center' });
  r.text(padNumber(state.stageNumber, 2), cx, valueY, {
    size: 24,
    weight: 300,
    font: THEME.mono,
    align: 'center',
    color: state.bossStage ? THEME.orange : THEME.text,
    spacing: 2,
    glow: 8,
    glowColor: accent,
  });

  // 列の区切り
  for (const x of [r.width * 0.36, r.width * 0.64]) {
    r.strokeLine(x, labelY - 4, x, valueY + 8, THEME.faint);
  }

  const right = r.width - pad;
  if (state.vitals.kind === 'lives') {
    drawLives(r, right, labelY, valueY, state.vitals.lives, state.vitals.maxLives);
  } else {
    drawPlayerHp(r, right, labelY, valueY, state.vitals.hp, state.vitals.maxHp);
  }
}

function drawLives(r: Renderer, right: number, labelY: number, valueY: number, lives: number, max: number): void {
  r.text('LIFE', right, labelY, { ...LABEL, align: 'right' });
  // 残りライフは光る点、失ったライフは暗い輪
  const radius = 4.5;
  const spacing = 18;
  for (let i = 0; i < max; i++) {
    const x = right - radius - (max - 1 - i) * spacing;
    if (i < lives) {
      r.setGlow(THEME.cyan, 8);
      r.fillCircle(x, valueY, radius, THEME.ice);
      r.setGlow();
    } else {
      r.strokeCircle(x, valueY, radius, THEME.faint, 1);
    }
  }
}

/** PLAYER HP: 細長いゲージ。HP 1 ごとに区切りを入れ、減ると滑らかに短くなる */
function drawPlayerHp(r: Renderer, right: number, labelY: number, valueY: number, hp: number, max: number): void {
  r.text('PLAYER', right, labelY, { ...LABEL, align: 'right' });
  drawGauge(r, right - 120, valueY - 2, 120, hp / max, THEME.cyan, max);
}

/**
 * 細長いゲージ。背景は暗く、残り部分だけが発光する。
 * @param segments 区切りの数 (0 で区切りなし)
 * @param markers ゲージの上下に付ける目盛りの位置 (割合)
 */
function drawGauge(
  r: Renderer,
  x: number,
  y: number,
  w: number,
  ratio: number,
  color: string,
  segments: number,
  markers: readonly number[] = [],
): void {
  const h = 4;
  r.fillRect(x, y, w, h, THEME.faint);
  const filled = w * Math.max(0, Math.min(1, ratio));
  if (filled > 0) {
    r.setGlow(color, 10);
    r.fillRect(x, y, filled, h, color);
    r.setGlow();
  }
  for (let i = 1; i < segments; i++) {
    r.fillRect(x + (w * i) / segments - 1, y, 2, h, THEME.background);
  }
  for (const m of markers) {
    const mx = x + w * m;
    r.strokeLine(mx, y - 4, mx, y - 1, color, 1);
    r.strokeLine(mx, y + h + 1, mx, y + h + 4, color, 1);
  }
}

/**
 * ボスの HP ゲージ (フィールド上端)。オレンジで、ボス戦であることを示す。
 * @param hp 表示用の値 (滑らかに減らすため小数可)
 * @param markers 攻撃パターンが変わる HP の割合。ゲージの目盛りとして表示する
 */
export function drawBossHp(
  r: Renderer,
  y: number,
  hp: number,
  maxHp: number,
  markers: readonly number[],
): void {
  r.text('BOSS', 18, y + 2, { ...LABEL, color: THEME.orange });
  drawGauge(r, 74, y, r.width - 74 - 18, hp / maxHp, THEME.orange, 0, markers);
}

export interface EffectStatus {
  label: string;
  color: string;
  /** 残り時間の割合 (0..1) */
  ratio: number;
}

/** 発動中のアイテム効果と残り時間を、画面下 (指を置く領域) に並べる */
export function drawEffectStatus(r: Renderer, y: number, effects: readonly EffectStatus[]): void {
  const w = 110;
  const gap = 24;
  const total = effects.length * w + (effects.length - 1) * gap;
  effects.forEach((e, i) => {
    const x = (r.width - total) / 2 + i * (w + gap);
    r.text(e.label, x, y - 8, { ...LABEL, size: 10, color: e.color });
    drawGauge(r, x, y + 2, w, e.ratio, e.color, 0);
  });
}

/** 開発用オプションが有効なことを示す表示 (画面左下) */
export function drawDebugBadge(r: Renderer, label: string): void {
  r.text(label, 10, r.height - 10, { size: 10, weight: 600, spacing: 1, color: THEME.orange, maxWidth: r.width - 20 });
}
