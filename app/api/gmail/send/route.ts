import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

// ヘッダーインジェクション対策
function sanitizeHeader(v: string): string {
  return v.replace(/[\r\n]/g, "");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to: toRaw, cc: ccRaw, subject, body, threadId, inReplyTo, references, mode } =
      await req.json();

    if (!toRaw) {
      return NextResponse.json({ error: "To address is required" }, { status: 400 });
    }

    // "名前 <email@example.com>" 形式からメールアドレスだけ抽出
    const toMatch = toRaw.match(/<([^>]+)>/);
    const toAddress = toMatch ? toMatch[1] : toRaw.trim();
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(toAddress)) {
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }
    const to = sanitizeHeader(toAddress);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken as string });

    const gmail = google.gmail({ version: "v1", auth });

    const isForward = mode === "forward";
    const finalSubject = isForward
      ? (subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`)
      : (subject.startsWith("Re:") ? subject : `Re: ${subject}`);

    const headers = [
      `To: ${to}`,
      ccRaw ? `Cc: ${sanitizeHeader(ccRaw)}` : "",
      `Subject: ${sanitizeHeader(finalSubject)}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      // 転送は新規スレッドとして扱うため In-Reply-To / References をセットしない
      !isForward && inReplyTo ? `In-Reply-To: ${sanitizeHeader(inReplyTo)}` : "",
      !isForward && references ? `References: ${sanitizeHeader(references)}` : "",
    ]
      .filter(Boolean)
      .join("\r\n");

    const raw = `${headers}\r\n\r\n${body}`;
    const encodedRaw = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedRaw,
        // 転送は新規スレッドとして扱うため threadId をセットしない
        ...(isForward ? {} : { threadId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gmail/send] error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }
}
