"use client";

import { useState } from "react";
import { tokens } from "@/lib/tokens";
import type { Email } from "@/types/gmail";

type Props = {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
};

function parseFrom(from: string) {
  // "Name <email@example.com>" → name と email を分離
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) return { name: match[1].replace(/"/g, "").trim(), email: match[2] };
  return { name: from, email: from };
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function MailListItem({ email, isSelected, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const { name } = parseFrom(email.from);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        w-full text-left px-4 py-3
        transition-colors duration-100 cursor-pointer
        ${isSelected ? "border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"}
      `}
      style={{
        background: isSelected
          ? tokens.color.primaryLight
          : hovered
          ? tokens.color.bgHover
          : tokens.color.bgCard,
        borderLeftColor: isSelected ? tokens.color.primary : "transparent",
        borderBottom: `1px solid ${tokens.color.borderLight}`,
        transition: `background ${tokens.transition.micro}`,
      }}
    >
      <div className="flex-1 min-w-0">
        {/* Row 1: 送信者名（左）＋ 日時（右） */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {/* 未読ドット：送信者名の左に inline で配置 */}
            <span
              className="flex-shrink-0 rounded-full"
              style={{
                width: 6,
                height: 6,
                background: email.isUnread ? tokens.color.primary : "transparent",
                display: "inline-block",
              }}
            />
            <span
              className="truncate"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: tokens.color.textPrimary,
              }}
            >
              {name || "(Unknown sender)"}
            </span>
          </div>
          <span
            className="flex-shrink-0"
            style={{ fontSize: 12, color: tokens.color.textSecondary }}
          >
            {formatDate(email.date)}
          </span>
        </div>

        {/* Row 2: 件名 */}
        <p
          className="truncate mb-0.5"
          style={{
            fontSize: 14,
            color: tokens.color.textPrimary,
            fontWeight: email.isUnread ? 600 : 400,
          }}
        >
          {email.subject}
        </p>

        {/* Row 3: プレビューテキスト */}
        <p
          className="truncate leading-relaxed"
          style={{ fontSize: 13, color: tokens.color.textSecondary }}
        >
          {email.snippet}
        </p>
      </div>
    </button>
  );
}
