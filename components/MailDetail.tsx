"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { ChevronLeftIcon, MailOpenIcon, MailIcon, ArchiveIcon, Trash2Icon } from "lucide-react";
import { tokens, buttonStyles, keyframes } from "@/lib/tokens";
import AIReplyPanel, { type ReplyPattern } from "./AIReplyPanel";
import BriefingPanel from "./BriefingPanel";
import ErrorMessage from "./ErrorMessage";

type MailAction = "markRead" | "markUnread" | "archive" | "trash";

export type Mail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromAddress: string;
  to?: string;
  cc?: string;
  date: string;
  textPlain: string;
  textHtml: string;
  messageId?: string;
  references?: string;
  labelIds?: string[];
  attachments?: Array<{
    filename: string;
    mimeType: string;
    attachmentId: string;
    data?: string; // base64
  }>;
};

type Props = {
  mail: Mail | null;
  onClose?: () => void;
  onAction?: (action: MailAction) => void;
  onBack?: () => void; // モバイル: 一覧に戻る
};

const CSP_META = '<meta http-equiv="Content-Security-Policy" content="img-src https: data: blob: \'self\';">';

function injectCspMeta(html: string): string {
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/(<head[\s>][^>]*>)/i, `$1${CSP_META}`);
  }
  return CSP_META + html;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const detailStyles = keyframes + `
  .mailly-outline-btn:hover { background: ${tokens.color.bgHover} !important; }
  .mailly-danger-btn:hover { background: #FEF2F2 !important; }
`;

export default function MailDetail({ mail, onClose, onAction, onBack }: Props) {
  const { data: session } = useSession();
  const [patterns, setPatterns] = useState<ReplyPattern[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | "forward">("reply");
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false); // モバイル用アコーディオン
  const [isGenerated, setIsGenerated] = useState(false);
  const [bodyViewMode, setBodyViewMode] = useState<"html" | "text">("html");
  const abortRef = useRef<AbortController | null>(null);
  const replyCache = useRef<Record<string, ReplyPattern[]>>({});
  const mailRef = useRef<typeof mail>(mail);
  useEffect(() => { mailRef.current = mail; });
  const retryOnEmailBodyRef = useRef(false);

  // メールが切り替わるたびにモードをリセット
  useEffect(() => {
    retryOnEmailBodyRef.current = false; // メール切り替え時はリトライフラグをリセット
    if (!mail) return;
    setReplyMode("reply");
    setIsAiPanelOpen(false);
    setBodyViewMode("html");
    setIsGenerated(false);

    // キャッシュがあれば即座に反映してAPIを呼ばない
    if (replyCache.current[mail.id]) {
      setPatterns(replyCache.current[mail.id]);
      setIsGenerating(false);
      setIsGenerated(true);
      return;
    }

    // PC/TB: メール選択と同時に生成開始
    if (typeof window !== "undefined" && window.innerWidth >= 640) {
      generateReply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mail?.id]);

  // emailBody の変化を監視してリトライ（1回のみ）
  const emailBody = (mail?.textPlain || stripHtmlTags(mail?.textHtml || "")).trim();
  useEffect(() => {
    if (
      retryOnEmailBodyRef.current &&
      emailBody &&
      !isGenerating &&
      mail?.id &&
      !replyCache.current[mail.id]
    ) {
      retryOnEmailBodyRef.current = false;
      generateReply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailBody]);

  if (!mail) {
    return null;
  }

  const generateReply = async () => {
    // 最新の mail を ref 経由で参照（stale closure 対策）
    const currentMail = mailRef.current;
    if (!currentMail) return;
    const emailBody = (currentMail.textPlain || stripHtmlTags(currentMail.textHtml || "")).trim();
    if (!emailBody) {
      if (currentMail.textHtml || currentMail.textPlain) {
        setError("Could not generate a reply for this email. The message body may not be available.");
      } else {
        retryOnEmailBodyRef.current = true; // 本文到着後にリトライ
      }
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPatterns([]);
    setError(null);
    setIsGenerating(true);

    const collected: ReplyPattern[] = [];

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailBody,
          subject: currentMail.subject,
          attachments: currentMail.attachments ?? [],
          from: currentMail.from,
          to: currentMail.to ?? "",
        }),
        signal: controller.signal,
      });

      if (res.status === 401) { signOut(); return; }
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let obj: any;
          try { obj = JSON.parse(line); } catch { continue; }
          if (obj.done) {
            replyCache.current[currentMail.id] = collected;
            setIsGenerating(false);
            setIsGenerated(true);
            return;
          }
          if (obj.error) throw new Error(obj.error);
          if (obj.label && obj.body) {
            collected.push(obj);
            setPatterns([...collected]);
          }
        }
      }
      setIsGenerating(false);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error("[generateReply]", e);
      setError("AI generation failed. Please try again.");
      setIsGenerating(false);
    }
  };

  const regeneratePattern = async (index: number, label: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRegeneratingIndex(index);

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          emailBody: mail.textPlain || stripHtmlTags(mail.textHtml || ""),
          subject: mail.subject,
          attachments: mail.attachments ?? [],
          regenerateLabel: label,
          from: mail.from,
          to: mail.to ?? "",
        }),
      });

      if (res.status === 401) { signOut(); return; }
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let obj: any;
          try { obj = JSON.parse(line); } catch { continue; }
          if (obj.done) return;
          if (obj.label && obj.body) {
            setPatterns((prev) => prev.map((p, i) => (i === index ? obj : p)));
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error("[regeneratePattern]", e);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const parseAddressList = (header: string): string[] =>
    header.split(",").map((s) => s.trim()).filter(Boolean);

  const extractEmail = (addr: string): string => {
    const match = addr.match(/<([^>]+)>/);
    return (match ? match[1] : addr).trim().toLowerCase();
  };

  const computeReplyAllCc = (): string => {
    const selfEmail = (session?.user?.email ?? "").toLowerCase();
    const toAddrs = parseAddressList(mail.to ?? "");
    const ccAddrs = parseAddressList(mail.cc ?? "");
    return [...toAddrs, ...ccAddrs]
      .filter((addr) => extractEmail(addr) !== selfEmail)
      .join(", ");
  };

  const computeForwardBody = (): string => {
    const divider = "---------- Forwarded Message ----------";
    const originalBody = mail.textPlain ?? mail.textHtml ?? "";
    return [
      "",
      divider,
      `From: ${mail.from}`,
      `Date: ${mail.date}`,
      `Subject: ${mail.subject}`,
      `To: ${mail.to ?? ""}`,
      "",
      originalBody,
    ].join("\n");
  };

  const handleMailAction = async (action: MailAction) => {
    try {
      const res = await fetch("/api/gmail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: mail.id, action }),
      });
      if (res.status === 401) { signOut(); return; }
      if (!res.ok) throw new Error("Operation failed");
      onAction?.(action);
    } catch (e: any) {
      console.error("[handleMailAction]", e);
      toast.error(e.message ?? "Operation failed");
    }
  };

  const handleSend = async (body: string, to?: string) => {
    const isForward = replyMode === "forward";
    const cc = replyMode === "replyAll" ? computeReplyAllCc() : undefined;
    const res = await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: isForward ? to : mail.from,
        ...(cc ? { cc } : {}),
        subject: mail.subject,
        body,
        mode: isForward ? "forward" : "reply",
        ...(!isForward && {
          threadId: mail.threadId,
          inReplyTo: mail.messageId,
          references: mail.references,
        }),
      }),
    });

    if (res.status === 401) { signOut(); return; }
    if (!res.ok) {
      throw new Error("Failed to send email");
    }
  };

  const isUnread = mail.labelIds?.includes("UNREAD") ?? false;

  // outline ボタン共通スタイル（色・角丸・フォントサイズ上書き）
  const outlineBtnStyle = {
    background: tokens.color.bgCard,
    color: tokens.color.textPrimary,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.button,
    fontSize: 13,
    transition: `background ${tokens.transition.micro}`,
  };

  return (
    <>
      <style>{detailStyles}</style>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="px-4 md:px-6 py-3 border-b border-border flex items-center gap-2 min-h-[56px]">
          {/* モバイル: 戻るボタン */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Back to list"
            >
              <ChevronLeftIcon size={20} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm md:text-base font-medium truncate">{mail.subject || "(件名なし)"}</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">
              {mail.from} · {mail.date}
            </p>
          </div>

          {/* 管理アクション（未読・アーカイブ・削除） */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleMailAction(isUnread ? "markRead" : "markUnread")}
              className="mailly-ghost-btn flex items-center gap-1.5"
              style={{ ...buttonStyles.ghost, fontSize: 13 }}
            >
              {isUnread ? <MailOpenIcon className="w-4 h-4" /> : <MailIcon className="w-4 h-4" />}
              <span className="hidden sm:inline">{isUnread ? "Read" : "Unread"}</span>
            </button>
            <button
              onClick={() => handleMailAction("archive")}
              className="mailly-ghost-btn flex items-center gap-1.5"
              style={{ ...buttonStyles.ghost, fontSize: 13 }}
            >
              <ArchiveIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </button>
            <button
              onClick={() => handleMailAction("trash")}
              className="mailly-ghost-btn btn-danger flex items-center gap-1.5 hover:bg-red-50"
              style={{ ...buttonStyles.ghost, fontSize: 13, color: tokens.color.danger, background: undefined }}
            >
              <Trash2Icon className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* コンテンツエリア: デスクトップは左右2カラム、タブレットは縦積み */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden md:overflow-y-auto lg:overflow-hidden">

          {/* メール本文（左カラム） */}
          <div className={`flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pt-4 flex flex-col md:flex-none md:overflow-visible lg:flex-1 lg:min-h-0 lg:overflow-y-auto ${isAiPanelOpen ? "pb-96 md:pb-4" : "pb-12 md:pb-4"}`}>
            {/* HTML/テキスト切り替えボタン（両方ある場合のみ表示） */}
            {mail.textHtml && mail.textPlain && (
              <div className="flex gap-1 mb-3 shrink-0">
                <button
                  onClick={() => setBodyViewMode("html")}
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: `1px solid ${bodyViewMode === "html" ? tokens.color.primary : tokens.color.border}`,
                    background: bodyViewMode === "html" ? tokens.color.primaryLight : tokens.color.bgCard,
                    color: bodyViewMode === "html" ? tokens.color.primaryText : tokens.color.textSecondary,
                    cursor: "pointer",
                    fontWeight: bodyViewMode === "html" ? 500 : 400,
                    transition: `all ${tokens.transition.micro}`,
                  }}
                >
                  HTML
                </button>
                <button
                  onClick={() => setBodyViewMode("text")}
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: `1px solid ${bodyViewMode === "text" ? tokens.color.primary : tokens.color.border}`,
                    background: bodyViewMode === "text" ? tokens.color.primaryLight : tokens.color.bgCard,
                    color: bodyViewMode === "text" ? tokens.color.primaryText : tokens.color.textSecondary,
                    cursor: "pointer",
                    fontWeight: bodyViewMode === "text" ? 500 : 400,
                    transition: `all ${tokens.transition.micro}`,
                  }}
                >
                  Text
                </button>
              </div>
            )}

            {/* 本文表示 */}
            {mail.textHtml && (bodyViewMode === "html" || !mail.textPlain) ? (
              <iframe
                srcDoc={injectCspMeta(mail.textHtml)}
                sandbox="allow-popups"
                referrerPolicy="no-referrer"
                style={{
                  width: "100%",
                  flex: 1,
                  border: "none",
                  minHeight: 300,
                }}
                title="Email body"
              />
            ) : (
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                {mail.textPlain}
              </pre>
            )}

            {/* 添付ファイル */}
            {mail.attachments && mail.attachments.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {mail.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground"
                  >
                    <span>📎</span>
                    {att.filename}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI 返信パネルエリア（右カラム） */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden md:static md:z-auto md:flex-1 md:overflow-visible lg:w-[340px] lg:shrink-0 lg:overflow-hidden lg:flex-none"
            style={{
              background: tokens.color.bgPage,
              borderLeft: `1px solid ${tokens.color.border}`,
            }}
          >
            {/* モバイル: アコーディオントグル */}
            <button
              className="md:hidden flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground min-h-[48px]"
              style={{ borderTop: "2px solid #534AB7" }}
              onClick={() => {
                const opening = !isAiPanelOpen;
                setIsAiPanelOpen(opening);
                // SP: パネルを開いたタイミングで生成開始（未生成・未実行・キャッシュなしの場合のみ）
                if (opening && !isGenerated && !isGenerating && !replyCache.current[mail.id]) {
                  generateReply();
                }
              }}
              aria-expanded={isAiPanelOpen}
            >
              <span className="flex items-center gap-2">
                Reply Panel
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isAiPanelOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* パネル内容: モバイルはmax-hアニメーション、タブレット以上は常時表示 */}
            {/* アニメーションラッパー（パディングなし）でmax-hを制御することで確実に非表示化 */}
            <div
              className={`
                overflow-hidden transition-all duration-200 ease-out flex items-stretch
                ${isAiPanelOpen ? "max-h-[800px]" : "max-h-0"}
                md:max-h-none md:overflow-visible md:flex-1 lg:overflow-y-auto
              `}
            >
            <div className="flex flex-col items-stretch w-full px-4 pb-6 pt-3">
              {/* ── ブリーフィング（右カラム最上部） ── */}
              <BriefingPanel email={mail} />

              {/* ── グループ1：返信モード切替（返信・全員に返信・転送） ── */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(["reply", "replyAll", "forward"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setReplyMode(m)}
                    className="px-3 py-2 min-h-[36px] rounded-lg border transition-colors text-sm"
                    style={{
                      background: replyMode === m ? tokens.color.primaryLight : tokens.color.bgCard,
                      color: replyMode === m ? tokens.color.primaryText : tokens.color.textSecondary,
                      border: `1px solid ${replyMode === m ? tokens.color.primary : tokens.color.neutralDisabled}`,
                      borderRadius: tokens.radius.button,
                      fontSize: 13,
                      fontWeight: replyMode === m ? 500 : 400,
                      transition: `background ${tokens.transition.micro}`,
                      cursor: "pointer",
                    }}
                  >
                    {m === "reply" ? "Reply" : m === "replyAll" ? "Reply All" : "Forward"}
                  </button>
                ))}
              </div>

              {error ? (
                <ErrorMessage message={error} onRetry={generateReply} />
              ) : (
                <AIReplyPanel
                  key={replyMode}
                  patterns={replyMode === "forward" ? [] : patterns}
                  isLoading={replyMode === "forward" ? false : isGenerating}
                  regeneratingIndex={regeneratingIndex}
                  toAddress={mail.from}
                  ccAddresses={replyMode === "replyAll" ? computeReplyAllCc() : undefined}
                  onSend={handleSend}
                  onRegenerate={regeneratePattern}
                  mode={replyMode}
                  initialBody={replyMode === "forward" ? computeForwardBody() : undefined}
                  isGenerated={isGenerated}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
