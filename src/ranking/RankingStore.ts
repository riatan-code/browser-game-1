import { readJson, writeJson } from '../storage/localStore.ts';
import { DEFAULT_PLAYER_NAME, insertEntry, rankOf, type RankingEntry } from './ranking.ts';

/**
 * 端末内 (localStorage) にランキングと前回入力した名前を保存する。
 * 保存できない環境では、そのセッション中だけメモリで保持する。
 */
export class RankingStore {
  private entries: RankingEntry[];
  private name: string;

  constructor(
    private readonly storageKey: string,
    private readonly nameKey: string,
    readonly size: number,
  ) {
    this.entries = this.loadEntries();
    const savedName = readJson(nameKey);
    this.name = typeof savedName === 'string' ? savedName : '';
  }

  get list(): readonly RankingEntry[] {
    return this.entries;
  }

  get best(): number {
    return this.entries[0]?.score ?? 0;
  }

  /** 前回ランキングに登録した名前 (未登録なら空文字) */
  get lastName(): string {
    return this.name;
  }

  /** そのスコアがランクインする場合の順位 (0始まり)。圏外なら null */
  previewRank(score: number): number | null {
    if (score <= 0) return null;
    const rank = rankOf(this.entries, score);
    return rank < this.size ? rank : null;
  }

  /** スコアを記録し、順位 (0始まり、圏外なら null) を返す */
  add(entry: RankingEntry): number | null {
    const result = insertEntry(this.entries, entry, this.size);
    this.entries = result.entries;
    writeJson(this.storageKey, this.entries);
    if (entry.name !== DEFAULT_PLAYER_NAME) {
      this.name = entry.name;
      writeJson(this.nameKey, entry.name);
    }
    return result.rank;
  }

  private loadEntries(): RankingEntry[] {
    const data = readJson(this.storageKey);
    if (!Array.isArray(data)) return [];
    return data.flatMap((v) => {
      const entry = toEntry(v);
      return entry ? [entry] : [];
    }).slice(0, this.size);
  }
}

/** 保存データを検証して RankingEntry に変換する (名前のない旧形式にも対応) */
function toEntry(v: unknown): RankingEntry | null {
  if (typeof v !== 'object' || v === null) return null;
  const e = v as Record<string, unknown>;
  if (
    typeof e.score !== 'number' ||
    !Number.isFinite(e.score) ||
    typeof e.date !== 'number' ||
    typeof e.cleared !== 'boolean'
  ) {
    return null;
  }
  const name = typeof e.name === 'string' && e.name !== '' ? e.name : DEFAULT_PLAYER_NAME;
  return { name, score: e.score, date: e.date, cleared: e.cleared };
}
