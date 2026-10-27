import type { BossBattle } from '../game/BossBattle.ts';
import type { Boss } from '../game/types.ts';
import { drawRabbit, type RabbitPose } from './bossCharacter.ts';
import type { Renderer } from './Renderer.ts';
import { THEME } from './theme.ts';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * ボス本体・攻撃予告・弾・レーザーの描画。
 * @param defeatProgress 撃破演出の進み具合 (0..1)。撃破前は 0
 */
export function drawBossBattle(
  r: Renderer,
  battle: BossBattle,
  fieldHeight: number,
  alpha: number,
  defeatProgress: number,
): void {
  const { boss, telegraph } = battle;
  const { ctx } = r;
  const x = lerp(boss.prevX, boss.x, alpha);

  // レーザーの照準: 予告中に照射範囲を示す。終盤ほど濃くなる
  if (telegraph?.kind === 'laser') {
    const t = telegraph.time / telegraph.duration;
    const w = battle.laserWidth;
    const top = battle.laserTop;
    const pulse = 0.5 + 0.5 * Math.sin(telegraph.time * 30);
    const left = telegraph.targetX - w / 2;
    const right = telegraph.targetX + w / 2;
    // 照準: ごく薄い帯と、両側の細い線。終盤ほど濃くなる
    ctx.globalAlpha = 0.05 + 0.12 * t + 0.05 * pulse;
    r.fillRect(left, top, w, fieldHeight - top, THEME.laser);
    ctx.globalAlpha = 0.5 + 0.4 * t;
    ctx.setLineDash([10, 8]);
    r.strokeLine(left, top, left, fieldHeight, THEME.laser, 1);
    r.strokeLine(right, top, right, fieldHeight, THEME.laser, 1);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  for (const laser of battle.lasers) {
    const top = battle.laserTop;
    const left = laser.x - laser.width / 2;
    ctx.globalAlpha = 0.35;
    r.fillRect(left, top, laser.width, fieldHeight - top, THEME.laser);
    ctx.globalAlpha = 1;
    r.setGlow(THEME.laser, 16);
    r.fillRect(laser.x - laser.width / 6, top, laser.width / 3, fieldHeight - top, THEME.laserCore);
    r.setGlow();
    r.strokeLine(left, top, left, fieldHeight, THEME.laser, 1.5);
    r.strokeLine(left + laser.width, top, left + laser.width, fieldHeight, THEME.laser, 1.5);
  }

  // 撃破後はへたり込んだ姿を見せ、演出の最後に薄れて消える
  const defeated = boss.hp <= 0;
  ctx.globalAlpha = defeated ? Math.min(1, (1 - defeatProgress) / 0.2) : 1;
  const charge = telegraph ? telegraph.time / telegraph.duration : null;
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
