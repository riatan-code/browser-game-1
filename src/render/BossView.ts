import type { BossBattle } from '../game/BossBattle.ts';
import type { Boss, Laser } from '../game/types.ts';
import { drawRabbit, type RabbitPose } from './bossCharacter.ts';
import type { Renderer } from './Renderer.ts';
import { THEME } from './theme.ts';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * ボス本体・攻撃予告・弾・レーザーの描画。
 * @param paddleY パドルの高さ。レーザーの照準に「ここが危ない」印を付ける位置
 * @param defeatProgress 撃破演出の進み具合 (0..1)。撃破前は 0
 */
export function drawBossBattle(
  r: Renderer,
  battle: BossBattle,
  fieldHeight: number,
  paddleY: number,
  alpha: number,
  defeatProgress: number,
): void {
  const { boss, telegraph } = battle;
  const { ctx } = r;
  const x = lerp(boss.prevX, boss.x, alpha);
  const time = performance.now() / 1000;
  const top = battle.laserTop;

  if (telegraph) {
    const t = telegraph.time / telegraph.duration;
    for (const zone of telegraph.zones) drawLaserWarning(r, zone, top, fieldHeight, paddleY, t, time);
  }
  for (const laser of battle.lasers) drawLaserBeam(r, laser, top, fieldHeight, time);

  // 撃破後はへたり込んだ姿を見せ、演出の最後に薄れて消える
  const defeated = boss.hp <= 0;
  ctx.globalAlpha = defeated ? Math.min(1, (1 - defeatProgress) / 0.2) : 1;
  // 撃ち続けている間は構えた姿勢のまま
  const charge = telegraph ? telegraph.time / telegraph.duration : battle.emitting ? 1 : null;
  drawRabbit(r, x, boss.y + boss.height, poseFor(boss, charge, defeated ? defeatProgress : null));
  ctx.globalAlpha = 1;
  if (charge !== null) drawAlert(r, x + boss.width * 0.42, boss.y - 10, charge);

  drawBullets(r, battle, alpha);
}

/**
 * 状態ごとの姿勢。顔つきは変えず、体の伸縮・揺れ・耳・目の開閉だけで表す。
 * 見た目だけのアニメーションなので、描画側の時計 (performance.now) を使う。
 * @param charge 攻撃予告の進み具合 (0..1)。予告中でなければ null
 * @param defeat 撃破演出の進み具合 (0..1)。撃破前は null
 */
function poseFor(boss: Boss, charge: number | null, defeat: number | null): RabbitPose {
  const t = performance.now() / 1000;
  // 通常: ゆっくり呼吸するように伸び縮みし、耳が少し揺れる
  const breath = Math.sin(t * 2.4);
  const pose: RabbitPose = {
    scaleX: 1 - 0.015 * breath,
    scaleY: 1 + 0.02 * breath,
    offsetX: 0,
    earSpread: 0.05 * Math.sin(t * 1.7),
    eyes: 'open',
    spin: 0,
  };

  if (defeat !== null) {
    // 撃破: 目を回し、耳が垂れて、小さく縮んでへたり込む
    const k = 1 - (1 - Math.min(1, defeat * 2.5)) ** 3;
    pose.eyes = 'dizzy';
    pose.spin = t * 6;
    pose.scaleX = 1 - 0.22 * k + 0.02 * Math.sin(t * 9) * k;
    pose.scaleY = 1 - 0.38 * k;
    pose.earSpread = 0.95 * k;
    return pose;
  }

  if (charge !== null) {
    // 攻撃前: 身を縮めて構え、耳をぴんと立ててぷるぷる震える
    pose.scaleX += 0.08 * charge;
    pose.scaleY -= 0.12 * charge;
    pose.earSpread = -0.14 * charge + 0.07 * Math.sin(t * 38) * charge;
    pose.offsetX = Math.sin(t * 52) * 1.6 * charge;
  }

  if (boss.flashTime > 0) {
    // 被弾: 一瞬目をつぶって潰れ、小さく揺れる
    const k = boss.flashTime / 0.15;
    pose.eyes = 'closed';
    pose.scaleX += 0.08 * k;
    pose.scaleY -= 0.12 * k;
    pose.offsetX += Math.sin(t * 90) * 2.5 * k;
  }
  return pose;
}

/** 攻撃予告の「!」。顔を怖くせずに、攻撃が来ることを知らせる */
function drawAlert(r: Renderer, x: number, y: number, charge: number): void {
  const pop = Math.min(1, charge * 4);
  const size = 18 + 8 * pop;
  r.text('!', x, y, { size, weight: 700, align: 'center', color: THEME.orange, glow: 8 });
}

const easeOut = (t: number): number => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * レーザーの照準。細い光の線で照射範囲を描き出し、発射が近づくほど明るくなる。
 * - 両端のガイド線がボスから下へ伸びていく
 * - 照射範囲の中を走査線が上から下へ流れる
 * - パドルの高さに角括弧の印を付け、避けるべき範囲を示す
 * - 発射直前はガイド線が明滅して強く光る
 * @param t 予告の進み具合 (0..1)
 */
function drawLaserWarning(
  r: Renderer,
  zone: { x: number; width: number },
  top: number,
  bottom: number,
  paddleY: number,
  t: number,
  time: number,
): void {
  const { ctx } = r;
  const color = THEME.laser;
  const left = zone.x - zone.width / 2;
  const right = zone.x + zone.width / 2;
  const h = bottom - top;
  const imminent = t > 0.75;
  const flicker = imminent ? 0.6 + 0.4 * Math.abs(Math.sin(time * 40)) : 1;

  // ごく薄い照射範囲
  ctx.globalAlpha = 0.03 + 0.08 * t;
  r.fillRect(left, top, zone.width, h, color);

  // 走査線: 上から下へ繰り返し流れ、後ろに短い残光を引く
  const scanY = top + ((time * 1.4) % 1) * h;
  const trail = ctx.createLinearGradient(0, scanY - 46, 0, scanY);
  trail.addColorStop(0, 'rgba(255, 157, 66, 0)');
  trail.addColorStop(1, 'rgba(255, 157, 66, 0.22)');
  ctx.globalAlpha = 0.4 + 0.6 * t;
  ctx.fillStyle = trail;
  ctx.fillRect(left, scanY - 46, zone.width, 46);
  r.strokeLine(left, scanY, right, scanY, color, 1);

  // 両端のガイド線: 予告の前半でボスから下へ伸び切る
  const reach = top + h * easeOut(t / 0.4);
  ctx.globalAlpha = (0.45 + 0.4 * t) * flicker;
  if (imminent) r.setGlow(color, 10);
  r.strokeLine(left, top, left, reach, color, imminent ? 1.5 : 1);
  r.strokeLine(right, top, right, reach, color, imminent ? 1.5 : 1);
  r.setGlow();

  // 発射口とパドルの高さに角括弧の印
  ctx.globalAlpha = (0.5 + 0.5 * t) * flicker;
  const c = Math.min(14, zone.width / 4);
  r.strokeLine(left, top, left + c, top, color, 1.5);
  r.strokeLine(right, top, right - c, top, color, 1.5);
  for (const [y, dir] of [[paddleY - 10, 1], [paddleY + 24, -1]] as const) {
    r.strokeLine(left, y, left + c, y, color, 1.5);
    r.strokeLine(left, y, left, y + dir * c, color, 1.5);
    r.strokeLine(right, y, right - c, y, color, 1.5);
    r.strokeLine(right, y, right, y + dir * c, color, 1.5);
  }
  ctx.globalAlpha = 1;
}

/**
 * 照射中のレーザー。一瞬で開いて素早く閉じる光の柱。
 * 外側のかすかな光 → オレンジの本体 → 白い芯 → 両端の線、の層で描き、
 * 発射口のフレアと、柱の中を流れ落ちる光の筋を添える
 */
function drawLaserBeam(r: Renderer, laser: Laser, top: number, bottom: number, time: number): void {
  const { ctx } = r;
  const color = THEME.laser;
  const age = laser.duration - laser.timeLeft;
  const k = easeOut(age / 0.07) * Math.min(1, laser.timeLeft / 0.12);
  const h = bottom - top;
  const w = laser.width * (0.35 + 0.65 * k);
  const left = laser.x - w / 2;

  ctx.globalAlpha = 0.14 * k;
  r.fillRect(left - 8, top, w + 16, h, color);
  ctx.globalAlpha = 0.5 * k;
  r.fillRect(left, top, w, h, color);

  // 流れ落ちる光の筋
  ctx.globalAlpha = 0.35 * k;
  for (let i = 0; i < 6; i++) {
    const y = top + ((time * 2.6 + i / 6) % 1) * h;
    r.strokeLine(left + 2, y, left + w - 2, y, THEME.laserCore, 1);
  }

  ctx.globalAlpha = k;
  const core = Math.min(w * 0.3, 12);
  r.setGlow(color, 18);
  r.fillRect(laser.x - core / 2, top, core, h, THEME.laserCore);
  r.strokeLine(left, top, left, bottom, color, 1.5);
  r.strokeLine(left + w, top, left + w, bottom, color, 1.5);
  // 発射口のフレア
  r.fillEllipse(laser.x, top + 2, w / 2 + 10, 5, 0, THEME.laserCore);
  r.setGlow();
  ctx.globalAlpha = 1;
}

function drawBullets(r: Renderer, battle: BossBattle, alpha: number): void {
  for (const b of battle.bullets) {
    const bx = lerp(b.prevX, b.x, alpha);
    const by = lerp(b.prevY, b.y, alpha);
    r.ctx.globalAlpha = 0.3;
    r.fillCircle(bx, by, b.radius * 1.5, THEME.bullet);
    r.ctx.globalAlpha = 1;
    r.setGlow(THEME.bullet, 10);
    r.fillCircle(bx, by, b.radius * 0.8, THEME.bullet);
    r.setGlow();
    r.fillCircle(bx, by, b.radius * 0.4, THEME.bulletCore);
  }
}
