# 島開拓ゲーム v1

スマホ向けのカジュアル島開拓ミニゲームです。HTML / CSS / JavaScript / Canvas とローカルPNG素材のみで作っているので、GitHub Pages にそのまま置けば動きます。

## 遊び方

- 左下のジョイスティックで移動
- PCでは矢印キー / WASD でも移動
- 木、石、草むら、ベリーに近づくと自動で採取
- 採掘所を建てると鉱石も採取可能
- 素材を持って売却所に近づき、売却ボタンでコイン化
- 建築メニューから倉庫、石材置き場、畑、住宅、採掘所、作業員小屋を建築
- 条件を満たすと作業員を雇用し、木材を自動回収

## セーブ

`localStorage` に自動保存します。

- key: `island_dev_game_save`
- save version: `1`
- `migrateSave(save)` を用意しているので、v2以降で保存形式を拡張できます。

## ファイル構成

- `index.html`
- `style.css`
- `main.js`
- `assets/`
- `README.md`

## 公開方法

GitHub Pages では、このフォルダをリポジトリに置いて `index.html` を公開対象にしてください。ビルドやサーバーは不要です。
