import type { Brick } from '../game/types.ts';
import type { Renderer } from './Renderer.ts';
import { brickColor, THEME } from './theme.ts';

interface Flash {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  age: number;
}

/** ブロックの輪郭が分解した1本の線 */
interface Shard {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  vx: number;
  vy: number;
  color: string;
  age: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  age: number;
  life: number;
}

const FLASH_LIFE = 0.12;
const SHARD_LIFE = 0.28;
const STEEL_FLASH_LIFE = 0.18;
/** 粒子の上限。マルチボールで大量に壊れても描画負荷が増えすぎないようにする */
const MAX_SPARKS = 120;

/**
 * 盤面の短いエフェクト (速い・短い・静か)。
 * - ブロック破壊: 一瞬強く光り、輪郭の線が四方へ分かれて消え、小さな光の粒が少し散る
 * - 壊れないブロックへの衝突: 一瞬だけ強く光る
 * 見た目だけの演出なので、ゲームの状態には一切影響しない。
 */
export class Effects {
  private flashes: Flash[] = [];
  private shards: Shard[] = [];
  private sparks: Spark[] = [];
  private readonly steelFlash = new Map<Brick, number>();

  brickBroken(brick: Brick): void {
    const { x, y, width: w, height: h } = brick;
    const color = brickColor(brick.row);
    this.flashes.push({ x, y, w, h, color, age: 0 });

    const speed = 70;
    this.shards.push(
      { x1: x, y1: y, x2: x + w, y2: y, vx: 0, vy: -speed, color, age: 0 },
      { x1: x, y1: y + h, x2: x + w, y2: y + h, vx: 0, vy: speed, color, age: 0 },
      { x1: x, y1: y, x2: x, y2: y + h, vx: -speed, vy: 0, color, age: 0 },
      { x1: x + w, y1: y, x2: x + w, y2: y + h, vx: speed, vy: 0, color, age: 0 },
    );

    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let i = 0; i < 6 && this.sparks.length < MAX_SPARKS; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 110;
      this.sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        color: i % 2 === 0 ? THEME.ice : color,
        age: 0,
        life: 0.25 + Math.random() * 0.15,
      });
    }
  }

  steelHit(brick: Brick): void {
    this.steelFlash.set(brick, STEEL_FLASH_LIFE);
  }

  /** 壊れないブロックの発光の強さ (0..1) */
  steelFlashLevel(brick: Brick): number {
    return (this.steelFlash.get(brick) ?? 0) / STEEL_FLASH_LIFE;
  }

  clear(): void {
    this.flashes = [];
    this.shards = [];
    this.sparks = [];
    this.steelFlash.clear();
  }

  update(dt: number): void {
    for (const f of this.flashes) f.age += dt;
    this.flashes = this.flashes.filter((f) => f.age < FLASH_LIFE);

    for (const s of this.shards) {
      s.age += dt;
      const dx = s.vx * dt;
      const dy = s.vy * dt;
      s.x1 += dx;
      s.x2 += dx;
      s.y1 += dy;
      s.y2 += dy;
    }
    this.shards = this.shards.filter((s) => s.age < SHARD_LIFE);

    for (const p of this.sparks) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.sparks = this.sparks.filter((p) => p.age < p.life);

    for (const [brick, t] of this.steelFlash) {
      if (t - dt <= 0) this.steelFlash.delete(brick);
      else this.steelFlash.set(brick, t - dt);
    }
  }

  draw(r: Renderer): void {
    const { ctx } = r;
    for (const f of this.flashes) {
      const k = 1 - f.age / FLASH_LIFE;
      ctx.globalAlpha = 0.5 * k;
      r.fillRect(f.x, f.y, f.w, f.h, THEME.ice);
      ctx.globalAlpha = k;
      r.chamferRect(f.x - 2, f.y - 2, f.w + 4, f.h + 4, 5);
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const s of this.shards) {
      const k = 1 - s.age / SHARD_LIFE;
      // 線は外へ広がりながら中央へ縮んで消える
      const shrink = (1 - k) * 0.5;
      const mx = (s.x1 + s.x2) / 2;
      const my = (s.y1 + s.y2) / 2;
      ctx.globalAlpha = k;
      r.strokeLine(
        s.x1 + (mx - s.x1) * shrink,
        s.y1 + (my - s.y1) * shrink,
        s.x2 + (mx - s.x2) * shrink,
        s.y2 + (my - s.y2) * shrink,
        s.color,
        1.2,
      );
    }

    for (const p of this.sparks) {
      ctx.globalAlpha = 1 - p.age / p.life;
      r.fillRect(p.x - 1, p.y - 1, 2, 2, p.color);
    }
    ctx.globalAlpha = 1;
  }
}
