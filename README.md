# browser-game-1

Vite + TypeScript + HTML5 Canvas によるブラウザゲームのプロジェクト雛形です。
PC (キーボード/マウス) とスマートフォン (タッチ) の両方に対応し、GitHub Pages で公開できます。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm install` | 依存パッケージのインストール |
| `npm run dev` | 開発サーバー起動 (同一LAN内のスマホからも `http://<PCのIP>:5173/browser-game-1/` で確認可) |
| `npm run build` | 型チェック + 本番ビルド (`dist/`) |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run typecheck` | 型チェックのみ |

## ディレクトリ構成

```
src/
  main.ts            エントリポイント
  config.ts          論理解像度・固定ステップなどの定数
  style.css          全画面表示・スマホのスクロール/ズーム抑止
  core/              ゲームループ・シーン管理・座標変換 (Viewport)
  game/              ゲームロジック (DOM/Canvas 非依存の純粋な TS)
  render/            Canvas 描画 (高DPI対応・リサイズ・レターボックス)
  input/             キーボード / マウス / タッチ入力 (Pointer Events で統一)
  scenes/            シーン (ロジックと描画を結び付ける層)
public/              そのまま配信される静的ファイル
```

- 描画・入力はすべて論理座標 (`config.ts` の `GAME_WIDTH` x `GAME_HEIGHT`) で扱います。画面サイズに合わせて自動的にスケールされます。
- ロジックは固定タイムステップ (`Scene.update`)、描画は requestAnimationFrame ごと (`Scene.render`) に分離しています。

## GitHub Pages での公開

1. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定
2. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイします

リポジトリ名を変更した場合は `vite.config.ts` の `base` も合わせて変更してください。
