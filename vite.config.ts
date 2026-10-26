import { defineConfig } from 'vite';

// GitHub Pages の Project Site (https://<USERNAME>.github.io/browser-game-1/) で配信するため、
// Vite 公式の推奨どおり base をリポジトリ名に合わせる。
// 開発サーバーも同じパス (http://localhost:5173/browser-game-1/) で配信され、本番とのパス差異を防げる。
export default defineConfig({
  base: '/browser-game-1/',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  server: {
    host: true, // 同一LAN内のスマートフォンから実機確認できるようにする
  },
});
