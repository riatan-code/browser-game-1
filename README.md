# browser-game-1

Vite + TypeScript + HTML5 Canvas で作ったブロック崩しゲームです。
PC (キーボード/マウス) とスマートフォン (タッチ) の両方に対応し、GitHub Pages で公開できます。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm install` | 依存パッケージのインストール |
| `npm run dev` | 開発サーバー起動 (同一LAN内のスマホからも `http://<PCのIP>:5173/browser-game-1/` で確認可) |
| `npm run build` | 型チェック + 本番ビルド (`dist/`) |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run typecheck` | 型チェックのみ |

## 操作

- PC: マウスを左右に動かしてパドル操作、クリックで発射 (← → / Space でも可)
- スマホ: 指を左右にスライドしてパドル操作、タップで発射

## ランキング / シェア

- ランキング: 上位5件をブラウザの localStorage に保存します (端末ごと。サーバーは使用しません)
  - ランクインすると名前入力ダイアログが表示され、名前 (10文字まで) 付きで登録できます。前回の名前は自動入力されます
- X でシェア: 結果画面のボタンから、スコアとゲーム URL 入りの投稿画面を開きます (X の Web Intent を使用)

## ディレクトリ構成

```
src/
  main.ts            エントリポイント
  config.ts          論理解像度 (540x900 縦長)・固定ステップなどの共通定数
  style.css          全画面表示・スマホのスクロール/ズーム抑止
  core/              ゲームループ・シーン管理・座標変換 (Viewport)・イベントバス
  game/              ゲームロジック (DOM/Canvas 非依存)
    config.ts          ゲームの数値パラメータ (ライフ・速度・サイズ・得点など)
    BreakoutWorld.ts   ゲーム状態と進行 (発射・ミス・クリア判定)
    physics.ts         ボールの移動・反射
    collision.ts       当たり判定
    entities.ts        パドル / ボール / ブロックの生成
    stages.ts          ステージのブロック配置データ
    events.ts          ゲームイベント定義 (サウンド・エフェクトの接続口)
  render/            Canvas 描画 (高DPI対応・リサイズ・レターボックス)・配色テーマ
  ui/                HUD (SCORE / BEST / LIFE)・ボタン・開始 / 結果画面・名前入力ダイアログ (HTML)
  ranking/           ランキングの計算 (純粋関数) と localStorage への保存
  share/             X への投稿 (Web Intent)
  storage/           localStorage の安全なラッパー
  input/             キーボード / マウス / タッチ入力 (Pointer Events で統一)
  scenes/            入力 → ロジック → 描画をつなぐシーン
public/              そのまま配信される静的ファイル
```

- 描画・入力はすべて論理座標 (`config.ts` の `GAME_WIDTH` x `GAME_HEIGHT`) で扱います。画面サイズに合わせて自動的にスケールされます。
- ロジックは固定タイムステップ (`Scene.update`)、描画は requestAnimationFrame ごと (`Scene.render`) に分離しています。

## GitHub Pages での公開

1. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定
2. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイします

リポジトリ名を変更した場合は `vite.config.ts` の `base` も合わせて変更してください。
