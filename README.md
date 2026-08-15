# Art Experience Chat

対話から、その人に合ったアート体験を3つ提案するWebアプリです。

- OpenAI Responses API
- Web search
- Vercel Functions
- GitHub + Vercel で公開可能
- APIキーはフロントエンドに置かず、Vercelの環境変数で管理

## ファイル構成

```text
art-experience-chat/
├─ index.html
├─ api/
│  └─ chat.js
├─ package.json
├─ .gitignore
└─ README.md
```

## Vercelで必要な環境変数

Vercelの Project > Settings > Environment Variables に次を登録します。

```text
OPENAI_API_KEY
```

値にはOpenAI Platformで作成したSecret Keyを設定してください。

## 公開までの概要

1. このフォルダの中身をGitHubのリポジトリにアップロード
2. VercelでそのGitHubリポジトリをImport
3. `OPENAI_API_KEY` をEnvironment Variablesに登録
4. Deploy
5. 発行された `*.vercel.app` URLを開いてテスト

## セキュリティ

APIキーを `index.html`、`api/chat.js`、READMEなどへ直接書き込まないでください。
`.env` や `.env.local` もGitHubにはアップロードしないでください。

## 補足

`api/chat.js` はOpenAI Responses APIの `web_search` ツールを利用します。
最新の展示・施設情報が必要な場面では、AIがWeb検索を使える構成です。
