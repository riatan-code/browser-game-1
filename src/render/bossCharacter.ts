import type { Renderer } from './Renderer.ts';
import { THEME } from './theme.ts';

/**
 * Stage 3 のボスキャラクター: 手描き風の丸いうさぎ。
 *
 * 形・顔・色はこのファイルの定数だけで決まり、どの状態でも同じ1体として描かれる。
 * 状態による違いは RabbitPose (体の伸縮・揺れ・耳の角度・目の種類) だけで表現し、
 * 顔つき (怒り顔など) や配色は変えない。
 *
 * 座標は体の下端中央を原点とし、上が負。体の大きさは当たり判定 (config の boss: 140 x 84) に合わせている。
 */

/** 体: 頭と胴が一体になった、下ぶくれの丸いシルエット */
const BODY = { cy: -42, rx: 61, ry: 41 };
/** 耳の付け根・長さ・太さ・傾き。左右で少し変えて手描きらしさを残す */
const EARS = [
  { x: -17, y: -76, length: 42, width: 19, tilt: -0.13 },
  { x: 15, y: -77, length: 37, width: 17, tilt: 0.19 },
] as const;
/** 腕と足は体の後ろから少しだけのぞかせる */
const ARMS = [
  { x: -59, y: -27, rx: 9, ry: 7, rot: 0.5 },
  { x: 59, y: -25, rx: 9, ry: 7, rot: -0.45 },
] as const;
const FEET = [
  { x: -22, y: -3, rx: 12, ry: 6 },
  { x: 21, y: -3, rx: 12, ry: 6 },
] as const;
const FACE = {
  eyeX: 21,
  eyeY: -47,
  cheekX: 37,
  cheekY: -36,
  cheekR: 8.5,
  mouthY: -39,
};
const LINE_WIDTH = 3.4;

export type RabbitEyes = 'open' | 'closed' | 'dizzy';

export interface RabbitPose {
  /** 横・縦の伸縮 (1 = 通常)。原点 (下端) を基準に伸び縮みするので、足元は浮かない */
  scaleX: number;
  scaleY: number;
  /** 揺れなどの位置のずれ */
  offsetX: number;
  /** 耳を外側へ倒す量 (ラジアン)。負なら内側へ立てる */
  earSpread: number;
  eyes: RabbitEyes;
  /** 目を回す演出の回転 (dizzy のとき) */
  spin: number;
}

/** うさぎを描く。(x, bottom) は体の下端中央 */
export function drawRabbit(r: Renderer, x: number, bottom: number, pose: RabbitPose): void {
  const { ctx } = r;
  const c = THEME.boss;
  ctx.save();
  ctx.translate(x + pose.offsetX, bottom);
  ctx.scale(pose.scaleX, pose.scaleY);
  // 伸縮しても線の太さが変わらないよう補正する
  const lw = LINE_WIDTH / ((pose.scaleX + pose.scaleY) / 2);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = c.line;

  // 体の後ろにあるもの (耳・腕・足) を先に描き、付け根を体で隠す
  EARS.forEach((ear, i) => {
    const side = i === 0 ? -1 : 1;
    const rot = ear.tilt + side * pose.earSpread;
    const ex = ear.x + Math.sin(rot) * (ear.length / 2);
    const ey = ear.y - Math.cos(rot) * (ear.length / 2);
    wobblyEllipse(ctx, ex, ey, ear.width / 2, ear.length / 2, rot, 11 + i * 7);
    fillStroke(ctx, c.body);
    wobblyEllipse(ctx, ex - Math.sin(rot) * 2, ey + Math.cos(rot) * 2, ear.width * 0.22, ear.length * 0.3, rot, 3 + i);
    ctx.fillStyle = c.pink;
    ctx.fill();
  });
  ARMS.forEach((arm, i) => {
    wobblyEllipse(ctx, arm.x, arm.y, arm.rx, arm.ry, arm.rot, 23 + i);
    fillStroke(ctx, c.body);
  });
  FEET.forEach((foot, i) => {
    wobblyEllipse(ctx, foot.x, foot.y, foot.rx, foot.ry, 0, 31 + i);
    fillStroke(ctx, c.body);
  });

  bodyPath(ctx);
  fillStroke(ctx, c.body);

  drawFace(r, pose, lw);
  ctx.restore();
}

function drawFace(r: Renderer, pose: RabbitPose, lw: number): void {
  const { ctx } = r;
  const c = THEME.boss;

  // ほっぺ: 淡いピンクの丸に、短い斜線
  for (const side of [-1, 1]) {
    const cx = side * FACE.cheekX;
    r.fillCircle(cx, FACE.cheekY, FACE.cheekR, c.pink);
    ctx.lineWidth = lw * 0.42;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const lx = cx - 4 + i * 3.6;
      ctx.moveTo(lx, FACE.cheekY + 2.8);
      ctx.lineTo(lx + 2.4, FACE.cheekY - 2.8);
    }
    ctx.stroke();
  }

  // 目
  ctx.lineWidth = lw * 0.6;
  for (const side of [-1, 1]) {
    const ex = side * FACE.eyeX;
    const ey = FACE.eyeY;
    if (pose.eyes === 'open') {
      ctx.fillStyle = c.line;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 3.6, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      r.fillCircle(ex - 1.2, ey - 1.7, 1.3, c.eyeShine);
    } else if (pose.eyes === 'closed') {
      // ぎゅっとつぶった目 (> <)
      ctx.beginPath();
      ctx.moveTo(ex + side * 4, ey - 4);
      ctx.lineTo(ex - side * 3, ey);
      ctx.lineTo(ex + side * 4, ey + 4);
      ctx.stroke();
    } else {
      // 目を回す (うずまき)
      ctx.lineWidth = lw * 0.4;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 5; a += 0.25) {
        const rad = 0.5 + a * 0.42;
        const px = ex + Math.cos(a + pose.spin * side) * rad;
        const py = ey + Math.sin(a + pose.spin * side) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // 口: 小さくゆるい ω
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.arc(-3.2, FACE.mouthY, 3.2, 0, Math.PI);
  ctx.moveTo(6.4, FACE.mouthY);
  ctx.arc(3.2, FACE.mouthY, 3.2, 0, Math.PI);
  ctx.stroke();
}

function fillStroke(ctx: CanvasRenderingContext2D, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

/**
 * 手描き線のゆらぎ。角度ごとに決まった値を返す (毎フレーム変わらない) ので、
 * 線が震えずに「少しだけ歪んだ1枚の絵」として安定して見える。
 */
function wobble(theta: number, seed: number): number {
  return (
    0.022 * Math.sin(3 * theta + seed) +
    0.014 * Math.sin(5 * theta + seed * 1.7) +
    0.008 * Math.sin(9 * theta + seed * 0.6)
  );
}

/** 点列を通る、なめらかな閉じた線 (中点を結ぶ2次曲線) */
function smoothClosedPath(ctx: CanvasRenderingContext2D, points: readonly [number, number][]): void {
  const n = points.length;
  const mid = (i: number): [number, number] => {
    const a = points[i % n] ?? [0, 0];
    const b = points[(i + 1) % n] ?? [0, 0];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  ctx.beginPath();
  const start = mid(0);
  ctx.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i++) {
    const p = points[i % n] ?? [0, 0];
    const m = mid(i);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

function wobblyEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  seed: number,
): void {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const points: [number, number][] = [];
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const k = 1 + wobble(t, seed) * 1.6;
    const px = Math.cos(t) * rx * k;
    const py = Math.sin(t) * ry * k;
    points.push([cx + px * cos - py * sin, cy + px * sin + py * cos]);
  }
  smoothClosedPath(ctx, points);
}

/** 頭と胴が一体の、下側がふっくら広がった体 */
function bodyPath(ctx: CanvasRenderingContext2D): void {
  const points: [number, number][] = [];
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const s = Math.sin(t);
    const k = 1 + wobble(t, 5.3);
    // 下半分 (s > 0) を横に広げ、底を平たくして座っているような安定感を出す
    const px = Math.cos(t) * BODY.rx * (1 + 0.07 * Math.max(0, s)) * k;
    const py = (s > 0 ? Math.pow(s, 0.6) : s) * BODY.ry * k;
    points.push([px, BODY.cy + py]);
  }
  smoothClosedPath(ctx, points);
}
