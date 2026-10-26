# Browser Game Project

## Goal
ブラウザ上ですぐ遊べるゲームを開発する。

公開先はGitHub Pages。

## Technology
- Vite
- TypeScript
- HTML5 Canvas
- CSS
- Vanilla TypeScript

原則としてバックエンドは使用しない。

## Requirements
- PC対応
- スマートフォン対応
- マウス操作対応
- タッチ操作対応
- レスポンシブ対応
- GitHub Pages対応
- 外部APIに依存しない

## Architecture
以下の責務を可能な限り分離する。

- game loop
- input
- physics
- collision
- rendering
- UI
- audio
- configuration

巨大な1ファイルに処理を集中させない。

## Development Rules
コードを変更したら必ず以下を行う。

1. npm run build
2. TypeScriptエラー確認
3. lintが存在する場合はlint
4. 既存機能を壊していないか確認

エラーが発生した場合は、自分で原因を調査して修正する。

## GitHub Pages
GitHub PagesのProject Siteで動作するようにする。

絶対パスに依存しない。
Viteのbase設定を適切に行う。

## UI
- モバイルファースト
- 画面から要素をはみ出させない
- 不要なページスクロールを発生させない
- タッチ操作しやすいUIにする

## Game Design
ゲームの数値パラメータは可能な限りconfigに分離する。

ゲーム性を変更する場合は既存仕様との整合性を確認する。

## Completion
タスク完了前に必ずbuildする。
buildが失敗している状態を完成扱いしない。

## Git
通常の実装依頼ではcommitやpushを勝手に行わない。

私が「公開」と指示した場合のみ、
git diffを確認した上でcommitとpushを行う。
