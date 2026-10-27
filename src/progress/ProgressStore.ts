import { readJson, writeJson } from '../storage/localStore.ts';

/**
 * ステージのクリア状況を端末内 (localStorage) に保存する。
 * STAGE 1 は最初から選択でき、ステージ N をクリアすると N+1 が選択できるようになる。
 * 保存できない環境では、そのセッション中だけメモリで保持する。
 */
export class ProgressStore {
  private readonly cleared: Set<number>;

  constructor(
    private readonly storageKey: string,
    private readonly stageCount: number,
  ) {
    this.cleared = new Set(this.load());
  }

  /** @param index ステージ番号 (0 始まり) */
  isCleared(index: number): boolean {
    return this.cleared.has(index);
  }

  isUnlocked(index: number): boolean {
    return index === 0 || this.isCleared(index - 1);
  }

  markCleared(index: number): void {
    if (this.cleared.has(index)) return;
    this.cleared.add(index);
    writeJson(this.storageKey, [...this.cleared].sort((a, b) => a - b));
  }

  /** 保存データを検証して、範囲内のステージ番号だけを取り出す */
  private load(): number[] {
    const data = readJson(this.storageKey);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (v): v is number => Number.isInteger(v) && v >= 0 && v < this.stageCount,
    );
  }
}
