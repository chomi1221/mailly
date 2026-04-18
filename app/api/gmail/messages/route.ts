import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "ReauthRequired" }, { status: 401 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      labelIds: ["INBOX"],
      pageToken,
    });

    const messages = listRes.data.messages ?? [];

    if (messages.length === 0) {
      return NextResponse.json({ emails: [], nextPageToken: null });
    }

    // 各メールのヘッダー情報を並列取得
    const emails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = detail.data.payload?.headers ?? [];
        const get = (name: string) =>
          headers.find((h) => h.name === name)?.value ?? "";

        return {
          id: msg.id,
          threadId: msg.threadId,
          subject: get("Subject") || "(件名なし)",
          from: get("From"),
          date: get("Date"),
          snippet: detail.data.snippet ?? "",
          labelIds: detail.data.labelIds ?? [],
          isUnread: detail.data.labelIds?.includes("UNREAD") ?? false,
        };
      })
    );

    return NextResponse.json({
      emails,
      nextPageToken: listRes.data.nextPageToken ?? null,
    });
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 502 }
    );
  }
}
