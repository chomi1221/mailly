"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { tokens, buttonStyles, tabStyles, keyframes } from "@/lib/tokens";
import ErrorMessage from "./ErrorMessage";

export type ReplyPattern = {
  label: string;
  body: string;
};

type Props = {
  patterns: ReplyPattern[];
  isLoading: boolean;
  regeneratingIndex?: number | null;
  toAddress: string;
  ccAddresses?: string;
  onSend: (body: string, to?: string) => Promise<void>;
  onRegenerate: (index: number, label: string) => void;
  mode?: "reply" | "replyAll" | "forward";
  initialBody?: string;
  onGenerate: () => void;
  isGenerated: boolean;
};

const panelStyles = keyframes + `
  .mailly-ghost-btn:not(.btn-danger):hover:not(:disabled) { background: ${tokens.color.primaryLight} !important; }
  .mailly-send-btn:hover:not(:disabled) { background: ${tokens.color.primaryHover} !important; }
  .mailly-outline-btn:hover { background: ${tokens.color.bgHover} !important; }
  .mailly-textarea:focus { border-color: ${tokens.color.primary} !important; outline: none; }
`;

// ─── Icons (from MaillyPrototype) ─────────────────────────────
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2L9 14l-2-5-5-2 12-5z" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8l4 4L14 4" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1 L9.5 6.5 L15 8 L9.5 9.5 L8 15 L6.5 9.5 L1 8 L6.5 6.5 Z" />
  </svg>
);

// セクション区切り線スタイル（内部仕切りは borderLight）
const innerDivider = { borderBottom: `1px solid ${tokens.color.borderLight}` } as const;
const innerDividerTop = { borderTop: `1px solid ${tokens.color.borderLight}` } as const;

export default function AIReplyPanel({
  patterns,
  isLoading,
  regeneratingIndex,
  toAddress,
  ccAddresses,
  onSend,
  onRegenerate,
  mode = "reply",
  initialBody,
  onGenerate,
  isGenerated,
}: Props) {
  const isForward = mode === "forward";

  const [activeIndex, setActiveIndex] = useState(0);
  const [editedBody, setEditedBody] = useState(initialBody ?? "");
  const [editedTo, setEditedTo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // アクティブなパターンの本文が届いたらエディタに反映（転送モード以外）
  useEffect(() => {
    if (!isForward) {
      setEditedBody(patterns[activeIndex]?.body ?? "");
    }
  }, [activeIndex, patterns[activeIndex]?.body]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = (i: number) => {
    setActiveIndex(i);
    setSent(false);
    setSendError(null);
  };

  const handleSend = async () => {
    if (!editedBody.trim() || isSending) return;
    if (isForward && !editedTo.trim()) return;
    setSendError(null);
    setIsSending(true);
    try {
      await onSend(editedBody, isForward ? editedTo.trim() : undefined);
      setSent(true);
    } catch (e: any) {
      console.error("[AIReplyPanel send]", e);
      setSendError("Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const canSend = isForward
    ? editedBody.trim().length > 0 && editedTo.trim().length > 0
    : editedBody.trim().length > 0 && patterns.length > 0;

  const isSendDisabled = isSending || sent || !canSend;
  const isRegenDisabled = isLoading || isSending || regeneratingIndex === activeIndex || patterns.length === 0;

  return (
    <>
      <style>{panelStyles}</style>
      <div className="md:flex md:flex-col md:items-stretch md:flex-1">
      <div
        className="overflow-hidden md:flex-1 md:flex md:flex-col md:items-stretch"
        style={{
          background: tokens.color.bgCard,
          border: `1px solid ${tokens.color.border}`,
          borderRadius: tokens.radius.panel,
          boxShadow: tokens.shadow.panel,
          animation: "mailly-fadeInUp 0.2s ease-out",
        }}
      >
        {/* ヘッダー */}
        {isForward ? (
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={innerDivider}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}>Forward</span>
          </div>
        ) : (isGenerated || isLoading) ? (
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={innerDivider}
          >
            <AiBadge />
            <span
              className="flex-1"
              style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}
            >
              {isLoading ? "Generating reply patterns..." : "Reply patterns generated"}
            </span>
            {patterns.length > 0 && !isLoading && (
              <span style={{ fontSize: 12, color: tokens.color.textSecondary }}>
                {patterns.length} patterns
              </span>
            )}
            {isLoading && (
              <span
                className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{
                  borderColor: tokens.color.borderLight,
                  borderTopColor: tokens.color.primary,
                }}
              />
            )}
          </div>
        ) : null}

        {/* パターンタブ（転送モード時・未生成時は非表示） */}
        {!isForward && isGenerated && (
          <div
            className="px-4 flex flex-wrap gap-2"
            style={{
              paddingTop: 12,
              paddingBottom: 12,
              ...innerDivider,
            }}
          >
            {patterns.map((p, i) => (
              <button
                key={i}
                onClick={() => handleTabClick(i)}
                style={{
                  ...(i === activeIndex ? tabStyles.active : tabStyles.inactive),
                  opacity: sent ? (i === activeIndex ? 1 : 0.4) : 1,
                  cursor: sent ? "default" : "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* 宛先 */}
        <div
          className="px-4 py-2 flex items-center gap-2 min-h-[40px]"
          style={innerDivider}
        >
          <span style={{ fontSize: 12, color: tokens.color.textSecondary, flexShrink: 0 }}>
            To
          </span>
          {isForward ? (
            <input
              type="email"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground focus:border-b transition-colors"
              style={{ fontSize: 13, borderBottomColor: tokens.color.primary }}
              placeholder="Enter recipient email address"
              value={editedTo}
              onChange={(e) => { setEditedTo(e.target.value); setSent(false); setSendError(null); }}
              disabled={isSending}
            />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}>
              {toAddress}
            </span>
          )}
        </div>

        {/* CC (全員に返信時のみ) */}
        {!isForward && ccAddresses && (
          <div
            className="px-4 py-2 flex items-start gap-2"
            style={innerDivider}
          >
            <span style={{ fontSize: 12, color: tokens.color.textSecondary, flexShrink: 0, paddingTop: 1 }}>
              CC
            </span>
            <span style={{ fontSize: 13, color: tokens.color.textPrimary, wordBreak: "break-all" }}>
              {ccAddresses}
            </span>
          </div>
        )}

        {/* 「編集して送信」ラベル */}
        {isGenerated && (
          <p style={{ fontSize: 11, color: tokens.color.textTertiary, padding: "6px 16px 0", margin: 0 }}>
            Edit and send
          </p>
        )}

        {/* エディタ */}
        <div className={`px-4 pb-0 md:flex-1 ${isGenerated ? "pt-1" : "pt-4"}`}>
          <textarea
            className="mailly-textarea w-full min-h-[140px] px-3 py-2.5 rounded-lg resize-y transition-colors font-sans md:h-full"
            value={editedBody}
            placeholder={isForward ? "Enter message body..." : isGenerated ? "Generating..." : ""}
            onChange={(e) => {
              setEditedBody(e.target.value);
              setSent(false);
              setSendError(null);
            }}
            disabled={isSending}
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              background: tokens.color.bgCard,
              border: `1px solid ${tokens.color.border}`,
              color: tokens.color.textPrimary,
            }}
          />
        </div>

        {/* 送信エラー */}
        {sendError && (
          <div className="px-4 pt-2">
            <ErrorMessage message={sendError} />
          </div>
        )}

        {/* アクション */}
        <div
          className="flex items-center gap-2 px-4 py-3 mt-3"
          style={innerDividerTop}
        >
          <div className="ml-auto flex items-center gap-2">
            {!isForward && !isGenerated && (
              <button
                onClick={onGenerate}
                disabled={isLoading}
                className="mailly-ghost-btn"
                style={{
                  ...buttonStyles.ghost,
                  fontSize: 13,
                  color: tokens.color.primary,
                  borderColor: tokens.color.primary,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                <SparkleIcon />
                AI reply
              </button>
            )}
            {isGenerated && !isForward && (
              <button
                onClick={() => {
                  setSent(false);
                  setSendError(null);
                  onRegenerate(activeIndex, patterns[activeIndex]?.label ?? "");
                }}
                disabled={isRegenDisabled}
                className="mailly-ghost-btn"
                style={{
                  ...buttonStyles.ghost,
                  fontSize: 13,
                  opacity: isRegenDisabled ? 0.5 : 1,
                  cursor: isRegenDisabled ? "not-allowed" : "pointer",
                }}
              >
                <RefreshCw className="w-4 h-4" />
                {regeneratingIndex === activeIndex ? "Regenerating..." : "Regenerate"}
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={isSendDisabled}
              className="mailly-send-btn"
              style={
                sent
                  ? { ...buttonStyles.primarySent, fontSize: 13 }
                  : {
                      ...buttonStyles.primary,
                      fontSize: 13,
                      background: isSendDisabled ? tokens.color.textTertiary : tokens.color.primary,
                      opacity: isSendDisabled ? 0.5 : 1,
                      cursor: isSendDisabled ? "not-allowed" : "pointer",
                    }
              }
            >
              {isSending ? (
                <>
                  <span
                    className="rounded-full border-2 animate-spin"
                    style={{
                      width: 13,
                      height: 13,
                      borderColor: "rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      flexShrink: 0,
                    }}
                  />
                  Sending...
                </>
              ) : sent ? (
                <>
                  <CheckIcon />
                  Sent
                </>
              ) : (
                <>
                  <SendIcon />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

function AiBadge() {
  return (
    <span
      style={{
        background: "#EEF2FF",
        color: "#3730A3",
        fontSize: 12,
        fontWeight: 500,
        padding: "2px 7px",
        borderRadius: 12,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      AI
    </span>
  );
}
