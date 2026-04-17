# MaiLLY プロジェクトドキュメント

## 概要

Gmail + Claude AI を組み合わせた AI メールクライアント。Google OAuth で認証し、受信トレイの表示・既読/アーカイブ/削除操作、AI による返信文案の自動生成・ストリーミング配信、メール送信（返信・全員に返信・転送）を提供する。

---

## ディレクトリ構成

```
app/
├── page.tsx
│   └─ 役割：ログインページ。セッションがあれば /inbox へリダイレクト。未認証ユーザーにはロゴと Google サインインボタンを表示
├── layout.tsx
│   └─ 役割：ルートレイアウト。Geist フォントを設定し Providers でアプリ全体をラップ
├── globals.css
│   └─ 役割：グローバルスタイル（Tailwind ディレクティブ等）
├── inbox/
│   └── page.tsx
│       └─ 役割：受信トレイページ（メインUI）。2カラムレイアウト（メール一覧 + 詳細）を管理し、既読・アーカイブ・削除のアクションをクライアント側で処理するクライアントコンポーネント
└── api/
    ├── route.ts
    │   └─ 役割：旧バージョンのメール送信エンドポイント（POST）。返信のみ対応。現在は gmail/send/route.ts に置き換えられており実質未使用
    ├── auth/
    │   └── [...nextauth]/route.ts
    │       └─ 役割：NextAuth のハンドラ。GET/POST をエクスポートし、authOptions は lib/auth.ts から参照
    ├── ai/
    │   ├── route.ts
    │   │   └─ 役割：返信文案生成エンドポイント（POST）。claude-opus-4-5 を使い patterns 配列を JSON で一括返却。PDFアタッチメントにも対応（非ストリーミング版）
    │   └── reply/route.ts
    │       └─ 役割：返信文案生成ストリーミングエンドポイント（POST）。claude-haiku-4-5-20251001 で NDJSON 形式にストリーミング配信。再生成（regenerateLabel）にも対応
    └── gmail/
        ├── messages/route.ts
        │   └─ 役割：受信トレイ一覧を Gmail API から取得（GET）。最新 20 件のメタデータ（送信者・件名・日時・未読フラグ）を返す
        ├── message/
        │   └── [id]/route.ts
        │       └─ 役割：メール詳細を Gmail API から取得（GET）。本文（text/plain・text/html）・添付ファイル（PDF は base64 付き）・ヘッダー情報を返す
        ├── attachment/
        │   └── [messageId]/[attachmentId]/route.ts
        │       └─ 役割：添付ファイルの base64 データを Gmail API から取得（GET）。mimeType・filename はクエリパラメータで受け取る
        ├── modify/route.ts
        │   └─ 役割：メールのラベル操作エンドポイント（POST）。markRead / markUnread / archive / trash の 4 アクションに対応
        └── send/route.ts
            └─ 役割：メール送信エンドポイント（POST）。返信・全員に返信・転送（mode: "forward"）に対応し RFC 2822 形式でエンコードして送信

components/
├── AIReplyPanel.tsx
│   └─ 役割：AI 返信パネル UI。パターンタブ切替・本文編集・再生成・送信ボタンを提供するクライアントコンポーネント。転送モードにも対応
├── ErrorMessage.tsx
│   └─ 役割：エラーメッセージ表示コンポーネント。任意で再試行ボタンを表示
├── MailDetail.tsx
│   └─ 役割：メール詳細表示コンポーネント。本文（HTML/テキスト切替）・添付ファイル一覧・返信モード切替（返信/全員に返信/転送）・AIReplyPanel を統合
├── MailList.tsx
│   └─ 役割：メール一覧コンポーネント。/api/gmail/messages からデータを取得しスケルトンローダー・エラー・空状態を表示（※現在は inbox/page.tsx に処理が統合されており未使用の可能性あり）
├── MailListItem.tsx
│   └─ 役割：メール一覧の各行コンポーネント。送信者名・件名・プレビュー・未読ドット・選択状態のスタイルを表示（※同上）
├── Providers.tsx
│   └─ 役割：クライアント側プロバイダーのラッパー。SessionProvider と react-hot-toast の Toaster を設定
└── SignInButton.tsx
    └─ 役割：Google サインインボタン。クリックで next-auth の signIn("google") を呼び出し

lib/
├── auth.ts
│   └─ 役割：NextAuth の authOptions 定義。Google OAuth 設定・JWT コールバック（アクセストークンの自動リフレッシュ）・session コールバックを含む
├── fetchSupportedAttachments.ts
│   └─ 役割：PDF・画像の添付ファイルのみ Gmail API から base64 データを取得するユーティリティ関数
└── tokens.ts
    └─ 役割：MaiLLY デザイントークン定義。カラー・タイポグラフィ・スペーシング・角丸・シャドウ・トランジション・ボタンスタイル・タブスタイル・アニメーション keyframes を一元管理

types/
├── ai.ts
│   └─ 役割：AI 関連の型定義。ReplyPattern / AIReplyResponse / AIReplyAttachment / AIReplyRequest
├── gmail.ts
│   └─ 役割：Gmail 関連の型定義。Email / Attachment / AttachmentWithData / MessageDetail
└── next-auth.d.ts
    └─ 役割：NextAuth の型拡張。Session に accessToken / error、JWT に accessToken / refreshToken / expiresAt / error を追加

設定ファイル/
├── next.config.ts
│   └─ 役割：Next.js 設定ファイル（現状は空設定）
├── tailwind.config.ts
│   └─ 役割：Tailwind CSS 設定。loading-slide アニメーションをカスタム定義
└── next-env.d.ts
    └─ 役割：Next.js が自動生成する TypeScript 参照ファイル。編集不要
```

---

## 注記

- `app/api/massages/route.ts` はファイル名が typo（"massages" → 正しくは "messages"）。GET でメール一覧、POST でメール詳細を取得する両用エンドポイントだが、現在のメインフローは `app/api/gmail/messages/route.ts` および `app/api/gmail/message/[id]/route.ts` を使用しており、このファイルの利用状況は要確認。
- `components/MailList.tsx` と `components/MailListItem.tsx` は独立したコンポーネントとして存在するが、現在のメインUI（`app/inbox/page.tsx`）はメール一覧を直接インラインで実装しており、これらコンポーネントは呼び出されていない可能性がある。
