/**
 * localStorage の安全なラッパー。
 * プライベートブラウズ等で使えない環境でも例外を投げず、ゲームを継続できるようにする。
 */
export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくてもゲームは継続する
  }
}
