import { readJson, writeJson } from '../storage/localStore.ts';

/**
 * ステージのクリア状況を端末内 (localStorage) に保存する。
 * STAGE 1 は最初から選択でき、ステージ N をクリアすると N+1 が選択できるようになる。
 * ボスの EX モードのクリアは、通常のクリアとは別に記録する。
 * 保存できない環境では、そのセッション中だけメモリで保持する。
 */
export class ProgressStore {
  private readonly cleared: Set<number>;
  private readonly exCleared: Set<number>;

  constructor(
    private readonly storageKey: string,
    private readonly exStorageKey: string,
    private readonly stageCount: number,
  ) {
    this.cleared = new Set(this.load(storageKey));
    this.exCleared = new Set(this.load(exStorageKey));
  }

  /** @param index ステージ番号 (0 始まり) */
  isCleared(index: number): boolean {
    return this.cleared.has(index);
  }

  isUnlocked(index: number): boolean {
    return index === 0 || this.isCleared(index - 1);
  }

  isExCleared(index: number): boolean {
    return this.exCleared.has(index);
  }

  markCleared(index: number): void {
    this.add(this.cleared, this.storageKey, index);
  }

  markExCleared(index: number): void {
    this.add(this.exCleared, this.exStorageKey, index);
  }

  private add(set: Set<number>, key: string, index: number): void {
    if (set.has(index)) return;
    set.add(index);
    writeJson(key, [...set].sort((a, b) => a - b));
  }

  /** 保存データを検証して、範囲内のステージ番号だけを取り出す */
  private load(key: string): number[] {
    const data = readJson(key);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (v): v is number => Number.isInteger(v) && v >= 0 && v < this.stageCount,
    );
  }
}
