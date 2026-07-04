// MaiLLY Design Tokens v2.0
// ビジュアルデザインの単一の真実。このファイルを変更すれば全体に反映される。
// primitive 層（tokens）+ semantic 層（semantic）の2層構成。
//
// 設計原則:
//   1. AIのアフォーダンスはニュートラルが既定値。
//      ユーザーの意図が生まれた時のみ Indigo が点灯する。
//   2. 最小フォントサイズ 12px。
//   3. 孤立値を持たない。すべての値はこのファイルの定義に寄せる。

export const tokens = {
  // ── Colors ──────────────────────────────────────────
  color: {
    primary: "#4F46E5", // Indigo 600 — プライマリアクション・選択状態・アクセント
    primaryLight: "#EEF2FF", // Indigo 50  — 選択背景・送信済みボタン背景
    primaryText: "#3730A3", // Indigo 700 — 選択状態のテキスト
    primaryHover: "#4338CA", // Indigo 700 — プライマリボタンホバー

    bgPage: "#F8F8F6", // ページ背景（わずかにウォームグレー）
    bgCard: "#FFFFFF", // カード・パネル背景
    bgHover: "#F5F5F3", // ホバー時の背景

    textPrimary: "#1A1A1A", // 本文・見出し
    textSecondary: "#6B7280", // サブテキスト・メタ情報
    textTertiary: "#9CA3AF", // プレースホルダー・disabled

    border: "#E5E7EB", // 標準の罫線
    borderLight: "#F3F4F6", // 軽い区切り線

    danger: "#DC2626", // 削除・エラー

    bgQuiet: "#FAFAFA", // AI操作ゾーンの背景。bgPageより静か
    neutralDisabled: "#D1D5DB", // 意図未入力の生成ボタン・非選択Pillボーダー
    dangerBg: "#FEF2F2", // 破壊的アクションのホバー背景
    dangerBorder: "#FECACA", // 破壊的アクションのボーダー
  },

  // ── Border Width ────────────────────────────────────
  // 0.5px hairline は使用禁止。罫線・区切りはすべて 1px。
  borderWidth: {
    default: 1,
    emphasis: 1.5,
    accent: 2,
  },

  // ── Typography ──────────────────────────────────────
  font: {
    sans: `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic Medium", sans-serif`,
    // 日英混在のためシステムフォントスタック。Inter/Roboto 単体は使わない。
    // 最小フォントサイズ 12px。9〜11px は使用禁止（長時間PC作業での眼精疲労を防ぐ）。
    scale: {
      headingLg: { fontSize: 16, fontWeight: 600, lineHeight: 1.4 }, // パネル見出し
      headingMd: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 }, // 件名
      bodyMd: { fontSize: 14, fontWeight: 400, lineHeight: 1.6 }, // 本文・エディタ
      bodySm: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 }, // 送信者名・プレビュー
      caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.4 }, // 日時・バッジ
      labelCaps: { fontSize: 12, fontWeight: 600, lineHeight: 1.4, letterSpacing: "0.07em", textTransform: "uppercase" }, // セクションラベル（大文字）
      citation: { fontSize: 12, fontWeight: 400, lineHeight: 1.4 }, // 出典・引用
    },
  },

  // ── Spacing (4px grid) ──────────────────────────────
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },

  // ── Border Radius ───────────────────────────────────
  radius: {
    badge: 4,  // AIバッジ・小さいタグ
    control: 6, // 小型ボタン・チップ・段落ブロック用。5px 等の孤立値は今後すべてこれに統合
    button: 8,  // 通常ボタン
    panel: 12, // カード・パネル
    pill: 20, // タブ（Pill形状）
  },

  // ── Shadows ─────────────────────────────────────────
  shadow: {
    panel: "0 1px 4px rgba(0,0,0,0.06)", // AIパネルのみ許容
  },

  // ── Transitions ─────────────────────────────────────
  transition: {
    micro: "0.12s ease",  // ホバー系
    fade: "0.2s ease-out", // フェードイン
    expand: "0.3s ease-out", // パネル展開
  },

  // ── Layout ──────────────────────────────────────────
  // IA確定値
  layout: {
    colLeft: 220,
    colRight: 360,
  },
} as const;

// ── Semantic layer ──────────────────────────────────────────
// v2 の新コンポーネント（ブリーフィング / 返信タイプPill / 段落編集モード）が参照する。
// primitive 層（tokens）の値に意味を与える。コンポーネントは可能な限りこちらを参照する。

export const semantic = {
  briefing: {
    surface: tokens.color.bgCard,
    label:        { ...tokens.font.scale.labelCaps, color: tokens.color.textTertiary },
    text:         { ...tokens.font.scale.caption, lineHeight: 1.6, color: tokens.color.textPrimary },
    sectionLabel: { ...tokens.font.scale.labelCaps, color: tokens.color.textTertiary },
    taskItem:     { ...tokens.font.scale.caption, color: tokens.color.textPrimary },
    taskSource:   { ...tokens.font.scale.citation, color: tokens.color.textTertiary },
    checkbox:     { accentColor: tokens.color.primary },
  },
  pill: {
    selected: {
      background: tokens.color.primaryLight,
      borderColor: tokens.color.primary,
      color: tokens.color.primaryText,
      borderWidth: tokens.borderWidth.emphasis,
    },
    unselected: {
      background: "transparent",
      borderColor: tokens.color.neutralDisabled,
      color: tokens.color.textSecondary,
      borderWidth: tokens.borderWidth.emphasis,
    },
  },
  edit: {
    paraHover: tokens.color.bgHover,
    paraEditingBorder: { color: tokens.color.primary, width: tokens.borderWidth.emphasis },
    aiZoneBg: tokens.color.bgQuiet,
    generateIdle:  { background: tokens.color.neutralDisabled, color: "#FFFFFF" },
    generateReady: { background: tokens.color.primary, color: "#FFFFFF" },
  },
  reply: {
    topAccent: { color: tokens.color.primary, width: tokens.borderWidth.accent },
    checklistNote: { ...tokens.font.scale.caption, color: tokens.color.textTertiary },
  },
  destructive: {
    text: tokens.color.danger,
    border: tokens.color.dangerBorder,
    hoverBg: tokens.color.dangerBg,
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
    border: `1.5px solid ${tokens.color.neutralDisabled}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.textSecondary,
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
