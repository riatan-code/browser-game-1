import type { ItemKind } from './config.ts';

export type ItemWeights = Readonly<Record<ItemKind, number>>;

/** 抽選の重み付きテーブル。出現確率を確認・調整しやすいよう純粋関数にしている */
export interface DropTable {
  /** アイテムが出る確率 (0..1) */
  chance: number;
  weights: ItemWeights;
}

/**
 * アイテムを抽選する。出なければ null。
 * rng は 0 以上 1 未満を返す関数 (テスト時に差し替えられるよう引数にしている)。
 */
export function rollItem(table: DropTable, rng: () => number = Math.random): ItemKind | null {
  if (rng() >= table.chance) return null;
  const entries = Object.entries(table.weights) as [ItemKind, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;

  let pick = rng() * total;
  for (const [kind, weight] of entries) {
    pick -= weight;
    if (pick < 0) return kind;
  }
  return entries[entries.length - 1]?.[0] ?? null;
}
