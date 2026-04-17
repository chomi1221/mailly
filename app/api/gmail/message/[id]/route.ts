import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import type { Attachment } from "@/types/gmail";

type ParseResult = {
  textPlain: string;
  textHtml: string;
  attachments: Attachment[];
};

function parseParts(
  parts: gmail_v1.Schema$MessagePart[] | null | undefined,
  result: ParseResult
): void {
  if (!parts) return;
  for (const part of parts) {
    if (part.mimeType?.startsWith("multipart/")) {
      parseParts(part.parts, result);
    } else if (part.mimeType === "text/plain" && part.body?.data) {
      result.textPlain = Buffer.from(part.body.data, "base64").toString("utf-8");
    } else if (part.mimeType === "text/html" && part.body?.data) {
      result.textHtml = Buffer.from(part.body.data, "base64").toString("utf-8");
    } else if (part.filename && part.body?.attachmentId) {
      result.attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType ?? "application/octet-stream",
        size: part.body.size ?? 0,
      });
    }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "ReauthRequired" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    const res = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const msg = res.data;
    const headers = msg.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    const parsed: ParseResult = { textPlain: "", textHtml: "", attachments: [] };

    if (msg.payload?.parts) {
      parseParts(msg.payload.parts, parsed);
    } else if (msg.payload?.body?.data) {
      // multipart でない単純なメッセージ
      const decoded = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
      if (msg.payload.mimeType === "text/html") {
        parsed.textHtml = decoded;
      } else {
        parsed.textPlain = decoded;
      }
    }

    // PDF添付の base64 データを取得してレスポンスに含める
    const attachmentsWithData = await Promise.all(
      parsed.attachments.map(async (att) => {
        if (att.mimeType !== "application/pdf" || !att.attachmentId) return att;
        const attRes = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: id,
          id: att.attachmentId,
        });
        return { ...att, data: attRes.data.data ?? undefined };
      })
    );

    return NextResponse.json({
      id: msg.id,
      threadId: msg.threadId,
      subject: getHeader("Subject") || "(件名なし)",
      from: getHeader("From"),
      to: getHeader("To"),
      cc: getHeader("Cc"),
      date: getHeader("Date"),
      snippet: msg.snippet ?? "",
      textPlain: parsed.textPlain,
      textHtml: parsed.textHtml,
      attachments: attachmentsWithData,
      labelIds: msg.labelIds ?? [],
      messageId: getHeader("Message-ID"),
      references: getHeader("References"),
    });
  } catch (error) {
    console.error("Gmail message fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 502 });
  }
}
