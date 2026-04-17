"use client";

import { tokens } from "@/lib/tokens";

type Props = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm w-full" style={{ color: tokens.color.danger }}>
      <span aria-hidden>⚠</span>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="underline hover:no-underline flex-shrink-0"
          style={{ color: tokens.color.textSecondary, cursor: "pointer" }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
