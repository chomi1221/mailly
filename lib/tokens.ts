// MaiLLY Design Tokens v1.0
// ビジュアルデザインの単一の真実。このファイルを変更すれば全体に反映される。

export const tokens = {
  // ── Colors ──────────────────────────────────────────
  color: {
    primary:       "#4F46E5", // Indigo 600 — プライマリアクション・選択状態・アクセント
    primaryLight:  "#EEF2FF", // Indigo 50  — 選択背景・送信済みボタン背景
    primaryText:   "#3730A3", // Indigo 700 — 選択状態のテキスト
    primaryHover:  "#4338CA", // Indigo 700 — プライマリボタンホバー

    bgPage:        "#F8F8F6", // ページ背景（わずかにウォームグレー）
    bgCard:        "#FFFFFF", // カード・パネル背景
    bgHover:       "#F5F5F3", // ホバー時の背景

    textPrimary:   "#1A1A1A", // 本文・見出し
    textSecondary: "#6B7280", // サブテキスト・メタ情報
    textTertiary:  "#9CA3AF", // プレースホルダー・disabled

    border:        "#E5E7EB", // 標準の罫線
    borderLight:   "#F3F4F6", // 軽い区切り線

    danger:        "#DC2626", // 削除・エラー
  },

  // ── Typography ──────────────────────────────────────
  font: {
    sans: `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic Medium", sans-serif`,
    // 日英混在のためシステムフォントスタック。Inter/Roboto 単体は使わない。
    scale: {
      headingLg: { fontSize: 16, fontWeight: 600, lineHeight: 1.4 }, // パネル見出し
      headingMd: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 }, // 件名
      bodyMd:    { fontSize: 14, fontWeight: 400, lineHeight: 1.6 }, // 本文・エディタ
      bodySm:    { fontSize: 13, fontWeight: 400, lineHeight: 1.5 }, // 送信者名・プレビュー
      caption:   { fontSize: 12, fontWeight: 400, lineHeight: 1.4 }, // 日時・バッジ
    },
  },

  // ── Spacing (4px grid) ──────────────────────────────
  space: {
    1:  4,
    2:  8,
    3:  12,
    4:  16,
    5:  20,
    6:  24,
    8:  32,
  },

  // ── Border Radius ───────────────────────────────────
  radius: {
    badge:  4,  // AIバッジ・小さいタグ
    button: 8,  // 通常ボタン
    panel:  12, // カード・パネル
    pill:   20, // タブ（Pill形状）
  },

  // ── Shadows ─────────────────────────────────────────
  shadow: {
    panel: "0 1px 4px rgba(0,0,0,0.06)", // AIパネルのみ許容
  },

  // ── Transitions ─────────────────────────────────────
  transition: {
    micro:  "0.12s ease",  // ホバー系
    fade:   "0.2s ease-out", // フェードイン
    expand: "0.3s ease-out", // パネル展開
  },
} as const;

// ── Button variant styles (inline style objects) ────────────

export const buttonStyles = {
  // ベタ塗り + 白文字（送信）
  primary: {
    background: tokens.color.primary,
    color: "#FFFFFF",
    border: "none",
    borderRadius: tokens.radius.button,
    fontSize: 13,
    fontWeight: 500,
    padding: "9px 18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: tokens.font.sans,
    transition: `background ${tokens.transition.micro}`,
  },
  // 薄ベタ塗り + プライマリ文字（送信済み）
  primarySent: {
    background: tokens.color.primaryLight,
    color: tokens.color.primary,
    border: "none",
    borderRadius: tokens.radius.button,
    fontSize: 13,
    fontWeight: 500,
    padding: "9px 18px",
    cursor: "default",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: tokens.font.sans,
  },
  // テキストのみ（再生成）
  ghost: {
    background: "transparent",
    color: tokens.color.primary,
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 400,
    padding: "8px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: tokens.font.sans,
    transition: `background ${tokens.transition.micro}`,
  },
  // アウトライン（返信・全員に返信・転送）
  outline: {
    background: tokens.color.bgCard,
    color: tokens.color.textPrimary,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.button,
    fontSize: 13,
    fontWeight: 400,
    padding: "6px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: tokens.font.sans,
    transition: `background ${tokens.transition.micro}`,
  },
} as const;

// ── Tab variant styles ───────────────────────────────────────

export const tabStyles = {
  active: {
    background: tokens.color.primaryLight,
    border: `1.5px solid ${tokens.color.primary}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.primaryText,
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 13px",
    cursor: "pointer",
    fontFamily: tokens.font.sans,
    lineHeight: 1.5,
    transition: `all ${tokens.transition.micro}`,
  },
  inactive: {
    background: "transparent",
    border: "1.5px solid #D1D5DB",
    borderRadius: tokens.radius.pill,
    color: "#374151",
    fontSize: 12,
    fontWeight: 400,
    padding: "5px 13px",
    cursor: "pointer",
    fontFamily: tokens.font.sans,
    lineHeight: 1.5,
    transition: `all ${tokens.transition.micro}`,
  },
} as const;

// ── Animations (inject once into <style>) ───────────────────

export const keyframes = `
  @keyframes mailly-fadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mailly-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
  }
  @keyframes mailly-spin {
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${tokens.color.border}; border-radius: 2px; }
`;
