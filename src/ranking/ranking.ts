export interface RankingEntry {
  name: string;
  score: number;
  /** 記録日時 (epoch ms) */
  date: number;
  cleared: boolean;
}

/** 名前が空のときの表示名 */
export const DEFAULT_PLAYER_NAME = 'NO NAME';

/**
 * スコアをランキングに挿入する (純粋関数)。
 * 同点の場合は先に記録したものを上位とする。
 * @returns 新しいランキングと、追加したエントリの順位 (0始まり、圏外なら null)
 */
export function insertEntry(
  entries: readonly RankingEntry[],
  entry: RankingEntry,
  size: number,
): { entries: RankingEntry[]; rank: number | null } {
  const at = rankOf(entries, entry.score);
  const next = [...entries.slice(0, at), entry, ...entries.slice(at)].slice(0, size);
  return { entries: next, rank: at < size ? at : null };
}

/** そのスコアが入る位置 (0始まり)。size 以上なら圏外 */
export function rankOf(entries: readonly RankingEntry[], score: number): number {
  const index = entries.findIndex((e) => score > e.score);
  return index === -1 ? entries.length : index;
}

/**
 * 入力された名前を整える。
 * 前後の空白と制御文字を除去し、最大文字数 (サロゲートペアも1文字) で切り詰める。
 */
export function sanitizeName(raw: string, maxLength: number): string {
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return [...cleaned].slice(0, maxLength).join('').trim();
}
