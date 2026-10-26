/**
 * X (旧Twitter) の Web Intent で投稿画面を開く。API キーやサーバーは不要。
 * ポップアップブロックを避けるため、クリック等のユーザー操作のイベントハンドラ内で呼ぶこと。
 */
export function openXShare(text: string, url: string, hashtags: readonly string[] = []): void {
  const params = new URLSearchParams({ text, url });
  if (hashtags.length > 0) params.set('hashtags', hashtags.join(','));
  window.open(`https://x.com/intent/tweet?${params.toString()}`, '_blank', 'noopener,noreferrer');
}

/** 公開中のゲームの URL (GitHub Pages のサブパスにも対応) */
export function gameUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}
