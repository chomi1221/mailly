import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

// ── ヘッダーエンコーディング ──────────────────────────────────────────────

// ヘッダーインジェクション対策（改行除去）
function sanitizeHeader(v: string): string {
  return v.replace(/[\r\n]/g, "");
}

// RFC 2047 encoded-word (=?UTF-8?B?...?=) でヘッダー値をエンコードする。
// ASCII のみの文字列はそのまま返す（二重エンコード防止）。
// 1エンコードワードの上限（75文字）を超える場合はチャンク分割して空白で繋ぐ。
// 受信側は隣接するエンコードワード間の空白を無視して結合する（RFC 2047 §6.2）。
function mimeEncodeHeader(text: string): string {
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  // =?UTF-8?B?(10文字) + base64 + ?=(2文字) ≤ 75文字 → base64 ≤ 63文字 → 元データ ≤ 47バイト
  // マルチバイト文字の切れ目を避けるため 45バイトずつ切る
  const CHUNK = 45;
  const buf = Buffer.from(text, "utf-8");
  const words: string[] = [];
  for (let i = 0; i < buf.length; i += CHUNK) {
    words.push(`=?UTF-8?B?${buf.subarray(i, i + CHUNK).toString("base64")}?=`);
  }
  return words.join(" ");
}

// ── 送信 ──────────────────────────────────────────────────────────────────

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
    const rawSubject = sanitizeHeader(
      isForward
        ? subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`
        : subject.startsWith("Re:") ? subject : `Re: ${subject}`
    );

    // 本文を MIME base64 エンコード（RFC 2045）
    // Gmail API 向けの base64url エンコード（外側）とは別物。
    // CTE: base64 を宣言することで受信 MUA が正しくデコードできる。
    const bodyBase64 = Buffer.from(body ?? "", "utf-8").toString("base64");
    // RFC 2045: base64 の行は 76 文字以内に折り返す
    const mimeBody = (bodyBase64.match(/.{1,76}/g) ?? [bodyBase64]).join("\r\n");

    const headerLines = [
      `To: ${to}`,
      ccRaw ? `Cc: ${sanitizeHeader(ccRaw)}` : "",
      // RFC 2047: 非 ASCII 件名を =?UTF-8?B?...?= でエンコード
      `Subject: ${mimeEncodeHeader(rawSubject)}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      !isForward && inReplyTo ? `In-Reply-To: ${sanitizeHeader(inReplyTo)}` : "",
      !isForward && references  ? `References: ${sanitizeHeader(references)}`  : "",
    ]
      .filter(Boolean)
      .join("\r\n");

    // RFC 2822 フォーマット: ヘッダー群 + 空行 + 本文
    const rawMessage = `${headerLines}\r\n\r\n${mimeBody}`;

    // Gmail API の raw フィールドは base64url エンコードされた RFC 2822 メッセージ
    const encodedRaw = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedRaw,
        ...(isForward ? {} : { threadId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gmail/send] error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }
}
