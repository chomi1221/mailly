import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "ReauthRequired" }, { status: 401 });
  }

  const { messageId, attachmentId } = await params;

  // mimeType and filename are passed as query params — the caller already has
  // them from the message metadata; the Gmail attachments API only returns data+size.
  const { searchParams } = new URL(req.url);
  const mimeType = searchParams.get("mimeType") ?? "application/octet-stream";
  const filename = searchParams.get("filename") ?? "";

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const gmail = google.gmail({ version: "v1", auth });

    const res = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    return NextResponse.json({
      data: res.data.data ?? "",
      mimeType,
      filename,
    });
  } catch (error) {
    console.error("Gmail attachment fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
  }
}
