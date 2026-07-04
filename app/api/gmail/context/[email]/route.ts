import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

// 差出人との過去のやり取りをまとめる。ブリーフィング生成の文脈として使う。
// 本文の全文は扱わず snippet のみ。本文・snippet はログに出さない。

const MAX_THREADS = 20; // 取得するスレッド数の上限
const MAX_RECENT = 5; // recentMessages の最大件数

type RecentMessage = {
  date: string;
  snippet: string;
  fromMe: boolean;
};

type CollectedMessage = RecentMessage & {
  internalDate: number; // 並び替え用（ms epoch）
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "ReauthRequired" }, { status: 401 });
  }

  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).trim();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    // 差出人メールアドレスでフィルタしてスレッド一覧を取得
    const listRes = await gmail.users.threads.list({
      userId: "me",
      q: `from:${email}`,
      maxResults: MAX_THREADS,
    });

    const threads = listRes.data.threads ?? [];

    // 初めての相手：やり取りが存在しない
    if (threads.length === 0) {
      return NextResponse.json({
        totalExchanges: 0,
        daysSinceLastExchange: null,
        recentMessages: [],
      });
    }

    // 各スレッドのメッセージ（ヘッダー・snippet・ラベル）を並列取得
    const threadDetails = await Promise.all(
      threads.map((t) =>
        gmail.users.threads.get({
          userId: "me",
          id: t.id!,
          format: "metadata",
          metadataHeaders: ["Date"],
        })
      )
    );

    const collected: CollectedMessage[] = [];
    for (const detail of threadDetails) {
      for (const msg of detail.data.messages ?? []) {
        const headers = msg.payload?.headers ?? [];
        const dateHeader =
          headers.find((h) => h.name?.toLowerCase() === "date")?.value ?? "";
        const internalDate = msg.internalDate ? parseInt(msg.internalDate, 10) : 0;
        collected.push({
          date: dateHeader || (internalDate ? new Date(internalDate).toISOString() : ""),
          snippet: msg.snippet ?? "",
          fromMe: msg.labelIds?.includes("SENT") ?? false,
          internalDate,
        });
      }
    }

    const totalExchanges = collected.length;

    if (totalExchanges === 0) {
      return NextResponse.json({
        totalExchanges: 0,
        daysSinceLastExchange: null,
        recentMessages: [],
      });
    }

    // 古い順に並べ替え
    collected.sort((a, b) => a.internalDate - b.internalDate);

    // 前回やり取りからの経過日数（最新メッセージ基準）
    const lastInternalDate = collected[collected.length - 1].internalDate;
    const daysSinceLastExchange = lastInternalDate
      ? Math.max(0, Math.floor((Date.now() - lastInternalDate) / 86_400_000))
      : null;

    // 直近最大5件を古い順で返す
    const recentMessages: RecentMessage[] = collected
      .slice(-MAX_RECENT)
      .map(({ date, snippet, fromMe }) => ({ date, snippet, fromMe }));

    return NextResponse.json({
      totalExchanges,
      daysSinceLastExchange,
      recentMessages,
    });
  } catch (error) {
    console.error("Gmail context fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sender context" },
      { status: 502 }
    );
  }
}
