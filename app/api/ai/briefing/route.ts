import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildContentBlocks,
  generateBriefing,
  type BriefingAttachment,
  type SenderContext,
} from "@/lib/briefing";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const {
    emailBody,
    subject,
    senderName,
    senderEmail,
    attachments,
    senderContext,
  }: {
    emailBody?: string;
    subject?: string;
    senderName?: string;
    senderEmail?: string;
    attachments?: BriefingAttachment[];
    senderContext?: SenderContext;
  } = await req.json();

  if (!emailBody || emailBody.trim() === "") {
    return new Response(JSON.stringify({ error: "emailBody is required" }), {
      status: 400,
    });
  }

  const contentBlocks = buildContentBlocks({
    emailBody,
    subject,
    senderName,
    senderEmail,
    attachments,
    senderContext,
  });

  try {
    const briefing = await generateBriefing(client, contentBlocks);

    if (!briefing) {
      // パース失敗時：生の出力はレスポンスに含めない
      return new Response(
        JSON.stringify({ error: "Failed to generate a valid briefing" }),
        { status: 502 }
      );
    }

    return new Response(JSON.stringify(briefing), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai/briefing] generation error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate briefing" }),
      { status: 502 }
    );
  }
}
