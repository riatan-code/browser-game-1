/**
 * 開発環境 (npm run dev) 専用のテスト用オプション。URL パラメータで指定する。
 *
 *   ?life=inf  LIFE / PLAYER HP が減らない
 *   ?stage=3   STAGE 3 までをステージ選択で選べるようにし、選択状態にしておく
 *
 * 例: http://localhost:5173/browser-game-1/?life=inf&stage=3
 *
 * import.meta.env.DEV は本番ビルドで false に置き換わり、解析処理ごと取り除かれるため、
 * 公開版では URL を付けても効果がない。
 */
export interface DevOptions {
  infiniteLife: boolean;
  /** ステージ選択で解放・選択しておくステージ (0 始まり)。指定なしは null */
  startStage: number | null;
}

const DISABLED: DevOptions = { infiniteLife: false, startStage: null };

function parse(search: string): DevOptions {
  const params = new URLSearchParams(search);
  const stage = Number(params.get('stage'));
  return {
    infiniteLife: params.get('life') === 'inf',
    startStage: Number.isInteger(stage) && stage >= 1 ? stage - 1 : null,
  };
}

export const DEV_OPTIONS: DevOptions = import.meta.env.DEV ? parse(window.location.search) : DISABLED;

/** テスト用オプションが1つでも有効か (有効中はランキングに記録しない) */
export function isDevModeActive(options: DevOptions): boolean {
  return options.infiniteLife || options.startStage !== null;
}

/** HUD に出す、有効なオプションの短い表記 */
export function devModeLabel(options: DevOptions): string {
  const parts = ['DEBUG'];
  if (options.infiniteLife) parts.push('LIFE ∞');
  if (options.startStage !== null) parts.push(`UNLOCK S${options.startStage + 1}`);
  return parts.join(' / ');
}
