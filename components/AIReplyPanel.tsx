"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { tokens, buttonStyles, tabStyles, keyframes, semantic } from "@/lib/tokens";
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
  isGenerated: boolean;
};

// ── Helpers ────────────────────────────────────────────────────

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

// ── AIInstructionInput (shared: para edit + whole-reply edit) ──

type AIInstructionInputProps = {
  instruction: string;
  onInstructionChange: (v: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
};

function AIInstructionInput({
  instruction,
  onInstructionChange,
  onGenerate,
  onCancel,
  loading,
  error,
}: AIInstructionInputProps) {
  const hasInput = instruction.trim().length > 0;
  const canGenerate = hasInput && !loading;
  const genStyle = canGenerate ? semantic.edit.generateReady : semantic.edit.generateIdle;

  return (
    <div
      style={{
        background: semantic.edit.aiZoneBg,
        border: `${tokens.borderWidth.default}px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.control,
        padding: tokens.space[3],
        marginTop: tokens.space[2],
        marginBottom: tokens.space[1],
      }}
    >
      <textarea
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={instruction}
        onChange={(e) => onInstructionChange(e.target.value)}
        disabled={loading}
        placeholder="Instruction for AI… (⌘↵ to apply)"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canGenerate) {
            e.preventDefault();
            onGenerate();
          }
        }}
        style={{
          width: "100%",
          resize: "none",
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: tokens.font.scale.caption.fontSize,
          fontFamily: tokens.font.sans,
          color: tokens.color.textPrimary,
          lineHeight: 1.5,
          boxSizing: "border-box",
          display: "block",
        }}
      />
      {error && (
        <div style={{ fontSize: 12, color: tokens.color.danger, marginBottom: tokens.space[1] }}>
          Could not apply edit.{" "}
          <button
            onClick={onGenerate}
            style={{
              fontSize: 12,
              color: tokens.color.primary,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: tokens.font.sans,
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: tokens.space[2],
          marginTop: tokens.space[2],
        }}
      >
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            fontSize: 12,
            fontFamily: tokens.font.sans,
            fontWeight: 400,
            background: "transparent",
            border: "none",
            color: tokens.color.textSecondary,
            cursor: loading ? "default" : "pointer",
            padding: "4px 8px",
            borderRadius: tokens.radius.control,
          }}
        >
          Cancel
        </button>
        <button
          onClick={canGenerate ? onGenerate : undefined}
          disabled={!canGenerate}
          style={{
            background: genStyle.background,
            color: genStyle.color,
            fontSize: 12,
            fontFamily: tokens.font.sans,
            fontWeight: 500,
            border: "none",
            borderRadius: tokens.radius.control,
            padding: "5px 12px",
            cursor: canGenerate ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            gap: tokens.space[1],
            transition: `background ${tokens.transition.micro}`,
          }}
        >
          {loading ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const panelStyles =
  keyframes +
  `
  .mailly-ghost-btn:not(.btn-danger):hover:not(:disabled) { background: ${tokens.color.primaryLight} !important; }
  .mailly-send-btn:hover:not(:disabled) { background: ${tokens.color.primaryHover} !important; }
  .mailly-outline-btn:hover { background: ${tokens.color.bgHover} !important; }
  .mailly-textarea:focus { border-color: ${tokens.color.primary} !important; outline: none; }
`;

// ── Icons ──────────────────────────────────────────────────────

const SendIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2L9 14l-2-5-5-2 12-5z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 8l4 4L14 4" />
  </svg>
);

const innerDivider = { borderBottom: `1px solid ${tokens.color.borderLight}` } as const;
const innerDividerTop = { borderTop: `1px solid ${tokens.color.borderLight}` } as const;

// ── Main component ─────────────────────────────────────────────

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
  isGenerated,
}: Props) {
  const isForward = mode === "forward";

  // ─ Existing state ─
  const [activeIndex, setActiveIndex] = useState(0);
  const [editedBody, setEditedBody] = useState(initialBody ?? "");
  const [editedTo, setEditedTo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // ─ Edit-mode state ─
  const [editingParaIdx, setEditingParaIdx] = useState<number | null>(null);
  const [wholeEditOpen, setWholeEditOpen] = useState(false);
  const [paraInstruction, setParaInstruction] = useState("");
  const [wholeInstruction, setWholeInstruction] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [hoveredParaIdx, setHoveredParaIdx] = useState<number | null>(null);

  // Sync body with active pattern; reset all edit state on pattern switch
  useEffect(() => {
    if (!isForward) {
      setEditedBody(patterns[activeIndex]?.body ?? "");
      setEditingParaIdx(null);
      setWholeEditOpen(false);
      setParaInstruction("");
      setWholeInstruction("");
      setEditError(null);
      setHoveredParaIdx(null);
    }
  }, [activeIndex, patterns[activeIndex]?.body]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes all edit modes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setEditingParaIdx(null);
      setWholeEditOpen(false);
      setParaInstruction("");
      setWholeInstruction("");
      setEditError(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─ Handlers ─

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
    } catch (e: unknown) {
      console.error("[AIReplyPanel send]", e);
      setSendError("Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleParaGenerate = async () => {
    if (editingParaIdx === null || !paraInstruction.trim() || editLoading) return;
    setEditLoading(true);
    setEditError(null);

    // async ギャップを挟むため、Apply 時点の値をスナップショットとして確保する。
    // 閉包が古くなっていても正しい段落インデックス・送信内容で API を呼べる。
    const snapIdx = editingParaIdx;
    const snapBody = editedBody;
    const snapInstruction = paraInstruction;

    const paras = splitParagraphs(snapBody);
    const target = paras[snapIdx] ?? "";
    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: target, instruction: snapInstruction, scope: "para" }),
      });
      if (!res.ok) throw new Error("edit failed");
      const { text } = (await res.json()) as { text: string };
      // 関数型更新で「API 呼び出し完了時点での最新 editedBody」に対してパッチを当てる。
      // これにより、API 待機中に editedBody が変化していた場合でも正しく反映される。
      setEditedBody((latest) => {
        const latestParas = splitParagraphs(latest);
        latestParas[snapIdx] = text.trim();
        return latestParas.join("\n\n");
      });
      setEditingParaIdx(null);
      setParaInstruction("");
    } catch {
      setEditError("Could not apply edit");
    } finally {
      setEditLoading(false);
    }
  };

  const handleWholeGenerate = async () => {
    if (!wholeInstruction.trim() || editLoading) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedBody, instruction: wholeInstruction, scope: "whole" }),
      });
      if (!res.ok) throw new Error("edit failed");
      const { text } = (await res.json()) as { text: string };
      setEditedBody(text.trim());
      setWholeEditOpen(false);
      setWholeInstruction("");
    } catch {
      setEditError("Could not apply edit");
    } finally {
      setEditLoading(false);
    }
  };

  // ─ Derived ─

  const canSend = isForward
    ? editedBody.trim().length > 0 && editedTo.trim().length > 0
    : editedBody.trim().length > 0 && patterns.length > 0;
  const isSendDisabled = isSending || sent || !canSend;
  const isRegenDisabled =
    isLoading || isSending || regeneratingIndex === activeIndex || patterns.length === 0;

  const paras = splitParagraphs(editedBody);
  // Paragraph view is shown when: reply generated, whole-edit not open, not forward mode
  const showParaView = isGenerated && !wholeEditOpen && !isForward;

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
          {/* ── Header ── */}
          {isForward ? (
            <div className="flex items-center gap-2 px-4 py-3" style={innerDivider}>
              <span style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}>
                Forward
              </span>
            </div>
          ) : isGenerated || isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3" style={innerDivider}>
              <AiBadge />
              <span
                className="flex-1"
                style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}
              >
                {isLoading ? "Generating reply patterns..." : "Reply patterns generated"}
              </span>
              {patterns.length > 0 && !isLoading && (
                <span style={{ fontSize: 12, color: tokens.color.textSecondary }}>
                  {patterns.length} {patterns.length === 1 ? "pattern" : "patterns"}
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

          {/* ── Pattern tabs ── */}
          {!isForward && isGenerated && (
            <div
              className="px-4 flex flex-wrap gap-2"
              style={{ paddingTop: 12, paddingBottom: 12, ...innerDivider }}
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

          {/* ── To ── */}
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
                onChange={(e) => {
                  setEditedTo(e.target.value);
                  setSent(false);
                  setSendError(null);
                }}
                disabled={isSending}
              />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}>
                {toAddress}
              </span>
            )}
          </div>

          {/* ── CC ── */}
          {!isForward && ccAddresses && (
            <div className="px-4 py-2 flex items-start gap-2" style={innerDivider}>
              <span
                style={{
                  fontSize: 12,
                  color: tokens.color.textSecondary,
                  flexShrink: 0,
                  paddingTop: 1,
                }}
              >
                CC
              </span>
              <span
                style={{ fontSize: 13, color: tokens.color.textPrimary, wordBreak: "break-all" }}
              >
                {ccAddresses}
              </span>
            </div>
          )}

          {/* ── "Edit and send" label + "Edit entire reply" toggle ── */}
          {isGenerated && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 16px 0",
              }}
            >
              <p style={{ fontSize: 12, color: tokens.color.textTertiary, margin: 0 }}>
                Edit and send
              </p>
              {!isForward && (
                <button
                  onClick={() => {
                    if (wholeEditOpen) {
                      setWholeEditOpen(false);
                      setWholeInstruction("");
                      setEditError(null);
                    } else {
                      setWholeEditOpen(true);
                      setEditingParaIdx(null);
                      setParaInstruction("");
                      setEditError(null);
                    }
                  }}
                  style={{
                    fontSize: 12,
                    fontFamily: tokens.font.sans,
                    background: "transparent",
                    border: "none",
                    color: wholeEditOpen ? tokens.color.primary : tokens.color.textTertiary,
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: wholeEditOpen ? 500 : 400,
                    transition: `color ${tokens.transition.micro}`,
                  }}
                >
                  {wholeEditOpen ? "Done" : "Edit entire reply"}
                </button>
              )}
            </div>
          )}

          {/* ── Body: paragraph view OR textarea ── */}
          <div className={`px-4 pb-0 md:flex-1 ${isGenerated ? "pt-1" : "pt-4"}`}>
            {showParaView ? (
              // Paragraph view: hoverable, clickable units
              <div style={{ minHeight: 140, fontFamily: tokens.font.sans }}>
                {paras.length === 0 ? (
                  <div
                    style={{
                      color: tokens.color.textTertiary,
                      fontSize: 12,
                      padding: `${tokens.space[2]}px 0`,
                    }}
                  >
                    No content yet
                  </div>
                ) : (
                  paras.map((para, i) => (
                    <div key={i}>
                      {/* Paragraph block */}
                      <div
                        onMouseEnter={() => {
                          if (!editLoading) setHoveredParaIdx(i);
                        }}
                        onMouseLeave={() => setHoveredParaIdx(null)}
                        onClick={() => {
                          if (editLoading || editingParaIdx === i) return;
                          setEditingParaIdx(i);
                          setWholeEditOpen(false);
                          setParaInstruction("");
                          setEditError(null);
                        }}
                        style={{
                          padding: `${tokens.space[1] + 2}px ${tokens.space[2]}px`,
                          borderRadius: tokens.radius.control,
                          border:
                            editingParaIdx === i
                              ? `${semantic.edit.paraEditingBorder.width}px solid ${semantic.edit.paraEditingBorder.color}`
                              : `${tokens.borderWidth.emphasis}px solid transparent`,
                          background:
                            editingParaIdx === i
                              ? tokens.color.primaryLight
                              : hoveredParaIdx === i
                              ? semantic.edit.paraHover
                              : "transparent",
                          cursor: editLoading
                            ? "default"
                            : editingParaIdx === i
                            ? "text"
                            : "pointer",
                          transition: `background ${tokens.transition.micro}, border-color ${tokens.transition.micro}`,
                          whiteSpace: "pre-wrap",
                          fontSize: tokens.font.scale.bodyMd.fontSize,
                          lineHeight: tokens.font.scale.bodyMd.lineHeight,
                          color: tokens.color.textPrimary,
                          marginBottom: tokens.space[1],
                          userSelect: editingParaIdx === i ? "text" : "none",
                        }}
                      >
                        {para}
                      </div>

                      {/* Inline instruction zone for this paragraph */}
                      {editingParaIdx === i && (
                        <AIInstructionInput
                          instruction={paraInstruction}
                          onInstructionChange={(v) => {
                            setParaInstruction(v);
                            if (editError) setEditError(null);
                          }}
                          onGenerate={handleParaGenerate}
                          onCancel={() => {
                            setEditingParaIdx(null);
                            setParaInstruction("");
                            setEditError(null);
                          }}
                          loading={editLoading}
                          error={editError}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Textarea (forward mode / pre-generation / whole-edit mode)
              <>
                <textarea
                  className="mailly-textarea w-full min-h-[140px] px-3 py-2.5 rounded-lg resize-y transition-colors font-sans md:h-full"
                  value={editedBody}
                  placeholder={
                    isForward ? "Enter message body..." : isGenerated ? "Generating..." : ""
                  }
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
                {/* Whole-reply instruction zone */}
                {wholeEditOpen && (
                  <AIInstructionInput
                    instruction={wholeInstruction}
                    onInstructionChange={(v) => {
                      setWholeInstruction(v);
                      if (editError) setEditError(null);
                    }}
                    onGenerate={handleWholeGenerate}
                    onCancel={() => {
                      setWholeEditOpen(false);
                      setWholeInstruction("");
                      setEditError(null);
                    }}
                    loading={editLoading}
                    error={editError}
                  />
                )}
              </>
            )}
          </div>

          {/* ── Send error ── */}
          {sendError && (
            <div className="px-4 pt-2">
              <ErrorMessage message={sendError} />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 px-4 py-3 mt-3" style={innerDividerTop}>
            <div className="ml-auto flex items-center gap-2">
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
                        background: isSendDisabled
                          ? tokens.color.textTertiary
                          : tokens.color.primary,
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
        background: tokens.color.primaryLight,
        color: tokens.color.primaryText,
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
