"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import MailListItem from "./MailListItem";
import ErrorMessage from "./ErrorMessage";
import type { Email } from "@/types/gmail";

type Props = {
  selectedId: string | null;
  onSelect: (email: Email) => void;
};

export default function MailList({ selectedId, onSelect }: Props) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch("/api/gmail/messages", { signal: controller.signal })
      .then((res) => {
        if (res.status === 401) { signOut(); return null; }
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<{ emails: Email[] }>;
      })
      .then((data) => {
        if (!data) return;
        setEmails(data.emails);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Failed to fetch emails");
        setLoading(false);
      });

    return () => controller.abort();
  }, [retryCount]);

  if (loading) {
    return (
      <div className="flex flex-col">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-100 animate-pulse">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-200 mt-2" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-12" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex justify-center">
        <ErrorMessage
          message={error}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        Your inbox is empty
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {emails.map((email) => (
        <MailListItem
          key={email.id}
          email={email}
          isSelected={selectedId === email.id}
          onClick={() => onSelect(email)}
        />
      ))}
    </div>
  );
}
