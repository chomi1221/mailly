"use client";

import { useState } from "react";

// ─── Design Tokens ───────────────────────────────────────────
const tokens = {
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  primaryText: "#3730A3",
  primaryHover: "#4338CA",
  bgPage: "#F8F8F6",
  bgCard: "#FFFFFF",
  bgHover: "#F5F5F3",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  danger: "#DC2626",
  font: `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic Medium", sans-serif`,
};

// ─── Mock Data ────────────────────────────────────────────────
const MAILS = [
  {
    id: 1,
    sender: "Mrs. GREEN APPLE OFFICIAL FAN CLUB",
    subject: "＼明日まで／«ゼンジン未到とイ/ミュータブル〜間奏編〜»4月18日公演",
    preview: "チケットを買ったけど、どうしても行けなくなってしまった方、これからライブに行きたいという方は、ぜひ公式のチケットトレードをご利用ください。",
    date: "Tue, 14 Apr 2026 12:09:41 +0900",
    unread: false,
    hasAttachment: false,
    body: `«ゼンジン未到とイ/ミュータブル〜間奏編〜»\n4月18日公演 公式チケットトレード(抽選)受付は4月15日(水)11:59まで！\n\nチケットを買ったけど、どうしても行けなくなってしまった方、\nこれからライブに行きたいという方は、ぜひ公式のチケットトレードをご利用ください。\n\nなお、トレードは定価でのやり取りで、抽選制となります。\n取引相手を指定できるトレードではございませんので、ご了承ください。\n\n▼公式チケットトレード(抽選)\n【受付期限】\n[4月18日(土)公演]\n2026年4月15日(水) 11:59まで\n\n[4月19日(日)公演]\n2026年4月16日(木) 11:59まで\n\n詳細はこちら★\nhttps://mrsgreenapple.com/news/detail/22390`,
    from: '"Mrs. GREEN APPLE OFFICIAL FAN CLUB 「Ringo Jam」" <info@mrsgreenapple.com>',
  },
  {
    id: 2,
    sender: "【差エントリー】抽選でデ...",
    subject: "povo2.0運営事務局",
    preview: "対象の1年間トッピングを利用中、または期...",
    date: "4月13日",
    unread: true,
    hasAttachment: false,
    body: "povo2.0のご利用ありがとうございます。",
    from: "povo2.0運営事務局 <info@povo.jp>",
  },
  {
    id: 3,
    sender: "AdGuard VPN for iOS v2.10",
    subject: "AdGuard VPN",
    preview: "7日間無料トライアルでAdGuard VPNのフル...",
    date: "4月13日",
    unread: false,
    hasAttachment: false,
    body: "AdGuard VPN for iOS v2.10がリリースされました。",
    from: "AdGuard <noreply@adguard.com>",
  },
  {
    id: 4,
    sender: "Zoom",
    subject: "Zoom Workplaceプロにア...",
    preview: "長時間のミーティングや、多くの機能を活用...",
    date: "4月13日",
    unread: false,
    hasAttachment: false,
    body: "Zoom Workplaceのご案内です。",
    from: "Zoom <no-reply@zoom.us>",
  },
  {
    id: 5,
    sender: "chiyomi.a.1221@gmail.com",
    subject: "Fwd: test mail",
    preview: "---------- 転送メッセージ ---------- 差出人: Chiy...",
    date: "4月13日",
    unread: false,
    hasAttachment: false,
    body: "転送メッセージです。",
    from: "Chiyomi Akita <chiyomi.a.1221@gmail.com>",
  },
];

const AI_BODIES = {
  0: `いつもお世話になっております。ライブ情報のご案内をいただき、ありがとうございます。公式チケットトレードのご案内を確認させていただきました。また、メディア情報やJAM'S Drawの更新についても教えていただき、大変ありがとうございます。今後のスケジュール情報も含め、引き続きよろしくお願いいたします。`,
  1: `チケットトレードのご案内、確認しました。詳細は公式サイトで確認いたします。引き続きよろしくお願いします。`,
  2: `ご案内ありがとうございます！チケットトレードの情報、しっかり確認しました。またよろしくお願いします！`,
};

// ─── Icons ────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2L9 14l-2-5-5-2 12-5z" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
    <polyline points="8 1 8 4.5 11.5 4.5" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8l4 4L14 4" />
  </svg>
);
const PaperclipIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 7.5l-6.5 6.5a4 4 0 0 1-5.66-5.66l7-7a2.5 2.5 0 0 1 3.54 3.54l-7 7a1 1 0 0 1-1.41-1.41l6.5-6.5" />
  </svg>
);
const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 9 1 6 4 3" />
    <path d="M15 14v-3a5 5 0 0 0-5-5H1" />
  </svg>
);
const ReplyAllIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 3 6 6 3" />
    <polyline points="2 9 -1 6 2 3" transform="translate(3,0)" />
    <path d="M15 14v-3a5 5 0 0 0-5-5H3" />
  </svg>
);
const ForwardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 9 15 6 12 3" />
    <path d="M1 14v-3a5 5 0 0 1 5-5h9" />
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <span style={{
    display: "inline-block", width: 13, height: 13,
    border: `2px solid ${tokens.border}`,
    borderTopColor: tokens.textSecondary,
    borderRadius: "50%",
    animation: "mailly-spin 0.8s linear infinite",
    flexShrink: 0,
  }} />
);

// ─── MailListItem ─────────────────────────────────────────────
function MailListItem({ mail, selected, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${tokens.borderLight}`,
        background: selected ? tokens.primaryLight : hovered ? tokens.bgHover : tokens.bgCard,
        cursor: "pointer",
        transition: "background 0.12s ease",
      }}
    >
      {/* Row 1: sender + date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: mail.unread ? tokens.primary : "transparent",
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 500, color: tokens.textPrimary,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {mail.sender}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {mail.hasAttachment && <span style={{ color: tokens.textSecondary }}><PaperclipIcon /></span>}
          <span style={{ fontSize: 12, color: tokens.textSecondary, whiteSpace: "nowrap" }}>{mail.date}</span>
        </div>
      </div>
      {/* Row 2: subject */}
      <div style={{
        fontSize: 14, fontWeight: mail.unread ? 600 : 400,
        color: tokens.textPrimary,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: 2,
      }}>
        {mail.subject}
      </div>
      {/* Row 3: preview */}
      <div style={{
        fontSize: 13, color: tokens.textSecondary,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {mail.preview}
      </div>
    </div>
  );
}

// ─── AIReplyPanel ─────────────────────────────────────────────
function AIReplyPanel({ mail }) {
  const TABS = ["丁寧・フォーマル", "簡潔・ビジネス", "カジュアル"];
  const [activeTab, setActiveTab] = useState(0);
  const [body, setBody] = useState(AI_BODIES[0]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleTabChange = (i) => {
    if (sent || loading) return;
    setActiveTab(i);
    setBody(AI_BODIES[i]);
  };

  const handleRegen = () => {
    if (sent) return;
    setLoading(true);
    setTimeout(() => {
      setBody(AI_BODIES[activeTab] + "\n\nご不明点がございましたら、お気軽にお問い合わせください。");
      setLoading(false);
    }, 1600);
  };

  const handleSend = () => {
    if (sent) return;
    setSent(true);
  };

  return (
    <div style={{
      background: tokens.bgCard,
      border: `1px solid ${tokens.border}`,
      borderRadius: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      overflow: "hidden",
      animation: "mailly-fadeInUp 0.2s ease-out",
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        borderBottom: `1px solid ${tokens.border}`,
      }}>
        <span style={{
          background: "#F3F4F6", color: tokens.textSecondary,
          fontSize: 11, fontWeight: 500,
          padding: "2px 7px", borderRadius: 4, flexShrink: 0,
          letterSpacing: "0.02em",
        }}>AI</span>
        <span style={{ fontSize: 13, color: tokens.textPrimary, flex: 1 }}>
          {loading ? "生成中..." : "返信パターンの生成が完了しました"}
        </span>
        {loading
          ? <Spinner />
          : <span style={{ fontSize: 12, color: tokens.textSecondary }}>3 パターン</span>
        }
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 8,
        padding: "12px 16px",
        borderBottom: `1px solid ${tokens.borderLight}`,
        flexWrap: "wrap",
      }}>
        {TABS.map((label, i) => (
          <button
            key={i}
            onClick={() => handleTabChange(i)}
            style={{
              padding: "5px 13px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: i === activeTab ? 500 : 400,
              cursor: sent || loading ? "default" : "pointer",
              border: `1.5px solid ${i === activeTab ? tokens.primary : "#D1D5DB"}`,
              background: i === activeTab ? tokens.primaryLight : "transparent",
              color: i === activeTab ? tokens.primaryText : "#374151",
              opacity: (sent || loading) && i !== activeTab ? 0.4 : 1,
              transition: "all 0.15s ease",
              fontFamily: tokens.font,
              lineHeight: 1.5,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* To row */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 6,
        padding: "8px 16px",
        borderBottom: `1px solid ${tokens.borderLight}`,
      }}>
        <span style={{ fontSize: 12, color: tokens.textSecondary, flexShrink: 0, paddingTop: 1 }}>宛先</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: tokens.textPrimary, lineHeight: 1.5 }}>
          {mail.from}
        </span>
      </div>

      {/* Editor label */}
      <div style={{ padding: "6px 16px 0", fontSize: 11, color: tokens.textTertiary }}>
        編集して送信
      </div>

      {/* Editor */}
      {loading ? (
        <div style={{ padding: "12px 16px", minHeight: 160, borderBottom: `1px solid ${tokens.borderLight}` }}>
          {[100, 96, 88, 60].map((w, i) => (
            <div key={i} style={{
              height: 13, background: "#F3F4F6", borderRadius: 4,
              marginBottom: 10, width: `${w}%`,
              animation: "mailly-pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          readOnly={sent}
          style={{
            display: "block", width: "100%",
            padding: "12px 16px",
            minHeight: 160,
            fontSize: 14, lineHeight: 1.7,
            color: sent ? tokens.textSecondary : tokens.textPrimary,
            fontFamily: tokens.font,
            background: tokens.bgCard,
            border: "none",
            borderBottom: `1px solid ${tokens.borderLight}`,
            resize: "none",
            outline: "none",
          }}
        />
      )}

      {/* Action bar */}
      <div style={{
        display: "flex", justifyContent: "flex-end", alignItems: "center",
        gap: 6, padding: "10px 14px",
      }}>
        {!sent && (
          <button
            onClick={handleRegen}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "transparent", border: "none",
              color: tokens.primary, fontSize: 13,
              padding: "8px 10px", cursor: loading ? "default" : "pointer",
              borderRadius: 6,
              opacity: loading ? 0.4 : 1,
              fontFamily: tokens.font,
            }}
          >
            <RefreshIcon />
            再生成
          </button>
        )}

        {sent ? (
          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            background: tokens.primaryLight, color: tokens.primary,
            border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            padding: "9px 18px", cursor: "default",
            fontFamily: tokens.font,
          }}>
            <CheckIcon />
            送信済み
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: loading ? tokens.textTertiary : tokens.primary,
              color: "#fff",
              border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 500,
              padding: "9px 18px",
              cursor: loading ? "default" : "pointer",
              transition: "background 0.15s ease",
              fontFamily: tokens.font,
            }}
          >
            <SendIcon />
            送信
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────
export default function MaillyPrototype() {
  const [selectedId, setSelectedId] = useState(1);
  const selectedMail = MAILS.find((m) => m.id === selectedId);

  return (
    <>
      <style>{`
        @keyframes mailly-fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mailly-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes mailly-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        .mailly-action-btn:hover {
          background: ${tokens.bgHover} !important;
        }
        .mailly-send-btn:hover {
          background: ${tokens.primaryHover} !important;
        }
        body { margin: 0; }
        * { box-sizing: border-box; }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tokens.border}; border-radius: 2px; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden",
        fontFamily: tokens.font,
        background: tokens.bgPage,
        color: tokens.textPrimary,
        fontSize: 14,
      }}>

        {/* ── Top Bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          height: 48,
          background: tokens.bgCard,
          borderBottom: `1px solid ${tokens.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: tokens.textPrimary, letterSpacing: "-0.01em" }}>
              MaiLLY
            </span>
            <span style={{
              fontSize: 10, fontWeight: 500, color: tokens.primary,
              background: tokens.primaryLight,
              padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em",
            }}>beta</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: tokens.textSecondary }}>chiyomi.a.1221@gmail.com</span>
            <button style={{
              fontSize: 13, color: tokens.textSecondary,
              background: "transparent", border: `1px solid ${tokens.border}`,
              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
              fontFamily: tokens.font,
            }}>ログアウト</button>
          </div>
        </div>

        {/* ── 3-pane ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Left: Mail List */}
          <div style={{
            width: 280,
            borderRight: `1px solid ${tokens.border}`,
            background: tokens.bgCard,
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            flexShrink: 0,
          }}>
            <div style={{
              padding: "14px 16px 10px",
              fontSize: 13, fontWeight: 600,
              color: tokens.textPrimary,
              borderBottom: `1px solid ${tokens.borderLight}`,
              flexShrink: 0,
            }}>
              受信トレイ
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {MAILS.map((mail) => (
                <MailListItem
                  key={mail.id}
                  mail={mail}
                  selected={mail.id === selectedId}
                  onClick={() => setSelectedId(mail.id)}
                />
              ))}
            </div>
          </div>

          {/* Center: Thread */}
          <div style={{
            flex: 1, overflow: "auto",
            padding: "20px 24px",
            background: tokens.bgPage,
          }}>
            {/* Subject + meta */}
            <h1 style={{
              fontSize: 15, fontWeight: 600,
              color: tokens.textPrimary,
              lineHeight: 1.4, marginBottom: 6,
            }}>
              {selectedMail.subject}
            </h1>
            <p style={{ fontSize: 12, color: tokens.textSecondary, marginBottom: 20 }}>
              {selectedMail.from} · {selectedMail.date}
            </p>

            {/* Body */}
            <div style={{
              fontSize: 14, lineHeight: 1.8,
              color: tokens.textPrimary,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {selectedMail.body}
            </div>
          </div>

          {/* Right: Action + AI Panel */}
          <div style={{
            width: 300,
            borderLeft: `1px solid ${tokens.border}`,
            background: tokens.bgPage,
            padding: 16,
            overflowY: "auto",
            display: "flex", flexDirection: "column", gap: 12,
            flexShrink: 0,
          }}>

            {/* Reply actions */}
            <div style={{
              display: "flex", gap: 8,
              paddingBottom: 12,
              borderBottom: `1px solid ${tokens.borderLight}`,
              flexWrap: "wrap",
            }}>
              {[
                { label: "返信", Icon: ReplyIcon },
                { label: "全員に返信", Icon: ReplyAllIcon },
                { label: "転送", Icon: ForwardIcon },
              ].map(({ label, Icon }) => (
                <button
                  key={label}
                  className="mailly-action-btn"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: tokens.bgCard,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 8,
                    fontSize: 13, color: tokens.textPrimary,
                    padding: "6px 12px", cursor: "pointer",
                    fontFamily: tokens.font,
                    transition: "background 0.12s ease",
                  }}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>

            {/* Delete / Archive / Unread */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "未読", color: tokens.textSecondary },
                { label: "アーカイブ", color: tokens.textSecondary },
                { label: "削除", color: tokens.danger },
              ].map(({ label, color }) => (
                <button
                  key={label}
                  className="mailly-action-btn"
                  style={{
                    background: tokens.bgCard,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 8,
                    fontSize: 13, color,
                    padding: "5px 10px", cursor: "pointer",
                    fontFamily: tokens.font,
                    transition: "background 0.12s ease",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* AI Panel */}
            <AIReplyPanel key={selectedId} mail={selectedMail} />
          </div>
        </div>
      </div>
    </>
  );
}
