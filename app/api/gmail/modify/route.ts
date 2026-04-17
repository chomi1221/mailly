import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

type Action = "markRead" | "markUnread" | "archive" | "trash";

const ACTION_MAP: Record<Action, { addLabelIds: string[]; removeLabelIds: string[] }> = {
  markRead:   { addLabelIds: [],         removeLabelIds: ["UNREAD"] },
  markUnread: { addLabelIds: ["UNREAD"], removeLabelIds: [] },
  archive:    { addLabelIds: [],         removeLabelIds: ["INBOX"] },
  trash:      { addLabelIds: ["TRASH"],  removeLabelIds: ["INBOX"] },
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messageId, action } = (await req.json()) as {
      messageId: string;
      action: Action;
    };

    if (!messageId || !action || !(action in ACTION_MAP)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken as string });
    const gmail = google.gmail({ version: "v1", auth });

    const { addLabelIds, removeLabelIds } = ACTION_MAP[action];

    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: { addLabelIds, removeLabelIds },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status ?? 500;
    console.error("[gmail/modify] error:", err);
    return NextResponse.json(
      { error: "Failed to modify message" },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
