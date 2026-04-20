"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import { ArchiveIcon, Trash2Icon, MailOpenIcon, MailIcon } from "lucide-react";
import { tokens, keyframes } from "@/lib/tokens";
import MailDetail, { type Mail } from "@/components/MailDetail";

function parseFromName(from: string): string {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) return match[1].replace(/"/g, "").trim() || match[2];
  return from;
}

function formatMailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

type MailSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isUnread: boolean;
};

type MailAction = "markRead" | "markUnread" | "archive" | "trash";

const inboxStyles = keyframes + `
  .mailly-mail-item:not([data-selected="true"]):hover .mailly-item-bg {
    background: ${tokens.color.bgHover} !important;
  }
`;

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mails, setMails] = useState<MailSummary[]>([]);
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingMailIds, setPendingMailIds] = useState<Set<string>>(new Set());
  const [hoveredMailId, setHoveredMailId] = useState<string | null>(null);
  // モバイル: list/detail の表示切り替え
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 未認証ならログインページへ
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // セッションエラー（トークン切れ等）の検知
  useEffect(() => {
    if (session?.error) {
      toast.error("Your session has expired. Please sign in again.");
      router.push("/");
    }
  }, [session?.error, router]);

  // メール一覧を取得
  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      setLoadingList(true);
      setListError(null);
      try {
        const res = await fetch("/api/gmail/messages");
        if (!res.ok) throw new Error("Failed to fetch emails");
        const data = await res.json();
        const emails: MailSummary[] = data.emails ?? [];
        setMails(emails);
        setNextPageToken(data.nextPageToken ?? null);
        // ローディング完了後、デスクトップ/タブレットのみ最新メールを自動で開く
        if (emails.length > 0 && window.innerWidth >= 640) {
          handleSelectMail(emails[0].id, emails[0].isUnread);
        }
      } catch (e: any) {
        const msg = e.message ?? "Failed to fetch emails";
        setListError(msg);
        toast.error(msg);
        console.error("[inbox] fetchMails:", e);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [status]);

  // メール詳細を取得
  const handleSelectMail = async (id: string, isUnreadOverride?: boolean) => {
    setLoadingDetail(true);
    setSelectedMail(null);
    try {
      const res = await fetch(`/api/gmail/message/${id}`);
      if (!res.ok) throw new Error("Failed to fetch email details");
      const data = await res.json();

      // 未読メールを開いた場合は自動で既読にする
      const isUnread = isUnreadOverride ?? mails.find((m) => m.id === id)?.isUnread ?? false;
      if (isUnread) {
        // Gmail API へ fire-and-forget（失敗してもメール表示は続ける）
        fetch("/api/gmail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: id, action: "markRead" }),
        }).catch((e) => console.error("[auto markRead] error:", e));

        // 一覧のローカル状態を即時更新
        setMails((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isUnread: false } : m))
        );
        // 詳細データの labelIds からも UNREAD を除去（ボタン表示の整合性）
        data.labelIds = (data.labelIds ?? []).filter((l: string) => l !== "UNREAD");
      }

      setSelectedMail(data);
    } catch (e: any) {
      console.error("[inbox] fetchDetail:", e);
      toast.error(e.message ?? "Failed to fetch email");
      setMobileView("list");
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadMoreMails = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/gmail/messages?pageToken=${nextPageToken}`);
      if (!res.ok) throw new Error("Failed to fetch more emails");
      const data = await res.json();
      setMails((prev) => [...prev, ...(data.emails ?? [])]);
      setNextPageToken(data.nextPageToken ?? null);
    } catch (e: any) {
      console.error("[inbox] loadMore:", e);
      toast.error("Failed to load more emails");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreMails();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, loadingMore]);

  // 一覧からのラベル操作
  const handleModify = async (mailId: string, action: MailAction) => {
    // archive/trash 中は該当アイテムを opacity-50 に
    setPendingMailIds((prev) => new Set(prev).add(mailId));
    try {
      const res = await fetch("/api/gmail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: mailId, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[handleModify] API error", res.status, body);
        toast.error(`Operation failed (${res.status})`);
        return;
      }

      if (action === "archive" || action === "trash") {
        setMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMail?.id === mailId) {
          setSelectedMail(null);
          setMobileView("list");
        }
      } else {
        setMails((prev) =>
          prev.map((m) =>
            m.id === mailId ? { ...m, isUnread: action === "markUnread" } : m
          )
        );
        if (selectedMail?.id === mailId) {
          setSelectedMail((prev) => {
            if (!prev) return prev;
            const current = prev.labelIds ?? [];
            const updated =
              action === "markUnread"
                ? [...current.filter((l) => l !== "UNREAD"), "UNREAD"]
                : current.filter((l) => l !== "UNREAD");
            return { ...prev, labelIds: updated };
          });
        }
      }
    } catch (e: any) {
      console.error("[handleModify]", e);
      toast.error("Operation failed");
    } finally {
      setPendingMailIds((prev) => {
        const next = new Set(prev);
        next.delete(mailId);
        return next;
      });
    }
  };

  // 詳細パネルからのアクション通知
  const handleDetailAction = (action: MailAction) => {
    if (!selectedMail) return;
    const mailId = selectedMail.id;

    if (action === "archive" || action === "trash") {
      setMails((prev) => prev.filter((m) => m.id !== mailId));
      setSelectedMail(null);
      setMobileView("list");
    } else {
      setMails((prev) =>
        prev.map((m) =>
          m.id === mailId ? { ...m, isUnread: action === "markUnread" } : m
        )
      );
      setSelectedMail((prev) => {
        if (!prev) return prev;
        const current = prev.labelIds ?? [];
        const updated =
          action === "markUnread"
            ? [...current.filter((l) => l !== "UNREAD"), "UNREAD"]
            : current.filter((l) => l !== "UNREAD");
        return { ...prev, labelIds: updated };
      });
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div
        className="h-screen flex items-center justify-center text-sm"
        style={{ background: tokens.color.bgPage, color: tokens.color.textSecondary }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      <style>{inboxStyles}</style>
      <div
        className="h-screen flex flex-col bg-background"
        style={{ background: tokens.color.bgPage }}
      >
        {/* トップバー */}
        <header
          className="h-12 flex items-center justify-between px-5 border-b border-border shrink-0"
          style={{ background: tokens.color.bgCard }}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="MaiLLY"
              width={120}
              height={30}
            />
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: tokens.color.primaryLight,
                color: tokens.color.primaryText,
              }}
            >
              beta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs hidden sm:block"
              style={{ color: tokens.color.textSecondary }}
            >
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-2 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* サイドバー：メール一覧 */}
          <aside
            className={`
              ${mobileView === "detail" ? "hidden" : "flex"}
              md:flex
              w-full md:w-72 md:shrink-0
              flex-col overflow-hidden
            `}
            style={{
              background: tokens.color.bgCard,
              borderRight: `1px solid ${tokens.color.border}`,
            }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: `1px solid ${tokens.color.border}` }}
            >
              <h1
                className="text-sm font-medium"
                style={{ color: tokens.color.textSecondary }}
              >
                Inbox
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                /* メール一覧スケルトン */
                <div className="p-4 space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="h-3.5 bg-muted rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                      <div className="h-2.5 bg-muted rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : listError ? (
                <div className="p-4 text-sm flex items-center gap-2" style={{ color: tokens.color.danger }}>
                  <span>⚠</span>
                  <span>{listError}</span>
                </div>
              ) : mails.length === 0 ? (
                <div className="p-4 text-sm" style={{ color: tokens.color.textSecondary }}>
                  No emails
                </div>
              ) : (
                <>
                  {mails.map((mail) => {
                  const isSelected = selectedMail?.id === mail.id;
                  return (
                    <div
                      key={mail.id}
                      onClick={() => { setMobileView("detail"); handleSelectMail(mail.id); }}
                      onMouseEnter={() => setHoveredMailId(mail.id)}
                      onMouseLeave={() => setHoveredMailId(null)}
                      className={`
                        group relative w-full text-left px-4 py-3
                        hover:bg-muted/50 transition-colors cursor-pointer
                        ${pendingMailIds.has(mail.id) ? "opacity-50 pointer-events-none" : ""}
                      `}
                      style={{
                        background: isSelected
                          ? tokens.color.primaryLight
                          : hoveredMailId === mail.id
                          ? tokens.color.bgHover
                          : tokens.color.bgCard,
                        borderBottom: `1px solid ${tokens.color.borderLight}`,
                        transition: `background ${tokens.transition.micro}`,
                      }}
                    >
                      {/* Row 1: 送信者名（左・ドット付き）＋ 日時（右） */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span
                            className="rounded-full flex-shrink-0"
                            style={{
                              display: "inline-block",
                              width: 6,
                              height: 6,
                              background: mail.isUnread ? tokens.color.primary : "transparent",
                            }}
                          />
                          <span
                            className="truncate"
                            style={{ fontSize: 13, fontWeight: 500, color: tokens.color.textPrimary }}
                          >
                            {parseFromName(mail.from)}
                          </span>
                        </div>
                        <span
                          className="flex-shrink-0"
                          style={{ fontSize: 12, color: tokens.color.textSecondary }}
                        >
                          {formatMailDate(mail.date)}
                        </span>
                      </div>

                      {/* Row 2: 件名 */}
                      <div
                        className="truncate pr-20"
                        style={{
                          fontSize: 14,
                          color: tokens.color.textPrimary,
                          fontWeight: mail.isUnread ? 600 : 400,
                        }}
                      >
                        {mail.subject || "(件名なし)"}
                      </div>

                      {/* Row 3: プレビュー */}
                      <div
                        className="truncate mt-0.5 opacity-70"
                        style={{ fontSize: 13, color: tokens.color.textSecondary }}
                      >
                        {mail.snippet}
                      </div>

                      {/* ホバー時アクションボタン（アイコンのみ） */}
                      <div
                        className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-background/80 rounded-md px-0.5 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleModify(mail.id, mail.isUnread ? "markRead" : "markUnread")}
                          title={mail.isUnread ? "Mark as read" : "Mark as unread"}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {mail.isUnread ? <MailOpenIcon size={13} /> : <MailIcon size={13} />}
                        </button>
                        <button
                          onClick={() => handleModify(mail.id, "archive")}
                          title="Archive"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArchiveIcon size={13} />
                        </button>
                        <button
                          onClick={() => handleModify(mail.id, "trash")}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2Icon size={13} />
                        </button>
                      </div>
                    </div>
                  );
                  })}
                  {/* 無限スクロール用センチネル */}
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {loadingMore && (
                    <div className="p-4 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-1.5 animate-pulse">
                          <div className="h-3.5 bg-muted rounded w-3/4" />
                          <div className="h-2.5 bg-muted rounded w-1/2" />
                          <div className="h-2.5 bg-muted rounded w-full" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>

          {/* メインコンテンツ */}
          <main
            className={`
              ${mobileView === "list" ? "hidden" : "flex"}
              md:flex
              flex-1 overflow-hidden flex-col
            `}
            style={{ background: tokens.color.bgPage }}
          >
            {loadingDetail ? (
              /* メール詳細スケルトン */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-border animate-pulse">
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
                <div className="flex-1 px-6 py-4 animate-pulse space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 bg-muted rounded ${i % 4 === 3 ? "w-1/2" : "w-full"}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <MailDetail
                mail={selectedMail}
                onAction={handleDetailAction}
                onBack={() => setMobileView("list")}
              />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
