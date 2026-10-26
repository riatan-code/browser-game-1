export interface Hit {
  /** 矩形からボールへ向かう法線 */
  nx: number;
  ny: number;
  /** めり込み量 */
  depth: number;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** 円と軸平行矩形 (左上 x,y) の衝突判定。衝突していなければ null。 */
export function circleRect(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): Hit | null {
  const dx = cx - clamp(cx, rx, rx + rw);
  const dy = cy - clamp(cy, ry, ry + rh);
  const d2 = dx * dx + dy * dy;
  if (d2 > r * r) return null;

  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, depth: r - d };
  }

  // 中心が矩形内に入り込んでいる場合は、最も近い辺から押し出す
  const left = cx - rx;
  const right = rx + rw - cx;
  const top = cy - ry;
  const bottom = ry + rh - cy;
  const min = Math.min(left, right, top, bottom);
  if (min === top) return { nx: 0, ny: -1, depth: top + r };
  if (min === bottom) return { nx: 0, ny: 1, depth: bottom + r };
  if (min === left) return { nx: -1, ny: 0, depth: left + r };
  return { nx: 1, ny: 0, depth: right + r };
}
