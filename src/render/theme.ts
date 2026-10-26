/** 配色。見た目の調整はここだけで完結させる。 */
export const THEME = {
  background: '#11142a',
  hudBackground: '#0b0e1f',
  divider: '#262b4a',
  text: '#eef0fa',
  subText: '#8a90b4',
  accent: '#4dabf7',
  danger: '#ff6b6b',
  overlay: 'rgba(7, 8, 15, 0.78)',
  /** 情報量の多いリザルト画面用の濃いオーバーレイ */
  overlayStrong: 'rgba(7, 8, 15, 0.93)',
  secondaryButton: '#2a3054',
  highlight: '#fcc419',
  paddle: '#eef0fa',
  ball: '#ffffff',
  buttonText: '#0b0e1f',
  /** ブロックの色 (行ごと) */
  brickRows: ['#ff6b6b', '#ff922b', '#fcc419', '#51cf66', '#4dabf7', '#9775fa'],
} as const;

export function brickColor(row: number): string {
  const colors = THEME.brickRows;
  return colors[row % colors.length] ?? THEME.text;
}
