"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { RefreshCwIcon } from "lucide-react";
import { tokens, semantic } from "@/lib/tokens";
import type { Mail } from "./MailDetail";

// ブリーフィング = 秘書的サーフェス。装飾を足さず、罫線と余白で構造を作る。
// 色・タイポ・余白・角丸・ボーダー幅はすべて semantic.briefing / tokens を参照する。

type TaskType = "action" | "extraction";
type Section = "確認事項" | "対応事項";

type Task = {
  type: TaskType;
  text: string;
  source?: string;
  section?: Section;
};

type Briefing = {
  briefingType: "simple" | "normal" | "complex";
  briefingText: string;
  tasks: Task[];
};

type SenderContext = {
  totalExchanges: number;
  daysSinceLastExchange: number | null;
  recentMessages: { date: string; snippet: string; fromMe: boolean }[];
};

type CacheEntry = { briefing: Briefing | null; context: SenderContext | null };

const briefingStyles = `
@keyframes mailly-brief-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

// "Name <a@b.com>" / "a@b.com" → { name, email }
function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    const email = m[2].trim();
    return { name: m[1].trim() || email, email };
  }
  const email = from.trim();
  return { name: email, email };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBody(mail: Mail): string {
  const plain = mail.textPlain?.trim();
  if (plain) return plain;
  return mail.textHtml ? htmlToText(mail.textHtml) : "";
}

function contextMetaText(ctx: SenderContext): string {
  if (ctx.totalExchanges === 0) return "First exchange";
  const parts = [`${ctx.totalExchanges} exchanges`];
  if (ctx.daysSinceLastExchange != null) {
    parts.push(ctx.daysSinceLastExchange === 0 ? "last contact today" : `last contact ${ctx.daysSinceLastExchange} days ago`);
  }
  return parts.join(" · ");
}

const SECTION_LABEL: Record<Section, string> = {
  "確認事項": "To Review",
  "対応事項": "To Do",
};

// semantic のスタイルオブジェクトを React の style に流し込む
const s = (obj: object): CSSProperties => obj as CSSProperties;

export default function BriefingPanel({ email }: { email: Mail }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [context, setContext] = useState<SenderContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState(false);

  const cacheRef = useRef<Record<string, CacheEntry>>({});
  const latestIdRef = useRef<string>(email.id);

  const fetchContext = useCallback(async (id: string, senderEmail: string) => {
    try {
      const res = await fetch(`/api/gmail/context/${encodeURIComponent(senderEmail)}`);
      if (!res.ok) return; // 取得失敗時はメタ行を出さない（本体は妨げない）
      const data: SenderContext = await res.json();
      if (latestIdRef.current !== id) return;
      setContext(data);
      const entry = (cacheRef.current[id] ??= { briefing: null, context: null });
      entry.context = data;
    } catch {
      // 無視（メタ行を出さないだけ）
    }
  }, []);

  const fetchBriefing = useCallback(async (id: string, mail: Mail) => {
    setBusy(true);
    setError(false);
    const sender = parseSender(mail.from);
    const attachments = (mail.attachments ?? [])
      .filter((a) => a.mimeType === "application/pdf" && a.data)
      .map((a) => ({ filename: a.filename, base64: a.data as string, mimeType: a.mimeType }));

    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailBody: getBody(mail),
          subject: mail.subject,
          senderName: sender.name,
          senderEmail: sender.email,
          attachments,
        }),
      });
      if (!res.ok) throw new Error("briefing failed");
      const data: Briefing = await res.json();
      if (latestIdRef.current !== id) return;
      setBriefing(data);
      const entry = (cacheRef.current[id] ??= { briefing: null, context: null });
      entry.briefing = data;
    } catch {
      if (latestIdRef.current !== id) return;
      setError(true);
    } finally {
      if (latestIdRef.current === id) setBusy(false);
    }
  }, []);

  // メール切替時：キャッシュがあれば復元、なければ取得（メールID で重複回避）
  useEffect(() => {
    const id = email.id;
    latestIdRef.current = id;
    const cached = cacheRef.current[id];
    if (cached) {
      setBriefing(cached.briefing);
      setContext(cached.context);
      setError(cached.briefing === null);
      setBusy(false);
      if (cached.context === null) {
        void fetchContext(id, parseSender(email.from).email);
      }
      return;
    }
    setBriefing(null);
    setContext(null);
    void fetchContext(id, parseSender(email.from).email);
    void fetchBriefing(id, email);
  }, [email, fetchContext, fetchBriefing]);

  const regenerate = () => {
    if (busy) return;
    void fetchBriefing(email.id, email);
  };

  const metaText = context ? contextMetaText(context) : null;
  const showTasks = briefing && briefing.briefingType !== "simple" && briefing.tasks.length > 0;
  const isComplex = briefing?.briefingType === "complex";

  const renderTask = (task: Task, key: number) => (
    <label
      key={key}
      style={{ display: "flex", alignItems: "flex-start", gap: tokens.space[2], marginBottom: tokens.space[2] }}
    >
      <input
        type="checkbox"
        style={{ accentColor: semantic.briefing.checkbox.accentColor, marginTop: 3, flexShrink: 0 }}
      />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={s(semantic.briefing.taskItem)}>{task.text}</span>
        {task.type === "extraction" && task.source && (
          <span style={s(semantic.briefing.taskSource)}>Source: {task.source}</span>
        )}
      </span>
    </label>
  );

  const renderSection = (label: Section) => {
    const items = briefing!.tasks.filter((t) => t.section === label);
    if (items.length === 0) return null;
    return (
      <div style={{ marginTop: tokens.space[3] }}>
        <div style={{ ...s(semantic.briefing.sectionLabel), marginBottom: tokens.space[2] }}>{SECTION_LABEL[label]}</div>
        {items.map((t, i) => renderTask(t, i))}
      </div>
    );
  };

  const regenStyle =
    busy || hover ? semantic.readyAction.hover : semantic.readyAction.default;

  return (
    <section
      style={{
        background: semantic.briefing.surface,
        border: `${tokens.borderWidth.default}px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.panel,
        padding: tokens.space[4],
        marginBottom: tokens.space[4],
      }}
    >
      <style>{briefingStyles}</style>

      <div style={s(semantic.briefing.label)}>Briefing</div>

      {metaText && (
        <div
          style={{
            ...s(tokens.font.scale.caption),
            color: tokens.color.textTertiary,
            marginTop: tokens.space[2],
          }}
        >
          {metaText}
        </div>
      )}

      {/* 本体 */}
      {busy && !briefing ? (
        <div style={{ marginTop: tokens.space[3] }} aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 10,
                width: i === 2 ? "60%" : "100%",
                background: tokens.color.bgHover,
                borderRadius: tokens.radius.control,
                marginBottom: tokens.space[2],
                animation: "mailly-brief-pulse 1.4s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : error && !briefing ? (
        <div style={{ marginTop: tokens.space[3] }}>
          <div style={{ ...s(semantic.briefing.text) }}>Could not load the briefing</div>
          <button
            onClick={regenerate}
            style={{
              ...s(tokens.font.scale.caption),
              color: tokens.color.primary,
              background: "transparent",
              border: "none",
              padding: 0,
              marginTop: tokens.space[2],
              cursor: "pointer",
              fontFamily: tokens.font.sans,
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      ) : briefing ? (
        <div style={{ marginTop: tokens.space[3], opacity: busy ? 0.5 : 1, transition: `opacity ${tokens.transition.micro}` }}>
          <p style={{ ...s(semantic.briefing.text), margin: 0 }}>{briefing.briefingText}</p>

          {showTasks && (
            <div style={{ marginTop: tokens.space[3] }}>
              {isComplex ? (
                <>
                  {renderSection("確認事項")}
                  {renderSection("対応事項")}
                </>
              ) : (
                briefing.tasks.map((t, i) => renderTask(t, i))
              )}
            </div>
          )}

          {error && (
            <div style={{ ...s(tokens.font.scale.caption), color: tokens.color.danger, marginTop: tokens.space[2] }}>
              Regeneration failed
            </div>
          )}
        </div>
      ) : null}

      {/* 再生成ボタン：Ready（常時実行可能）。デフォルトから Indigo テキストリンク、
          ホバー/実行中は薄い Indigo 背景のみ（semantic.readyAction） */}
      {(briefing || (error && !busy)) && (
        <div style={{ marginTop: tokens.space[4], display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={regenerate}
            disabled={busy}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              background: regenStyle.background,
              color: regenStyle.color,
              border: "none",
              borderRadius: tokens.radius.control,
              fontSize: tokens.font.scale.caption.fontSize,
              fontWeight: 500,
              padding: "6px 12px",
              cursor: busy ? "default" : "pointer",
              fontFamily: tokens.font.sans,
              display: "inline-flex",
              alignItems: "center",
              gap: tokens.space[1] + 2,
              transition: `background ${tokens.transition.micro}`,
            }}
          >
            <RefreshCwIcon size={12} />
            {busy ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      )}
    </section>
  );
}
